/**
 * 保存并发保护（乐观锁）：assertNotStale + 409 分支。
 *
 * 事故背景（2026-10-18）：管理端「角色增益」面板保存时提交整份 7 档 mindscapeBuffs，
 * 面板打开期间库里被别的东西改过就整份旧覆盖，菲欧妮因此丢了一整天四批数据。
 * 现在保存前比对 updated_at，不一致就抛 STALE_WRITE，控制器回 409，前端提示刷新。
 *
 * 本文件全部用例都**不触库**（assertNotStale 注入假查询器、409 分支直接喂错误对象），
 * 所以不需要数据库、也不会往真库写东西；谁把校验挪到写库之后，这里会红。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { assertNotStale, normalizeUpdatedAt } from '../src/services/calculatorBuffService.js'
import {
  buildStaleAgentResponse,
  handleAgentSaveError,
} from '../src/controllers/calculatorBuffController.js'

/** 假 res：只用得上 status().json() 链（与 utils/response.js 的用法一致） */
function createRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

/** 假查询器：记录被查过的 SQL，按预设返回一行 */
function createRunner(row) {
  const calls = []
  const runner = async (sql, params) => {
    calls.push({ sql, params })
    return [[row], []]
  }
  runner.calls = calls
  return runner
}

/** 库里那一行的真实值（本机 MySQL 会话时区 SYSTEM=+08:00，mysql2 读出来是 Date） */
const DB_DATE = new Date('2026-10-18T15:22:09.000Z')

test('normalizeUpdatedAt：Date / ISO 字符串 / 带毫秒 都规范成 ISO-UTC 秒级', () => {
  assert.equal(normalizeUpdatedAt(DB_DATE), '2026-10-18T15:22:09.000Z')
  assert.equal(normalizeUpdatedAt('2026-10-18T15:22:09.000Z'), '2026-10-18T15:22:09.000Z')
  // 同一秒内的毫秒残差必须被抹平（列是 TIMESTAMP 无小数秒）
  assert.equal(normalizeUpdatedAt('2026-10-18T15:22:09.987Z'), '2026-10-18T15:22:09.000Z')
  // 带偏移的等价写法 → 同一瞬时
  assert.equal(normalizeUpdatedAt('2026-10-18T23:22:09+08:00'), '2026-10-18T15:22:09.000Z')
  // 空值 / 垃圾值不炸
  assert.equal(normalizeUpdatedAt(null), null)
  assert.equal(normalizeUpdatedAt(''), null)
  assert.equal(normalizeUpdatedAt('   '), null)
  assert.equal(normalizeUpdatedAt('not-a-date'), null)
})

test('assertNotStale：不传 baseUpdatedAt 时完全不查库（老客户端/新建行为不变）', async () => {
  const runner = createRunner({ updated_at: DB_DATE })
  const result = await assertNotStale('`character`', 'fione', undefined, runner)
  assert.equal(result, null)
  assert.equal(runner.calls.length, 0, '没传基准值就不该发 SELECT')
  // 空字符串同理
  await assertNotStale('`character`', 'fione', '', runner)
  assert.equal(runner.calls.length, 0)
})

test('assertNotStale：行不存在（新建）→ 不校验、不抛错', async () => {
  const runner = createRunner(undefined)
  const result = await assertNotStale('`character`', 'brand-new', DB_DATE.toISOString(), runner)
  assert.equal(result, null)
  assert.deepEqual(runner.calls[0].params, ['brand-new'])
})

test('assertNotStale：与库里一致（Date 与 ISO 字符串混用）→ 放行', async () => {
  const runner = createRunner({ updated_at: DB_DATE })
  const result = await assertNotStale('`character`', 'fione', '2026-10-18T15:22:09.000Z', runner)
  assert.deepEqual(result, { currentUpdatedAt: '2026-10-18T15:22:09.000Z' })
  assert.equal(runner.calls.length, 1)
  assert.match(runner.calls[0].sql, /SELECT updated_at FROM `character` WHERE id = \?/)
})

test('assertNotStale：库里已变 → 抛 STALE_WRITE 并带 currentUpdatedAt', async () => {
  const runner = createRunner({ updated_at: DB_DATE })
  await assert.rejects(
    () => assertNotStale('`character`', 'fione', '2026-10-18T09:00:00.000Z', runner),
    (err) => {
      assert.equal(err.code, 'STALE_WRITE')
      assert.equal(err.currentUpdatedAt, '2026-10-18T15:22:09.000Z')
      assert.equal(err.message, '数据已被其它操作更新')
      return true
    },
  )
})

test('assertNotStale：同一秒内的毫秒差不算变更（避免误判成冲突）', async () => {
  const runner = createRunner({ updated_at: DB_DATE })
  const result = await assertNotStale('`character`', 'fione', '2026-10-18T15:22:09.480Z', runner)
  assert.deepEqual(result, { currentUpdatedAt: '2026-10-18T15:22:09.000Z' })
})

test('assertNotStale：表名非法直接拒绝（防拼接）', async () => {
  await assert.rejects(
    () => assertNotStale('`character`; DROP TABLE `character`', 'x', DB_DATE.toISOString()),
    /非法表名/,
  )
})

test('控制器：STALE_WRITE → HTTP 409 + error=stale + updatedAt', () => {
  const res = createRes()
  const err = Object.assign(new Error('数据已被其它操作更新'), {
    code: 'STALE_WRITE',
    currentUpdatedAt: '2026-10-18T15:22:09.000Z',
  })
  handleAgentSaveError(res, err)
  assert.equal(res.statusCode, 409)
  // 顶层平铺（协议里写的那三个字段）
  assert.equal(res.body.error, 'stale')
  assert.equal(res.body.message, '数据已被其它操作更新')
  assert.equal(res.body.updatedAt, '2026-10-18T15:22:09.000Z')
  // 信封里也留给现有客户端解析
  assert.equal(res.body.code, 409)
  assert.equal(res.body.data.error, 'stale')
  assert.equal(res.body.data.updatedAt, '2026-10-18T15:22:09.000Z')
})

test('控制器：buildStaleAgentResponse 没有 currentUpdatedAt 时 updatedAt 为 null', () => {
  const body = buildStaleAgentResponse(Object.assign(new Error('数据已被其它操作更新'), {
    code: 'STALE_WRITE',
  }))
  assert.equal(body.error, 'stale')
  assert.equal(body.updatedAt, null)
  assert.equal(body.data.updatedAt, null)
})

test('控制器：其它错误仍然是 400（不改变现有行为）', () => {
  const res = createRes()
  handleAgentSaveError(res, new Error('角色 ID 与名称为必填项'))
  assert.equal(res.statusCode, 400)
  assert.equal(res.body.code, 400)
  assert.equal(res.body.message, '角色 ID 与名称为必填项')
  assert.equal(res.body.data.error, '角色 ID 与名称为必填项')
  assert.equal(res.body.error, undefined)
})

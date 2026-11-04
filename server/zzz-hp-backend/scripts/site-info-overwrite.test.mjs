/**
 * 网站说明回归：后端启动时只允许「缺行补默认」，绝不允许按内容特征覆盖已有行。
 *
 * 事故：`siteInfoService.ensureTable()` 曾有三条
 * `UPDATE ... WHERE content NOT LIKE '%旧标记%'`，每次后端重启后的首次访问都会把
 * 管理端刚编辑的网站说明整段还原成默认值（2026-10-20）。
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_SECTIONS, ensureTable } from '../src/services/siteInfoService.js'

test('ensureTable 只建表 + 补缺失行，不覆盖已有网站说明', async () => {
  const calls = []
  const fakeDb = {
    query: async (sql, params) => {
      calls.push({ sql: String(sql), params })
      return [[]]
    },
  }

  await ensureTable(fakeDb)

  const creates = calls.filter((call) => /CREATE TABLE/i.test(call.sql))
  const inserts = calls.filter((call) => /INSERT IGNORE INTO site_info_section/i.test(call.sql))
  const destructive = calls.filter((call) =>
    /(UPDATE\s+site_info_section|DELETE\s+FROM\s+site_info_section|REPLACE\s+INTO\s+site_info_section)/i.test(
      call.sql,
    ),
  )

  assert.equal(creates.length, 1, '应只建一次表')
  assert.equal(inserts.length, DEFAULT_SECTIONS.length, '每个栏目各补一次 INSERT IGNORE')
  assert.equal(destructive.length, 0, '不得改写/删除已有栏目（否则会覆盖管理端编辑）')

  // 默认值只用于缺行；每条 INSERT 的参数必须是合法栏目键 + 非空标题/正文
  const panelKeys = new Set(DEFAULT_SECTIONS.map((section) => section.panelKey))
  for (const call of inserts) {
    assert.ok(Array.isArray(call.params), 'INSERT 参数应为数组')
    assert.equal(call.params.length, 3)
    const [panelKey, title, content] = call.params
    assert.equal(panelKeys.has(panelKey), true, `未知栏目键：${panelKey}`)
    assert.ok(String(title).trim(), `栏目 ${panelKey} 标题为空`)
    assert.ok(String(content).trim(), `栏目 ${panelKey} 正文为空`)
    assert.match(call.sql, /INSERT IGNORE/i)
  }
  assert.doesNotMatch(
    calls.map((call) => call.sql).join('\n'),
    /NOT LIKE/i,
    '不应保留按内容标记自动覆盖的旧逻辑',
  )
})

test('默认文案与当前站点一致（HP数据站 / 怪物数据库 / 备案号）', () => {
  const byKey = Object.fromEntries(DEFAULT_SECTIONS.map((section) => [section.panelKey, section]))
  assert.equal(byKey.about.content.includes('HP数据站'), true)
  assert.equal(byKey.about.content.includes('ZZZ-HP'), false)
  assert.equal(byKey.features.content.includes('怪物数据库'), true)
  assert.equal(byKey.features.content.includes('单独怪物对比'), false)
  assert.equal(byKey.legal.content.includes('湘ICP备2026047771号-1'), true)
})

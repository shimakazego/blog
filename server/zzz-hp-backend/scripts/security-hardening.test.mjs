import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { format } from 'node:util'
import express from 'express'
import { revokeAllAdminSessions } from '../src/services/adminSessionService.js'
import { runAdminPasswordRotation } from './set-admin-password.mjs'
import {
  normalizeAvatarSourceUrl,
  resolveExistingAvatarFile,
} from '../src/utils/calculatorPublicAsset.js'
import { detectImageKind } from '../src/utils/imageMagic.js'
import { createEmptyBuffStatModifiers } from '../src/utils/calculatorBuffFields.js'
import { failInternal } from '../src/utils/response.js'

test('failInternal 生产环境不回传内部错误详情，且服务端始终记录', (t) => {
  const errorLogs = []
  t.mock.method(console, 'error', (...args) => errorLogs.push(args))

  const makeRes = () => {
    const recorded = {}
    return {
      recorded,
      status(code) {
        recorded.code = code
        return this
      },
      json(body) {
        recorded.body = body
        return this
      },
    }
  }

  const err = Object.assign(new Error('sensitive database detail (ER_DUP_ENTRY)'), {
    code: 'ER_DUP_ENTRY',
  })
  const originalNodeEnv = process.env.NODE_ENV
  const originalExpose = process.env.EXPOSE_ERROR_DETAIL

  try {
    // 生产环境：message 为稳定文案，data 不携带内部详情
    process.env.NODE_ENV = 'production'
    delete process.env.EXPOSE_ERROR_DETAIL
    let res = makeRes()
    failInternal(res, err, '获取数据失败')
    assert.equal(res.recorded.code, 500)
    assert.equal(res.recorded.body.message, '获取数据失败')
    assert.equal(res.recorded.body.data, null)

    // 生产 + 显式 EXPOSE_ERROR_DETAIL=1：附带详情便于排查
    process.env.EXPOSE_ERROR_DETAIL = '1'
    res = makeRes()
    failInternal(res, err, '获取数据失败')
    assert.deepEqual(res.recorded.body.data, {
      error: 'sensitive database detail (ER_DUP_ENTRY)',
    })

    // 非生产环境：附带详情
    delete process.env.NODE_ENV
    delete process.env.EXPOSE_ERROR_DETAIL
    res = makeRes()
    failInternal(res, err, '获取数据失败')
    assert.deepEqual(res.recorded.body.data, {
      error: 'sensitive database detail (ER_DUP_ENTRY)',
    })

    // 服务端始终记录诊断元数据，原始错误详情不进入日志
    assert.equal(errorLogs.length, 3)
    assert.ok(errorLogs.every((args) => args[0] === '[failInternal] 获取数据失败'))
    for (const args of errorLogs) {
      assert.deepEqual(args[1], { name: 'Error', code: 'ER_DUP_ENTRY' })
    }
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalExpose === undefined) delete process.env.EXPOSE_ERROR_DETAIL
    else process.env.EXPOSE_ERROR_DETAIL = originalExpose
  }
})

test('内部错误日志不包含 JSON 请求体、SQL 或异常消息中的敏感内容', async (t) => {
  const errorLogs = []
  t.mock.method(console, 'error', (...args) => errorLogs.push(args))
  const originalNodeEnv = process.env.NODE_ENV
  const originalExpose = process.env.EXPOSE_ERROR_DETAIL
  process.env.NODE_ENV = 'production'
  delete process.env.EXPOSE_ERROR_DETAIL

  const app = express()
  app.use(express.json())
  app.use((err, _req, res, _next) => failInternal(res, err))
  const server = app.listen(0, '127.0.0.1')

  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve)
      server.once('error', reject)
    })
    const secret = 'TEST_ONLY_SENSITIVE_VALUE'
    for (const body of [`{"password":"${secret}",}`, `"${secret}"`]) {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/login/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })
      assert.equal(response.status, 500)
      assert.deepEqual(await response.json(), {
        code: 500,
        message: '服务器内部错误',
        data: null,
      })
    }
    assert.equal(errorLogs.length, 2)
    for (const [, diagnostic] of errorLogs) {
      assert.deepEqual(diagnostic, {
        name: 'SyntaxError',
        type: 'entity.parse.failed',
        status: 400,
      })
    }

    const databaseError = Object.assign(new Error(secret), {
      code: 'ER_QUERY_INTERRUPTED',
      errno: 1317,
      sqlState: '70100',
      sql: `UPDATE account SET password_hash = '${secret}'`,
      sqlMessage: secret,
      cause: new Error(secret),
    })
    assert.ok(format(databaseError).includes(secret))
    failInternal({ status() { return this }, json() {} }, databaseError, '设置密码失败')
    assert.equal(errorLogs.length, 3)
    assert.deepEqual(errorLogs[2][1], {
      name: 'Error',
      code: 'ER_QUERY_INTERRUPTED',
      errno: 1317,
      sqlState: '70100',
    })
    assert.ok(errorLogs.every((args) => !format(...args).includes(secret)))
  } finally {
    await new Promise((resolve) => server.close(resolve))
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
    if (originalExpose === undefined) delete process.env.EXPOSE_ERROR_DETAIL
    else process.env.EXPOSE_ERROR_DETAIL = originalExpose
  }
})

test('赛季内容接口在数据库失败时返回 500，校验失败仍返回 400', async (t) => {
  const { default: pool } = await import('../src/config/db.js')
  const controllers = await import('../src/controllers/seasonContentController.js')
  let databaseCalls = 0
  const failDatabase = async () => {
    databaseCalls += 1
    throw Object.assign(new Error('simulated connection failure'), { code: 'ECONNRESET' })
  }
  t.mock.method(pool, 'execute', failDatabase)
  t.mock.method(pool, 'query', failDatabase)
  t.mock.method(console, 'error', () => {})

  const handlers = [
    ['previewSeasonContentHandler', '预览失败'],
    ['softDeleteSeasonContentHandler', '软删除失败'],
    ['purgeSeasonContentHandler', '软删除失败'],
    ['restoreSeasonContentHandler', '恢复失败'],
    ['cleanupSeasonContentHandler', '清理失败'],
  ]
  for (const [name, message] of handlers) {
    await t.test(name, async () => {
      const req = {
        body: { scheme: 'defense', version: '3.1', phase: '1', confirmText: 'defense:3.1:1' },
        query: {},
      }
      const res = {
        status(code) { this.code = code; return this },
        json(body) { this.body = body; return this },
      }
      await controllers[name](req, res)
      assert.equal(res.code, 500)
      assert.equal(res.body.message, message)

      const callsBeforeValidation = databaseCalls
      req.body.version = ''
      req.body.confirmText = 'defense::1'
      await controllers[name](req, res)
      assert.equal(res.code, 400)
      assert.match(res.body.message, /必填/)
      assert.equal(databaseCalls, callsBeforeValidation)
    })
  }
  assert.equal(databaseCalls, handlers.length)
})

test('avatar URL 拒绝穿越与未知前缀', () => {
  assert.equal(normalizeAvatarSourceUrl('/character/foo.webp'), '/character/foo.webp')
  assert.equal(normalizeAvatarSourceUrl('/character/../.env'), null)
  assert.equal(normalizeAvatarSourceUrl('/character/%2e%2e/secret'), null)
  assert.equal(normalizeAvatarSourceUrl('/etc/passwd'), null)
  assert.equal(normalizeAvatarSourceUrl('C:\\Windows\\win.ini'), null)
  assert.equal(resolveExistingAvatarFile('/character/../../package.json'), null)
})

test('魔数识别与空 Buff factor 默认为 0', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
  assert.equal(detectImageKind(png), 'png')
  assert.equal(detectImageKind(Buffer.from('not-an-image')), null)

  const empty = createEmptyBuffStatModifiers()
  assert.equal(empty.directDmgMultFactor, 0)
  assert.equal(empty.radianceMultFactor, 0)
  assert.equal(empty.specialMultFactor, 0)
})

test('批量撤销管理员会话会写入空会话存储', (t) => {
  const writes = []

  t.mock.method(fs, 'existsSync', () => true)
  t.mock.method(fs, 'writeFileSync', (...args) => writes.push(args))

  revokeAllAdminSessions()

  assert.equal(writes.length, 1)
  assert.match(writes[0][0], /admin-sessions\.json$/)
  assert.deepEqual(JSON.parse(writes[0][1]), { sessions: {} })
  assert.equal(writes[0][2], 'utf8')
})

test('密码更新成功后才撤销会话并关闭数据库连接', async () => {
  const events = []
  const connection = {
    async query() {
      events.push('query')
      return [[{ id: 7 }]]
    },
    async execute() {
      events.push('execute')
    },
    async end() {
      events.push('end')
    },
  }

  const exitCode = await runAdminPasswordRotation({
    plainPassword: ' test-password-not-a-secret ',
    environment: {},
    async createConnection() {
      events.push('connect')
      return connection
    },
    async hashPassword(password) {
      assert.equal(password, 'test-password-not-a-secret')
      events.push('hash')
      return '$2b$12$test-only-hash'
    },
    revokeSessions() {
      events.push('revoke')
    },
    logger: {
      log() {
        events.push('log')
      },
      error() {
        events.push('error')
      },
    },
  })

  assert.equal(exitCode, 0)
  assert.deepEqual(events, ['connect', 'hash', 'query', 'execute', 'revoke', 'log', 'end'])
})

test('数据库写入失败时不撤销会话', async () => {
  let revoked = false
  const errors = []
  const connection = {
    async query() {
      return [[{ id: 7 }]]
    },
    async execute() {
      const error = new Error('sensitive database detail')
      error.code = 'ER_TEST_FAILURE'
      throw error
    },
    async end() {},
  }

  const exitCode = await runAdminPasswordRotation({
    plainPassword: 'test-password-not-a-secret',
    environment: {},
    createConnection: async () => connection,
    hashPassword: async () => '$2b$12$test-only-hash',
    revokeSessions() {
      revoked = true
    },
    logger: { log() {}, error: (message) => errors.push(message) },
  })

  assert.equal(exitCode, 1)
  assert.equal(revoked, false)
  assert.deepEqual(errors, ['设置管理员密码失败（ER_TEST_FAILURE）。'])
})

test('数据库写入后撤销失败会报告部分成功并返回失败', async () => {
  const errors = []
  let connectionClosed = false
  const connection = {
    async query() {
      return [[]]
    },
    async execute() {},
    async end() {
      connectionClosed = true
    },
  }

  const exitCode = await runAdminPasswordRotation({
    plainPassword: 'test-password-not-a-secret',
    environment: {},
    createConnection: async () => connection,
    hashPassword: async () => '$2b$12$test-only-hash',
    revokeSessions() {
      const error = new Error('sensitive filesystem detail')
      error.code = 'EACCES'
      throw error
    },
    logger: { log() {}, error: (message) => errors.push(message) },
  })

  assert.equal(exitCode, 1)
  assert.equal(connectionClosed, true)
  assert.deepEqual(errors, [
    '管理员密码已写入数据库，但撤销现有管理员会话失败（EACCES）。请保持后端停服并检查 data 目录写权限。',
  ])
})

test('命令行入口缺少 ADMIN_PASSWORD 时会失败且不会连接数据库', () => {
  const scriptPath = fileURLToPath(new URL('./set-admin-password.mjs', import.meta.url))
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: os.tmpdir(),
    env: { ...process.env, ADMIN_PASSWORD: '' },
    encoding: 'utf8',
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /请先在 .env 中设置 ADMIN_PASSWORD/)
})

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, '../../data/ocr-quota.json')

/** 全站每月云识别上限（腾讯云总配额） */
export const OCR_MONTHLY_LIMIT = Number(process.env.OCR_MONTHLY_LIMIT) || 1000

/** 普通用户每人每月上传识别次数（按 clientId 与 IP 分别计数，取更严者） */
export const OCR_USER_MONTHLY_LIMIT = Number(process.env.OCR_USER_MONTHLY_LIMIT) || 50

function monthKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

function ensureStore() {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(DATA_FILE)) {
    const initialUsed = Math.max(
      0,
      Math.min(OCR_MONTHLY_LIMIT, Number(process.env.OCR_MONTH_USED_SEED) || 4),
    )
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify({ month: monthKey(), globalUsed: initialUsed, users: {} }, null, 2),
      'utf8',
    )
  }
}

function readStore() {
  ensureStore()
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    const month = typeof raw.month === 'string' ? raw.month : monthKey()
    const globalUsed = Number(raw.globalUsed ?? raw.used) || 0
    const users =
      raw.users && typeof raw.users === 'object' && !Array.isArray(raw.users) ? raw.users : {}
    const normalizedUsers = {}
    for (const [key, value] of Object.entries(users)) {
      const used = Number(value) || 0
      if (used > 0) normalizedUsers[key] = used
    }
    return { month, globalUsed, users: normalizedUsers }
  } catch {
    return { month: monthKey(), globalUsed: 0, users: {} }
  }
}

function writeStore(store) {
  ensureStore()
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(
      {
        month: store.month,
        globalUsed: store.globalUsed,
        users: store.users,
      },
      null,
      2,
    ),
    'utf8',
  )
}

function syncMonth(store) {
  const current = monthKey()
  if (store.month !== current) {
    store.month = current
    store.globalUsed = 0
    store.users = {}
    writeStore(store)
  }
  return store
}

function getUserUsed(store, key) {
  if (!key) return 0
  return Math.max(0, Number(store.users[key]) || 0)
}

function buildGlobalQuota(store) {
  const limit = OCR_MONTHLY_LIMIT
  const used = Math.min(limit, Math.max(0, store.globalUsed))
  const remaining = Math.max(0, limit - used)
  return { month: store.month, limit, used, remaining }
}

function normalizeIpKey(ip) {
  const raw = String(ip || '').trim()
  if (!raw) return ''
  if (raw.startsWith('ip:')) return raw.slice(0, 128)
  return `ip:${raw}`.slice(0, 128)
}

/**
 * 个人配额键：clientId 与 IP 分开计数；若 clientId 本身已是 ip: 前缀则只计一次。
 * @param {{ clientId?: string, ip?: string }} options
 */
export function resolveOcrQuotaKeys({ clientId = '', ip = '' } = {}) {
  const clientKey = typeof clientId === 'string' ? clientId.trim().slice(0, 128) : ''
  const ipKey = normalizeIpKey(ip)
  const keys = []
  if (clientKey) keys.push(clientKey)
  if (ipKey && ipKey !== clientKey) keys.push(ipKey)
  return keys
}

function buildUserQuota(store, keys) {
  const global = buildGlobalQuota(store)
  const userLimit = OCR_USER_MONTHLY_LIMIT
  let userUsed = 0
  for (const key of keys) {
    userUsed = Math.max(userUsed, getUserUsed(store, key))
  }
  userUsed = Math.min(userLimit, userUsed)
  const userRemaining = Math.max(0, userLimit - userUsed)
  const remaining = Math.min(userRemaining, global.remaining)
  return {
    month: store.month,
    limit: userLimit,
    used: userUsed,
    remaining,
    personalRemaining: userRemaining,
    scope: 'user',
    globalLimit: global.limit,
    globalUsed: global.used,
    globalRemaining: global.remaining,
  }
}

/**
 * @param {{ clientId?: string, ip?: string, isAdmin?: boolean }} options
 */
export function getOcrQuota(options = {}) {
  const store = syncMonth(readStore())
  const { isAdmin = false } = options

  if (isAdmin) {
    const global = buildGlobalQuota(store)
    return {
      ...global,
      scope: 'global',
      isAdmin: true,
      userLimit: OCR_USER_MONTHLY_LIMIT,
    }
  }

  return buildUserQuota(store, resolveOcrQuotaKeys(options))
}

function quotaExceededError(code, message, store, options) {
  const err = new Error(message)
  err.code = code
  err.quota = getOcrQuota(options)
  return err
}

/**
 * 占用云识别额度：先扣全站，再扣个人（管理员仅扣全站）。
 * 个人侧同时累加 clientId 与 IP 桶，换 clientId 无法绕过同 IP 限额。
 * @param {number} count
 * @param {{ clientId?: string, ip?: string, isAdmin?: boolean }} options
 */
export function consumeOcrQuota(count = 1, options = {}) {
  const { isAdmin = false } = options
  const store = syncMonth(readStore())
  const globalLimit = OCR_MONTHLY_LIMIT
  const userLimit = OCR_USER_MONTHLY_LIMIT
  const keys = resolveOcrQuotaKeys(options)

  if (store.globalUsed + count > globalLimit) {
    throw quotaExceededError(
      'OCR_GLOBAL_QUOTA_EXCEEDED',
      `本月全站云识别次数已用尽（上限 ${globalLimit} 次）`,
      store,
      options,
    )
  }

  if (!isAdmin) {
    if (!keys.length) {
      throw quotaExceededError(
        'OCR_CLIENT_REQUIRED',
        '缺少识别客户端标识，请刷新页面后重试',
        store,
        options,
      )
    }
    for (const key of keys) {
      const userUsed = getUserUsed(store, key)
      if (userUsed + count > userLimit) {
        throw quotaExceededError(
          'OCR_USER_QUOTA_EXCEEDED',
          `您本月云识别次数已用尽（每人 ${userLimit} 次）`,
          store,
          options,
        )
      }
    }
    for (const key of keys) {
      store.users[key] = getUserUsed(store, key) + count
    }
  }

  store.globalUsed += count
  writeStore(store)
  return getOcrQuota(options)
}

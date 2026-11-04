import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_FILE = path.join(__dirname, '../../data/admin-sessions.json')

/** 管理员会话有效期（毫秒），默认 12 小时 */
const ADMIN_SESSION_TTL_MS = Number(process.env.ADMIN_SESSION_TTL_MS) || 12 * 60 * 60 * 1000

/** 会话绝对上限（毫秒），默认 30 天：滑动续期最多续到这里，强制重新登录 */
const ADMIN_SESSION_ABSOLUTE_TTL_MS =
  Number(process.env.ADMIN_SESSION_ABSOLUTE_TTL_MS) || 30 * 24 * 60 * 60 * 1000

function ensureStore() {
  const dir = path.dirname(DATA_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ sessions: {} }, null, 2), 'utf8')
  }
}

function readStore() {
  ensureStore()
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
    const sessions =
      raw.sessions && typeof raw.sessions === 'object' && !Array.isArray(raw.sessions)
        ? raw.sessions
        : {}
    return { sessions }
  } catch {
    return { sessions: {} }
  }
}

function writeStore(store) {
  ensureStore()
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8')
}

function purgeExpiredSessions(store) {
  const now = Date.now()
  let changed = false
  for (const [token, session] of Object.entries(store.sessions)) {
    const expiresAt = Number(session?.expiresAt) || 0
    if (expiresAt <= now) {
      delete store.sessions[token]
      changed = true
    }
  }
  if (changed) writeStore(store)
  return store
}

export function createAdminSession() {
  const store = purgeExpiredSessions(readStore())
  const token = crypto.randomBytes(32).toString('hex')
  const now = Date.now()
  store.sessions[token] = { createdAt: now, expiresAt: now + ADMIN_SESSION_TTL_MS }
  writeStore(store)
  return { token, expiresAt: store.sessions[token].expiresAt }
}

/**
 * 校验会话，有效时滑动续期（持续保存：活跃使用即不被登出）。
 * 续期只在该写时才写文件（剩余不足 TTL 一半才顺延），避免每个请求都落盘。
 * 续期上限受 createdAt + 绝对上限约束，超过后不再顺延，任其到期。
 */
export function isValidAdminSession(token) {
  if (typeof token !== 'string' || !token.trim()) return false
  const key = token.trim()
  const store = purgeExpiredSessions(readStore())
  const session = store.sessions[key]
  if (!session) return false
  const now = Date.now()
  const expiresAt = Number(session.expiresAt) || 0
  if (expiresAt <= now) {
    delete store.sessions[key]
    writeStore(store)
    return false
  }
  const createdAt = Number(session.createdAt) || now
  if (!session.createdAt) session.createdAt = createdAt
  const absoluteCeiling = createdAt + ADMIN_SESSION_ABSOLUTE_TTL_MS
  const nextExpiresAt = Math.min(now + ADMIN_SESSION_TTL_MS, absoluteCeiling)
  if (nextExpiresAt > expiresAt && expiresAt - now < ADMIN_SESSION_TTL_MS / 2) {
    session.expiresAt = nextExpiresAt
    writeStore(store)
  }
  return true
}

/** 返回有效会话的过期时间（供 /api/admin/session 核验）；无效返回 null */
export function getAdminSessionInfo(token) {
  if (typeof token !== 'string' || !token.trim()) return null
  if (!isValidAdminSession(token)) return null
  const store = readStore()
  const session = store.sessions[token.trim()]
  if (!session) return null
  return { expiresAt: Number(session.expiresAt) || 0 }
}

export function revokeAdminSession(token) {
  if (typeof token !== 'string' || !token.trim()) return
  const store = readStore()
  if (store.sessions[token.trim()]) {
    delete store.sessions[token.trim()]
    writeStore(store)
  }
}

export function revokeAllAdminSessions() {
  writeStore({ sessions: {} })
}

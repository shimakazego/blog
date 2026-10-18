const ADMIN_AUTH_STORAGE_KEY = 'zzz-hp-admin-authed'
const ADMIN_TOKEN_STORAGE_KEY = 'zzz-hp-admin-token'
const OCR_CLIENT_ID_KEY = 'zzz-hp-ocr-client-id'

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value == null) {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
      return
    }
    localStorage.setItem(key, value)
    // 同步清理旧版 sessionStorage，避免两套状态不一致
    sessionStorage.removeItem(key)
  } catch {
    /* ignore quota / private mode */
  }
}

export function isAdminAuthenticated(): boolean {
  return readStorage(ADMIN_AUTH_STORAGE_KEY) === '1' && Boolean(getAdminToken())
}

export function getAdminToken(): string {
  return readStorage(ADMIN_TOKEN_STORAGE_KEY)?.trim() || ''
}

export function setAdminAuthenticated(value: boolean, token?: string) {
  if (value) {
    if (!token?.trim()) {
      writeStorage(ADMIN_AUTH_STORAGE_KEY, null)
      writeStorage(ADMIN_TOKEN_STORAGE_KEY, null)
      return
    }
    writeStorage(ADMIN_AUTH_STORAGE_KEY, '1')
    writeStorage(ADMIN_TOKEN_STORAGE_KEY, token.trim())
    return
  }
  writeStorage(ADMIN_AUTH_STORAGE_KEY, null)
  writeStorage(ADMIN_TOKEN_STORAGE_KEY, null)
}

export function clearAdminAuthenticated() {
  setAdminAuthenticated(false)
}

/**
 * 管理接口返回 401 / ADMIN_AUTH_REQUIRED 时调用：立刻清掉本地登录态。
 * 不清的话路由守卫还认本地标记，用户点了「去登录」也会被弹回管理页空转。
 */
export function handleAdminSessionExpired() {
  writeStorage(ADMIN_AUTH_STORAGE_KEY, null)
  writeStorage(ADMIN_TOKEN_STORAGE_KEY, null)
  lastSessionCheckAt = 0
  lastSessionCheckValid = false
}

const ADMIN_SESSION_CHECK_CACHE_MS = 2 * 60 * 1000
let lastSessionCheckAt = 0
let lastSessionCheckValid = false

/**
 * 进管理页前向服务器核验登录态（结果内存缓存 2 分钟，避免每次导航都发请求）。
 * 401 → 清本地态并返回 false；网络错误 / 5xx 不清态（沿用上次结果，没核验过则放行），
 * 不能把用户因断网或服务器抖动登出。
 */
export async function verifyAdminSessionWithServer(): Promise<boolean> {
  if (!isAdminAuthenticated()) return false
  if (Date.now() - lastSessionCheckAt < ADMIN_SESSION_CHECK_CACHE_MS) {
    return lastSessionCheckValid
  }
  let response: Response
  try {
    response = await fetch('/api/zzz/admin/session', { headers: withAdminAuthHeaders() })
  } catch {
    return lastSessionCheckAt > 0 ? lastSessionCheckValid : true
  }
  if (response.ok) {
    lastSessionCheckAt = Date.now()
    lastSessionCheckValid = true
    return true
  }
  if (response.status === 401) {
    handleAdminSessionExpired()
    return false
  }
  return lastSessionCheckAt > 0 ? lastSessionCheckValid : true
}

/** 管理端写请求统一附加 Authorization + X-Admin-Token */
export function withAdminAuthHeaders(
  headers: HeadersInit | undefined = undefined,
): Record<string, string> {
  const out: Record<string, string> = {}
  if (headers) {
    const normalized = new Headers(headers)
    normalized.forEach((value, key) => {
      out[key] = value
    })
  }
  const token = getAdminToken()
  if (token) {
    out.Authorization = `Bearer ${token}`
    out['X-Admin-Token'] = token
  }
  return out
}

function writeCookie(name: string, value: string) {
  try {
    const maxAge = 60 * 60 * 24 * 400
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`
  } catch {
    /* ignore */
  }
}

function readCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
    return match?.[1] ? decodeURIComponent(match[1]) : null
  } catch {
    return null
  }
}

/** 浏览器端稳定客户端 ID，用于普通用户每月额度统计 */
export function getOrCreateOcrClientId(): string {
  try {
    const existing =
      localStorage.getItem(OCR_CLIENT_ID_KEY)?.trim() ||
      sessionStorage.getItem(OCR_CLIENT_ID_KEY)?.trim() ||
      readCookie(OCR_CLIENT_ID_KEY)?.trim()
    if (existing) {
      try {
        localStorage.setItem(OCR_CLIENT_ID_KEY, existing)
        sessionStorage.setItem(OCR_CLIENT_ID_KEY, existing)
      } catch {
        /* ignore */
      }
      writeCookie(OCR_CLIENT_ID_KEY, existing)
      return existing
    }
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `ocr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
    try {
      localStorage.setItem(OCR_CLIENT_ID_KEY, id)
      sessionStorage.setItem(OCR_CLIENT_ID_KEY, id)
    } catch {
      /* ignore */
    }
    writeCookie(OCR_CLIENT_ID_KEY, id)
    return id
  } catch {
    return `ocr-temp-${Date.now().toString(36)}`
  }
}

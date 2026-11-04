import { verifyAdminPassword } from '../services/adminAuthService.js'
import { createAdminSession, getAdminSessionInfo } from '../services/adminSessionService.js'
import { readAdminToken } from '../middleware/requireAdmin.js'
import { success, fail, failInternal } from '../utils/response.js'

export async function loginAdmin(req, res) {
  const password = req.body?.password

  if (typeof password !== 'string' || !password.trim()) {
    return fail(res, '请输入密码', 400)
  }

  try {
    const ok = await verifyAdminPassword(password.trim())
    if (!ok) {
      return fail(res, '密码错误', 401)
    }
    const session = createAdminSession()
    return success(res, { authenticated: true, token: session.token }, '登录成功')
  } catch (err) {
    return failInternal(res, err, '登录失败')
  }
}

/** 会话核验：前端进入管理页前调用，确认本地保存的登录态在服务器侧仍有效 */
export function getAdminSession(req, res) {
  const info = getAdminSessionInfo(readAdminToken(req))
  if (!info) {
    return fail(res, '管理员会话无效或已过期，请重新登录', 401, { code: 'ADMIN_AUTH_REQUIRED' })
  }
  return success(res, { valid: true, expiresAt: info.expiresAt })
}

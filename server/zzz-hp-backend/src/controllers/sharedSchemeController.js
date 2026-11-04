import {
  deleteSharedScheme,
  importSharedSchemes,
  listSharedSchemes,
  updateSharedScheme,
} from '../services/sharedSchemeService.js'
import { fail, failInternal, success } from '../utils/response.js'

/** 公开：只返回启用中的预设，含 payload / dependencies */
export async function getSharedSchemes(_req, res) {
  try {
    const schemes = await listSharedSchemes({ enabledOnly: true, includePayload: true })
    return success(res, { schemes })
  } catch (err) {
    return failInternal(res, err, '获取共用方案失败')
  }
}

/** 管理端：返回全部（含停用），列表不带 payload，避免把整包塞进管理页 */
export async function getAdminSharedSchemes(_req, res) {
  try {
    const schemes = await listSharedSchemes({ enabledOnly: false, includePayload: false })
    return success(res, { schemes })
  } catch (err) {
    return failInternal(res, err, '获取共用方案失败')
  }
}

export async function importSharedSchemesHandler(req, res) {
  try {
    if (!req.file?.buffer?.length) return fail(res, '请选择方案 JSON 文件', 400)
    let pack
    try {
      pack = JSON.parse(req.file.buffer.toString('utf8'))
    } catch {
      return fail(res, 'JSON 解析失败，请检查文件格式', 400)
    }
    const mode = req.body?.mode === 'replace' ? 'replace' : 'merge'
    const summary = await importSharedSchemes(pack, { mode })
    return success(res, summary, `已导入 ${summary.imported} 个共用方案`)
  } catch (err) {
    if (err?.code === 'INVALID_SHARED_SCHEME') return fail(res, err.message, 400)
    return failInternal(res, err, '导入共用方案失败')
  }
}

export async function updateSharedSchemeHandler(req, res) {
  try {
    const updated = await updateSharedScheme(req.params.id, req.body ?? {})
    if (!updated) return fail(res, '共用方案不存在或没有可更新字段', 404)
    return success(res, updated, '共用方案已更新')
  } catch (err) {
    if (err?.code === 'INVALID_SHARED_SCHEME') return fail(res, err.message, 400)
    return failInternal(res, err, '更新共用方案失败')
  }
}

export async function removeSharedSchemeHandler(req, res) {
  try {
    const removed = await deleteSharedScheme(req.params.id)
    if (!removed) return fail(res, '共用方案不存在', 404)
    return success(res, { id: req.params.id }, '共用方案已删除')
  } catch (err) {
    return failInternal(res, err, '删除共用方案失败')
  }
}

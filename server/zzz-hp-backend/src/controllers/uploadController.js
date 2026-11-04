import { success, fail } from '../utils/response.js'
import {
  saveCalculatorPublicAvatar,
  syncEntityAvatarToPublic,
} from '../utils/calculatorPublicAsset.js'
import { persistTypedImageBuffer } from '../middleware/upload.js'

function buildImageUrl(type, filename) {
  return `/${type}_image/${filename}`
}

export function uploadBoss(req, res) {
  try {
    const saved = persistTypedImageBuffer('boss', req, req.file)
    const url = buildImageUrl('boss', saved.filename)
    return success(
      res,
      { url, filename: saved.filename, stable: saved.stable },
      saved.stable ? 'Boss 图片已按稳定文件名保存' : 'Boss 图片上传成功（未提供名称/ID，使用随机文件名）',
      201,
    )
  } catch (err) {
    return fail(res, err.message || 'Boss 图片上传失败', 400)
  }
}

export function uploadBuff(req, res) {
  try {
    const saved = persistTypedImageBuffer('buff', req, req.file)
    const url = buildImageUrl('buff', saved.filename)
    return success(
      res,
      { url, filename: saved.filename, stable: saved.stable },
      saved.stable ? 'Buff 图片已按稳定文件名保存' : 'Buff 图片上传成功（未提供 ID/名称，使用随机文件名）',
      201,
    )
  } catch (err) {
    return fail(res, err.message || 'Buff 图片上传失败', 400)
  }
}

export function uploadCalculator(req, res) {
  const kind = req.query?.kind
  const entityId = req.query?.entityId
  if (kind && entityId && req.file) {
    return uploadCalculatorPublic(req, res)
  }
  return fail(
    res,
    '请使用 /api/upload/calculator-public?kind=&entityId=，头像固定为 /character/{id}.webp 等形式',
    400,
  )
}

export async function uploadCalculatorPublic(req, res) {
  if (!req.file) {
    return fail(res, '请上传图片文件，字段名为 image', 400)
  }

  // 优先读 multipart 字段：ID 含 `&`（如 orphie&magus）时放 query 易被拆成多个参数
  const kind = req.body?.kind ?? req.query?.kind
  const entityId = req.body?.entityId ?? req.query?.entityId

  try {
    const saved = await saveCalculatorPublicAvatar(kind, entityId, req.file)
    return success(
      res,
      { url: saved.url, filename: saved.filename },
      '计算器头像已保存到固定路径',
      201,
    )
  } catch (err) {
    return fail(res, err.message || '上传失败', 400)
  }
}

/** 将已有头像（含旧 /calculator_image/哈希）迁移为 /character/{id}.webp 等固定路径 */
export async function ensureCalculatorPublic(req, res) {
  const kind = req.body?.kind ?? req.query?.kind
  const entityId = req.body?.entityId ?? req.query?.entityId
  const currentUrl =
    typeof req.body?.url === 'string'
      ? req.body.url
      : typeof req.query?.url === 'string'
        ? req.query.url
        : null

  try {
    const result = syncEntityAvatarToPublic(kind, entityId, currentUrl)
    if (result.action === 'missing' && currentUrl) {
      return fail(res, `找不到头像文件：${currentUrl}`, 404)
    }
    return success(
      res,
      { url: result.url, action: result.action },
      result.action === 'updated' ? '头像已迁移到固定路径' : '头像路径已是固定路径',
      200,
    )
  } catch (err) {
    return fail(res, err.message || '迁移失败', 400)
  }
}

export function handleUploadError(err, _req, res, next) {
  if (!err) return next()

  if (err.code === 'LIMIT_FILE_SIZE') {
    return fail(res, '图片不能超过 5MB', 400)
  }
  if (err.code === 'ENOENT' || err.code === 'EACCES' || err.code === 'EPERM') {
    return fail(res, '服务器图片目录不可写，请检查目录权限', 500)
  }
  return fail(res, err.message || '图片上传失败', 400)
}

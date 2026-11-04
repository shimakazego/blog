import { Router } from 'express'
import multer from 'multer'
import {
  getAdminSharedSchemes,
  getSharedSchemes,
  importSharedSchemesHandler,
  removeSharedSchemeHandler,
  updateSharedSchemeHandler,
} from '../controllers/sharedSchemeController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { fail } from '../utils/response.js'

/**
 * 共用方案（服务端预设方案）。
 *
 * 读公开：进计算页要能拿到预设；
 * 写全部 requireAdmin：用户侧不能改服务端预设，只能复制到自己本机。
 */

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const name = String(file.originalname || '').toLowerCase()
    const type = String(file.mimetype || '')
    if (name.endsWith('.json') || type.includes('json') || type === 'application/octet-stream') {
      cb(null, true)
      return
    }
    cb(new Error('请上传 JSON 文件'))
  },
})

function handleImportUpload(req, res, next) {
  importUpload.single('file')(req, res, (err) => {
    if (err) return fail(res, err.message || '上传失败', 400)
    if (!req.file) return fail(res, '请选择方案 JSON 文件', 400)
    return next()
  })
}

const router = Router()

router.get('/', getSharedSchemes)

router.get('/admin', requireAdmin, getAdminSharedSchemes)
router.post('/admin/import', requireAdmin, handleImportUpload, importSharedSchemesHandler)
router.patch('/admin/:id', requireAdmin, updateSharedSchemeHandler)
router.delete('/admin/:id', requireAdmin, removeSharedSchemeHandler)

export default router

import { Router } from 'express'
import {
  uploadBossImage,
  uploadBuffImage,
  uploadCalculatorImage,
  uploadCalculatorPublicImage,
} from '../middleware/upload.js'
import {
  uploadBoss,
  uploadBuff,
  uploadCalculator,
  uploadCalculatorPublic,
  ensureCalculatorPublic,
  handleUploadError,
} from '../controllers/uploadController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.post('/boss', requireAdmin, uploadBossImage, handleUploadError, uploadBoss)
router.post('/buff', requireAdmin, uploadBuffImage, handleUploadError, uploadBuff)
router.post('/calculator', requireAdmin, uploadCalculatorImage, handleUploadError, uploadCalculator)
router.post(
  '/calculator-public',
  requireAdmin,
  uploadCalculatorPublicImage,
  handleUploadError,
  uploadCalculatorPublic,
)
router.post('/calculator-public/ensure', requireAdmin, ensureCalculatorPublic)

export default router

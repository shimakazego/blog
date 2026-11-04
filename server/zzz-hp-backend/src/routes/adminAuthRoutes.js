import { Router } from 'express'
import { loginAdmin, getAdminSession } from '../controllers/adminAuthController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.post('/login', loginAdmin)
router.get('/session', requireAdmin, getAdminSession)

export default router

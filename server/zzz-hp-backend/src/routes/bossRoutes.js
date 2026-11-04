import { Router } from 'express'
import { addBoss, queryBoss, removeBoss } from '../controllers/dataController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.get('/search', queryBoss)
router.post('/', requireAdmin, addBoss)
router.delete('/:id', requireAdmin, removeBoss)

export default router

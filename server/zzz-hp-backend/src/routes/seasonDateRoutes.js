import { Router } from 'express'
import {
  getSeasonDates,
  postSeasonDate,
  putSeasonDate,
  removeSeasonDate,
} from '../controllers/seasonDateController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.get('/', getSeasonDates)
router.post('/', requireAdmin, postSeasonDate)
router.put('/:id', requireAdmin, putSeasonDate)
router.delete('/:id', requireAdmin, removeSeasonDate)

export default router

import { Router } from 'express'
import {
  addChangelog,
  editChangelog,
  getChangelog,
  getChangelogs,
  removeChangelog,
} from '../controllers/changelogController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.get('/', getChangelogs)
router.get('/:id', getChangelog)
router.post('/', requireAdmin, addChangelog)
router.put('/:id', requireAdmin, editChangelog)
router.delete('/:id', requireAdmin, removeChangelog)

export default router

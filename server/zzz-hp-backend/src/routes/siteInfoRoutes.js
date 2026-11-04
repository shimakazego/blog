import { Router } from 'express'
import {
  editSiteInfoSection,
  getSiteInfoSectionByKey,
  getSiteInfoSections,
} from '../controllers/siteInfoController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

router.get('/', getSiteInfoSections)
router.get('/:panelKey', getSiteInfoSectionByKey)
router.put('/:panelKey', requireAdmin, editSiteInfoSection)

export default router

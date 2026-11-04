import { Router } from 'express'
import {
  applyNanokaCandidatesHandler,
  applyNanokaSkillsHandler,
  collectNanokaBasicsHandler,
  collectNanokaSkillsHandler,
  listNanokaSkillGapsHandler,
  previewNanokaCandidatesHandler,
  scanNanokaBasicsHandler,
} from '../controllers/nanokaBasicsController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

// 候选文档来自本地采集（tools/nanoka-scan.mjs + tools/nanoka-candidates.mjs）或浏览器直采，服务端不抓网络
router.post('/preview', requireAdmin, previewNanokaCandidatesHandler)
router.post('/apply', requireAdmin, applyNanokaCandidatesHandler)

// 浏览器直采：索引比对（不写库）+ 单条详情映射（不写库）。抓 nanoka 由浏览器负责，服务端不联网。
router.post('/scan', requireAdmin, scanNanokaBasicsHandler)
router.post('/collect', requireAdmin, collectNanokaBasicsHandler)

// 招式（技能倍率）：招式名与倍率是确定值，不需要逐字段复核（用户 2026-10-16 裁定）。
// gaps 是纯本地查询；collect-skills 只算不写；apply-skills 才算并写（dryRun 只算不写）。
router.get('/agent-skill-gaps', requireAdmin, listNanokaSkillGapsHandler)
router.post('/collect-skills', requireAdmin, collectNanokaSkillsHandler)
router.post('/apply-skills', requireAdmin, applyNanokaSkillsHandler)

export default router

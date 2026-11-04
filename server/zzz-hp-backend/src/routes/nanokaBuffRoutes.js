import { Router } from 'express'
import {
  applyNanokaBuffsHandler,
  emptyTargetsNanokaBuffsHandler,
  extractNanokaBuffsHandler,
  parseNanokaBuffsHandler,
  rulesNanokaBuffsHandler,
  simplifyNanokaBuffsHandler,
} from '../controllers/nanokaBuffController.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

// 增益（关键字 → 增益块）：抓 nanoka 由**浏览器**负责（服务端不联网）。
// extract / simplify / parse 只算不写；apply 才写库，且只写确认过的行（按槽位下标定位）。
router.post('/extract', requireAdmin, extractNanokaBuffsHandler)
router.post('/simplify', requireAdmin, simplifyNanokaBuffsHandler)
router.post('/parse', requireAdmin, parseNanokaBuffsHandler)
router.post('/apply', requireAdmin, applyNanokaBuffsHandler)
// 解析规则对照表（只读；从抽取器词表自动导出）
router.get('/rules', requireAdmin, rulesNanokaBuffsHandler)
// 「找空活干」：0 增益的角色 / 音擎（只读查询，不写库）
router.get('/empty-targets', requireAdmin, emptyTargetsNanokaBuffsHandler)

export default router

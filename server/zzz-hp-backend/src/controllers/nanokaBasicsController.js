/**
 * nanoka 采集（基础数据）管理端接口：**只读预览 + 按勾选录入**，写入走既有 upsert 服务。
 *
 * 另有「浏览器直采」的两个接口：`/scan`（索引比对）与 `/collect`（单条详情映射）。
 * 抓 nanoka 一律由**浏览器**完成（浏览器走用户系统代理），服务端不联网。
 *
 * 2026-10-16 追加「招式（技能倍率）」三件套：
 *   - `GET /agent-skill-gaps`：纯本地查询，列出还没有 nanoka 招式的角色；
 *   - `POST /collect-skills`：吃浏览器抓来的角色详情，只算计划不写库；
 *   - `POST /apply-skills`：算计划并写库（`upsertSkill`），`dryRun: true` 时只算不写。
 * 前端统一先采集预览，再提交明确勾选的新增/覆盖项。
 */
import {
  applyNanokaCandidates,
  applyNanokaSkills,
  collectNanokaEntry,
  collectNanokaSkills,
  listNanokaSkillGaps,
  previewNanokaCandidates,
  scanNanokaBasics,
} from '../services/nanokaBasicsService.js'
import { fail, success, failInternal } from '../utils/response.js'

/** POST /api/admin/nanoka/preview —— 吃候选文档（本地采集产物），返回逐字段状态，不写库 */
export async function previewNanokaCandidatesHandler(req, res) {
  try {
    const doc = req.body?.doc ?? req.body
    const data = await previewNanokaCandidates(doc)
    const counts = data.entries.reduce(
      (acc, entry) => {
        for (const field of entry.fields) acc[field.status] = (acc[field.status] ?? 0) + 1
        return acc
      },
      { insert: 0, fill: 0, conflict: 0, equal: 0, exists: 0, stale: 0 },
    )
    return success(res, { ...data, counts }, '候选已解析（未写入）')
  } catch (err) {
    return fail(res, err.message || '候选解析失败', 400, { error: err.message })
  }
}

/** POST /api/admin/nanoka/apply —— 只写勾选的条目/字段 */
export async function applyNanokaCandidatesHandler(req, res) {
  try {
    const summary = await applyNanokaCandidates(req.body ?? {})
    const message = `录入完成：新增 ${summary.created}，更新 ${summary.updated}，跳过 ${summary.skipped}，失败 ${summary.failed}`
    return success(res, summary, message)
  } catch (err) {
    return fail(res, err.message || '录入失败', 400, { error: err.message })
  }
}

/** POST /api/admin/nanoka/scan —— 吃浏览器抓来的索引（character.json / weapon.json），只比对，不写库 */
export async function scanNanokaBasicsHandler(req, res) {
  try {
    const { buildTag, charIndex, weaponIndex } = req.body ?? {}
    const data = await scanNanokaBasics({ buildTag, charIndex, weaponIndex })
    const { counts } = data
    const message = `比对完成：缺失角色 ${counts.missingAgents}，缺失音擎 ${counts.missingWengines}；本地多出角色 ${counts.extraLocalAgents}、音擎 ${counts.extraLocalWengines}`
    return success(res, data, message)
  } catch (err) {
    return fail(res, err.message || '索引比对失败', 400, { error: err.message })
  }
}

/** POST /api/admin/nanoka/collect —— 吃浏览器抓来的单条详情，映射成候选条目（不写库） */
export async function collectNanokaBasicsHandler(req, res) {
  try {
    const data = collectNanokaEntry(req.body ?? {})
    const dropped = data.unsupported.length
    const message = dropped
      ? `已映射候选条目（未写库）；有 ${dropped} 项仓库没有对应字段，已丢弃`
      : '已映射候选条目（未写库）'
    return success(res, data, message)
  } catch (err) {
    return fail(res, err.message || '详情映射失败', 400, { error: err.message })
  }
}

/** GET /api/admin/nanoka/agent-skill-gaps —— 纯本地查询：还没有 nanoka 招式的角色（不联网、不写库） */
export async function listNanokaSkillGapsHandler(req, res) {
  try {
    const includeExisting = req.query?.includeExisting === '1'
    const rows = await listNanokaSkillGaps({ includeExisting })
    const zero = rows.filter((row) => row.skillCount === 0).length
    const message = includeExisting ? `可检查 ${rows.length} 个角色的招式（其中 ${zero} 个暂无招式）` : `本地共 ${rows.length} 个角色没有 nanoka 招式（其中 ${zero} 个连本地招式也是 0 条）`
    return success(res, rows, message)
  } catch (err) {
    return failInternal(res, err, '列出缺招式角色失败')
  }
}

/** POST /api/admin/nanoka/collect-skills —— 算招式录入计划，只算不写 */
export async function collectNanokaSkillsHandler(req, res) {
  try {
    const { nanokaId, meta, detail, level } = req.body ?? {}
    const data = await collectNanokaSkills({ nanokaId, meta, detail, level })
    const { plan, agentName, agentId } = data
    const message = `${agentName || agentId}：可新建 ${plan.create.length} 条，可覆盖倍率 ${plan.overwrite.length} 条，已一致 ${plan.skipSame.length} 条（未写库）`
    return success(res, data, message)
  } catch (err) {
    return fail(res, err.message || '招式计划计算失败', 400, { error: err.message })
  }
}

/** POST /api/admin/nanoka/apply-skills —— 算计划并写库；`dryRun: true` 时只算不写 */
export async function applyNanokaSkillsHandler(req, res) {
  try {
    const { nanokaId, meta, detail, level, dryRun, selection } = req.body ?? {}
    const data = await applyNanokaSkills({ nanokaId, meta, detail, level, dryRun: dryRun === true, selection })
    const head = `${data.agentName || data.agentId}`
    const message = data.dryRun
      ? `${head}：预览（未写入）——将新建 ${data.plan.create.length} 条 / 覆盖倍率 ${data.plan.overwrite.length} 条 / 跳过 ${data.skipped} 条`
      : `${head}：新建 ${data.created} / 覆盖 ${data.updated} / 跳过 ${data.skipped}${data.failed ? ` / 失败 ${data.failed}` : ''}`
    return success(res, data, message)
  } catch (err) {
    return fail(res, err.message || '招式录入失败', 400, { error: err.message })
  }
}

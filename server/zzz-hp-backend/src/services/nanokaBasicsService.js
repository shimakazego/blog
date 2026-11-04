/**
 * nanoka 采集·基础数据（角色基础面板 / 音擎基础属性）的管理端服务。
 *
 * 设计口径（2026-10-16 用户裁定）：
 *   - **只补空缺**：默认只填"本地为 0 / 缺失"的字段；覆盖非空值必须在界面上显式勾选（conflicts）。
 *   - **必须过管理员审核**：本服务只做「预览」与「按勾选录入」，不自动改任何东西。
 *   - **唯一写库路径**：写库复用 `upsertAgent` / `upsertWengine`（calculatorBuffService），不另造 SQL 写路径。
 *   - 采集产物由开发目录的 `tools/nanoka-scan.mjs` + `tools/nanoka-candidates.mjs` 生成，
 *     服务端不抓网络（服务器可能访问不到 nanoka）；预览/录入只吃这份候选文档。
 *
 * 候选文档形状（= `nanoka-candidates-*.json`）：
 *   { buildTag, newAgents: [...], newWengines: [...], fillEmptyFields: [{id,name,field,from,to}], conflicts: [{kind,id,name,field,local,nanoka}] }
 *
 * 2026-10 追加「浏览器直采」链路（服务端**仍然不联网**）：
 *   - `scanNanokaBasics`：吃浏览器抓来的 character.json / weapon.json 索引，与库比对出「缺什么」；
 *   - `collectNanokaEntry`：吃浏览器抓来的单条详情，映射成候选文档条目（不写库）。
 *   抓取一律发生在浏览器（走用户系统代理）；后端只做映射与 diff，见 nanoka/nanokaBasicsMapper.js。
 *
 * 2026-10-16 追加「招式（技能倍率）一键录入」（服务端**仍然不联网**）：
 *   - `listNanokaSkillGaps`：**纯本地查询**——哪些角色还没有 nanoka 招式（顺带给出各自现有招式条数）；
 *   - `collectNanokaSkills`：吃浏览器抓来的角色详情，算出招式录入计划（不写库）；
 *   - `applyNanokaSkills`：按计划写库（`upsertSkill`，唯一写路径）。
 *   招式名与倍率是**确定值**（用户 2026-10-16 裁定），所以这条链路不需要逐字段复核：
 *   前端统一先预览，再按勾选录入。倍率口径见 nanoka/nanokaSkillMapper.js。
 */
import { listCalculatorBuffs, upsertAgent, upsertWengine } from './calculatorBuffService.js'
import { listSkills, upsertSkill } from './skillLibraryService.js'
import {
  collectAgentUnsupported,
  collectWengineUnsupported,
  diffNanokaIndexAgainstLocal,
  mapAgentDetail,
  mapWengineDetail,
  normalizeName,
} from './nanoka/nanokaBasicsMapper.js'
import { planAgentSkillImport } from './nanoka/nanokaSkillMapper.js'
import { selectReviewedNanokaSkills } from '../utils/nanokaSkillReview.js'

const AGENT_LABELS = {
  hp: '生命值',
  atk: '攻击力',
  def: '防御力',
  critRate: '暴击率',
  critDmg: '暴击伤害',
  mastery: '异常精通',
  anomalyControl: '异常掌控',
  penRate: '穿透率',
  energyRegen: '能量自动回复',
  sharpenCritDmgBonus: '初始锐爆伤害',
}

const WENGINE_LABELS = {
  baseAtk: '基础攻击力',
  baseDef: '基础防御力',
  externalAtkPercent: '攻击力%',
  externalHpPercent: '生命值%',
  externalDefPercent: '防御力%',
  critRate: '暴击率',
  critDmg: '暴击伤害',
  anomalyControlPercent: '异常掌控',
  mastery: '异常精通',
  penRate: '穿透率',
  energyRegen: '能量自动回复',
}

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v))
const same = (a, b) => {
  const x = num(a)
  const y = num(b)
  if (x === null || y === null) return x === y
  return Math.abs(x - y) < 0.005
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/** 把候选文档规整成「条目 + 字段」清单，便于前端逐项勾选 */
export function buildCandidateEntries(doc) {
  if (!isPlainObject(doc)) throw new Error('候选文档必须是 JSON 对象')
  const hasAny = ['newAgents', 'newWengines', 'fillEmptyFields', 'conflicts'].some((k) => Array.isArray(doc[k]))
  if (!hasAny) {
    throw new Error('无法识别的候选文档：需要包含 newAgents / newWengines / fillEmptyFields / conflicts 中至少一项')
  }

  const entries = []

  for (const item of doc.newAgents ?? []) {
    if (!isPlainObject(item)) continue
    entries.push({
      kind: 'agent',
      action: 'insert',
      id: String(item.id ?? '').trim(),
      name: String(item.name ?? ''),
      nanokaId: item.nanokaId ?? null,
      element: item.element ?? '',
      profession: item.profession ?? '',
      fields: Object.entries(item.basePanel ?? {}).map(([key, value]) => ({
        key,
        label: AGENT_LABELS[key] ?? key,
        nanoka: value,
        local: null,
      })),
      payload: item,
    })
  }

  for (const item of doc.newWengines ?? []) {
    if (!isPlainObject(item)) continue
    const fields = []
    for (const key of ['baseAtk', 'baseDef']) {
      if (num(item[key]) !== null) fields.push({ key, label: WENGINE_LABELS[key], nanoka: item[key], local: null })
    }
    for (const [key, value] of Object.entries(item.advancedStats ?? {})) {
      fields.push({ key, label: WENGINE_LABELS[key] ?? key, nanoka: value, local: null })
    }
    entries.push({
      kind: 'wengine',
      action: 'insert',
      id: String(item.id ?? '').trim(),
      name: String(item.name ?? ''),
      nanokaId: item.nanokaId ?? null,
      rarity: item.rarity ?? '',
      fields,
      payload: item,
    })
  }

  for (const item of doc.fillEmptyFields ?? []) {
    if (!isPlainObject(item)) continue
    entries.push({
      kind: 'wengine',
      action: 'fill',
      id: String(item.id ?? '').trim(),
      name: String(item.name ?? ''),
      fields: [
        {
          key: String(item.field ?? '').replace(/^advancedStats\./, ''),
          label: WENGINE_LABELS[String(item.field ?? '').replace(/^advancedStats\./, '')] ?? item.field,
          nanoka: item.to,
          local: item.from,
        },
      ],
    })
  }

  for (const item of doc.conflicts ?? []) {
    if (!isPlainObject(item)) continue
    const kind = item.kind === 'agent' ? 'agent' : 'wengine'
    const labels = kind === 'agent' ? AGENT_LABELS : WENGINE_LABELS
    entries.push({
      kind,
      action: 'overwrite',
      id: String(item.id ?? '').trim(),
      name: String(item.name ?? ''),
      fields: [
        { key: String(item.field ?? ''), label: labels[String(item.field ?? '')] ?? item.field, nanoka: item.nanoka, local: item.local },
      ],
    })
  }

  // 同名条目（同一 id 既在 insert 又在 patch）合并字段，避免重复写入
  const merged = new Map()
  for (const entry of entries) {
    const mapKey = `${entry.kind}:${entry.id}:${entry.action}`
    if (!merged.has(mapKey)) merged.set(mapKey, entry)
    else merged.get(mapKey).fields.push(...entry.fields)
  }
  return [...merged.values()]
}

/** 读当前库里的记录（一次读全表，保证与写库用的形状完全一致） */
async function loadLocalState() {
  const data = await listCalculatorBuffs()
  return {
    agents: new Map((data.agents ?? []).map((a) => [String(a.id), a])),
    wengines: new Map((data.wengines ?? []).map((w) => [String(w.id), w])),
  }
}

function readLocalField(local, kind, key) {
  if (!local) return null
  if (kind === 'agent') return local.basePanel?.[key] ?? null
  if (key === 'baseAtk' || key === 'baseDef') return local[key] ?? null
  return local.advancedStats?.[key] ?? null
}

/**
 * 预览：把候选条目与库现状对齐，给出逐字段状态。
 *   status: 'insert'（库里没有，可新增）｜'fill'（库为空，可补）｜'conflict'（库非空且不同，需显式覆盖）｜'equal'（已一致，无需动作）｜'stale'（库里已不是候选文档里的旧值）
 */
export async function previewNanokaCandidates(doc) {
  const entries = buildCandidateEntries(doc)
  const local = await loadLocalState()

  const result = []
  for (const entry of entries) {
    const localDoc = entry.kind === 'agent' ? local.agents.get(entry.id) : local.wengines.get(entry.id)
    const fields = entry.fields.map((f) => {
      const current = readLocalField(localDoc, entry.kind, f.key)
      let status
      if (entry.action === 'insert') status = localDoc ? 'exists' : 'insert'
      else if (same(current, f.nanoka)) status = 'equal'
      else if (num(current) === null || num(current) === 0) status = 'fill'
      else if (entry.action === 'overwrite') {
        status = same(current, f.local) ? 'conflict' : 'stale'
      } else status = same(current, f.local) ? 'fill' : 'stale'
      return { ...f, current, status }
    })
    result.push({
      kind: entry.kind,
      action: entry.action,
      id: entry.id,
      name: entry.name ?? localDoc?.name ?? '',
      nanokaId: entry.nanokaId ?? null,
      exists: Boolean(localDoc),
      element: entry.element ?? localDoc?.element ?? '',
      profession: entry.profession ?? localDoc?.profession ?? '',
      fields,
      payload: entry.payload ?? null,
    })
  }
  return { buildTag: doc.buildTag ?? null, generatedAt: doc.generatedAt ?? null, entries: result }
}

/** 把 dot path 写进对象（只支持一层：basePanel.x / advancedStats.x / 顶层键） */
function setField(doc, kind, key, value) {
  if (kind === 'agent') {
    doc.basePanel = { ...(doc.basePanel ?? {}), [key]: value }
    return
  }
  if (key === 'baseAtk' || key === 'baseDef') {
    doc[key] = value
    return
  }
  doc.advancedStats = { ...(doc.advancedStats ?? {}), [key]: value }
}

function defaultAgentBuffs() {
  return [0, 1, 2, 3, 4, 5, 6].map(() => ({}))
}

/**
 * 录入：只处理界面上勾选的条目/字段。
 *   entries: [{ kind, id, action, fields: [{key, nanoka, expect}] }]
 * `expect` 是预览时的库现值，用来做乐观锁：库变了就拒绝这一项，避免覆盖别人的改动。
 */
export async function applyNanokaCandidates({ entries } = {}) {
  if (!Array.isArray(entries) || !entries.length) throw new Error('没有勾选任何要录入的条目')
  const local = await loadLocalState()
  const summary = { created: 0, updated: 0, skipped: 0, failed: 0, details: [] }

  for (const entry of entries) {
    const kind = entry.kind === 'agent' ? 'agent' : 'wengine'
    const id = String(entry.id ?? '').trim()
    const action = String(entry.action ?? 'fill')
    if (!id) {
      summary.failed += 1
      summary.details.push({ kind, id, action, ok: false, reason: '缺少 id' })
      continue
    }
    const localDoc = kind === 'agent' ? local.agents.get(id) : local.wengines.get(id)

    try {
      if (action === 'insert') {
        if (localDoc) {
          summary.skipped += 1
          summary.details.push({ kind, id, action, ok: false, reason: '库里已存在同 id 记录，跳过新增' })
          continue
        }
        const payload = entry.payload ?? {}
        if (kind === 'agent') {
          await upsertAgent({
            ...payload,
            id,
            basePanel: { ...(payload.basePanel ?? {}) },
            mindscapeBuffs: Array.isArray(payload.mindscapeBuffs) && payload.mindscapeBuffs.length ? payload.mindscapeBuffs : defaultAgentBuffs(),
            mindscapeNotes: Array.isArray(payload.mindscapeNotes) ? payload.mindscapeNotes : ['', '', '', '', '', '', ''],
          })
        } else {
          await upsertWengine({ ...payload, id })
        }
        summary.created += 1
        summary.details.push({ kind, id, action, ok: true, name: payload.name ?? id })
        continue
      }

      if (!localDoc) {
        summary.skipped += 1
        summary.details.push({ kind, id, action, ok: false, reason: '库里没有这条记录，无法补写' })
        continue
      }

      const next = JSON.parse(JSON.stringify(localDoc))
      const applied = []
      for (const field of entry.fields ?? []) {
        const key = String(field.key ?? '')
        if (!key) continue
        const current = readLocalField(localDoc, kind, key)
        const expect = field.expect
        const stale =
          expect !== undefined &&
          expect !== null &&
          !same(current, expect) &&
          !(num(current) === 0 && num(expect) === 0)
        if (stale) {
          applied.push({ key, ok: false, reason: `库现值 ${current} 与预览时 ${expect} 不一致，已跳过` })
          continue
        }
        setField(next, kind, key, field.nanoka)
        applied.push({ key, ok: true, from: current, to: field.nanoka })
      }

      const okCount = applied.filter((a) => a.ok).length
      if (!okCount) {
        summary.skipped += 1
        summary.details.push({ kind, id, action, ok: false, reason: '没有可写入的字段', applied })
        continue
      }
      if (kind === 'agent') await upsertAgent(next)
      else await upsertWengine(next)
      summary.updated += 1
      summary.details.push({ kind, id, action, ok: true, applied })
    } catch (err) {
      summary.failed += 1
      summary.details.push({ kind, id, action, ok: false, reason: err?.message ?? String(err) })
    }
  }

  return summary
}

/**
 * 扫描：吃浏览器抓来的 nanoka 索引（`character.json` / `weapon.json` 原文），与库比对出「缺什么」。
 * 不联网、不写库；匹配口径见 nanoka/nanokaBasicsMapper.js 的 `diffNanokaIndexAgainstLocal`。
 */
export async function scanNanokaBasics({ buildTag, charIndex, weaponIndex } = {}) {
  const local = await loadLocalState()
  const diff = diffNanokaIndexAgainstLocal({
    charIndex,
    weaponIndex,
    agents: [...local.agents.values()],
    wengines: [...local.wengines.values()],
  })
  return { buildTag: String(buildTag ?? ''), ...diff }
}

/**
 * 采集：吃浏览器抓来的单条详情（`zh/character/<id>.json` 或 `zh/weapon/<id>.json`），
 * 映射成可直接拼进候选文档的条目。**不联网、不写库**。
 *
 * 返回 `{ entry, unsupported }`：`unsupported` 是被丢弃的项（如 basePanel 没有的 `impact`），供界面提示。
 */
export function collectNanokaEntry({ kind, nanokaId, meta, detail } = {}) {
  if (kind !== 'agent' && kind !== 'wengine') throw new Error("kind 必须是 'agent' 或 'wengine'")
  const id = nanokaId === null || nanokaId === undefined ? '' : String(nanokaId).trim()
  if (!id) throw new Error('缺少 nanokaId')
  if (!detail || typeof detail !== 'object') throw new Error('缺少详情 JSON')

  if (kind === 'agent') {
    const entry = mapAgentDetail({ detail, nanokaId: id, indexMeta: meta })
    if (!entry.id) throw new Error('角色索引缺少 code，无法生成角色 id')
    return { entry, unsupported: collectAgentUnsupported(detail) }
  }
  const entry = mapWengineDetail({ detail, nanokaId: id, indexMeta: meta })
  if (!entry.id) throw new Error('音擎索引缺少 en / zh，无法生成音擎 id')
  return { entry, unsupported: collectWengineUnsupported(detail) }
}

// ---------------------------------------------------------------- 招式（技能倍率）一键录入

/**
 * 一条招式算不算「nanoka 来源」。
 * 口径与统计现有 1129 条时一致：`multSource === 'nanoka'` 或 id 里带稳定 id 段 `-nk-`
 * （老数据可能只有 id 没有 multSource）。
 */
function isNanokaSkill(skill) {
  const id = String(skill?.id ?? '')
  if (id.includes('-nk-')) return true
  return String(skill?.multSource ?? '').trim() === 'nanoka'
}

/**
 * 缺 nanoka 招式的角色清单（**纯本地查询，不联网、不写库**）。
 *
 * 用 `listCalculatorBuffs()` 拿角色，用 `listSkills()` 数每个角色现有招式；
 * 返回 `[{ id, name, element, profession, skillCount, nanokaSkillCount }]`，
 * 默认只含 `nanokaSkillCount === 0` 的角色，includeExisting 可列全部角色供增量检查。
 * 条数不用于判断招式是否完整。
 */
export async function listNanokaSkillGaps({ includeExisting = false } = {}) {
  const [buffs, skills] = await Promise.all([listCalculatorBuffs(), listSkills()])
  const stat = new Map()
  for (const skill of skills) {
    const agentId = String(skill?.agentId ?? '')
    if (!agentId) continue // 公共异常招式（agentId 为空）不算角色招式
    const row = stat.get(agentId) ?? { skillCount: 0, nanokaSkillCount: 0 }
    row.skillCount += 1
    if (isNanokaSkill(skill)) row.nanokaSkillCount += 1
    stat.set(agentId, row)
  }

  const rows = (buffs.agents ?? [])
    .map((agent) => {
      const id = String(agent.id ?? '')
      const counts = stat.get(id) ?? { skillCount: 0, nanokaSkillCount: 0 }
      return {
        id,
        name: String(agent.name ?? ''),
        element: String(agent.element ?? ''),
        profession: String(agent.profession ?? ''),
        skillCount: counts.skillCount,
        nanokaSkillCount: counts.nanokaSkillCount,
      }
    })
    .filter((row) => includeExisting || row.nanokaSkillCount === 0)

  rows.sort(
    (a, b) => a.skillCount - b.skillCount || a.name.localeCompare(b.name, 'zh-Hans-CN') || (a.id < b.id ? -1 : 1),
  )
  return rows
}

/**
 * nanoka 索引项 / 详情 → 本地角色。
 *
 * 匹配口径：`meta.code` 归一化后对本地 `id`（nanoka code 与本地 id 大多同形，
 * 如 `Claret` → `claret`；`Soldier 11` → `soldier11`），再对本地 `name`（`meta.zh` / `detail.name`）。
 * 都对不上就返回 null（接口层报 400，不猜）。
 */
export function resolveLocalAgentForNanoka({ agents, meta, detail } = {}) {
  const list = Array.isArray(agents) ? agents : []
  const byId = new Map(list.map((a) => [normalizeName(a.id), a]))
  const byName = new Map(list.map((a) => [normalizeName(a.name), a]).filter(([k]) => k))
  const code = normalizeName(meta?.code ?? detail?.code_name ?? '')
  if (code && byId.has(code)) return byId.get(code)
  for (const raw of [meta?.zh, detail?.name, meta?.en]) {
    const norm = normalizeName(raw ?? '')
    if (norm && byName.has(norm)) return byName.get(norm)
  }
  return null
}

function assertSkillDetail({ detail, nanokaId }) {
  if (!detail || typeof detail !== 'object' || Array.isArray(detail)) {
    throw new Error(
      `缺少 nanoka 角色详情 JSON（应传入 zh/character/${nanokaId ?? '<id>'}.json 原文）`,
    )
  }
}

/**
 * 算某个角色的招式录入计划（**不联网、不写库**）。
 * `detail` 是浏览器抓来的 `zh/character/<nanokaId>.json` 原文，`meta` 是 character.json 索引项。
 */
export async function collectNanokaSkills({ nanokaId, meta, detail, level = 12 } = {}) {
  assertSkillDetail({ detail, nanokaId })
  const [buffs, skills] = await Promise.all([listCalculatorBuffs(), listSkills()])
  const agent = resolveLocalAgentForNanoka({ agents: buffs.agents, meta, detail })
  if (!agent) {
    const code = String(meta?.code ?? detail?.code_name ?? '').trim()
    const zh = String(meta?.zh ?? detail?.name ?? '').trim()
    throw new Error(
      `本库找不到角色 ${zh || code || nanokaId || '（未知名）'}：索引 code「${code || '无'}」归一化后与本地角色 id 都对不上，请先把该角色录进主数据`,
    )
  }
  const plan = planAgentSkillImport({
    agent,
    detail,
    existingSkills: skills,
    subcategories: buffs.skillSubcategories ?? [],
    level,
  })
  return { agentId: String(agent.id), agentName: String(agent.name ?? ''), nanokaId: nanokaId == null ? null : String(nanokaId), supportsSelection: true, plan }
}

/**
 * 重新计算计划，再按预览勾选项写库；倍率旧值变化时拒绝该角色的本次录入。
 *
 * 写库只用既有 `upsertSkill`（不新造 SQL 写路径）：
 *   - `create` 整条新建；
 *   - `overwrite` 只写 `doc`（= `{...existing, ...倍率字段}`，策略 B），
 *     本库的 `element / skillTypes / buffAnchorId / note / settlementMult / baseMultFactor` 原样保留。
 *
 * `dryRun: true` 时只返回计划，不写库。
 */
export async function applyNanokaSkills({ nanokaId, meta, detail, level = 12, dryRun = false, selection } = {}) {
  const collected = await collectNanokaSkills({ nanokaId, meta, detail, level })
  const { agentId, agentName } = collected
  const plan = selectReviewedNanokaSkills(collected.plan, selection)
  const details = []
  let created = 0
  let updated = 0
  let failed = 0

  if (!dryRun) {
    for (const doc of plan.create) {
      try {
        await upsertSkill(doc)
        created += 1
        details.push({
          action: 'create',
          id: doc.id,
          name: doc.name,
          baseMult: doc.baseMult,
          skillTypes: doc.skillTypes,
          ok: true,
        })
      } catch (err) {
        failed += 1
        details.push({ action: 'create', id: doc.id, name: doc.name, ok: false, reason: err?.message ?? String(err) })
      }
    }
    for (const item of plan.overwrite) {
      try {
        await upsertSkill(item.doc)
        updated += 1
        details.push({
          action: 'overwrite',
          id: item.id,
          name: item.name,
          from: item.from,
          to: item.to,
          changed: item.changed,
          ok: true,
        })
      } catch (err) {
        failed += 1
        details.push({ action: 'overwrite', id: item.id, name: item.name, ok: false, reason: err?.message ?? String(err) })
      }
    }
  }

  return {
    agentId,
    agentName,
    nanokaId: nanokaId == null ? null : String(nanokaId),
    dryRun: Boolean(dryRun),
    created,
    updated,
    skipped: plan.skipSame.length,
    failed,
    details,
    plan,
  }
}

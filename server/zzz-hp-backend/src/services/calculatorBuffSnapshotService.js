import { listCalculatorBuffs, upsertAgent, upsertBangboo, upsertDriveDisc, upsertWengine } from './calculatorBuffService.js'
import { listDamageEventModes, upsertDamageEventMode } from './damageEventModeService.js'
import { listSkills, upsertSkill } from './skillLibraryService.js'
import { listSkillGroups, upsertSkillGroup } from './skillGroupService.js'
import { listFollowUpSkillRules, listSkillSubcategories, upsertFollowUpSkillRule, upsertSkillSubcategory } from './skillSubcategoryService.js'
import {
  DEFAULT_AFFIX_PRESET_SCHEME,
  listAffixPreset,
  listAffixSchemes,
  replaceAffixPreset,
} from './affixPresetService.js'

const SNAPSHOT_KEYS = [
  'agents',
  'wengines',
  'bangboos',
  'driveDiscs',
  'skillSubcategories',
  'followUpSkillRules',
  'damageEventModes',
  'skills',
  'skillGroups',
]

/**
 * 词条库快照键（第 10 类）。
 *
 * 为什么不像前 9 类那样放进 `SNAPSHOT_KEYS`：那是**数组**类型清单，读写都按
 * 「扁平数组 + 按 id upsert」走；词条库是「方案 → 分组 + 条目」的层级结构，
 * 写入语义是**整份替换一套方案**，两者不能共用一套循环。
 *
 * 形状与 `scripts/export-affix-preset.mjs` 的输出、主数据 JSON 的 `affixPresets`
 * 键完全一致，所以 `scripts/import-affix-preset.mjs` 能直接吃这里的导出文件。
 */
const AFFIX_PRESET_KEY = 'affixPresets'
const AFFIX_PRESET_KIND = 'zzz-hp-affix-preset'

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function itemId(item) {
  return String(item?.id ?? '').trim()
}

/**
 * 词条库快照（全部方案，每套含条目与分组）。
 *
 * 形状对齐 `scripts/export-affix-preset.mjs` 的输出，也就是主数据 JSON 里
 * `affixPresets` 那个键的样子：`{ kind, exportedAt, defaultScheme, schemes }`。
 * 对齐的意义：这份导出文件既能被本接口导回，也能直接喂给
 * `scripts/import-affix-preset.mjs`，不需要转换。
 */
async function buildAffixPresetsSnapshot() {
  const schemes = await listAffixSchemes()
  const details = await Promise.all(
    schemes.map(async (meta) => {
      const full = await listAffixPreset(meta.name)
      return {
        name: meta.name,
        isDefault: meta.isDefault,
        sortOrder: meta.sortOrder,
        entries: full.entries,
        groups: full.groups,
      }
    }),
  )
  return {
    kind: AFFIX_PRESET_KIND,
    exportedAt: new Date().toISOString(),
    defaultScheme: schemes.find((item) => item.isDefault)?.name ?? schemes[0]?.name ?? '',
    schemes: details,
  }
}

export async function exportCalculatorBuffSnapshot() {
  const data = await listCalculatorBuffs()
  const [damageEventModes, skills, skillGroups, affixPresets] = await Promise.all([
    listDamageEventModes(),
    listSkills(),
    listSkillGroups(),
    buildAffixPresetsSnapshot(),
  ])
  return {
    exportedAt: new Date().toISOString(),
    agents: data.agents,
    wengines: data.wengines,
    bangboos: data.bangboos,
    driveDiscs: data.driveDiscs,
    skillSubcategories: data.skillSubcategories ?? [],
    followUpSkillRules: data.followUpSkillRules ?? [],
    damageEventModes,
    skills,
    skillGroups,
    affixPresets,
  }
}

/** 这份值是不是词条库快照（认 `schemes` 数组，不认 `kind`：主数据里可能没写 kind） */
function hasAffixPresets(value) {
  return Array.isArray(value?.schemes)
}

/**
 * 整份文件就是词条库（没有 9 类数组键）时的识别。
 *
 * 三种来源都要吃：
 * - `{ affixPresets: { schemes } }` —— 主数据 JSON 的写法；
 * - 裸 `{ kind, defaultScheme, schemes }` —— `export-affix-preset.mjs` 的产物；
 * - 旧单方案 `{ entries, groups }` —— `affix-preset.seed.json` 那套扁平格式，
 *   当作默认方案（与 `import-affix-preset.mjs` 同一口径）。
 *
 * 必须放在「单条增益」识别之前：词条库文件没有顶层 `id`，否则会被
 * 「无法识别的增益 JSON」直接拦掉。
 */
function coerceAffixPresetOnlyDoc(doc) {
  if (Array.isArray(doc.schemes)) {
    return {
      [AFFIX_PRESET_KEY]: {
        kind: typeof doc.kind === 'string' ? doc.kind : AFFIX_PRESET_KIND,
        defaultScheme: typeof doc.defaultScheme === 'string' ? doc.defaultScheme : undefined,
        schemes: doc.schemes,
      },
    }
  }
  if (Array.isArray(doc.entries) || Array.isArray(doc.groups)) {
    return {
      [AFFIX_PRESET_KEY]: {
        kind: AFFIX_PRESET_KIND,
        defaultScheme: DEFAULT_AFFIX_PRESET_SCHEME,
        schemes: [
          {
            name: DEFAULT_AFFIX_PRESET_SCHEME,
            entries: Array.isArray(doc.entries) ? doc.entries : [],
            groups: Array.isArray(doc.groups) ? doc.groups : [],
          },
        ],
      },
    }
  }
  return null
}

export function coerceCalculatorBuffSnapshot(raw) {
  if (raw == null) throw new Error('文件内容为空')
  if (Array.isArray(raw)) {
    throw new Error('请使用对象格式的增益快照，而不是数组')
  }
  if (typeof raw !== 'object') throw new Error('JSON 须为对象')

  const hasKnownKey = SNAPSHOT_KEYS.some((key) => Array.isArray(raw[key]))
  if (hasKnownKey || hasAffixPresets(raw[AFFIX_PRESET_KEY])) return raw

  const doc = raw
  const affixOnly = coerceAffixPresetOnlyDoc(doc)
  if (affixOnly) return affixOnly

  if (!itemId(doc)) {
    throw new Error(
      '无法识别的增益 JSON。请使用本页导出的快照，或包含 agents / wengines 等字段的对象。',
    )
  }

  if (Array.isArray(doc.mindscapeBuffs) || doc.basePanel) return { agents: [doc] }
  if (doc.twoPieceMods || doc.fourPieceBuffs || doc.twoPieceNote != null || doc.fourPieceNote != null) {
    return { driveDiscs: [doc] }
  }
  if (doc.baseAtk != null || doc.baseDef != null || doc.advancedStats || doc.refinementBuffs || doc.fixedBuffs) {
    return { wengines: [doc] }
  }
  if (doc.fixedMods || doc.refinementMods) return { bangboos: [doc] }
  if (doc.categoryId && doc.name && doc.agentId != null && doc.countsAsFollowUp != null) {
    return { skillSubcategories: [doc] }
  }
  if (Array.isArray(doc.events) || doc.modeType) return { damageEventModes: [doc] }
  if (doc.damageType != null && (doc.baseMult != null || doc.skillTypes)) return { skills: [doc] }
  if (Array.isArray(doc.members) && doc.name && doc.agentId != null) return { skillGroups: [doc] }
  if (doc.agentId && doc.categoryId) return { followUpSkillRules: [doc] }
  if (doc.profession || doc.element) return { agents: [doc] }

  throw new Error('无法识别的单条增益 JSON，请改用完整快照文件。')
}

function emptyTypeResult() {
  return { created: 0, updated: 0, skipped: 0, errors: [] }
}

async function importDocs(items, existingIds, upsertFn) {
  const result = emptyTypeResult()
  for (const item of items) {
    const id = itemId(item)
    if (!id) {
      result.skipped += 1
      continue
    }
    try {
      await upsertFn(item)
      if (existingIds.has(id)) result.updated += 1
      else result.created += 1
    } catch (err) {
      result.errors.push({
        id,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return result
}

/**
 * 导入词条库：**整份替换同名方案**。
 *
 * 文件里出现的方案逐个走 `replaceAffixPreset` —— 每套是一次事务，要么整份换成
 * 新内容、要么维持原样，不会留下改了一半的预设。**文件里没出现的方案保留不动**，
 * 不做「全量覆盖」，免得一次导入把库里其他方案删掉。
 *
 * ⚠️ 这条与前面 9 类的「按 id 增量、不删不存在的条目」语义不同，界面上要标出来。
 *
 * 计数单位是**方案**（不是条目）：同名方案记 updated，新方案记 created。
 */
async function importAffixPresets(affixPresets, existingSchemeNames) {
  const result = emptyTypeResult()
  const incoming = Array.isArray(affixPresets?.schemes) ? affixPresets.schemes : []
  for (const rawScheme of incoming) {
    const name = String(rawScheme?.name ?? '').trim()
    if (!name) {
      result.skipped += 1
      continue
    }
    try {
      await replaceAffixPreset({
        scheme: name,
        entries: Array.isArray(rawScheme.entries) ? rawScheme.entries : [],
        groups: Array.isArray(rawScheme.groups) ? rawScheme.groups : [],
      })
      if (existingSchemeNames.has(name)) result.updated += 1
      else result.created += 1
    } catch (err) {
      result.errors.push({
        id: name,
        message: err instanceof Error ? err.message : String(err),
      })
    }
  }
  return result
}

export async function importCalculatorBuffSnapshot(raw) {
  const snapshot = coerceCalculatorBuffSnapshot(raw)
  const current = await exportCalculatorBuffSnapshot()
  const idSet = (list) => new Set(asArray(list).map(itemId).filter(Boolean))

  const summary = {
    agents: emptyTypeResult(),
    wengines: emptyTypeResult(),
    bangboos: emptyTypeResult(),
    driveDiscs: emptyTypeResult(),
    skillSubcategories: emptyTypeResult(),
    followUpSkillRules: emptyTypeResult(),
    damageEventModes: emptyTypeResult(),
    skills: emptyTypeResult(),
    skillGroups: emptyTypeResult(),
    affixPresets: emptyTypeResult(),
  }

  if (Array.isArray(snapshot.agents)) {
    summary.agents = await importDocs(snapshot.agents, idSet(current.agents), upsertAgent)
  }
  if (Array.isArray(snapshot.wengines)) {
    summary.wengines = await importDocs(snapshot.wengines, idSet(current.wengines), upsertWengine)
  }
  if (Array.isArray(snapshot.bangboos)) {
    summary.bangboos = await importDocs(snapshot.bangboos, idSet(current.bangboos), upsertBangboo)
  }
  if (Array.isArray(snapshot.driveDiscs)) {
    summary.driveDiscs = await importDocs(
      snapshot.driveDiscs,
      idSet(current.driveDiscs),
      upsertDriveDisc,
    )
  }
  if (Array.isArray(snapshot.skillSubcategories)) {
    summary.skillSubcategories = await importDocs(
      snapshot.skillSubcategories,
      idSet(current.skillSubcategories),
      upsertSkillSubcategory,
    )
  }
  if (Array.isArray(snapshot.followUpSkillRules)) {
    summary.followUpSkillRules = await importDocs(
      snapshot.followUpSkillRules,
      idSet(current.followUpSkillRules),
      upsertFollowUpSkillRule,
    )
  }
  if (Array.isArray(snapshot.damageEventModes)) {
    summary.damageEventModes = await importDocs(
      snapshot.damageEventModes,
      idSet(current.damageEventModes),
      upsertDamageEventMode,
    )
  }
  if (Array.isArray(snapshot.skills)) {
    summary.skills = await importDocs(snapshot.skills, idSet(current.skills), upsertSkill)
  }
  if (Array.isArray(snapshot.skillGroups)) {
    summary.skillGroups = await importDocs(
      snapshot.skillGroups,
      idSet(current.skillGroups),
      upsertSkillGroup,
    )
  }

  if (Array.isArray(snapshot[AFFIX_PRESET_KEY]?.schemes)) {
    const existingSchemeNames = new Set(
      asArray(current[AFFIX_PRESET_KEY]?.schemes).map((item) => String(item?.name ?? '').trim()),
    )
    summary.affixPresets = await importAffixPresets(snapshot[AFFIX_PRESET_KEY], existingSchemeNames)
  }

  const hasAny =
    SNAPSHOT_KEYS.some((key) => Array.isArray(snapshot[key]) && snapshot[key].length > 0) ||
    (Array.isArray(snapshot[AFFIX_PRESET_KEY]?.schemes) &&
      snapshot[AFFIX_PRESET_KEY].schemes.length > 0)
  if (!hasAny) {
    throw new Error('文件中没有可导入的增益条目')
  }

  return summary
}

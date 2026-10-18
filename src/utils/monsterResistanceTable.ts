import {
  RESISTANCE_VALUE_MAP,
  type EnemyResistanceElement,
  type EnemyResistanceType,
} from '@/utils/enemyResistance'
import { elementIconPath, splitTraitElements } from '@/utils/elementIcons'

/**
 * 怪物详情弹窗的「弱点与抗性」表（六属性 × 伤害 / 异常积蓄 / 失衡 / 初始异常积蓄），
 * 展示口径对齐 nanoka 怪物页（用户提供截图）。
 *
 * 知识来源与可信度：
 * - 伤害列：本项目既有模型 `RESISTANCE_VALUE_MAP`（弱点 -20%、无弱点无抗性 0%、抗性 20%、高抗性 40%），
 *   此处不写任何百分比字面量，全部由该表 × 100 推导。
 * - 异常积蓄 / 失衡列：**推断**——截图中 40% 抗性属性的这两列显示为 20%，
 *   故按「伤害值截断到 ±20% 档（`RESISTANCE_VALUE_MAP.weak` / `.res20`）」实现，待验证。
 * - 初始异常积蓄列：**用户提供的真实游戏数据**——初始异常积蓄 = 基础异常条长度 × 异常条系数 × 版本系数，
 *   基础值按敌人类别（普通 / 精英 / 首领）与属性分列；展示口径为初始条长（0 次已异常）。
 *   异常条系数由数据侧下发（`boss_info.anomaly_bar_coefficient`；危局按 phases 里 boss 的同名字段下发），
 *   内置默认表在后端读取时解析，前端不持有副本，字段缺失 / 非法时只按 1 兜底，
 *   并置 `maxAnomalyProgressEstimated`，避免把基础条冒充成真实初始异常积蓄（见下）。
 *   版本系数同为**用户提供的游戏数据**：2.1 第一期及以后异常条整体 ×1.1，版本号解析不出时按 1（不乘）。
 *   `zzz-hp-backend/insert_boss_anomaly_coefficients.sql` 只在需要把默认值落库时执行。
 */

/**
 * 表内属性顺序：冰 / 火 / 电 / 以太 / 物理 / 风（与截图一致）。
 * 与 `TRAIT_ELEMENTS` 同序但去掉流明，单独声明以保证表格恒为六行。
 */
export const MONSTER_RESISTANCE_TABLE_ELEMENTS: readonly EnemyResistanceElement[] = [
  '冰',
  '火',
  '电',
  '以太',
  '物理',
  '风',
]

/** 敌人类别（决定基础异常条所在列）；缺省按「首领」 */
export type MonsterAnomalyBarCategory = 'normal' | 'elite' | 'boss'

/** 基础异常条表的属性分组列：物理、火/电/冰/以太（数据完全一致，共用一列）、风 */
type MonsterAnomalyBarColumn = 'physical' | 'fireGroup' | 'wind'

/**
 * 基础异常条长度表（用户提供：boss 图鉴数据）。
 * 行维度：已异常次数 0..8 与 9+，共十档；列维度：敌人类别 × 属性分组。
 */
const BASE_ANOMALY_PROGRESS_TABLE: Record<
  MonsterAnomalyBarCategory,
  Record<MonsterAnomalyBarColumn, readonly number[]>
> = {
  normal: {
    physical: [720, 734, 748, 762, 777, 792, 807, 823, 839, 855],
    fireGroup: [600, 612, 624, 636, 648, 660, 673, 686, 699, 712],
    wind: [300, 500, 624, 636, 648, 660, 673, 686, 699, 712],
  },
  elite: {
    physical: [2700, 2754, 2809, 2865, 2922, 2980, 3039, 3099, 3160, 3223],
    fireGroup: [2250, 2295, 2340, 2386, 2433, 2481, 2530, 2580, 2631, 2683],
    wind: [1150, 2000, 2340, 2386, 2433, 2481, 2530, 2580, 2631, 2683],
  },
  boss: {
    physical: [3600, 3672, 3745, 3819, 3895, 3972, 4051, 4132, 4214, 4298],
    fireGroup: [3000, 3060, 3121, 3183, 3246, 3310, 3376, 3443, 3511, 3581],
    wind: [1500, 2700, 3121, 3183, 3246, 3310, 3376, 3443, 3511, 3581],
  },
}

function resolveAnomalyBarColumn(element: EnemyResistanceElement): MonsterAnomalyBarColumn {
  if (element === '物理') return 'physical'
  if (element === '风') return 'wind'
  return 'fireGroup'
}

/**
 * 取基础异常条长度：已异常次数 0..8 逐档，9 及以上取最后一档（越界按边界档收敛）。
 * 展示口径恒传 0（初始条长），其余档位供后续扩展（如已异常次数步进器）使用。
 */
export function getMonsterBaseAnomalyProgress(
  category: MonsterAnomalyBarCategory,
  element: EnemyResistanceElement,
  occurrence: number,
): number {
  const column = BASE_ANOMALY_PROGRESS_TABLE[category][resolveAnomalyBarColumn(element)]
  const index = Math.min(Math.max(Math.floor(occurrence), 0), column.length - 1)
  return column[index]!
}

/** 异常积蓄 / 失衡的截断上下限：即 ±20% 两个档位，非新常量 */
const ANOMALY_STAGGER_LOWER_BOUND_PERCENT = RESISTANCE_VALUE_MAP.weak * 100
const ANOMALY_STAGGER_UPPER_BOUND_PERCENT = RESISTANCE_VALUE_MAP.res20 * 100

/**
 * 数据侧下发的异常条系数是否为「已配置」：须为有限正数。
 * 0 / 负数 / NaN / Infinity 一律视为未配置，避免脏数据把初始异常积蓄算成 0 或负数；
 * 内置默认表由后端解析，前端不参与，前端也不持有按 Boss 名的副本。
 */
export function isAnomalyBarCoefficientConfigured(
  explicitValue: number | null | undefined,
): explicitValue is number {
  return typeof explicitValue === 'number' && Number.isFinite(explicitValue) && explicitValue > 0
}

/** 已配置的系数原样使用；未配置返回 null（调用方按 1 参与计算，但须标记该值为估算） */
function resolveAnomalyBarCoefficient(explicitValue: number | null | undefined): number | null {
  return isAnomalyBarCoefficientConfigured(explicitValue) ? explicitValue : null
}

/**
 * 版本系数：**在 2.1（含）之前就已存在的 Boss**，在 2.1 及以后的期数 ×1.1（用户提供的游戏数据）。
 * - 「在 2.1 之前出现过的老 Boss」与「2.1 才出的新 Boss」都算（即首次出现不晚于 2.1）；
 * - 2.1 **之后**才出的 Boss 不乘（它们的基础数据本身已含这一档）；
 * - 上述 Boss 在 2.1 **之前**的期数同样不乘（该补偿从 2.1 才开始生效）。
 * 版本号只比较「主.次」两段；缺段 / 空串 / 非数字一律保守返回 false（不乘）。
 */
export const ANOMALY_BAR_VERSION_MULTIPLIER = 1.1
/** 版本系数的起算版本：当前期数 ≥ 它，且该 Boss 在它（含）之前就已存在，两个条件同时成立才乘 */
export const ANOMALY_BAR_VERSION_MULTIPLIER_FROM = '2.1'

function parseMajorMinorVersion(version: string | null | undefined): [number, number] | null {
  if (typeof version !== 'string') return null
  const match = /^(\d+)\.(\d+)$/.exec(version.trim())
  if (!match) return null
  return [Number(match[1]), Number(match[2])]
}

/** 版本可解析且不晚于 target（≤）；缺失 / 非法 / 不可比一律 false */
export function isVersionAtMost(version: string | null | undefined, target: string): boolean {
  const value = parseMajorMinorVersion(version)
  const bound = parseMajorMinorVersion(target)
  if (value === null || bound === null) return false
  return value[0] < bound[0] || (value[0] === bound[0] && value[1] <= bound[1])
}

/** 版本可解析且不早于 target（≥）；缺失 / 非法 / 不可比一律 false */
export function isVersionAtLeast(version: string | null | undefined, target: string): boolean {
  const value = parseMajorMinorVersion(version)
  const bound = parseMajorMinorVersion(target)
  if (value === null || bound === null) return false
  return value[0] > bound[0] || (value[0] === bound[0] && value[1] >= bound[1])
}

/**
 * 版本系数是否生效：**两个条件同时成立** ——
 * ① 该 Boss 在起算版本 2.1（含）时就已存在（`bossExistedByMultiplierVersion`，
 *    由调用方按其出现历史计算：首次出现不晚于 2.1，含 2.1 才出的新 Boss）；
 * ② 当前期数 / 赛季版本 ≥ 2.1。
 * 其余组合（含版本未知）一律不乘。
 */
export function isAnomalyBarVersionMultiplier(
  version: string | null | undefined,
  bossExistedByMultiplierVersion?: boolean,
): boolean {
  if (bossExistedByMultiplierVersion !== true) return false
  return isVersionAtLeast(version, ANOMALY_BAR_VERSION_MULTIPLIER_FROM)
}

export interface MonsterResistanceTableInput {
  /** 弱点文本，如「冰、物理」；支持数组 */
  weakness?: string | string[] | null
  /** 抗性文本，如「电」；支持数组 */
  resistance?: string | string[] | null
  /** 高抗性（40%）属性，为 resistance 的子集 */
  resistance_high?: string | string[] | null
  /**
   * 怪物等级。初始异常积蓄是否随等级变化未经验证（见模块注释），
   * 当前不参与计算，仅作调用方显式声明用。
   */
  level?: number | null
  /** 敌人类别（决定基础异常条所在列）；缺省按「首领」 */
  monster_category?: MonsterAnomalyBarCategory | null
  /**
   * 异常条系数，由数据侧下发（`boss_info.anomaly_bar_coefficient`；危局为 phases 里 boss 的同名字段）；
   * 内置默认表已由后端解析，前端只在缺省 / 非有限正数时按 1 兜底（并置 `maxAnomalyProgressEstimated`）。
   */
  anomaly_bar_coefficient?: number | null
  /** 该怪物所在期数 / 赛季的游戏版本（如 3.2）；用于版本系数判定，缺省不乘 */
  version?: string | null
  /**
   * 该 Boss 是否在起算版本 2.1（含）时就已存在（由调用方按其出现历史计算：
   * 首次出现不晚于 2.1，含 2.1 才出的新 Boss）。
   * 与 `version ≥ 2.1` 同时成立时才乘版本系数；缺省按 false 处理。
   */
  boss_existed_by_multiplier_version?: boolean
}

export interface MonsterResistanceRow {
  /** 属性名（冰 / 火 / 电 / 以太 / 物理 / 风） */
  element: EnemyResistanceElement
  /** 属性图标地址（/attribute_image/*.webp）；未收录图标时为 null */
  icon: string | null
  /** 伤害补充百分比：弱点 -20、无弱点无抗性 0、抗性 20、高抗性 40 */
  damagePercent: number
  /** 异常积蓄百分比（伤害值截断到 ±20%） */
  anomalyPercent: number
  /** 失衡百分比（同异常积蓄截断规则） */
  staggerPercent: number
  /** 初始异常积蓄 = 基础异常条（初始条长）× 异常条系数 × 版本系数，四舍五入取整；千分位由展示层格式化 */
  maxAnomalyProgress: number
  /**
   * 上面的初始异常积蓄是否为估算值：异常条系数未由数据侧配置时为 true
   * （此时只按 1 参与计算，值退化为基础条 × 版本系数），展示层据此加 `*` 标注。
   */
  maxAnomalyProgressEstimated: boolean
}

function resolveResistanceType(
  element: EnemyResistanceElement,
  weakElements: ReadonlySet<string>,
  resistElements: ReadonlySet<string>,
  highResistElements: ReadonlySet<string>,
): EnemyResistanceType {
  // 抗性覆盖同属性弱点，与计算器口径（enemyBossTextParse.parseBossTraitToElementResistance）一致
  if (resistElements.has(element)) {
    return highResistElements.has(element) ? 'res40' : 'res20'
  }
  if (weakElements.has(element)) return 'weak'
  return 'normal'
}

function clampPercent(percent: number): number {
  return Math.min(
    ANOMALY_STAGGER_UPPER_BOUND_PERCENT,
    Math.max(ANOMALY_STAGGER_LOWER_BOUND_PERCENT, percent),
  )
}

/** 按「弱点与抗性」表口径生成六行数据（顺序固定为 冰 / 火 / 电 / 以太 / 物理 / 风） */
export function buildMonsterResistanceRows(
  input: MonsterResistanceTableInput,
): MonsterResistanceRow[] {
  const weakElements = new Set(splitTraitElements(input.weakness))
  const resistElements = new Set(splitTraitElements(input.resistance))
  const highResistElements = new Set(splitTraitElements(input.resistance_high))
  const category = input.monster_category ?? 'boss'
  const coefficient = resolveAnomalyBarCoefficient(input.anomaly_bar_coefficient)
  const versionMultiplier = isAnomalyBarVersionMultiplier(
    input.version,
    input.boss_existed_by_multiplier_version,
  )
    ? ANOMALY_BAR_VERSION_MULTIPLIER
    : 1

  return MONSTER_RESISTANCE_TABLE_ELEMENTS.map((element) => {
    const type = resolveResistanceType(element, weakElements, resistElements, highResistElements)
    const damagePercent = Math.round(RESISTANCE_VALUE_MAP[type] * 100)
    const baseAnomalyProgress = getMonsterBaseAnomalyProgress(category, element, 0)
    return {
      element,
      icon: elementIconPath(element),
      damagePercent,
      anomalyPercent: clampPercent(damagePercent),
      staggerPercent: clampPercent(damagePercent),
      // 系数未配置时按 1 参与计算（版本系数与系数是否配置无关），三因子只在此处取整一次
      maxAnomalyProgress: Math.round(baseAnomalyProgress * (coefficient ?? 1) * versionMultiplier),
      maxAnomalyProgressEstimated: coefficient === null,
    }
  })
}

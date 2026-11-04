/**
 * 异常条系数（初始异常积蓄 = 基础异常条长度 × 系数）——后端单一事实来源。
 *
 * 单一事实来源与覆盖关系：
 * - 本模块的 `ANOMALY_BAR_COEFFICIENT_BY_NAME` 是**内置默认值**：不接数据库、不跑任何脚本即可开箱生效；
 * - `boss_info.anomaly_bar_coefficient` 是**覆盖值**（后台可编辑），优先于本表；
 * - `zzz-hp-backend/insert_boss_anomaly_coefficients.sql` 只在**需要覆盖默认**时执行，
 *   本表已覆盖的条目不必跑它。
 * ⚠ 本表与上述 SQL 必须同步维护：任一处改了名称或系数，另一处要一起改，
 *   否则「库里填了值」与「库里没值」两条路径会给出不同结果。
 */

/**
 * 内置默认系数（Boss 名 → 系数，用户提供的真实游戏数据，共 18 条）。
 * 键是字面写法，带括号的条目两种写法都能命中，请统一走 `resolveAnomalyBarCoefficient`。
 */
export const ANOMALY_BAR_COEFFICIENT_BY_NAME = {
  死路屠夫: 1.0,
  未知复合侵蚀体: 1.0,
  '「霸主侵蚀体·庞培」': 1.1,
  '牲鬼·布林格': 1.1,
  '恶名·冥宁芙': 1.1,
  '自律强袭单位·「提丰·破坏者型」': 1.1,
  '恶名·死路屠夫': 1.1,
  '恶名·庞培': 1.1,
  秽息司祭: 1.2,
  '秽息妖鬼·名可名': 1.2,
  '「亵渎者」': 1.32,
  '魇缚者·叶释渊': 1.32,
  彷徨猎手: 1.38,
  '太初梦魇·「始主」': 1.5,
  '叛律孤歌·薇斯珀': 1.25,
  异变能量体: 1.25,
  猎血清道夫: 1.0625,
  基塔布鲁: 1.3,
}

/** 需要从 Boss 名中剔除的书名号 / 引号与空白（含全角空格，`\s` 已覆盖） */
const BOSS_NAME_DECORATION_PATTERN = /[\s「」『』“”‘’"']/g

/** Boss 名归一化：去掉书名号 / 引号与空白，容忍「霸主侵蚀体·庞培」与 霸主侵蚀体·庞培 的差异 */
export function normalizeBossName(name) {
  if (typeof name !== 'string') return ''
  return name.replace(BOSS_NAME_DECORATION_PATTERN, '')
}

/** 归一化名 → 系数：构建时归一化，使带括号与不带括号的两种写法共用一条默认值 */
const ANOMALY_BAR_COEFFICIENT_BY_NORMALIZED_NAME = new Map(
  Object.entries(ANOMALY_BAR_COEFFICIENT_BY_NAME).map(([name, coefficient]) => [
    normalizeBossName(name),
    coefficient,
  ]),
)

/**
 * 异常条系数：显式值（boss_info 覆盖）> 内置默认表 > null。
 * 显式值须为有限正数；0 / 负数 / NaN / Infinity / 空一律视为「未提供」，
 * 避免脏数据把初始异常积蓄算成 0 或负数。
 * 两处都没有时返回 **null**（而非 1）：是否按 1 兜底由调用方 / 展示层决定。
 */
export function resolveAnomalyBarCoefficient(bossName, explicitValue) {
  if (typeof explicitValue === 'number' && Number.isFinite(explicitValue) && explicitValue > 0) {
    return explicitValue
  }
  return ANOMALY_BAR_COEFFICIENT_BY_NORMALIZED_NAME.get(normalizeBossName(bossName)) ?? null
}

/**
 * 属性异常口径统一（2026-10-30）的旧数据转换 —— **后端同源实现**。
 *
 * 与前端 `zzz-hp/src/utils/attributeAnomalyMigration.ts` 同一套规则（Spec §4.4.1 / §4.4.3 / §3.5）：
 * - 字段键 `anomalyDmgBonus|CritRate|CritDmg|Mult|MultFactor` → `attributeAnomaly*`；
 * - 字段名作为字符串值出现时同步换名；`panel:` / `gain:` 目标串换后缀；
 * - 子类类型值 `anomaly` → `attributeAnomaly`，只在承载类型的键下
 *   （damageTypes / scope / damageType / kind / anomalySubKind / types）；
 *   `modeType` / `damage_type`（模式大类）/ `damageKind` 保持；
 * - 工具生成行（`[关键字]` / `[关键字 N]`）的 `属性=` 槽位改名；
 * - 游戏原文、条目名、招式名、自由备注、效果 `id` 一律不动。
 *
 * 幂等：已是新格式的输入再转换结果不变。
 */

export const ATTRIBUTE_ANOMALY_FIELD_RENAMES = {
  anomalyDmgBonus: 'attributeAnomalyDmgBonus',
  anomalyCritRate: 'attributeAnomalyCritRate',
  anomalyCritDmg: 'attributeAnomalyCritDmg',
  anomalyMult: 'attributeAnomalyMult',
  anomalyMultFactor: 'attributeAnomalyMultFactor',
}

const OLD_NAMES = new Set(Object.keys(ATTRIBUTE_ANOMALY_FIELD_RENAMES))
const NEW_NAMES = new Set(Object.values(ATTRIBUTE_ANOMALY_FIELD_RENAMES))
const TYPE_KEYS = new Set(['damageTypes', 'scope', 'damageType', 'kind', 'anomalySubKind', 'types'])
/** 绝不改写：引用身份、类级语义、自由文本 */
const PROTECTED_KEYS = new Set([
  'id',
  'modeType',
  'mode_type',
  'damageKind',
  'name',
  'agentId',
  'label',
  'buff',
  'buff_name',
  'originalText',
  'rawText',
  'gameText',
])

const NOTE_RULES = [
  [/(属性=)异常增伤(?=\s|$)/g, '$1属性异常增伤'],
  [/(属性=)异常暴击率(?=\s|$)/g, '$1属性异常暴击率'],
  [/(属性=)异常暴击伤害(?=\s|$)/g, '$1属性异常暴击伤害'],
]

function hasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key)
}

export function migrateAttributeAnomalyTargetString(value) {
  const match = /^(panel|gain):(.+)$/.exec(value)
  if (!match) return value
  const renamed = ATTRIBUTE_ANOMALY_FIELD_RENAMES[match[2]]
  return renamed ? `${match[1]}:${renamed}` : value
}

export function migrateAttributeAnomalyNoteText(text) {
  if (typeof text !== 'string' || !text.includes('[关键字')) return text
  let next = text
  for (const [pattern, replacement] of NOTE_RULES) next = next.replace(pattern, replacement)
  return next
}

function migrateString(value, parentKey) {
  const direct = ATTRIBUTE_ANOMALY_FIELD_RENAMES[value]
  if (direct) return direct
  if (value.startsWith('panel:') || value.startsWith('gain:')) {
    return migrateAttributeAnomalyTargetString(value)
  }
  if (value === 'anomaly' && parentKey && TYPE_KEYS.has(parentKey)) return 'attributeAnomaly'
  if (value.includes('[关键字')) return migrateAttributeAnomalyNoteText(value)
  return value
}

function migrateNode(value, parentKey) {
  if (typeof value === 'string') return migrateString(value, parentKey)
  if (Array.isArray(value)) {
    let changed = false
    const next = value.map((item) => {
      const migrated = migrateNode(item, parentKey)
      if (migrated !== item) changed = true
      return migrated
    })
    return changed ? next : value
  }
  if (value && typeof value === 'object') {
    let changed = false
    const next = {}
    for (const [key, item] of Object.entries(value)) {
      if (PROTECTED_KEYS.has(key)) {
        next[key] = item
        continue
      }
      const renamedKey = OLD_NAMES.has(key) ? ATTRIBUTE_ANOMALY_FIELD_RENAMES[key] : key
      if (renamedKey !== key) {
        changed = true
        // 新键已存在 → 保留新键的值（旧键丢弃，不相加、不覆盖）
        if (hasOwn(value, renamedKey)) continue
      }
      const migrated = migrateNode(item, key)
      if (migrated !== item) changed = true
      next[renamedKey] = migrated
    }
    return changed ? next : value
  }
  return value
}

/** 通用深转换（返回新对象；无变化时返回入参本身） */
export function migrateAttributeAnomalyNamingDeep(value) {
  return migrateNode(value, null)
}

/** 是否存在旧名（供调用方决定是否落新值；含新名不算） */
export function hasLegacyAttributeAnomalyNaming(value) {
  const text = JSON.stringify(value ?? null)
  for (const name of OLD_NAMES) {
    if (text.includes(`"${name}"`)) return true
    if (text.includes(`panel:${name}`) || text.includes(`gain:${name}`)) return true
  }
  return /属性=异常(增伤|暴击率|暴击伤害)(\s|$)/.test(text)
}

export { NEW_NAMES }

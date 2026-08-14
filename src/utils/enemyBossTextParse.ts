import {
  createDefaultElementResistance,
  type ElementResistanceMap,
  type EnemyResistanceElement,
  ENEMY_RESISTANCE_ELEMENTS,
} from '@/utils/enemyResistance'

/** 从弱点/抗性自由文本中提取六属性（子串匹配） */
export function extractResistanceElementsFromText(
  text: string | null | undefined,
): EnemyResistanceElement[] {
  const raw = String(text ?? '').trim()
  if (!raw) return []
  const found: EnemyResistanceElement[] = []
  for (const element of ENEMY_RESISTANCE_ELEMENTS) {
    if (raw.includes(element)) found.push(element)
  }
  return found
}

/** 弱点 → -20%（weak）；抗性 → +20%（res20）；其余 normal；抗性覆盖同属性弱点 */
export function parseBossTraitToElementResistance(
  weakness: string | null | undefined,
  resistance: string | null | undefined,
): ElementResistanceMap {
  const map = createDefaultElementResistance()
  for (const element of extractResistanceElementsFromText(weakness)) {
    map[element] = 'weak'
  }
  for (const element of extractResistanceElementsFromText(resistance)) {
    map[element] = 'res20'
  }
  return map
}

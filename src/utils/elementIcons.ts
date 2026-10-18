import { RESISTANCE_VALUE_MAP } from '@/utils/enemyResistance'

/**
 * 绝区零属性图标（本地 /attribute_image/ 目录，由 nanoka CDN 下载管理）
 */
const ELEMENT_ICON_MAP: Record<string, string> = {
  冰: '/attribute_image/IconIce.webp',
  火: '/attribute_image/IconFire.webp',
  电: '/attribute_image/IconElectric.webp',
  以太: '/attribute_image/IconEther.webp',
  物理: '/attribute_image/IconPhysical.webp',
  风: '/attribute_image/IconWind.webp',
  流明: '/attribute_image/IconLumen.webp',
}

/** 弱点/抗性可选属性（与临界推演 chip 一致） */
export const TRAIT_ELEMENTS = ['冰', '火', '电', '以太', '物理', '风', '流明'] as const

export type TraitElement = (typeof TRAIT_ELEMENTS)[number]

export interface ElementIconItem {
  name: string
  icon: string
  /** 抗性百分比（20 / 40），由 RESISTANCE_VALUE_MAP 推导 */
  percent: number
}

export function normalizeTraitElementName(raw: string): string {
  return String(raw ?? '')
    .replace(/属性$/, '')
    .trim()
}

export function splitTraitElements(value: string | string[] | null | undefined): string[] {
  if (value == null) return []
  const parts = Array.isArray(value) ? value : String(value).split(/[、,\s]+/)
  const seen = new Set<string>()
  const list: string[] = []
  for (const part of parts) {
    const name = normalizeTraitElementName(part)
    if (!name || seen.has(name)) continue
    seen.add(name)
    list.push(name)
  }
  return list
}

export function joinTraitElements(list: string[]): string {
  return [...new Set(list.map(normalizeTraitElementName).filter(Boolean))].join('、')
}

export function toggleTraitElement(list: string[], el: string): string[] {
  return list.includes(el) ? list.filter((item) => item !== el) : [...list, el]
}

/**
 * 解析「冰属性、以太」这类文本 → 图标列表（去重，忽略未收录属性）
 * highValue 内的属性为高抗性档（40%），其余抗性属性为 20% 档
 */
export function parseElementIcons(
  text: string | string[] | null | undefined,
  highValue?: string | string[] | null,
): ElementIconItem[] {
  const highSet = new Set(splitTraitElements(highValue))
  const items: ElementIconItem[] = []
  const seen = new Set<string>()
  for (const name of splitTraitElements(text)) {
    if (seen.has(name)) continue
    const icon = ELEMENT_ICON_MAP[name]
    if (!icon) continue
    seen.add(name)
    const level = highSet.has(name) ? RESISTANCE_VALUE_MAP.res40 : RESISTANCE_VALUE_MAP.res20
    items.push({ name, icon, percent: level * 100 })
  }
  return items
}

/** 弱点展示口径：游戏内弱点固定 -0.2 档，页面按绝对值显示为 20% */
export function weakTraitPercent(): number {
  return Math.abs(RESISTANCE_VALUE_MAP.weak) * 100
}

/**
 * 文本形态的弱点/抗性带百分比：如「20%冰、40%火」。
 * 未收录图标属性的条目原样保留，不强行加百分比。
 */
export function formatTraitTextWithPercent(
  value: string | string[] | null | undefined,
  highValue?: string | string[] | null,
): string {
  const percentByName = new Map(parseElementIcons(value, highValue).map((item) => [item.name, item.percent]))
  return splitTraitElements(value)
    .map((name) => (percentByName.has(name) ? `${percentByName.get(name)}%${name}` : name))
    .join('、')
}

export function elementIconPath(name: string): string | null {
  return ELEMENT_ICON_MAP[name] ?? null
}

export function hasElementIcons(text: string | string[] | null | undefined): boolean {
  return parseElementIcons(text).length > 0
}

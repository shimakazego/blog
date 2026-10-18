import type { BossInfoRecord } from '@/api/bossInfo'
import type { BossOption } from '@/api/crisisAssault'

/** 怪物数据库选择卡片的展示条目：在 BossOption 之上补充 boss_info 基础库字段 */
export interface BossPickerItem {
  bossName: string
  bossImage: string | null
  defense: number | null
  level: number | null
  staggerMultiplier: number | null
  weakness: string | null
  resistance: string | null
  resistanceHigh: string | null
}

/**
 * 按精确 boss_name 把各模式的 BossOption 与 boss_info 基础库记录联表成展示条目。
 * 基础库缺失的怪物仍会出现在选择器中，只是展示字段为空。
 */
export function joinBossOptionsWithInfo(
  options: BossOption[],
  records: BossInfoRecord[],
): BossPickerItem[] {
  const recordByName = new Map(records.map((record) => [record.boss_name, record]))
  return options.map((option) => {
    const info = recordByName.get(option.boss_name) ?? null
    return {
      bossName: option.boss_name,
      bossImage: option.boss_image || info?.boss_image || null,
      defense: info?.defense ?? null,
      level: info?.level ?? null,
      staggerMultiplier: info?.stagger_multiplier ?? null,
      weakness: info?.weakness ?? null,
      resistance: info?.resistance ?? null,
      resistanceHigh: info?.resistance_high ?? null,
    }
  })
}

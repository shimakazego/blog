<script setup lang="ts">
import { computed } from 'vue'
import BuffEffectBlocksDisplay from '@/components/calculator/BuffEffectBlocksDisplay.vue'
import BuffRichText from '@/components/calculator/BuffRichText.vue'
import type { EnemySlot } from '@/types/history'
import { splitBuffLines } from '@/utils/gameData'
import { isFieldBuffChanged, type MonsterFieldBuffSnapshot } from '@/utils/historyMonsterDetail'

const props = defineProps<{
  /** 原场地 Buff（较早一期） */
  previousFieldBuff: MonsterFieldBuffSnapshot | null
  /** 现场地 Buff（当期） */
  currentFieldBuff: MonsterFieldBuffSnapshot | null
}>()

type FieldBuff = NonNullable<EnemySlot['fieldBuff']>

const changed = computed(() =>
  isFieldBuffChanged(props.previousFieldBuff?.fieldBuff ?? null, props.currentFieldBuff?.fieldBuff ?? null),
)

/** 与 HistoryDetailPanel 的原文/效果块去重口径一致：注释与原文相同时去掉注释 */
function blocksForDisplay(fieldBuff: FieldBuff | null) {
  const blocks = fieldBuff?.effectBlocks
  if (!blocks?.length) return null
  const text = fieldBuff?.text?.trim() ?? ''
  return blocks.map((block) => ({
    ...block,
    note: block.note?.trim() && block.note.trim() !== text ? block.note : '',
  }))
}

function linesFor(fieldBuff: FieldBuff | null) {
  const text = fieldBuff?.text?.trim()
  if (!text) return []
  return splitBuffLines(text)
}

function nameFor(fieldBuff: FieldBuff | null) {
  const name = fieldBuff?.name?.trim()
  if (name && name !== '场地 Buff') return name
  return '场地 Buff'
}
</script>

<template>
  <div v-if="changed" class="room-buff-transition">
    <p class="room-buff-transition-title">场地 Buff 转变</p>
    <div class="room-buff-transition-columns">
      <div class="room-buff-column">
        <p class="room-buff-column-label">
          原场地 Buff<span v-if="previousFieldBuff?.phaseLabel" class="room-buff-column-phase">
            {{ previousFieldBuff.phaseLabel }}</span>
        </p>
        <div class="room-buff-column-head">
          <div v-if="previousFieldBuff?.fieldBuff?.imageUrl" class="room-buff-image">
            <img
              :src="previousFieldBuff.fieldBuff.imageUrl"
              :alt="previousFieldBuff.fieldBuff.name"
              loading="lazy"
            />
          </div>
          <span class="room-buff-name">{{ nameFor(previousFieldBuff?.fieldBuff ?? null) }}</span>
        </div>
        <ul v-if="linesFor(previousFieldBuff?.fieldBuff ?? null).length" class="room-buff-lines">
          <li v-for="(line, lineIndex) in linesFor(previousFieldBuff?.fieldBuff ?? null)" :key="lineIndex">
            <BuffRichText :text="line" />
          </li>
        </ul>
        <BuffEffectBlocksDisplay
          v-if="blocksForDisplay(previousFieldBuff?.fieldBuff ?? null)?.length"
          compact
          :blocks="blocksForDisplay(previousFieldBuff?.fieldBuff ?? null)"
          :title="nameFor(previousFieldBuff?.fieldBuff ?? null)"
          empty-text="暂无场地 Buff 效果块"
        />
      </div>
      <div class="room-buff-column">
        <p class="room-buff-column-label">
          现场地 Buff<span v-if="currentFieldBuff?.phaseLabel" class="room-buff-column-phase">
            {{ currentFieldBuff.phaseLabel }}</span>
        </p>
        <div class="room-buff-column-head">
          <div v-if="currentFieldBuff?.fieldBuff?.imageUrl" class="room-buff-image">
            <img
              :src="currentFieldBuff.fieldBuff.imageUrl"
              :alt="currentFieldBuff.fieldBuff.name"
              loading="lazy"
            />
          </div>
          <span class="room-buff-name">{{ nameFor(currentFieldBuff?.fieldBuff ?? null) }}</span>
        </div>
        <ul v-if="linesFor(currentFieldBuff?.fieldBuff ?? null).length" class="room-buff-lines">
          <li v-for="(line, lineIndex) in linesFor(currentFieldBuff?.fieldBuff ?? null)" :key="lineIndex">
            <BuffRichText :text="line" />
          </li>
        </ul>
        <BuffEffectBlocksDisplay
          v-if="blocksForDisplay(currentFieldBuff?.fieldBuff ?? null)?.length"
          compact
          :blocks="blocksForDisplay(currentFieldBuff?.fieldBuff ?? null)"
          :title="nameFor(currentFieldBuff?.fieldBuff ?? null)"
          empty-text="暂无场地 Buff 效果块"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.room-buff-transition {
  padding: 0.55rem 0.65rem;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--color-border) 75%, transparent);
  border-left: 3px solid color-mix(in srgb, #e8a838 75%, transparent);
  background: color-mix(in srgb, var(--color-background-soft) 75%, transparent);
}

.room-buff-transition-title {
  margin: 0 0 0.4rem;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-heading);
}

.room-buff-transition-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

.room-buff-column {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0 0.75rem;
}

.room-buff-column + .room-buff-column {
  border-left: 1px solid var(--color-border);
}

.room-buff-column:first-child {
  padding-left: 0;
}

.room-buff-column:last-child {
  padding-right: 0;
}

.room-buff-column-label {
  margin: 0;
  font-size: 0.72rem;
  font-weight: 700;
  color: #e85d4c;
}

.room-buff-column-phase {
  margin-left: 0.3rem;
  font-weight: 600;
  opacity: 0.72;
  color: var(--color-heading);
}

.room-buff-column-head {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.room-buff-image {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
}

.room-buff-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.room-buff-name {
  min-width: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-heading);
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.room-buff-lines {
  margin: 0;
  padding-left: 1rem;
  font-size: 0.72rem;
  line-height: 1.45;
  opacity: 0.88;
}

.room-buff-transition :deep(.effect-blocks-display) {
  width: 100%;
  margin-top: 0.1rem;
  padding-top: 0.3rem;
  border-top: 1px dashed color-mix(in srgb, var(--color-border) 65%, transparent);
}

@media (max-width: 768px) {
  .room-buff-transition-columns {
    grid-template-columns: 1fr;
  }

  .room-buff-column + .room-buff-column {
    border-left: none;
    border-top: 1px solid var(--color-border);
    padding: 0.45rem 0 0;
  }

  .room-buff-column {
    padding: 0;
  }
}
</style>

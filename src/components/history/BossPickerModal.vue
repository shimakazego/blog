<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { BossPickerItem } from '@/utils/bossPickerItems'
import { formatTraitTextWithPercent } from '@/utils/elementIcons'
import { resolveAssetUrl } from '@/utils/gameData'

const props = defineProps<{
  open: boolean
  items: BossPickerItem[]
  /** 弹窗标题随模式变化：选择 Boss / 选择精英 / 选择绝境 Boss… */
  title: string
  /** 当前已选怪物名，用于在网格中高亮；仅在用户点选后才变更 */
  selectedName?: string
}>()

const emit = defineEmits<{
  close: []
  select: [bossName: string]
}>()

const keyword = ref('')
const brokenImageNames = ref(new Set<string>())

const filteredItems = computed(() => {
  const text = keyword.value.trim()
  if (!text) return props.items
  return props.items.filter((item) => item.bossName.includes(text))
})

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    keyword.value = ''
    brokenImageNames.value = new Set()
  },
)

function markImageBroken(bossName: string) {
  brokenImageNames.value = new Set([...brokenImageNames.value, bossName])
}

function pick(item: BossPickerItem) {
  emit('select', item.bossName)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="boss-picker-overlay" role="presentation" @click.self="emit('close')">
      <div class="history-boss-picker" role="dialog" aria-modal="true" :aria-label="title">
        <header class="boss-picker-header">
          <div>
            <h3>{{ title }}</h3>
            <p>点击卡片完成选择，取消则直接关闭。</p>
          </div>
          <button type="button" class="close-btn" aria-label="关闭" @click="emit('close')">×</button>
        </header>

        <div class="boss-picker-body">
          <input v-model="keyword" type="search" class="search-input" placeholder="搜索怪物名称…" />

          <p v-if="!filteredItems.length" class="status-text">未找到匹配怪物</p>

          <div v-else class="boss-grid">
            <button
              v-for="item in filteredItems"
              :key="item.bossName"
              type="button"
              class="boss-card"
              :class="{ 'boss-card--selected': item.bossName === selectedName }"
              @click="pick(item)"
            >
              <img
                v-if="item.bossImage && !brokenImageNames.has(item.bossName)"
                class="boss-thumb"
                :src="resolveAssetUrl(item.bossImage)"
                :alt="item.bossName"
                loading="lazy"
                @error="markImageBroken(item.bossName)"
              />
              <span v-else class="boss-thumb boss-thumb--placeholder">无图</span>
              <span class="boss-name">{{ item.bossName }}</span>
              <span v-if="item.defense != null" class="boss-meta">
                防御 {{ item.defense }} · 失衡 {{ item.staggerMultiplier ?? 1.5 }}
              </span>
              <span class="boss-trait weak">
                弱 {{ formatTraitTextWithPercent(item.weakness) || '无' }}
              </span>
              <span class="boss-trait res">
                抗 {{ formatTraitTextWithPercent(item.resistance, item.resistanceHigh) || '无' }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.boss-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 1500;
  background: rgba(0, 0, 0, 0.58);
  display: grid;
  place-items: center;
  padding: 1rem;
}

/* 根类名不能改回 .boss-picker-modal：calculatorLight.css 里有一批挂在
   `[data-theme='light'] .boss-picker-modal …` 下的 !important 规则（计算器那个
   同名弹窗的白天配色），一旦同名就会在白天主题下接管本弹窗（且只在访问过
   计算器页面后才生效）。差异化的根类名把这条链切断。 */
.history-boss-picker {
  width: min(720px, 100%);
  max-height: min(88vh, 820px);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-background);
  box-shadow: 0 20px 56px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

.boss-picker-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.9rem 1rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.boss-picker-header h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
  color: var(--color-heading);
}

.boss-picker-header p {
  margin: 0;
  font-size: 0.78rem;
  color: var(--color-text);
}

.close-btn {
  border: none;
  background: transparent;
  color: var(--color-heading);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.8;
}

.close-btn:hover {
  opacity: 1;
}

.boss-picker-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0.75rem 1rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-background-soft);
  color: var(--color-text);
}

.boss-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 0.55rem;
}

.boss-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.65rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background-soft);
  cursor: pointer;
  text-align: center;
  transition:
    border-color 0.18s,
    background-color 0.18s;
}

.boss-card:hover {
  border-color: var(--color-border-hover);
  background: var(--color-background-mute);
}

/* 选中态沿用站点金色强调：与主题底色混出一层薄底，浅色/深色主题都不刺眼 */
.boss-card--selected {
  border-color: #c9a55c;
  background: color-mix(in srgb, #c9a55c 14%, var(--color-background-soft));
}

.boss-thumb {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  object-fit: cover;
  background: var(--color-background-mute);
}

.boss-thumb--placeholder {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  color: var(--color-text);
  opacity: 0.6;
}

.boss-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-heading);
  line-height: 1.25;
}

.boss-meta {
  font-size: 0.72rem;
  color: var(--color-text);
}

.boss-trait {
  font-size: 0.68rem;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 弱/抗的语义色：与主题文字色混色，浅色底上偏深、深色底上偏亮，两种主题都留得住对比度 */
.boss-trait.weak {
  color: color-mix(in srgb, #2f8fd8 60%, var(--color-heading));
  background: color-mix(in srgb, #2f8fd8 14%, transparent);
}

.boss-trait.res {
  color: color-mix(in srgb, #d9663f 60%, var(--color-heading));
  background: color-mix(in srgb, #d9663f 14%, transparent);
}

.status-text {
  margin: 0;
  font-size: 0.82rem;
  color: var(--color-text);
}
</style>

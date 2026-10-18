<script setup lang="ts">
import { computed } from 'vue'
import { parseElementIcons, weakTraitPercent } from '@/utils/elementIcons'

const props = withDefaults(
  defineProps<{
    value?: string | string[] | null
    /** 前缀文案：弱 / 抗 / 弱点 */
    label?: string
    variant?: 'weak' | 'resist'
    /** 是否显示属性文字（图标旁） */
    showName?: boolean
    /** 抗性 40% 档属性（resistance 的子集，仅抗性口径有意义） */
    highValue?: string | string[] | null
    /** 是否在图标旁显示百分比（如 20%冰）；缺省时保持旧渲染不变 */
    showPercent?: boolean
    /** 没有可识别属性时显示的占位文案（如「无」）；缺省不渲染，保持旧调用方行为 */
    emptyText?: string | null
  }>(),
  {
    value: '',
    label: '',
    variant: 'weak',
    showName: true,
    highValue: null,
    showPercent: false,
    emptyText: null,
  },
)

const items = computed(() =>
  parseElementIcons(
    props.value,
    props.showPercent && props.variant === 'resist' ? props.highValue : null,
  ),
)

/** 弱点固定 -20% 档，按用户口径展示为 20% */
const weakPercent = weakTraitPercent()

const showPercentValue = computed(() => props.showPercent && items.value.length > 0)
</script>

<template>
  <span v-if="items.length" class="trait-icons" :class="`trait-icons--${variant}`">
    <span v-if="label" class="trait-icons-label">{{ label }}</span>
    <span v-for="elem in items" :key="elem.name" class="trait-icons-item">
      <img class="trait-icons-img" :src="elem.icon" :alt="elem.name" :title="elem.name" loading="lazy" />
      <span v-if="showPercentValue" class="trait-icons-percent">
        {{ variant === 'weak' ? weakPercent : elem.percent }}%
      </span>
      <span v-if="showName" class="trait-icons-name">{{ elem.name }}</span>
    </span>
  </span>
  <span
    v-else-if="emptyText != null"
    class="trait-icons trait-icons--empty"
    :class="`trait-icons--${variant}`"
  >
    <span v-if="label" class="trait-icons-label">{{ label }}</span>
    <span class="trait-icons-empty">{{ emptyText }}</span>
  </span>
</template>

<style scoped>
.trait-icons {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.2rem 0.35rem;
  font-size: inherit;
  line-height: 1.35;
}

.trait-icons-label {
  font-weight: 650;
  margin-right: 0.1rem;
  color: inherit;
}

.trait-icons-item {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}

.trait-icons-img {
  width: 1.05em;
  height: 1.05em;
  border-radius: 2px;
  object-fit: contain;
}

.trait-icons-name {
  font-size: 0.92em;
  color: inherit;
}

.trait-icons-percent {
  font-size: 0.92em;
  font-weight: 650;
  opacity: 0.78;
  color: inherit;
  font-variant-numeric: tabular-nums;
}

/* 没有可识别属性时的占位（如「无」）：与真实属性拉开权重 */
.trait-icons-empty {
  font-size: 0.92em;
  opacity: 0.55;
  color: inherit;
}
</style>

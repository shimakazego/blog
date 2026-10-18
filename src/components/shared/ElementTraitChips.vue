<script setup lang="ts">
import { computed } from 'vue'
import {
  TRAIT_ELEMENTS,
  joinTraitElements,
  splitTraitElements,
  toggleTraitElement,
} from '@/utils/elementIcons'

const model = defineModel<string>({ default: '' })
/** 高抗性（40%）子集；仅 allowHigh 时使用，必须始终是 model 的子集 */
const highModel = defineModel<string>('high', { default: '' })

const props = withDefaults(
  defineProps<{
    label?: string
    variant?: 'weak' | 'resist'
    disabled?: boolean
    /** stack：标签在上；inline：标签与芯片横排（临界编辑用） */
    layout?: 'stack' | 'inline'
    /** 是否提供「高抗性（40%）」二级选择（默认关闭，保持既有调用方行为） */
    allowHigh?: boolean
  }>(),
  {
    label: '',
    variant: 'weak',
    disabled: false,
    layout: 'stack',
    allowHigh: false,
  },
)

const selected = computed(() => splitTraitElements(model.value))
// 只认 value 里的元素，保证 high ⊆ value（历史数据里若有越权项，一次点击即可自然剔除）
const highSelected = computed(() =>
  splitTraitElements(highModel.value).filter((el) => selected.value.includes(el)),
)

function onToggle(el: string) {
  const next = toggleTraitElement(selected.value, el)
  model.value = joinTraitElements(next)
  // 取消主行选中即同时退出高抗性，保证 high ⊆ value
  if (props.allowHigh && !next.includes(el)) {
    highModel.value = joinTraitElements(highSelected.value.filter((item) => item !== el))
  }
}

function onToggleHigh(el: string) {
  highModel.value = joinTraitElements(toggleTraitElement(highSelected.value, el))
}
</script>

<template>
  <div
    class="trait-chips"
    :class="{
      'is-disabled': disabled,
      'trait-chips--inline': layout === 'inline',
    }"
  >
    <span v-if="label" class="trait-chips-label">{{ label }}</span>
    <div class="trait-chips-list">
      <button
        v-for="el in TRAIT_ELEMENTS"
        :key="el"
        type="button"
        class="trait-chip"
        :class="{
          'trait-chip--on': selected.includes(el),
          'trait-chip--resist': variant === 'resist',
        }"
        :disabled="disabled"
        @click="onToggle(el)"
      >
        {{ el }}
      </button>
    </div>
    <div v-if="allowHigh && selected.length" class="trait-chips-high">
      <span class="trait-chips-label trait-chips-label--sub">高抗性（40%）</span>
      <div class="trait-chips-list">
        <button
          v-for="el in selected"
          :key="`high-${el}`"
          type="button"
          class="trait-chip"
          :class="{
            'trait-chip--on': highSelected.includes(el),
            'trait-chip--resist': variant === 'resist',
          }"
          :disabled="disabled"
          @click="onToggleHigh(el)"
        >
          {{ el }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trait-chips {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.trait-chips--inline {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem 0.45rem;
}

.trait-chips-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-heading, inherit);
  opacity: 0.85;
}

.trait-chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.28rem;
}

.trait-chips-high {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}

.trait-chips-label--sub {
  font-size: 0.72rem;
  opacity: 0.7;
}

.trait-chip {
  padding: 0.16rem 0.42rem;
  border: 1px solid var(--color-border, #3a4250);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text, #c8cdd5);
  font: inherit;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  opacity: 0.65;
}

.trait-chip:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.trait-chip--on {
  background: color-mix(in srgb, var(--color-heading, #c9a55c) 18%, transparent);
  border-color: color-mix(in srgb, var(--color-heading, #c9a55c) 55%, var(--color-border, #3a4250));
  color: var(--color-heading, #c9a55c);
  opacity: 1;
}

.trait-chips.is-disabled {
  opacity: 0.7;
  pointer-events: none;
}
</style>

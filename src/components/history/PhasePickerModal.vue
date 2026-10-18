<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

/** 选期卡片的最小数据结构：往期详细直接传 PhaseData，对比面板用图表点适配 */
export interface PhasePickerItem {
  id: string
  version: string
  phase: string
  dateRange: string
  /** 线程 ID；缺失时不显示 ID 行（对比面板的图表点没有 tid） */
  tid?: string
  isHidden?: boolean
  pendingCleanup?: boolean
}

const props = withDefaults(
  defineProps<{
    visible: boolean
    phases: PhasePickerItem[]
    title?: string
    /** 多选（对比面板）：点卡片切换勾选，弹窗不关；单选（往期详细）：点卡片直接 select */
    multiple?: boolean
  }>(),
  { title: '', multiple: false },
)

/** 单选 = 当前选中下标；多选 = 已勾选下标集合 */
const modelValue = defineModel<number | number[] | null>('modelValue')

const emit = defineEmits<{
  select: [index: number]
  close: []
}>()

const pickerScrollRef = ref<HTMLElement | null>(null)
const isPickerDragging = ref(false)
const pickerDragMoved = ref(false)
const pickerDragStartY = ref(0)
const pickerDragScrollTop = ref(0)

function isCardActive(index: number) {
  const value = modelValue.value
  if (Array.isArray(value)) return value.includes(index)
  return value === index
}

/** 点卡片：多选切换勾选；单选交给父组件（选中后由父组件关闭弹窗） */
function activateCard(index: number) {
  if (props.multiple) {
    const current = Array.isArray(modelValue.value) ? modelValue.value : []
    modelValue.value = current.includes(index)
      ? current.filter((item) => item !== index)
      : [...current, index]
    return
  }
  emit('select', index)
}

function onPickerPointerDown(event: PointerEvent) {
  if (!pickerScrollRef.value || event.button !== 0) return
  isPickerDragging.value = true
  pickerDragMoved.value = false
  pickerDragStartY.value = event.clientY
  pickerDragScrollTop.value = pickerScrollRef.value.scrollTop
}

function onPickerPointerMove(event: PointerEvent) {
  if (!isPickerDragging.value || !pickerScrollRef.value) return
  const deltaY = event.clientY - pickerDragStartY.value
  if (Math.abs(deltaY) <= 4) return

  if (!pickerDragMoved.value) {
    pickerDragMoved.value = true
    pickerScrollRef.value.setPointerCapture(event.pointerId)
  }
  pickerScrollRef.value.scrollTop = pickerDragScrollTop.value - deltaY
}

function onPickerPointerUp(event: PointerEvent) {
  if (!pickerScrollRef.value) return

  const wasDrag = pickerDragMoved.value

  isPickerDragging.value = false
  if (pickerScrollRef.value.hasPointerCapture(event.pointerId)) {
    pickerScrollRef.value.releasePointerCapture(event.pointerId)
  }

  if (!wasDrag) {
    const card = (event.target as HTMLElement).closest('.phase-card') as HTMLElement | null
    if (card) {
      const index = Number(card.dataset.index)
      if (!Number.isNaN(index)) activateCard(index)
    }
  }

  pickerDragMoved.value = false
}

function onPickerWheel(event: WheelEvent) {
  if (!pickerScrollRef.value) return
  event.preventDefault()
  pickerScrollRef.value.scrollTop += event.deltaY
}

function onDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      document.addEventListener('keydown', onDocumentKeydown)
    } else {
      document.removeEventListener('keydown', onDocumentKeydown)
    }
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDocumentKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="phase-modal-overlay" @click.self="emit('close')">
      <div class="phase-modal">
        <button type="button" class="phase-modal-close" aria-label="关闭" @click="emit('close')">
          ×
        </button>
        <h2 class="phase-modal-title">{{ title }}</h2>
        <div
          ref="pickerScrollRef"
          class="phase-grid-scroll"
          :class="{ 'is-dragging': isPickerDragging }"
          @pointerdown="onPickerPointerDown"
          @pointermove="onPickerPointerMove"
          @pointerup="onPickerPointerUp"
          @pointercancel="onPickerPointerUp"
          @wheel="onPickerWheel"
        >
          <div class="phase-grid">
            <button
              v-for="(phase, index) in phases"
              :key="phase.id"
              type="button"
              class="phase-card"
              :class="{
                active: isCardActive(index),
                'phase-card--hidden': phase.isHidden,
                'phase-card--trash': phase.pendingCleanup,
              }"
              :data-index="index"
            >
              <span class="phase-card-version">
                {{ phase.version }} {{ phase.phase }}
                <span v-if="phase.pendingCleanup" class="phase-trash-badge">已删除未清理</span>
                <span v-else-if="phase.isHidden" class="phase-hidden-badge">未公开</span>
              </span>
              <span class="phase-card-date">{{ phase.dateRange }}</span>
              <span v-if="phase.tid" class="phase-card-id">ID: {{ phase.tid }}</span>
            </button>
          </div>
        </div>
        <p class="phase-picker-hint">拖拽或滚轮上下浏览</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.phase-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(4px);
}

.phase-modal {
  position: relative;
  display: flex;
  flex-direction: column;
  width: min(1120px, 96vw);
  max-height: min(90vh, 860px);
  padding: 2.75rem 1.75rem 1.25rem;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  background: var(--color-background);
  overflow: hidden;
}

.phase-grid-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  cursor: grab;
  touch-action: pan-y;
  scrollbar-width: none;
  padding-right: 0.15rem;
}

.phase-grid-scroll::-webkit-scrollbar {
  display: none;
}

.phase-grid-scroll.is-dragging {
  cursor: grabbing;
  user-select: none;
}

.phase-picker-hint {
  flex-shrink: 0;
  margin: 0.75rem 0 0;
  text-align: center;
  font-size: 0.74rem;
  color: var(--color-text);
  opacity: 0.55;
}

.phase-modal-close {
  position: absolute;
  top: 0.85rem;
  left: 0.85rem;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-heading);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.phase-modal-close:hover {
  background: var(--color-background-mute);
}

.phase-modal-title {
  margin: 0 0 1.35rem;
  text-align: center;
  font-size: clamp(1.55rem, 3.2vw, 2rem);
  font-weight: 700;
  color: var(--color-heading);
  letter-spacing: 0.04em;
}

.phase-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0.85rem;
}

.phase-card {
  min-height: 102px;
  padding: 0.85rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background-soft);
  color: var(--color-heading);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  text-align: center;
  transition:
    border-color 0.2s,
    background-color 0.2s;
}

.phase-card:hover,
.phase-card.active {
  border-color: #e8a838;
  background: var(--color-background-mute);
}

.phase-card--hidden {
  border-style: dashed;
  border-color: color-mix(in srgb, #f5c451 55%, var(--color-border));
}

.phase-card--trash {
  border-style: dashed;
  border-color: color-mix(in srgb, #e85d4c 55%, var(--color-border));
  opacity: 0.92;
}

.phase-card-version {
  font-size: 0.98rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.phase-card-date,
.phase-card-id {
  font-size: 0.74rem;
  opacity: 0.72;
  line-height: 1.35;
}

/* 往期详细的 PhaseData 自带这两枚徽标；对比面板的图表点没有对应字段 */
.phase-hidden-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.08rem 0.4rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #f5c451;
  background: color-mix(in srgb, #f5c451 18%, transparent);
  border: 1px solid color-mix(in srgb, #f5c451 45%, transparent);
}

.phase-trash-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.08rem 0.4rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: #e85d4c;
  background: color-mix(in srgb, #e85d4c 18%, transparent);
  border: 1px solid color-mix(in srgb, #e85d4c 45%, transparent);
}

@media (max-width: 768px) {
  .phase-modal {
    width: min(100vw - 1rem, 1120px);
    max-height: min(88dvh, 860px);
    padding: 2.1rem 0.85rem 0.85rem;
  }

  .phase-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.45rem;
  }

  .phase-card {
    padding: 0.55rem 0.4rem;
  }

  .phase-card-version {
    font-size: 0.82rem;
  }

  .phase-card-date,
  .phase-card-id {
    font-size: 0.66rem;
  }
}
</style>

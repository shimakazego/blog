<script setup lang="ts">
withDefaults(
  defineProps<{
    name: string
    mult?: string
    count?: number | null
    stagger?: boolean
    dtype?: string
    dtypeKind?: 'direct' | 'anomaly'
    stypes?: string[]
    agentPair?: string
    agentTitle?: string
    /** 行尾红色提醒（如乱流/耀变触发者不合规），不占倍率格 */
    warn?: string | null
    damage?: string
    skip?: boolean
    index?: number
    rowDraggable?: boolean
    dragging?: boolean
    agentsClickable?: boolean
  }>(),
  {
    agentsClickable: true,
  },
)

const emit = defineEmits<{
  'select-agents': []
  'update:count': [value: number]
  'update:stagger': [value: boolean]
}>()

function emitCount(event: Event) {
  const n = Math.floor(Number((event.target as HTMLInputElement).value))
  if (!Number.isFinite(n)) return
  emit('update:count', Math.max(0, n))
}
</script>

<template>
  <li
    class="sf-card"
    :class="{
      'sf-card--skip': skip,
      'sf-card--draggable': rowDraggable,
      'sf-card--dragging': dragging,
    }"
    :draggable="rowDraggable"
  >
    <div class="sf-lead">
      <span v-if="index != null" class="sf-index">{{ index }}</span>
      <strong class="sf-name" :title="name">{{ name }}</strong>
      <span v-if="mult" class="sf-mult-label">倍率</span>
      <span v-if="mult" class="sf-mult" :title="mult">{{ mult }}</span>
      <template v-if="count != null">
        <span class="sf-mult-label">次数</span>
        <input
          class="sf-count"
          type="number"
          min="0"
          step="1"
          :value="count"
          draggable="false"
          @click.stop
          @input="emitCount"
        />
        <label class="sf-stagger" draggable="false" @click.stop>
          <input
            type="checkbox"
            :checked="stagger"
            @change="emit('update:stagger', ($event.target as HTMLInputElement).checked)"
          />
          失衡
        </label>
      </template>
      <span v-if="dtype" class="sf-dtype" :class="dtypeKind === 'direct' ? 'is-direct' : 'is-anomaly'">
        {{ dtype }}
      </span>
      <span v-if="stypes?.length" class="sf-stypes">
        <span v-for="item in stypes" :key="item" class="sf-stype">{{ item }}</span>
      </span>
      <button
        v-if="agentPair && agentsClickable"
        type="button"
        class="sf-agents"
        :title="agentTitle || agentPair"
        draggable="false"
        @click.stop="emit('select-agents')"
      >
        {{ agentPair }}
      </button>
      <span
        v-else-if="agentPair"
        class="sf-agents is-static"
        :title="agentTitle || agentPair"
      >
        {{ agentPair }}
      </span>
      <span v-if="warn" class="sf-warn" :title="warn">{{ warn }}</span>
    </div>
    <span v-if="damage" class="sf-damage">{{ damage }}</span>
    <div class="sf-card-actions">
      <slot name="actions" />
    </div>
  </li>
</template>

<style scoped>
.sf-card {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  height: 2.15rem;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.45rem;
  border: 1px solid #2a3038;
  border-radius: 6px;
  background: #141820;
}
.sf-card--draggable {
  cursor: grab;
}
.sf-card--dragging {
  opacity: 0.35;
  cursor: grabbing;
}
.sf-lead {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
}
.sf-warn {
  flex: 1 1 4rem;
  min-width: 0;
  max-width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.68rem;
  font-weight: 600;
  color: #e07070;
  line-height: 1.2;
}
.sf-damage {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 6.5rem;
  text-align: right;
  font-size: 0.82rem;
  font-weight: 800;
  color: #c4a0e8;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sf-card-actions {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 0.25rem;
  flex: 0 0 auto;
  flex-shrink: 0;
  margin-left: auto;
  position: relative;
  z-index: 2;
}
.sf-index {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.1rem;
  height: 1.1rem;
  border-radius: 999px;
  background: rgba(201, 165, 92, 0.16);
  color: #f0d7a2;
  font-size: 0.68rem;
  font-weight: 700;
}
.sf-name {
  box-sizing: border-box;
  flex: 1 1 4rem;
  width: auto;
  min-width: 2.5rem;
  max-width: 7rem;
  padding: 0.08rem 0.4rem;
  border: 1px solid #2d323a;
  border-radius: 4px;
  background: #0f1217;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
  font-size: 0.8rem;
  color: #e8edf5;
  font-weight: 600;
}
.sf-mult-label {
  flex: 0 0 auto;
  font-size: 0.68rem;
  color: #9aa3b0;
  font-weight: 600;
}
.sf-mult,
.sf-count {
  flex: 0 0 auto;
  padding: 0.08rem 0.28rem;
  border: 1px solid #2d323a;
  border-radius: 4px;
  background: #0f1217;
  color: #e8edf5;
  font-size: 0.76rem;
  font-weight: 700;
  text-align: left;
  font-variant-numeric: tabular-nums;
}
.sf-mult {
  box-sizing: content-box;
  width: 5.2ch;
  min-width: 5.2ch;
  max-width: 5.2ch;
  overflow: hidden;
  white-space: nowrap;
}
.sf-count {
  width: 3rem;
  height: 1.35rem;
  box-sizing: border-box;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 700;
}
.sf-stagger {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.72rem;
  color: #9aa3b0;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}
.sf-stagger input {
  margin: 0;
  accent-color: #c9a55c;
}
.sf-dtype,
.sf-stype,
.sf-agents {
  box-sizing: border-box;
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  height: 1.25rem;
  padding: 0 0.42rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}
.sf-dtype.is-anomaly {
  background: #1a2a38;
  border: 1px solid #3a6a88;
  color: #8ec8e8;
}
.sf-dtype.is-direct {
  background: rgba(201, 165, 92, 0.14);
  border: 1px solid #8a6a1f;
  color: #f0d7a2;
}
.sf-stypes {
  display: flex;
  flex: 0 1 auto;
  gap: 0.2rem;
  min-width: 0;
  overflow: hidden;
}
.sf-stype {
  background: #15241f;
  border: 1px solid #2f5c52;
  color: #8fd4c4;
}
.sf-agents {
  appearance: none;
  -webkit-appearance: none;
  margin: 0;
  background: #241833;
  border: 1px solid #6b4ea0;
  color: #d4b8f0;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
}
.sf-agents:hover {
  filter: brightness(1.08);
}
.sf-agents.is-static {
  cursor: default;
}
.sf-agents.is-static:hover {
  filter: none;
}
.sf-card-actions > :deep(*) {
  flex: 0 0 auto;
}
</style>

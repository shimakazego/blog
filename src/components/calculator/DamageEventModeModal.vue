<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import DamageEventEditor from '@/components/calculator/DamageEventEditor.vue'
import type {
  DamageEvent,
  DamageEventMode,
  DamageEventModeType,
  SkillSubcategory,
} from '@/types/calculator'
import { TRIGGER_AGENT_AT_CALC } from '@/types/calculator'
import {
  createEmptyDamageEvent,
  DAMAGE_EVENT_KIND_OPTIONS,
  formatDamageEventDisplayName,
} from '@/utils/damageEvent'
import {
  createCustomModeId,
  loadCustomModes,
  removeCustomMode,
  upsertCustomMode,
} from '@/utils/customDamageEventModes'
import { buildDamageModeTeamKey, resolveEventOwnerAgentId } from '@/utils/damageEventOwner'

const props = withDefaults(
  defineProps<{
    agentId?: string
    agentName?: string
    presetModes?: DamageEventMode[]
    skillSubcategories: SkillSubcategory[]
    modeType?: DamageEventModeType
    triggerAgentOptions?: { id: string; name: string }[]
    mainAgentId?: string
    ownerAgentOptions?: { id: string; name: string; element?: string }[]
    teamHasRemiel?: boolean
    resolveMultDefaults?: (
      event: DamageEvent,
    ) => Partial<Record<keyof import('@/types/calculator').DamageEventMultOverrides, number>>
    turbulenceCalculable?: boolean
    mainAgentElement?: string | null
  }>(),
  { modeType: 'direct' },
)

const open = defineModel<boolean>('open', { default: false })
const events = defineModel<DamageEvent[]>('events', { default: () => [] })
const modeId = defineModel<string | null>('modeId', { default: null })
const modeName = defineModel<string>('modeName', { default: '' })

const draftName = ref('')
const message = ref('')
const customModes = ref<DamageEventMode[]>(loadCustomModes())
const modeSearchQuery = ref('')

const isPresetMode = computed(() => {
  if (!modeId.value) return false
  if (modeId.value.startsWith('custom-') || modeId.value === 'custom') return false
  return (props.presetModes ?? []).some((item) => item.id === modeId.value)
})

const isCustomMode = computed(() => !isPresetMode.value && Boolean(modeId.value))

const agentPresets = computed(() =>
  (props.presetModes ?? []).filter((item) => {
    const typeOk = (item.modeType ?? 'direct') === props.modeType
    const agentOk = !item.agentId || !props.agentId || item.agentId === props.agentId
    return typeOk && agentOk
  }),
)

const mainAgentIdRef = computed(() => props.mainAgentId ?? props.agentId ?? '')

const agentCustoms = computed(() =>
  customModes.value.filter((item) => {
    if (item.modeType !== props.modeType) return false
    // 按主 C / 绑定角色展示；不再用当前事件 teamKey 硬过滤，
    // 否则改产生者后其它自定义模式会从侧栏消失。
    return !item.agentId || !props.agentId || item.agentId === props.agentId
  }),
)

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '')
}

function stripAgentLabelNoise(name: string): string {
  return name
    .replace(/（未上阵）/g, '')
    .replace(/（其他角色）/g, '')
    .trim()
}

function agentLabel(agentId: string | null | undefined): string {
  if (!agentId || agentId === TRIGGER_AGENT_AT_CALC) {
    return agentId === TRIGGER_AGENT_AT_CALC ? '计算时选择' : ''
  }
  const raw =
    props.triggerAgentOptions?.find((item) => item.id === agentId)?.name ??
    props.ownerAgentOptions?.find((item) => item.id === agentId)?.name ??
    agentId
  const cleaned = stripAgentLabelNoise(raw)
  const base = cleaned.includes('·') ? cleaned.split('·')[0]!.trim() : cleaned
  return base || cleaned
}

function modeSearchBlob(mode: DamageEventMode): string {
  const mainId = mainAgentIdRef.value
  const parts: string[] = [mode.name, mode.modeType === 'anomaly' ? '异常' : '直伤']
  for (const event of mode.events ?? []) {
    const ownerId = resolveEventOwnerAgentId(event, mainId)
    const ownerName = agentLabel(ownerId)
    const triggerName = agentLabel(event.triggerAgentId)
    const kind =
      DAMAGE_EVENT_KIND_OPTIONS.find((item) => item.id === event.kind)?.label ?? event.kind
    const display = formatDamageEventDisplayName(
      event,
      (id) =>
        id ? props.skillSubcategories.find((item) => item.id === id) ?? null : null,
      ownerName || undefined,
    )
    parts.push(kind, display, ownerName, triggerName)
  }
  return normalizeSearchText(parts.filter(Boolean).join(' '))
}

function modeMatchesQuery(mode: DamageEventMode, query: string): boolean {
  if (!query) return true
  return modeSearchBlob(mode).includes(query)
}

const filteredAgentPresets = computed(() => {
  const query = normalizeSearchText(modeSearchQuery.value)
  return agentPresets.value.filter((mode) => modeMatchesQuery(mode, query))
})

const filteredAgentCustoms = computed(() => {
  const query = normalizeSearchText(modeSearchQuery.value)
  return agentCustoms.value.filter((mode) => modeMatchesQuery(mode, query))
})

const hasModeSearchHits = computed(
  () => filteredAgentPresets.value.length > 0 || filteredAgentCustoms.value.length > 0,
)

watch(open, (isOpen) => {
  if (isOpen) {
    draftName.value = modeName.value || ''
    message.value = ''
    modeSearchQuery.value = ''
    customModes.value = loadCustomModes()
    // 管理员预设：每次打开重置为默认，会话内改动不持久化
    if (isPresetMode.value && modeId.value) {
      const preset = (props.presetModes ?? []).find((item) => item.id === modeId.value)
      if (preset) {
        events.value = cloneEventsForCalc(preset.events)
        modeName.value = preset.name
        draftName.value = preset.name
      }
    }
  }
})

watch(
  events,
  () => {
    if (!isCustomMode.value || !modeId.value || modeId.value === 'custom') return
    persistCurrentCustom()
  },
  { deep: true },
)

function close() {
  open.value = false
}

function cloneEventsForCalc(source: DamageEvent[]): DamageEvent[] {
  return source.map((event, index) => ({
    ...event,
    multOverrides: event.multOverrides ? { ...event.multOverrides } : null,
    // 管理端「计算时选择」载入计算页后改为待选
    triggerAgentId:
      event.triggerAgentId === TRIGGER_AGENT_AT_CALC ? null : (event.triggerAgentId ?? null),
    id: event.id?.startsWith('evt-')
      ? `evt-copy-${Date.now().toString(36)}-${index}`
      : `evt-copy-${Date.now().toString(36)}-${index}`,
  }))
}

function selectPreset(mode: DamageEventMode) {
  modeId.value = mode.id
  modeName.value = mode.name
  draftName.value = mode.name
  events.value = cloneEventsForCalc(mode.events)
  message.value = `已载入预设「${mode.name}」（可编辑；不另存为则下次打开重置）`
}

function cloneEventsFromCustom(source: DamageEvent[]): DamageEvent[] {
  const stamp = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
  return source.map((event, index) => ({
    ...event,
    ownerAgentId: event.ownerAgentId ?? null,
    multOverrides: event.multOverrides ? { ...event.multOverrides } : null,
    triggerAgentId:
      event.triggerAgentId === TRIGGER_AGENT_AT_CALC ? null : (event.triggerAgentId ?? null),
    // 始终换新 id，避免重复 key 导致列表只剩一条可点
    id: `evt-copy-${stamp}-${index}`,
  }))
}

function cloneEventsForStorage(source: DamageEvent[]): DamageEvent[] {
  return source.map((event) => ({
    ...event,
    ownerAgentId: event.ownerAgentId ?? null,
    triggerAgentId: event.triggerAgentId ?? null,
    multOverrides: event.multOverrides ? { ...event.multOverrides } : null,
  }))
}

function selectCustom(mode: DamageEventMode) {
  modeId.value = mode.id
  modeName.value = mode.name
  draftName.value = mode.name
  events.value = cloneEventsFromCustom(mode.events)
  message.value = `已载入自定义模式「${mode.name}」`
}

function createCustom() {
  const id = createCustomModeId()
  const name = draftName.value.trim() || (props.modeType === 'anomaly' ? '自定义异常模式' : '自定义直伤模式')
  const defaultKind = props.modeType === 'anomaly' ? 'anomaly' : 'direct'
  modeId.value = id
  modeName.value = name
  draftName.value = name
  events.value = [createEmptyDamageEvent(0, defaultKind)]
  persistCurrentCustom()
  message.value = '已新建自定义模式'
}

function persistCurrentCustom() {
  if (!modeId.value || isPresetMode.value) return
  const id = modeId.value === 'custom' ? createCustomModeId() : modeId.value
  if (modeId.value === 'custom') modeId.value = id
  const mainId = mainAgentIdRef.value
  const mode: DamageEventMode = {
    id,
    agentId: props.agentId ?? mainId,
    teamKey: buildDamageModeTeamKey(events.value, mainId),
    name: modeName.value || draftName.value || '自定义模式',
    modeType: props.modeType,
    events: cloneEventsForStorage(events.value),
  }
  customModes.value = upsertCustomMode(mode)
}

function saveAsCustom() {
  const id = createCustomModeId()
  const name = `${(draftName.value.trim() || modeName.value || '模式').replace(/（副本）$/, '')}（副本）`
  modeId.value = id
  modeName.value = name
  draftName.value = name
  events.value = events.value.map((event, index) => ({
    ...event,
    multOverrides: event.multOverrides ? { ...event.multOverrides } : null,
    id: `evt-copy-${Date.now().toString(36)}-${index}`,
  }))
  persistCurrentCustom()
  message.value = `已另存为「${name}」`
}

function deleteCurrentCustom() {
  if (!modeId.value || isPresetMode.value) return
  customModes.value = removeCustomMode(modeId.value)
  modeId.value = null
  modeName.value = ''
  draftName.value = ''
  events.value = []
  message.value = '已删除自定义模式'
}

function applyModeName() {
  const name = draftName.value.trim()
  if (!name) return
  modeName.value = name
  if (!modeId.value) {
    createCustom()
    return
  }
  if (isCustomMode.value) persistCurrentCustom()
}
</script>

<template>
  <button type="button" class="mode-summary-bar" @click="open = true">
    <span v-if="modeName || events.length" class="mode-summary-main">
      {{ modeName || '自定义模式' }}
      <span class="mode-summary-meta">· {{ events.length }} 条事件</span>
    </span>
    <span v-else class="mode-summary-placeholder">未选择模式</span>
    <span class="mode-summary-hint" aria-hidden="true">点击此处选择或切换</span>
  </button>

  <Teleport to="body">
    <div v-if="open" class="mode-overlay" role="presentation" @click.self="close">
      <div class="mode-modal" role="dialog" aria-modal="true" aria-label="伤害事件模式">
        <header class="mode-header">
          <div>
            <h3>{{ modeType === 'anomaly' ? '异常伤害事件' : '直伤伤害事件' }}</h3>
            <p>
              {{ agentName ? `当前主 C：${agentName}` : '请先选择主 C' }}
              · 管理端预设可编辑（不另存则下次重置），自定义模式自动缓存
            </p>
          </div>
          <button type="button" class="close-btn" aria-label="关闭" @click="close">×</button>
        </header>

        <div class="mode-body">
          <aside class="mode-aside">
            <div class="mode-aside-toolbar">
              <label class="mode-search">
                <span class="sr-only">搜索模式</span>
                <input
                  v-model="modeSearchQuery"
                  type="search"
                  placeholder="搜索模式 / 事件 / 产生者 / 触发者"
                  autocomplete="off"
                />
              </label>
            </div>

            <div class="mode-aside-scroll">
              <h4>管理员预设</h4>
              <button
                v-for="mode in filteredAgentPresets"
                :key="mode.id"
                type="button"
                class="mode-item"
                :class="{ active: modeId === mode.id }"
                @click="selectPreset(mode)"
              >
                <strong>{{ mode.name }}</strong>
                <span>{{ mode.events.length }} 条 · 预设</span>
              </button>
              <p v-if="!agentPresets.length" class="aside-empty">暂无该角色的管理端预设</p>
              <p v-else-if="!filteredAgentPresets.length" class="aside-empty">无匹配预设</p>

              <h4 class="aside-section">自定义模式</h4>
              <button type="button" class="mode-item mode-item--add" @click="createCustom">
                + 新建自定义模式
              </button>
              <button
                v-for="mode in filteredAgentCustoms"
                :key="mode.id"
                type="button"
                class="mode-item"
                :class="{ active: modeId === mode.id }"
                @click="selectCustom(mode)"
              >
                <strong>{{ mode.name }}</strong>
                <span>{{ mode.events.length }} 条事件</span>
              </button>
              <p
                v-if="modeSearchQuery.trim() && !hasModeSearchHits"
                class="aside-empty"
              >
                无匹配模式
              </p>
            </div>
          </aside>

          <div class="mode-main">
            <div class="name-row">
              <label>
                <span>模式名称</span>
                <input
                  v-model="draftName"
                  type="text"
                  placeholder="自定义模式名称"
                  :disabled="isPresetMode"
                  @change="applyModeName"
                  @blur="applyModeName"
                />
              </label>
              <div class="name-actions">
                <button
                  v-if="modeId"
                  type="button"
                  class="action-btn"
                  @click="saveAsCustom"
                >
                  另存为自定义
                </button>
                <button
                  v-if="isCustomMode"
                  type="button"
                  class="action-btn action-btn--danger"
                  @click="deleteCurrentCustom"
                >
                  删除
                </button>
              </div>
              <p v-if="message" class="mode-message">{{ message }}</p>
            </div>

            <p v-if="isPresetMode" class="readonly-hint">
              当前为管理员预设，可临时修改；不「另存为自定义」则下次打开会恢复默认。
            </p>

            <DamageEventEditor
              v-if="modeId"
              v-model="events"
              :skill-subcategories="skillSubcategories"
              :agent-id="agentId"
              :main-agent-id="mainAgentId ?? agentId"
              :owner-agent-options="ownerAgentOptions"
              :team-has-remiel="teamHasRemiel"
              :mode-type="modeType"
              :trigger-agent-options="triggerAgentOptions"
              :allow-calc-time-trigger="false"
              :resolve-mult-defaults="resolveMultDefaults"
              :turbulence-calculable="turbulenceCalculable"
              :main-agent-element="mainAgentElement"
              embedded
            />
            <p v-else class="pick-hint">请先选择预设模式或新建自定义模式</p>
          </div>
        </div>

        <footer class="mode-footer">
          <button type="button" class="done-btn" @click="close">完成</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mode-summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  background: #0f1217;
  border: 1px solid #2d323a;
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition:
    border-color 0.2s,
    background-color 0.2s;
}

.mode-summary-bar:hover {
  border-color: #c9a55c;
  background: #141820;
}

.mode-summary-main {
  color: #e4e8ef;
  font-weight: 600;
  font-size: 0.88rem;
}

.mode-summary-meta {
  color: #9aa3b0;
  font-weight: 500;
}

.mode-summary-placeholder {
  font-size: 0.84rem;
  color: #9aa3b0;
}

.mode-summary-hint {
  flex-shrink: 0;
  border: 1px solid #343a44;
  border-radius: 8px;
  background: #12161d;
  color: #d5dae4;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  pointer-events: none;
  white-space: nowrap;
}

.mode-summary-bar:hover .mode-summary-hint {
  border-color: #c9a55c;
  color: #f0d7a2;
}

.mode-overlay {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.55);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.mode-modal {
  width: min(960px, 100%);
  max-height: min(88vh, 820px);
  overflow: auto;
  border: 1px solid #2d323a;
  border-radius: 14px;
  background: linear-gradient(180deg, #171a1f 0%, #12151a 100%);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.mode-header,
.mode-footer {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.mode-header h3 {
  margin: 0;
  color: #f0f2f6;
  font-size: 1rem;
}

.mode-header p {
  margin: 0.25rem 0 0;
  color: #9aa3b0;
  font-size: 0.78rem;
}

.close-btn {
  border: none;
  background: transparent;
  color: #9aa3b0;
  font-size: 1.4rem;
  cursor: pointer;
}

.mode-body {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 0.85rem;
  min-height: 320px;
}

.mode-aside {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-width: 220px;
  max-height: min(62vh, 560px);
  min-height: 0;
  border-right: 1px solid #2a2f36;
  padding-right: 0.75rem;
}

.mode-aside-toolbar {
  flex-shrink: 0;
}

.mode-search input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #2d323a;
  border-radius: 8px;
  background: #0f1217;
  color: #ebedf0;
  padding: 0.4rem 0.55rem;
  font-size: 0.78rem;
}

.mode-search input::placeholder {
  color: #7f8794;
}

.mode-aside-scroll {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-height: 0;
  flex: 1 1 auto;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 0.1rem;
  overscroll-behavior: contain;
}

.mode-aside h4 {
  margin: 0.35rem 0 0.25rem;
  font-size: 0.78rem;
  color: #9aa3b0;
  font-weight: 600;
}

.aside-section {
  margin-top: 0.85rem !important;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.mode-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  border: 1px solid #2d323a;
  border-radius: 8px;
  background: #0f1217;
  color: #d5dae4;
  padding: 0.45rem 0.55rem;
  font-size: 0.76rem;
  text-align: left;
  cursor: pointer;
  flex-shrink: 0;
}

.mode-item strong {
  font-size: 0.82rem;
  color: #e8edf3;
}

.mode-item span {
  color: #8f96a3;
}

.mode-item.active {
  border-color: #c9a55c;
  background: rgba(201, 165, 92, 0.12);
}

.mode-item--add {
  border-style: dashed;
  color: #c9a55c;
}

.aside-empty,
.pick-hint,
.readonly-hint {
  margin: 0;
  font-size: 0.78rem;
  color: #8f96a3;
}

.readonly-hint {
  margin-bottom: 0.55rem;
  padding: 0.45rem 0.55rem;
  border-radius: 8px;
  border: 1px solid rgba(201, 165, 92, 0.35);
  background: rgba(201, 165, 92, 0.08);
  color: #e0c48a;
}

.name-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: end;
  margin-bottom: 0.65rem;
}

.name-row label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 12rem;
}

.name-row label span {
  font-size: 0.76rem;
  color: #9aa3b0;
}

.name-row input {
  border: 1px solid #2d323a;
  border-radius: 8px;
  background: #0f1217;
  color: #ebedf0;
  padding: 0.4rem 0.55rem;
  font-size: 0.84rem;
}

.name-row input:disabled {
  opacity: 0.65;
}

.name-actions {
  display: flex;
  gap: 0.4rem;
}

.action-btn {
  border: 1px solid #3a424f;
  border-radius: 8px;
  background: #141820;
  color: #d5dae4;
  padding: 0.4rem 0.65rem;
  font-size: 0.78rem;
  cursor: pointer;
}

.action-btn--danger {
  border-color: #5a3434;
  color: #e8a8a8;
}

.mode-message {
  margin: 0;
  width: 100%;
  font-size: 0.76rem;
  color: #9ad0b8;
}

.done-btn {
  margin-left: auto;
  border: 1px solid #c9a55c;
  border-radius: 8px;
  background: rgba(201, 165, 92, 0.14);
  color: #f0d7a2;
  padding: 0.45rem 1rem;
  font-size: 0.84rem;
  cursor: pointer;
}

@media (max-width: 768px) {
  .mode-body {
    grid-template-columns: 1fr;
  }

  .mode-aside {
    border-right: none;
    border-bottom: 1px solid #2a2f36;
    padding-right: 0;
    padding-bottom: 0.75rem;
    max-height: 280px;
  }
}
</style>

<script setup lang="ts">
/**
 * 流程增益表 —— 以表格形式调整「流程招式 × 增益（效果块）」的生效开关。
 *
 * 设计（2026-09-21 用户方案）：
 * - **只改增益开关**：次数 / 失衡 / 代理人一律不在这里动
 * - **表格形态**：左列（流程招式）与表头（增益）双向固定，中间横向滚动
 * - **左列 = 流程招式**：与流程列表同源、同顺序、同条数；**技能组显示为「组标题行 + 成员缩进」**
 * - **列 = 增益**：按**效果块**聚合（一块一列）
 * - **行级只做减法**：全局未启用的增益，格子置灰不可点（避免"关了却没关"）
 * - 同名招式在流程里可多次出现 → 行名后带「第 x 次」小标签
 * - 名字显示不全时用 `title` 悬停看完整信息（增益效果 / 来源）
 * - 白天主题：`html[data-theme='light']` 覆盖（写法对齐 GameAffixRulesModal）
 */
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import {
  flowBuffColumnBulkState,
  flowBuffColumnMatchesName,
  type FlowBuffCellState,
  type FlowBuffTableColumn,
  type FlowBuffTableRow,
} from '@/utils/flowBuffTable'

const props = defineProps<{
  rows: FlowBuffTableRow[]
  /** 列 = 一条增益一列（已按提供者分组、排好序） */
  columns: FlowBuffTableColumn[]
  /** `${rowKey}|${columnKey}` → on 生效 / off 本行关掉 / na 不可点（全局未启用或受益者对不上） */
  states: Record<string, FlowBuffCellState>
  /** 表格副标题（槽位 / 方案名），仅展示 */
  subtitle?: string
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  toggle: [rowKey: string, columnKey: string]
  /** 整列全开 / 全关（`enabled` = true 是"全开"） */
  setColumn: [columnKey: string, enabled: boolean]
}>()

/** 表头第一行：提供者分组（列已按分组排好，连续同名合并） */
const columnGroups = computed(() => {
  const out: { key: string; label: string; span: number }[] = []
  for (const column of props.columns) {
    const last = out[out.length - 1]
    if (last && last.key === column.groupKey) last.span += 1
    else out.push({ key: column.groupKey, label: column.groupLabel, span: 1 })
  }
  return out
})

/* ---------- 招式名列宽可拖（2026-09-23 用户要求，参照词条分析收益表） ---------- */
/**
 * 与收益表同款语义：**拖多少就是多少**（独立像素宽），可以拖到比名字本身还窄
 * —— 窄了靠 `ellipsis` 截断，悬停仍能看全名。宽度记在 localStorage，刷新后保持。
 */
const NAME_COL_MIN = 60
const NAME_COL_MAX = 600
const NAME_COL_DEFAULT = 230
const NAME_COL_STORAGE_KEY = 'zzz-hp-flow-buff-name-col-width'

function readStoredNameColWidth(): number {
  try {
    const raw = Number(localStorage.getItem(NAME_COL_STORAGE_KEY))
    return Number.isFinite(raw) && raw >= NAME_COL_MIN ? raw : NAME_COL_DEFAULT
  } catch {
    return NAME_COL_DEFAULT
  }
}

const nameColWidth = ref(readStoredNameColWidth())
const resizingNameCol = ref(false)

function startNameColResize(event: MouseEvent) {
  event.preventDefault()
  const startX = event.clientX
  const startWidth = nameColWidth.value
  resizingNameCol.value = true
  const onMove = (moveEvent: MouseEvent) => {
    nameColWidth.value = Math.min(
      NAME_COL_MAX,
      Math.max(NAME_COL_MIN, startWidth + (moveEvent.clientX - startX)),
    )
  }
  const onUp = () => {
    resizingNameCol.value = false
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    try {
      localStorage.setItem(NAME_COL_STORAGE_KEY, String(Math.round(nameColWidth.value)))
    } catch {
      /* 存不下就只在本次会话生效 */
    }
  }
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

/**
 * 滚轮分流（2026-09-23 用户要求）：
 * 指针在**招式名那一列** → 上下滚（走默认）；在**右侧** → 左右滚。
 */
function onBodyWheel(event: WheelEvent) {
  const target = event.target as HTMLElement | null
  if (target?.closest('.fbt-th-name, .fbt-td-name')) return
  const body = event.currentTarget as HTMLElement | null
  if (!body) return
  event.preventDefault()
  body.scrollLeft += event.deltaY
}

/** 悬停卡片（比原生 title 快、能显示多行；标题支持圆圈编号，和表格里同款） */
const tip = ref<{
  x: number
  y: number
  parts: { text: string; badge?: string | null }[]
  lines: string[]
  note: string
} | null>(null)

function showTipParts(
  event: MouseEvent,
  parts: { text: string; badge?: string | null }[],
  lines: string[],
  note = '',
) {
  tip.value = {
    x: event.clientX,
    y: event.clientY,
    parts,
    lines: lines.filter(Boolean).slice(0, 8),
    note,
  }
}

function moveTip(event: MouseEvent) {
  if (!tip.value) return
  tip.value = { ...tip.value, x: event.clientX, y: event.clientY }
}

function hideTip() {
  tip.value = null
}

/** 行标题的悬停内容（同名第几次 / 技能组） */
function showTitleTip(event: MouseEvent, row: FlowBuffTableRow) {
  showTipParts(
    event,
    [{ text: row.label, badge: row.badge ?? null }],
    [
      row.badge ? `同名招式第 ${row.badge} 次出现` : '',
      row.kind === 'group' ? '技能组（成员逐行）' : '',
    ],
  )
}

/**
 * 单元格的悬停内容（2026-09-23 用户口径）：
 * 标题 = 招式名 × 增益名（各带同款圆圈编号）；正文 = 数值 / 生效者 / 提供者。
 * **不带**状态词，也**不带**那条长长的触发说明（其他维持现状）。
 */
function showCellTip(event: MouseEvent, row: FlowBuffTableRow, column: FlowBuffTableColumn) {
  showTipParts(
    event,
    [
      { text: row.label, badge: row.badge ?? null },
      { text: ` × ${column.label}`, badge: column.badge ?? null },
    ],
    column.details ?? [],
  )
}

/** 卡片贴光标，右/下边界收一下，别跑出屏幕 */
const tipLeft = computed(() =>
  tip.value ? `${Math.max(8, Math.min(tip.value.x + 14, window.innerWidth - 320))}px` : '0',
)
const tipTop = computed(() =>
  tip.value ? `${Math.max(8, Math.min(tip.value.y + 16, window.innerHeight - 180))}px` : '0',
)

/** 表格总宽按列数算死：fixed 布局下若还有余量，浏览器会按内容重新分配列宽。
 *  含 border-spacing（列间距 2px，首尾各一份）。 */
const tableWidth = computed(
  () =>
    `${nameColWidth.value + 96 * props.columns.length + 2 * (props.columns.length + 1)}px`,
)

const onCount = computed(() =>
  Object.values(props.states).filter((value) => value === 'on').length,
)
const offCount = computed(() =>
  Object.values(props.states).filter((value) => value === 'off').length,
)

function stateOf(rowKey: string, columnKey: string): FlowBuffCellState {
  return props.states[`${rowKey}|${columnKey}`] ?? 'na'
}

function onCellClick(rowKey: string, columnKey: string) {
  if (stateOf(rowKey, columnKey) === 'na') return
  emit('toggle', rowKey, columnKey)
}

/* ---------- 搜索：只按增益名，「下一个 / 上一个」依次推进（2026-09-23 用户要求） ---------- */

const searchQuery = ref('')
/** 当前命中在 `matchedColumnKeys` 里的位置；-1 = 还没开始跳 */
const searchCursor = ref(-1)
const bodyRef = ref<HTMLElement | null>(null)

/** 命中列（按列序）。只比名字：列头名 + 全名（能力块的原始全名在 tipTitle 里） */
const matchedColumnKeys = computed(() => {
  if (!searchQuery.value.trim()) return [] as string[]
  return props.columns
    .filter((column) => flowBuffColumnMatchesName(column, searchQuery.value))
    .map((column) => column.key)
})

const activeMatchKey = computed(() =>
  searchCursor.value >= 0 ? (matchedColumnKeys.value[searchCursor.value] ?? null) : null,
)

const searchCountLabel = computed(() => {
  if (!searchQuery.value.trim()) return ''
  const total = matchedColumnKeys.value.length
  if (!total) return '无命中'
  return searchCursor.value >= 0 ? `${searchCursor.value + 1} / ${total}` : `共 ${total}`
})

// 换了搜索词就从头开始，避免"接着上次的序号继续跳"
watch(searchQuery, () => {
  searchCursor.value = -1
})

/** 把某一列滚进可视区：优先居中，但绝不被左边那条粘性「招式」列盖住 */
function scrollToColumn(columnKey: string) {
  const body = bodyRef.value
  const index = props.columns.findIndex((column) => column.key === columnKey)
  if (!body || index < 0) return
  // 固定布局：名称列 + 每列 96px + 列间距 2px（与 tableWidth 同一套算法）
  const left = nameColWidth.value + 2 * (index + 1) + 96 * index
  const keepClear = nameColWidth.value + 16
  body.scrollLeft = Math.max(0, left - Math.max(keepClear, (body.clientWidth - 96) / 2))
}

function stepMatch(delta: number) {
  const total = matchedColumnKeys.value.length
  if (!total) return
  const next = (searchCursor.value + delta + total) % total
  searchCursor.value = next
  scrollToColumn(matchedColumnKeys.value[next] ?? '')
}

/** 输入框里的快捷键：回车 = 下一个、Shift+回车 = 上一个 */
function onSearchKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter') return
  event.preventDefault()
  stepMatch(event.shiftKey ? -1 : 1)
}

/* ---------- 整列「全开 / 全关」（2026-09-23 用户要求，只作用于本列灰格以外的行） ---------- */

const columnBulkStates = computed<Record<string, 'on' | 'off' | 'mixed' | 'na'>>(() => {
  const out: Record<string, 'on' | 'off' | 'mixed' | 'na'> = {}
  for (const column of props.columns) {
    out[column.key] = flowBuffColumnBulkState({
      rows: props.rows,
      states: props.states,
      columnKey: column.key,
    })
  }
  return out
})

function bulkStateOf(columnKey: string) {
  return columnBulkStates.value[columnKey] ?? 'na'
}

function bulkGlyph(columnKey: string) {
  const state = bulkStateOf(columnKey)
  if (state === 'on') return '✓'
  if (state === 'off') return '×'
  if (state === 'mixed') return '–'
  return '·'
}

/** 两态：不是"全开"就全开；已经全开就全关（用户口径「全开／全关」） */
function onColumnBulkClick(columnKey: string) {
  const state = bulkStateOf(columnKey)
  if (state === 'na') return
  emit('setColumn', columnKey, state !== 'on')
}

/* ---------- 表头三行依次堆叠冻结（2026-09-29 用户要求） ----------
 * 原状：thead 所有 th 都钉 top:0（分组行与列名行滚动时重叠在同一位置），
 * 「整列」行被显式 static，纵向完全不粘。现在：分组行 top:0、列名行 top=分组行高、
 * 整列行 top=前两行高。行高由内容决定，用 ResizeObserver 实测后写进表格上的 CSS 变量。 */
const groupRowRef = ref<HTMLTableRowElement | null>(null)
const blockRowRef = ref<HTMLTableRowElement | null>(null)
const headerRowHeights = ref({ group: 0, block: 0 })
let headerRowsObserver: ResizeObserver | null = null

function measureHeaderRows() {
  headerRowHeights.value = {
    group: groupRowRef.value?.getBoundingClientRect().height ?? 0,
    block: blockRowRef.value?.getBoundingClientRect().height ?? 0,
  }
}

watch(open, (isOpen) => {
  headerRowsObserver?.disconnect()
  if (!isOpen) return
  nextTick(() => {
    measureHeaderRows()
    if (!groupRowRef.value || !blockRowRef.value) return
    if (!headerRowsObserver && typeof ResizeObserver !== 'undefined') {
      headerRowsObserver = new ResizeObserver(measureHeaderRows)
    }
    headerRowsObserver?.observe(groupRowRef.value)
    headerRowsObserver?.observe(blockRowRef.value)
  })
})

onUnmounted(() => {
  headerRowsObserver?.disconnect()
  headerRowsObserver = null
})

/** 量不到（0）时给 undefined，让样式里的回退值兜底，避免三行全叠回 top:0 */
const stickyTopBlock = computed(() =>
  headerRowHeights.value.group > 0
    ? `${Math.round(headerRowHeights.value.group)}px`
    : undefined,
)
const stickyTopBulk = computed(() => {
  const { group, block } = headerRowHeights.value
  return group + block > 0 ? `${Math.round(group + block)}px` : undefined
})
</script>

<template>
  <div v-if="open" class="fbt-mask" @click.self="open = false">
    <div class="fbt-card">
      <header class="fbt-head">
        <div class="fbt-head-main">
          <h3>流程增益表</h3>
          <span v-if="subtitle" class="fbt-sub">{{ subtitle }}</span>
        </div>
        <div class="fbt-head-stats">
          <span class="fbt-stat">生效 {{ onCount }}</span>
          <span class="fbt-stat is-off">关闭 {{ offCount }}</span>
        </div>
        <button type="button" class="mini-btn fbt-close-btn" @click="open = false">关闭</button>
      </header>

      <p class="fbt-hint">
        勾选 = 这一行<b>吃</b>该增益。取消勾选只影响<b>本行结算</b>：不改面板、不影响层数累计、不影响其它行。
        全局未启用的增益（灰色）在这里无法单独打开 —— 请到全局增益选择器里开。
      </p>

      <!-- 搜索：只搜增益名；点「下一个」逐列推进（2026-09-23 用户要求） -->
      <div class="fbt-search">
        <input
          v-model="searchQuery"
          class="fbt-search-input"
          type="search"
          placeholder="搜索增益名（全名里有也算）"
          @keydown="onSearchKeydown"
        />
        <span class="fbt-search-count">{{ searchCountLabel }}</span>
        <button
          type="button"
          class="mini-btn"
          :disabled="!matchedColumnKeys.length"
          @click="stepMatch(-1)"
        >
          上一个
        </button>
        <button
          type="button"
          class="mini-btn"
          :disabled="!matchedColumnKeys.length"
          @click="stepMatch(1)"
        >
          下一个
        </button>
        <button v-if="searchQuery" type="button" class="mini-btn" @click="searchQuery = ''">
          清空
        </button>
      </div>

      <div ref="bodyRef" class="fbt-body" @wheel="onBodyWheel">
        <table
          class="fbt-table"
          :style="{
            width: tableWidth,
            '--fbt-sticky-2': stickyTopBlock,
            '--fbt-sticky-3': stickyTopBulk,
          }"
        >
          <colgroup>
            <!-- 用行内 style：scoped 选择器依赖 data-v 属性，<col> 常常拿不到，规则不生效 -->
            <col :style="{ width: `${nameColWidth}px` }" />
            <col
              v-for="column in columns"
              :key="`col-${column.key}`"
              :style="{ width: '96px' }"
            />
          </colgroup>
          <thead>
            <!-- 第一行 = 提供者分组（角色1/2/3 → 其它 → 额外 Buff），第二行 = 一条增益一列 -->
            <tr ref="groupRowRef">
              <th class="fbt-th-name" rowspan="2">
                招式
                <span
                  class="fbt-name-resizer"
                  :class="{ 'is-active': resizingNameCol }"
                  @mousedown="startNameColResize"
                />
              </th>
              <th
                v-for="group in columnGroups"
                :key="group.key"
                class="fbt-th-group"
                :colspan="group.span"
              >
                {{ group.label }}
              </th>
            </tr>
            <tr ref="blockRowRef">
              <th
                v-for="column in columns"
                :key="column.key"
                class="fbt-th-block"
                :class="{
                  'is-match': matchedColumnKeys.includes(column.key),
                  'is-match-active': activeMatchKey === column.key,
                }"
                @mouseenter="showTipParts($event, [{ text: column.tipTitle ?? column.label, badge: column.badge ?? null }], column.details ?? [], column.note ?? '')"
                @mousemove="moveTip"
                @mouseleave="hideTip"
              >
                <span class="fbt-th-text">{{ column.label }}</span>
                <span v-if="column.badge" class="fbt-badge is-circle">{{ column.badge }}</span>
                <span class="fbt-th-beneficiary">生效者：{{ column.beneficiaryLabel }}</span>
              </th>
            </tr>
            <!-- 第三行 = 整列「全开 / 全关」（2026-09-23 用户要求）。随表头一起粘住（2026-09-29），
                 钉在分组行 + 列名行下方，形成三层堆叠表头。 -->
            <tr class="fbt-row-bulk">
              <th class="fbt-th-name fbt-th-bulk">整列</th>
              <th
                v-for="column in columns"
                :key="`bulk-${column.key}`"
                class="fbt-th-bulk"
                :class="`is-${bulkStateOf(column.key)}`"
              >
                <button
                  type="button"
                  class="fbt-bulk-btn"
                  :class="`is-${bulkStateOf(column.key)}`"
                  :disabled="bulkStateOf(column.key) === 'na'"
                  :title="
                    bulkStateOf(column.key) === 'na'
                      ? '这一列没有可调整的格子（全局未启用 / 这些行都不吃）'
                      : bulkStateOf(column.key) === 'on'
                        ? '整列全关'
                        : '整列全开（灰格不会被打开）'
                  "
                  @click="onColumnBulkClick(column.key)"
                >
                  {{ bulkGlyph(column.key) }}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.key"
              class="fbt-row"
              :class="{ 'is-group': row.kind === 'group', 'is-member': row.kind === 'member' }"
            >
              <th
                class="fbt-td-name"
                @mouseenter="showTitleTip($event, row)"
                @mousemove="moveTip"
                @mouseleave="hideTip"
              >
                <span class="fbt-name-text" :class="{ 'is-indent': row.kind === 'member' }">
                  {{ row.label }}
                </span>
                <span v-if="row.badge" class="fbt-badge is-circle">{{ row.badge }}</span>
                <span v-if="row.kind === 'group'" class="fbt-group-tag">技能组</span>
              </th>
              <td
                v-for="column in columns"
                :key="column.key"
                class="fbt-td-cell"
                :class="[
                  `is-${stateOf(row.key, column.key)}`,
                  {
                    'is-match': matchedColumnKeys.includes(column.key),
                    'is-match-active': activeMatchKey === column.key,
                  },
                ]"
              >
                <button
                  type="button"
                  class="fbt-cell"
                  :class="`is-${stateOf(row.key, column.key)}`"
                  :disabled="stateOf(row.key, column.key) === 'na'"
                  @mouseenter="showCellTip($event, row, column)"
                  @mousemove="moveTip"
                  @mouseleave="hideTip"
                  @click="onCellClick(row.key, column.key)"
                >
                  <span v-if="stateOf(row.key, column.key) === 'on'">✓</span>
                  <span v-else-if="stateOf(row.key, column.key) === 'off'">×</span>
                  <span v-else>·</span>
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td class="fbt-empty" :colspan="Math.max(1, columns.length + 1)">
                当前槽位还没有流程条目。
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 悬停卡片：标题带圆圈编号（与表格同款）；正文按段分行、段间留距 -->
      <div v-if="tip" class="fbt-tip" :style="{ left: tipLeft, top: tipTop }">
        <strong class="fbt-tip-title">
          <template v-for="(part, index) in tip.parts" :key="index">
            <span>{{ part.text }}</span>
            <span v-if="part.badge" class="fbt-badge is-circle">{{ part.badge }}</span>
          </template>
        </strong>
        <p v-for="(line, index) in tip.lines" :key="index" class="fbt-tip-line">{{ line }}</p>
        <!-- 长说明沉到最后、字号最小（2026-09-23 用户口径：直接显示，不做展开/收起） -->
        <template v-if="tip.note">
          <div class="fbt-tip-divider" />
          <p class="fbt-tip-note">{{ tip.note }}</p>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fbt-mask {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: rgba(6, 8, 12, 0.62);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.2rem;
}
.fbt-card {
  box-sizing: border-box;
  width: min(72rem, 100%);
  max-height: min(84vh, 52rem);
  display: flex;
  flex-direction: column;
  border: 1px solid #2a3038;
  border-radius: 8px;
  background: #141820;
  color: #dfe6ef;
  overflow: hidden;
}
/* 列头第三行：生效者（全队 / 角色名） */
.fbt-th-beneficiary {
  display: block;
  font-size: 0.6rem;
  font-weight: 400;
  opacity: 0.7;
}
/* 第一行表头：提供者分组 */
.fbt-th-group {
  border-left: 1px solid #2a3038;
  color: #9fb0c4;
  font-weight: 600;
  text-align: center;
}
/* 同名标记：小圆圈 + 数字（只在重名时出现） */
.fbt-badge.is-circle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1rem;
  height: 1rem;
  padding: 0 0.2rem;
  border: 1px solid currentColor;
  border-radius: 999px;
  font-size: 0.62rem;
  line-height: 1;
  opacity: 0.85;
}
.fbt-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.55rem 0.75rem;
  border-bottom: 1px solid #2a3038;
}
/* 头部「关闭」按钮（2026-10-01 用户要求优化）：本弹窗没有全局 .mini-btn 样式，
   原先掉回浏览器原生按钮（双层立体边 + 大字号）很突兀。给一套与搜索条 mini-btn
   同款的规则，并加显眼的红色边底，一眼可辨「关掉整个表」。 */
.fbt-close-btn {
  appearance: none;
  height: 1.6rem;
  margin-left: 0.25rem;
  padding: 0 0.7rem;
  border: 1px solid #7a3f46;
  border-radius: 4px;
  background: #241618;
  color: #d38f95;
  font: inherit;
  font-size: 0.8rem;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
}
.fbt-close-btn:hover {
  border-color: #a05258;
  background: #2e1a1d;
  color: #f0b9bd;
}
.fbt-head-main {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.fbt-head-main h3 {
  margin: 0;
  font-size: 1rem;
}
.fbt-sub {
  color: #9fb0c6;
  font-size: 0.82rem;
  max-width: 22rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fbt-head-stats {
  display: flex;
  gap: 0.4rem;
  margin-left: auto;
}
.fbt-stat {
  padding: 0 0.4rem;
  border: 1px solid #3d4653;
  border-radius: 999px;
  font-size: 0.78rem;
  color: #8fd3a5;
}
.fbt-stat.is-off {
  color: #ffd479;
}
.fbt-hint {
  margin: 0;
  padding: 0.45rem 0.75rem;
  color: #9fb0c6;
  font-size: 0.82rem;
  border-bottom: 1px solid #222833;
}
/* 搜索条（2026-09-23 用户要求）：单独一条，不动表格网格 */
.fbt-search {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #222833;
}
.fbt-search-input {
  width: 15rem;
  max-width: 40vw;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  border: 1px solid #3d4653;
  background: #10141b;
  color: #e6ebf2;
  font-size: 0.8rem;
}
.fbt-search-input::placeholder {
  color: #6f7c8d;
}
.fbt-search-count {
  min-width: 3.5rem;
  font-size: 0.78rem;
  color: #8695a8;
}
/* 「上一个／下一个」原先只挂了 class="mini-btn"，而 .mini-btn 在各组件里都是各自 scoped 的，
   本弹窗没有这份规则 → 掉回浏览器原生按钮：双层立体边（用户说的"箭头"感）、13.33px 默认字号、
   2px 边框、line-height: normal，文字顶出内框 = 越界。这里给本弹窗自己的一套，字号跟回页面。 */
.fbt-search .mini-btn {
  appearance: none;
  height: 1.6rem;
  padding: 0 0.6rem;
  border: 1px solid #3d4653;
  border-radius: 4px;
  background: #10141b;
  color: #cfd8e3;
  font: inherit;
  font-size: 0.8rem;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
}
.fbt-search .mini-btn:hover:not(:disabled) {
  border-color: #4c5866;
  background: #161c25;
}
.fbt-search .mini-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.fbt-body {
  overflow: auto;
  padding: 0 0 0.6rem;
}
.fbt-table {
  border-collapse: separate;
  /* 列间距：表头名字挨在一起时分不清列边界（2026-09-21 用户反馈）。
     表宽公式里必须一并算上间距，否则 fixed 布局又会按内容重分配列宽。 */
  /* 列间距收到 2px，改**用线条**区分列（2026-09-21 用户反馈：纯间距仍不够明显） */
  border-spacing: 2px 0;
  /* 列宽**限死**：招式列与增益列都固定（用 colgroup 钉，见下），名字过长一律省略号。
     注意别再写 `width: max-content` —— 那样会把声明列宽按内容重新分配（实测 96px 被撑成 123.5px）。 */
  table-layout: fixed;
}
/* colgroup + 行内表宽决定列宽；th/td 上不再写 width/min/max，避免和 col 冲突 */
.fbt-th-text,
.fbt-name-text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 悬停卡片：名字太长时看全名；增益列还能看到具体效果 */
.fbt-tip {
  position: fixed;
  z-index: 40;
  width: min(300px, 70vw);
  padding: 0.5rem 0.6rem;
  border-radius: 8px;
  border: 1px solid #3a424e;
  background: #171c24;
  color: #e6ebf2;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  pointer-events: none;
  /* 三层字号（2026-09-23 用户口径）：名字 > 数值/生效者/提供者 > 说明 */
  font-size: 0.78rem;
  line-height: 1.45;
}
.fbt-tip-title {
  display: block;
  margin-bottom: 0.3rem;
  /* 名字一行：比正文略大 */
  font-size: 0.86rem;
  line-height: 1.3;
  color: #f0f2f6;
  word-break: break-all;
}
.fbt-tip-line {
  margin: 0;
  color: #9fb0c4;
  word-break: break-all;
}
/* 长说明：沉到最后，上面一条细分隔线（2026-09-23 用户口径） */
.fbt-tip-divider {
  margin: 0.45rem 0 0.35rem;
  border-top: 1px solid #3a424e;
  opacity: 0.7;
}
.fbt-tip-note {
  margin: 0;
  /* 说明：最小一号 */
  font-size: 0.72rem;
  line-height: 1.6;
  color: #8695a8;
  word-break: break-all;
}
/* 正文三行贴成一小组；与名字、与说明之间各留一口气（2026-09-23 用户口径） */
.fbt-tip-line + .fbt-tip-line {
  margin-top: 0.22rem;
}
/* 招式名列宽拖动（2026-09-23 用户要求，参照词条分析收益表） */
.fbt-name-resizer {
  position: absolute;
  top: 0;
  right: -3px;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  z-index: 2;
}
.fbt-name-resizer.is-active {
  background: #4c8dff;
  opacity: 0.55;
}
/* 列宽可以拖到比名字本身还窄：窄了就截断，悬停仍能看全名 */
.fbt-th-name,
.fbt-td-name {
  overflow: hidden;
}
.fbt-td-name .fbt-name-text,
.fbt-th-name .fbt-name-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
/* 卡片标题里的圆圈编号（与表格里的同款） */
.fbt-tip-title .fbt-badge {
  margin-left: 0.25rem;
  vertical-align: middle;
}
.fbt-th-name,
.fbt-td-name {
  position: sticky;
  left: 0;
  z-index: 2;
  background: #171c25;
  border-right: 1px solid #2a3038;
  text-align: left;
  padding: 0.3rem 0.6rem;
  min-width: 10rem;
  max-width: 16rem;
  font-weight: 500;
}
.fbt-th-name {
  z-index: 3;
  top: 0;
  color: #9fb0c6;
  font-weight: 600;
  font-size: 0.82rem;
}
thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #171c25;
  border-bottom: 1px solid #2a3038;
}
.fbt-th-block {
  padding: 0.3rem 0.35rem;
  font-weight: 600;
  font-size: 0.78rem;
  color: #cbd5e1;
  white-space: nowrap;
  max-width: 8rem;
  /* 表头堆叠冻结（2026-09-29）：钉在分组行下方，不再与分组行同挤 top:0 互相重叠。
     变量由 ResizeObserver 实测分组行高后写上；量不到走回退值。 */
  top: var(--fbt-sticky-2, 2.2rem);
  /* 每列自成一块 + 右侧竖线：线条比纯间距更容易分辨列边界（2026-09-21 用户反馈） */
  background: #171c25;
  border-right: 1px solid #313947;
  border-radius: 4px;
}
.fbt-th-text {
  display: inline-block;
  /* 收进列宽内（列只有 96px，写死 7.5rem 会超出单元格） */
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
/* 整列「全开 / 全关」第三行（2026-09-23 用户要求；2026-09-29 改为随表头一起粘住）：
   三行表头依次堆叠 —— 分组行 top:0、列名行 top=分组行高、本行 top=前两行高。 */
.fbt-row-bulk th {
  position: sticky;
  top: var(--fbt-sticky-3, 4.4rem);
  z-index: 2;
  padding: 0.1rem 0.25rem;
  text-align: center;
  border-bottom: 1px solid #2a3038;
}
.fbt-row-bulk .fbt-th-name {
  /* 横竖双向粘性：left: 0（来自 .fbt-th-name）+ top=前两行高。
     原先写 top:auto 是「让位给列名、不纵向粘」的旧口径，2026-09-29 按用户要求整行也冻结。 */
  position: sticky;
  top: var(--fbt-sticky-3, 4.4rem);
  left: 0;
  z-index: 3;
}
.fbt-th-bulk {
  font-size: 0.72rem;
  font-weight: 500;
  color: #8695a8;
}
.fbt-th-name.fbt-th-bulk {
  text-align: left;
}
.fbt-bulk-btn {
  /* 居中 + 不撑满：原来是 display:block + width:100%（通栏色块，用户嫌"这么宽"）；
     改小圆点：与表体里"每格一个小方框"形成形状区分（列级 vs 格级一眼可辨），
     状态仍靠图形（✓／×／–／·）+ 颜色（绿=全开、红=全关、黄=各半、灰=不可用）区分。 */
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  margin: 0 auto;
  padding: 0;
  border-radius: 50%;
  border: 1px solid #3d4653;
  background: #10141b;
  color: #7f8fa3;
  font-size: 0.72rem;
  line-height: 1;
  cursor: pointer;
}
.fbt-bulk-btn.is-on {
  border-color: #3f7a55;
  background: #16241b;
  color: #8fd3a5;
}
.fbt-bulk-btn.is-off {
  border-color: #7a3f46;
  background: #241618;
  color: #d38f95;
}
.fbt-bulk-btn.is-mixed {
  border-color: #6a6f4a;
  background: #22261a;
  color: #cfd28f;
}
.fbt-bulk-btn:disabled {
  opacity: 0.45;
  cursor: default;
}
/* 搜索命中：整列淡淡一层；"当前"那一列再加一圈（2026-09-23 用户要求） */
.fbt-th-block.is-match,
.fbt-td-cell.is-match {
  background: rgba(76, 141, 255, 0.08);
}
.fbt-th-block.is-match-active,
.fbt-td-cell.is-match-active {
  background: rgba(76, 141, 255, 0.2);
  box-shadow: inset 0 0 0 1px rgba(76, 141, 255, 0.6);
}
.fbt-row.is-group .fbt-td-name {
  background: #1b2230;
}
.fbt-row.is-group .fbt-name-text {
  font-weight: 600;
}
.fbt-row.is-member .fbt-td-name {
  background: #151a22;
}
.fbt-name-text.is-indent {
  padding-left: 1rem;
}
.fbt-name-text {
  display: inline-block;
  max-width: 11rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
.fbt-badge {
  margin-left: 0.3rem;
  padding: 0 0.3rem;
  border: 1px solid #3d4653;
  border-radius: 999px;
  font-size: 0.7rem;
  color: #9fb0c6;
}
.fbt-group-tag {
  margin-left: 0.3rem;
  padding: 0 0.3rem;
  border: 1px solid #3f5a7a;
  border-radius: 3px;
  font-size: 0.7rem;
  color: #8fb7e6;
}
.fbt-td-cell {
  padding: 0.15rem 0.2rem;
  text-align: center;
  border-bottom: 1px solid #1e242e;
  /* 与表头对齐的列竖线：整列一条线，扫读时列边界清楚 */
  border-right: 1px solid #262e3a;
}
.fbt-cell {
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 4px;
  border: 1px solid #3d4653;
  background: #10141b;
  color: #7f8fa3;
  cursor: pointer;
  line-height: 1;
  font-size: 0.9rem;
}
.fbt-cell.is-on {
  border-color: #3f7a55;
  background: #16241b;
  color: #8fd3a5;
}
.fbt-cell.is-off {
  border-color: #7a5f3f;
  background: #241d16;
  color: #ffd479;
}
.fbt-cell.is-na {
  border-color: #262c35;
  background: #12161d;
  color: #4a5462;
  cursor: not-allowed;
}
.fbt-cell:hover:not(:disabled) {
  border-color: #6f8299;
}
.fbt-empty {
  padding: 0.8rem;
  color: #7f8fa3;
}

/*
 * 白天主题：Teleport/浮层同样靠 html[data-theme='light'] 覆盖。
 * ⚠️ 必须把后代**一起写进** `:global(...)` 里 —— 写成 `:global([data-theme='light']) .xxx` 会被编译成
 * 只剩 `[data-theme='light']`（后代被吃掉），规则等于没写。同 SkillFlowSection.vue 里那条注释。
 * 2026-09-21 实测：改前编译产物是 `[data-theme='light'] { background: … }`，弹窗在白天主题下仍是深色。
 */
:global([data-theme='light'] .fbt-mask) {
  background: rgba(15, 23, 42, 0.35);
}
:global([data-theme='light'] .fbt-card) {
  border-color: #d5dae3;
  background: linear-gradient(180deg, #ffffff 0%, #f6f8fb 100%);
  color: #1c212a;
}
:global([data-theme='light'] .fbt-head) {
  border-color: #e4e7ec;
}
:global([data-theme='light'] .fbt-hint) {
  border-color: #e4e7ec;
  color: #5b6573;
}
:global([data-theme='light'] .fbt-sub) {
  color: #5b6573;
}
:global([data-theme='light'] .fbt-stat) {
  border-color: #cfd6e0;
  color: #1f7a45;
}
:global([data-theme='light'] .fbt-stat.is-off) {
  color: #9a6a00;
}
:global([data-theme='light'] .fbt-th-name),
:global([data-theme='light'] .fbt-td-name),
:global([data-theme='light'] .fbt-table thead th) {
  background: #f1f4f8;
  border-color: #e4e7ec;
}
:global([data-theme='light'] .fbt-row.is-group .fbt-td-name) {
  background: #e8eef7;
}
:global([data-theme='light'] .fbt-row.is-member .fbt-td-name) {
  background: #f7f9fc;
}
:global([data-theme='light'] .fbt-th-block) {
  color: #364152;
}
:global([data-theme='light'] .fbt-td-cell) {
  border-color: #eef1f5;
}
:global([data-theme='light'] .fbt-badge) {
  border-color: #cfd6e0;
  color: #5b6573;
}
:global([data-theme='light'] .fbt-group-tag) {
  border-color: #b9cde6;
  color: #2f5c94;
}
:global([data-theme='light'] .fbt-cell) {
  border-color: #cfd6e0;
  background: #ffffff;
  color: #7b8798;
}
:global([data-theme='light'] .fbt-cell.is-on) {
  border-color: #8fbf9f;
  background: #eef8f1;
  color: #1f7a45;
}
:global([data-theme='light'] .fbt-cell.is-off) {
  border-color: #d8bd8a;
  background: #fdf6e7;
  color: #9a6a00;
}
:global([data-theme='light'] .fbt-cell.is-na) {
  border-color: #e6e9ee;
  background: #f4f6f9;
  color: #b6bdc7;
}
:global([data-theme='light'] .fbt-empty) {
  color: #7b8798;
}
:global([data-theme='light'] .fbt-tip) {
  border-color: #d5dae3;
  background: #ffffff;
  color: #1c212a;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.18);
}
:global([data-theme='light'] .fbt-tip-title) {
  color: #1c212a;
}
:global([data-theme='light'] .fbt-tip-line) {
  color: #5b6573;
}
:global([data-theme='light'] .fbt-th-block) {
  border-right-color: #dbe1ea;
}
:global([data-theme='light'] .fbt-td-cell) {
  border-right-color: #e8ecf2;
}
:global([data-theme='light'] .fbt-search) {
  border-bottom-color: #e6e9ee;
}
:global([data-theme='light'] .fbt-search-input) {
  border-color: #d5dae3;
  background: #ffffff;
  color: #1c212a;
}
:global([data-theme='light'] .fbt-row-bulk th) {
  border-bottom-color: #e6e9ee;
}
:global([data-theme='light'] .fbt-bulk-btn) {
  border-color: #d5dae3;
  background: #ffffff;
  color: #7b8798;
}
:global([data-theme='light'] .fbt-bulk-btn.is-on) {
  border-color: #8ecfa4;
  background: #eef8f1;
  color: #2f7d4a;
}
:global([data-theme='light'] .fbt-bulk-btn.is-off) {
  border-color: #e0a9ad;
  background: #fdf1f1;
  color: #b4434b;
}
:global([data-theme='light'] .fbt-bulk-btn.is-mixed) {
  border-color: #d6cf9a;
  background: #fbf9ee;
  color: #8a7c1f;
}
:global([data-theme='light'] .fbt-search .mini-btn) {
  border-color: #d5dae3;
  background: #ffffff;
  color: #2a3340;
}
:global([data-theme='light'] .fbt-search .mini-btn:hover:not(:disabled)) {
  border-color: #b9c2cf;
  background: #f2f5f9;
}
:global([data-theme='light'] .fbt-close-btn) {
  border-color: #e0a9ad;
  background: #fdf1f1;
  color: #b4434b;
}
:global([data-theme='light'] .fbt-close-btn:hover) {
  border-color: #c9828a;
  background: #fbe4e4;
}
</style>

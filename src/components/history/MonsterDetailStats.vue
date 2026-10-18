<script setup lang="ts">
import { computed } from 'vue'
import ElementTraitIcons from '@/components/shared/ElementTraitIcons.vue'
import { DEFAULT_ENEMY_STAGGER_MULTIPLIER } from '@/utils/enemyResistance'
import { formatHp } from '@/utils/gameData'
import {
  ANOMALY_BAR_VERSION_MULTIPLIER,
  buildMonsterResistanceRows,
  isAnomalyBarCoefficientConfigured,
  isAnomalyBarVersionMultiplier,
  type MonsterResistanceRow,
} from '@/utils/monsterResistanceTable'

/**
 * 数据行取值：基础字段沿用 boss_info（`BossInfoRecord`）的 snake_case 命名，
 * 使 `BossInfoRecord` 可直接作为 `record` 传入；危局往期详情弹窗按同一形状
 * 从 `EnemySlot` + 对比结果组装；后续防卫战详情弹窗同样复用。
 */
export interface MonsterDetailRecord {
  /** 怪物名，渲染为高亮的「怪物：」行；缺省不渲染该行 */
  boss_name?: string | null
  /** 血量文本（危局往期详情） */
  hp?: string | null
  /** 血量行的相对膨胀文本，如 +25.0% */
  hp_expansion?: string | null
  /** 血量增量行文本，如 +1200（与上一行「血量」标签对齐） */
  hp_delta_label?: string | null
  /** 危局基础血量，组件内用 formatHp 格式化 */
  crisis_base_hp?: number | null
  /** 危局血量系数展示，如 150% */
  hp_coeff_label?: string | null
  /** 危局血量系数差值文本，如 +5.0% */
  hp_coeff_delta_label?: string | null
  level?: number | null
  defense?: number | null
  /** 失衡时间（秒） */
  stagger_time?: number | null
  /** 失衡易伤乘数（1.5 = 150%）；缺省回退 DEFAULT_ENEMY_STAGGER_MULTIPLIER */
  stagger_multiplier?: number | null
  /** 弱点行常驻，无可识别属性时显示占位「无」 */
  weakness?: string | null
  /** 抗性行常驻，无可识别属性时显示占位「无」 */
  resistance?: string | null
  resistance_high?: string | null
  /** 敌人类别（决定基础异常条）：普通 / 精英 / 首领；缺省按「首领」 */
  monster_category?: 'normal' | 'elite' | 'boss' | null
  /** 异常条系数（初始异常积蓄 = 基础异常条 × 系数 × 版本系数），由数据侧下发；缺省视为未配置 */
  anomaly_bar_coefficient?: number | null
  /** 该怪物所在期数 / 赛季的游戏版本（如 3.2）；用于版本系数判定，缺省不乘 */
  version?: string | null
  /** 该 Boss 是否在起算版本 2.1（含）时就已存在；与 version ≥2.1 同时成立时才乘版本系数 */
  boss_existed_by_multiplier_version?: boolean
}

const props = defineProps<{
  /** 右侧数据行取值；缺省时只渲染左侧图片列（怪物数据库的未选择 / 查无基础库记录态） */
  record?: MonsterDetailRecord | null
  /** 左侧图片地址；缺省渲染「怪物图片」占位块 */
  imageUrl?: string | null
  /** 图片 alt；缺省回退 record.boss_name */
  imageAlt?: string
  /** 是否把图片（含占位块）作为点击入口：为真才有 role=button / 键盘可达 / 手型光标 */
  imageClickable?: boolean
  /** 图片列下方常驻提示，如「点击怪物图片可更换怪物」；缺省不渲染（可点击时也用作无障碍名称） */
  imageHint?: string | null
  /** 是否在数据块右侧渲染「弱点与抗性」表（六属性 × 伤害/异常积蓄/失衡/初始异常积蓄） */
  showResistanceTable?: boolean
}>()

const emit = defineEmits<{
  imageClick: []
}>()

/** 失衡易伤展示：150%（1.5）；未配置时回退默认 1.5（与怪物详情弹窗同口径） */
const staggerMultiplierLabel = computed(() => {
  const multiplier = props.record?.stagger_multiplier ?? DEFAULT_ENEMY_STAGGER_MULTIPLIER
  return `${Math.round(multiplier * 100)}%（${multiplier}）`
})

/** 异常条系数展示：数据侧未配置时显示「未配置」，不拿 1 冒充已配置 */
const anomalyBarCoefficientLabel = computed(() => {
  const coefficient = props.record?.anomaly_bar_coefficient
  return isAnomalyBarCoefficientConfigured(coefficient) ? String(coefficient) : '未配置'
})

/**
 * 版本系数是否生效（该 Boss 在 2.1（含）时就已存在，且当前期数 ≥2.1 才 ×1.1）：
 * 与表侧同一判定函数，避免「红色 ×1.1」与数值口径分叉。
 */
const anomalyBarVersionMultiplierActive = computed(() =>
  isAnomalyBarVersionMultiplier(
    props.record?.version,
    props.record?.boss_existed_by_multiplier_version,
  ),
)

/** 「弱点与抗性」表数据：仅在显式开启且存在数据块（弱点/抗性来源）时生成 */
const resistanceRows = computed<MonsterResistanceRow[]>(() => {
  if (!props.showResistanceTable || !props.record) return []
  return buildMonsterResistanceRows({
    weakness: props.record.weakness,
    resistance: props.record.resistance,
    resistance_high: props.record.resistance_high,
    level: props.record.level,
    monster_category: props.record.monster_category,
    anomaly_bar_coefficient: props.record.anomaly_bar_coefficient,
    version: props.record.version,
    boss_existed_by_multiplier_version: props.record.boss_existed_by_multiplier_version,
  })
})

/** 存在估算行（异常条系数未配置）时才渲染脚注，避免无谓的底部说明 */
const hasEstimatedMaxAnomalyProgress = computed(() =>
  resistanceRows.value.some((row) => row.maxAnomalyProgressEstimated),
)

/** 百分比展示：负值保留 -，正值与 0 不加 +（对齐怪物页口径） */
function formatPercent(percent: number): string {
  return `${percent}%`
}

/** 初始异常积蓄按千分位展示，如 3,960 */
function formatMaxAnomalyProgress(value: number): string {
  return value.toLocaleString('en-US')
}

function onImageClick() {
  if (!props.imageClickable) return
  emit('imageClick')
}

function onImageKeydown(event: KeyboardEvent) {
  if (!props.imageClickable) return
  if (event.key !== 'Enter' && event.key !== ' ') return
  event.preventDefault()
  emit('imageClick')
}
</script>

<template>
  <div
    class="monster-detail-stats"
    :class="{ 'monster-detail-stats--with-resistance-table': resistanceRows.length > 0 }"
  >
    <div class="monster-detail-media">
      <div
        class="monster-detail-image"
        :class="{ 'monster-detail-image--clickable': imageClickable }"
        :role="imageClickable ? 'button' : undefined"
        :aria-label="imageClickable ? imageHint || '更换怪物' : undefined"
        :tabindex="imageClickable ? 0 : undefined"
        @click="onImageClick"
        @keydown="onImageKeydown"
      >
        <img v-if="imageUrl" :src="imageUrl" :alt="imageAlt || record?.boss_name || ''" />
        <span v-else class="monster-detail-placeholder">怪物图片</span>
      </div>
      <p v-if="imageHint" class="monster-detail-image-hint">{{ imageHint }}</p>
    </div>

    <div v-if="record" class="monster-detail-data">
      <p v-if="record.boss_name" class="detail-row">
        <span class="detail-label">怪物：</span>
        <span class="detail-value detail-value--name">{{ record.boss_name }}</span>
      </p>
      <p v-if="record.hp" class="detail-row">
        <span class="detail-label">血量：</span>
        <span class="detail-value">{{ record.hp }}</span>
        <span v-if="record.hp_expansion" class="detail-hp-expansion">
          {{ record.hp_expansion }}
        </span>
      </p>
      <p v-if="record.hp_delta_label" class="detail-row">
        <span class="detail-label detail-label--ghost" aria-hidden="true">血量：</span>
        <span class="detail-hp-delta">{{ record.hp_delta_label }}</span>
      </p>
      <p v-if="record.level != null" class="detail-row">
        <span class="detail-label">等级：</span>
        <span class="detail-value">{{ record.level }}</span>
      </p>
      <p v-if="record.crisis_base_hp != null" class="detail-row">
        <span class="detail-label">基础血量：</span>
        <span class="detail-value">{{ formatHp(record.crisis_base_hp) }}</span>
      </p>
      <p v-if="record.hp_coeff_label" class="detail-row">
        <span class="detail-label">危局血量系数：</span>
        <span class="detail-value">{{ record.hp_coeff_label }}</span>
        <span v-if="record.hp_coeff_delta_label" class="detail-hp-expansion">
          {{ record.hp_coeff_delta_label }}
        </span>
      </p>
      <p v-if="record.defense != null" class="detail-row">
        <span class="detail-label">防御：</span>
        <span class="detail-value">{{ record.defense }}</span>
      </p>
      <p v-if="record.stagger_time != null" class="detail-row">
        <span class="detail-label">失衡时间：</span>
        <span class="detail-value">{{ record.stagger_time }} 秒</span>
      </p>
      <p class="detail-row">
        <span class="detail-label">失衡易伤：</span>
        <span class="detail-value">{{ staggerMultiplierLabel }}</span>
      </p>
      <p class="detail-row">
        <span class="detail-label">异常条系数：</span>
        <span class="detail-value">{{ anomalyBarCoefficientLabel }}</span>
        <span v-if="anomalyBarVersionMultiplierActive" class="detail-version-multiplier">
          × {{ ANOMALY_BAR_VERSION_MULTIPLIER }}
        </span>
      </p>
      <p class="detail-row">
        <span class="detail-label">弱点：</span>
        <span class="detail-value">
          <ElementTraitIcons :value="record.weakness" variant="weak" show-percent empty-text="无" />
        </span>
      </p>
      <p class="detail-row">
        <span class="detail-label">抗性：</span>
        <span class="detail-value">
          <ElementTraitIcons
            :value="record.resistance"
            :high-value="record.resistance_high"
            variant="resist"
            show-percent
            empty-text="无"
          />
        </span>
      </p>
    </div>

    <div v-if="resistanceRows.length" class="monster-resistance-table">
      <table class="monster-resistance-grid">
        <caption class="monster-resistance-caption">
          弱点与抗性
        </caption>
        <thead>
          <tr>
            <th scope="col">类型</th>
            <th scope="col">伤害</th>
            <th scope="col">异常积蓄</th>
            <th scope="col">失衡</th>
            <th scope="col" title="0 次已异常时的初始条长 × 异常条系数 × 版本系数">初始异常积蓄</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in resistanceRows" :key="row.element">
            <th scope="row" class="monster-resistance-element-cell">
              <span class="monster-resistance-element">
                <img
                  v-if="row.icon"
                  class="monster-resistance-icon"
                  :src="row.icon"
                  :alt="row.element"
                  :title="row.element"
                  loading="lazy"
                />
                <span class="monster-resistance-element-name">{{ row.element }}</span>
              </span>
            </th>
            <td>{{ formatPercent(row.damagePercent) }}</td>
            <td>{{ formatPercent(row.anomalyPercent) }}</td>
            <td>{{ formatPercent(row.staggerPercent) }}</td>
            <td>
              <span>{{ formatMaxAnomalyProgress(row.maxAnomalyProgress) }}</span>
              <span v-if="row.maxAnomalyProgressEstimated" class="monster-resistance-estimated">
                *
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="hasEstimatedMaxAnomalyProgress" class="monster-resistance-footnote">
        * 未配置异常条系数，数值为估算值
      </p>
    </div>
  </div>
</template>

<style scoped>
/* 与怪物详情弹窗同构：左图右数据的两列布局 */
.monster-detail-stats {
  display: flex;
  align-items: flex-start;
  gap: clamp(0.75rem, 2vw, 1.25rem);
}

/* 布局：图片列固定占 21%，数据列吃剩余空间；与表格并排时也是 21%（同一规则） */
.monster-detail-media {
  flex-shrink: 0;
  width: 21%;
  min-width: 150px;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.monster-detail-image {
  /* 图片列定宽后给图片本身设上限并居中，避免 3:4 竖图在宽屏下过高 */
  width: min(100%, 360px);
  margin-inline: auto;
  aspect-ratio: 3 / 4;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  background: var(--color-background-mute);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.monster-detail-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.monster-detail-image--clickable {
  cursor: pointer;
  transition: border-color 0.18s;
}

.monster-detail-image--clickable:hover {
  border-color: var(--color-border-hover);
}

.monster-detail-image--clickable:focus-visible {
  outline: 2px solid var(--color-border-hover);
  outline-offset: 2px;
}

.monster-detail-image-hint {
  margin: 0;
  font-size: 0.72rem;
  line-height: 1.4;
  text-align: center;
  color: var(--color-text);
}

.monster-detail-placeholder {
  font-size: 0.85rem;
  opacity: 0.45;
  padding: 0.5rem;
  text-align: center;
}

.monster-detail-data {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.detail-row {
  margin: 0;
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.1rem 0.15rem;
  font-size: clamp(0.82rem, 1.4vw, 0.92rem);
  line-height: 1.45;
}

/* 与数值拉开层次的中性标签色，不用强调红（红色只留给血量增量等语义） */
.detail-label {
  flex-shrink: 0;
  font-weight: 700;
  color: var(--color-text);
}

.detail-value {
  min-width: 0;
  font-weight: 600;
  color: var(--color-heading);
  overflow-wrap: anywhere;
}

.detail-value--name {
  font-weight: 700;
  color: #e8a838;
}

.detail-label--ghost {
  visibility: hidden;
}

/* 与怪物卡片（.enemy-hp-delta / .enemy-hp-expansion）同色的增长标识 */
.detail-hp-delta {
  min-width: 0;
  font-size: 0.74rem;
  font-weight: 600;
  color: #e85d4c;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.detail-hp-expansion {
  font-size: 0.78rem;
  font-weight: 600;
  color: #4d9fff;
  white-space: normal;
  overflow-wrap: anywhere;
}

/* 版本系数（旧 Boss 在 2.1 起 ×1.1）：用强调红标出，表示最终值里额外乘了这一档 */
.detail-version-multiplier {
  font-size: 0.78rem;
  font-weight: 650;
  color: #e85d4c;
  font-variant-numeric: tabular-nums;
}

/* 第三列：弱点与抗性表（六属性 × 伤害 / 异常积蓄 / 失衡 / 初始异常积蓄） */
.monster-resistance-table {
  flex: 0 0 auto;
  /* 与图片 / 数据三列并排时表格占 53% */
  width: 53%;
  min-width: 0;
  /* 极端窄屏下表格内部滚动，避免撑出整页横向滚动条 */
  overflow-x: auto;
}

.monster-resistance-grid {
  width: 100%;
  border-collapse: collapse;
  font-size: clamp(0.76rem, 1.3vw, 0.86rem);
  font-variant-numeric: tabular-nums;
}

.monster-resistance-caption {
  caption-side: top;
  padding: 0 0 0.3rem;
  text-align: left;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--color-text);
}

.monster-resistance-grid th,
.monster-resistance-grid td {
  padding: 0.24rem 0.34rem;
  border-bottom: 1px solid var(--color-border);
  text-align: center;
  font-weight: 600;
  line-height: 1.35;
  color: var(--color-heading);
}

.monster-resistance-grid thead th {
  background: var(--color-background-mute);
  font-weight: 700;
  color: var(--color-text);
}

/* 类型列按内容收窄，其余数值列均分剩余宽度（选择器需压过 .monster-resistance-grid th） */
.monster-resistance-grid .monster-resistance-element-cell {
  width: 1%;
  white-space: nowrap;
  text-align: left;
}

.monster-resistance-element {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.monster-resistance-icon {
  width: 1.05em;
  height: 1.05em;
  border-radius: 2px;
  object-fit: contain;
}

.monster-resistance-element-name {
  font-weight: 600;
}

/* 未配置异常条系数时的估算标注：保留数值但压低对比度，避免被读成精确的初始异常积蓄 */
.monster-resistance-estimated {
  opacity: 0.6;
}

.monster-resistance-footnote {
  margin: 0.3rem 0 0;
  font-size: 0.72rem;
  line-height: 1.4;
  color: var(--color-text);
  opacity: 0.6;
}

@media (max-width: 768px) {
  .monster-detail-stats {
    flex-direction: column;
    align-items: center;
  }

  .monster-detail-media {
    width: min(180px, 56vw);
  }

  .monster-detail-data {
    width: 100%;
  }

  /* 已竖排：表跟随数据块占满整行，避免 33% 宽显得过窄 */
  .monster-resistance-table {
    width: 100%;
  }
}

/* 中等宽度（769–900px）三列并排会明显挤压数据行：让表整行落到数据块下方 */
@media (min-width: 769px) and (max-width: 900px) {
  .monster-detail-stats--with-resistance-table {
    flex-wrap: wrap;
  }

  .monster-detail-stats--with-resistance-table .monster-resistance-table {
    flex: 1 1 100%;
    width: 100%;
  }
}
</style>

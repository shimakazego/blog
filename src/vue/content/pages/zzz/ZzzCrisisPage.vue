<template>
    <main class="crisis-page">
        <aside class="crisis-sidebar">
            <RouterLink class="back-link"
                        to="/#game-guides">返回游戏攻略</RouterLink>

            <h1 class="side-title">危局强袭</h1>

            <nav class="side-nav">
                <button v-for="panel in panels"
                        :key="panel.id"
                        type="button"
                        class="side-nav-button"
                        :class="{active: activePanel === panel.id}"
                        @click="activePanel = panel.id">
                    <span/>
                    {{ panel.label }}
                </button>
            </nav>

            <div class="side-mark">ZZZ-HP</div>
        </aside>

        <section class="crisis-content">
            <header class="mobile-head">
                <RouterLink class="back-link"
                            to="/#game-guides">返回</RouterLink>
                <strong>危局强袭</strong>
            </header>

            <div class="panel-head">
                <span class="eyebrow">CRISIS ASSAULT / {{ activePanelLabel }}</span>
                <h2>{{ activePanelLabel }}</h2>
                <p>{{ activePanelDescription }}</p>
            </div>

            <p v-if="loading"
               class="status-card">数据加载中...</p>
            <p v-else-if="error"
               class="status-card error">{{ error }}</p>

            <template v-else>
                <section v-if="activePanel === 'history'"
                         class="history-layout">
                    <div class="phase-list">
                        <button v-for="phase in phaseList"
                                :key="phase.id"
                                type="button"
                                class="phase-button"
                                :class="{active: selectedPhase?.id === phase.id}"
                                @click="selectedPhaseId = phase.id">
                            <strong>{{ formatPhaseTitle(phase) }}</strong>
                            <span>{{ formatDateRange(phase) }}</span>
                            <em>{{ formatHp(phase.totalHp) }}</em>
                        </button>
                    </div>

                    <article v-if="selectedPhase"
                             class="phase-detail">
                        <div class="detail-title-row">
                            <div>
                                <span class="eyebrow">PHASE DETAIL</span>
                                <h3>{{ formatPhaseTitle(selectedPhase) }}</h3>
                            </div>
                            <strong>{{ formatHp(selectedPhase.totalHp) }}</strong>
                        </div>

                        <div class="boss-grid">
                            <article v-for="boss in selectedPhase.bosses"
                                     :key="boss.id"
                                     class="boss-card">
                                <img v-if="boss.boss_image"
                                     :src="assetUrl(boss.boss_image)"
                                     :alt="boss.boss_name">
                                <div>
                                    <span>房间 {{ boss.room }} / Lv{{ boss.level }}</span>
                                    <h4>{{ boss.boss_name }}</h4>
                                    <p>HP {{ formatHp(boss.hp) }}</p>
                                    <p>弱点 {{ boss.weakness || "无" }} · 抗性 {{ boss.resistance || "无" }}</p>
                                </div>
                            </article>
                        </div>

                        <div class="buff-grid">
                            <article v-for="buff in selectedPhase.buffs"
                                     :key="buff.id"
                                     class="buff-card">
                                <strong>{{ buff.buff_name }}</strong>
                                <p>{{ buff.buff || "暂无 Buff 描述" }}</p>
                            </article>
                        </div>
                    </article>
                </section>

                <section v-else-if="activePanel === 'hp-chart'"
                         class="chart-panel">
                    <div class="chart-summary">
                        <article>
                            <span>{{ sortedPhases.length }}</span>
                            <strong>期数</strong>
                        </article>
                        <article>
                            <span>{{ formatHp(maxTotalHp) }}</span>
                            <strong>最高总血量</strong>
                        </article>
                        <article>
                            <span>{{ formatHp(latestPhase?.totalHp) }}</span>
                            <strong>最新总血量</strong>
                        </article>
                    </div>

                    <div class="chart-box">
                        <div ref="totalChartRef"
                             class="echart-line"
                             role="img"
                             aria-label="危局强袭总血量折线图"/>
                    </div>

                    <article v-if="selectedChartPhase"
                             class="chart-detail">
                        <span class="eyebrow">SELECTED POINT</span>
                        <h3>{{ formatPhaseTitle(selectedChartPhase) }}</h3>
                        <p>{{ formatDateRange(selectedChartPhase) }} · 总血量 {{ formatHp(selectedChartPhase.totalHp) }}</p>
                    </article>
                </section>

                <section v-else-if="activePanel === 'monster-compare'"
                         class="monster-layout">
                    <div class="boss-picker">
                        <button v-for="boss in bossOptions"
                                :key="boss.boss_name"
                                type="button"
                                class="boss-option"
                                :class="{active: selectedBossName === boss.boss_name}"
                                @click="selectBoss(boss.boss_name)">
                            <img v-if="boss.boss_image"
                                 :src="assetUrl(boss.boss_image)"
                                 :alt="boss.boss_name">
                            <span>{{ boss.boss_name }}</span>
                        </button>
                    </div>

                    <div class="chart-box monster-chart">
                        <p v-if="bossChartLoading"
                           class="status-card">Boss 趋势加载中...</p>
                        <p v-else-if="bossChartError"
                           class="status-card error">{{ bossChartError }}</p>
                        <div v-else
                             ref="bossChartRef"
                             class="echart-line"
                             role="img"
                             aria-label="Boss 血量趋势图"/>
                    </div>
                </section>
            </template>
        </section>
    </main>
</template>

<script setup>
import * as echarts from "echarts/core"
import {GridComponent, TooltipComponent} from "echarts/components"
import {LineChart} from "echarts/charts"
import {CanvasRenderer} from "echarts/renderers"
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from "vue"
import {getCrisisBossChart, getCrisisBosses, getCrisisPhases} from "/src/data/zzzApi.js"

echarts.use([GridComponent, TooltipComponent, LineChart, CanvasRenderer])

const panels = [
    {id: "history", label: "往期详情", description: "按期数浏览 Boss、Buff、血量和日期。"},
    {id: "hp-chart", label: "血量折线图", description: "查看危局强袭总血量随版本变化的趋势。"},
    {id: "monster-compare", label: "单独怪物对比", description: "选择 Boss 后查看它在不同期数中的血量变化。"}
]

const activePanel = ref("history")
const phases = ref([])
const bossOptions = ref([])
const selectedPhaseId = ref("")
const selectedChartPhaseId = ref("")
const selectedBossName = ref("")
const bossChart = ref([])
const loading = ref(true)
const error = ref("")
const bossChartLoading = ref(false)
const bossChartError = ref("")
const totalChartRef = ref(null)
const bossChartRef = ref(null)
let totalChartInstance = null
let bossChartInstance = null

const activePanelMeta = computed(() => panels.find(panel => panel.id === activePanel.value) || panels[0])
const activePanelLabel = computed(() => activePanelMeta.value.label)
const activePanelDescription = computed(() => activePanelMeta.value.description)
const sortedPhases = computed(() => [...phases.value].sort((a, b) => getPhaseSortValue(a) - getPhaseSortValue(b)))
const phaseList = computed(() => [...sortedPhases.value].reverse())
const latestPhase = computed(() => sortedPhases.value[sortedPhases.value.length - 1])
const selectedPhase = computed(() => sortedPhases.value.find(phase => phase.id === selectedPhaseId.value) || latestPhase.value)
const selectedChartPhase = computed(() => sortedPhases.value.find(phase => phase.id === selectedChartPhaseId.value) || latestPhase.value)
const maxTotalHp = computed(() => Math.max(...sortedPhases.value.map(phase => Number(phase.totalHp) || 0), 1))
const bossMaxHp = computed(() => Math.max(...bossChart.value.map(item => Number(item.totalHp) || 0), 1))

function assetUrl(path) {
    if(!path) return ""
    if(/^https?:\/\//.test(path)) return path
    return path.startsWith("/") ? path : `/${path}`
}

function formatHp(value) {
    const number = Number(value)
    if(!Number.isFinite(number)) return "—"
    if(number >= 100000000) return `${(number / 100000000).toFixed(2)} 亿`
    if(number >= 10000) return `${(number / 10000).toFixed(1)} 万`
    return String(number)
}

function formatPhaseTitle(phase) {
    if(!phase) return "未知期数"
    return `${phase.version} · 第 ${phase.phase} 期`
}

function formatDateRange(phase) {
    if(!phase) return "未知日期"
    return `${phase.startDate || "未知开始"} → ${phase.endDate || "未知结束"}`
}

function getPhaseSortValue(phase) {
    const version = String(phase?.version || "").match(/\d+(?:\.\d+)?/)?.[0] || "0"
    const currentPhase = String(phase?.phase || "").match(/\d+/)?.[0] || "0"
    const id = String(phase?.id || "").match(/\d/g)?.join("") || "0"
    return Number(version) * 10000 + Number(currentPhase) * 100 + Number(id) / 100000
}

function makeLineOption(rows, title) {
    const labels = rows.map(item => item.label || `${item.version}-${item.phase}`)
    const values = rows.map(item => Number(item.totalHp) || 0)

    return {
        backgroundColor: "transparent",
        color: ["#fbfe00"],
        grid: {
            top: 28,
            right: 28,
            bottom: 44,
            left: 78,
            containLabel: false
        },
        tooltip: {
            trigger: "axis",
            axisPointer: {
                type: "line",
                lineStyle: {
                    color: "rgba(251, 254, 0, 0.45)",
                    width: 2
                }
            },
            backgroundColor: "rgba(8, 8, 8, 0.94)",
            borderColor: "rgba(251, 254, 0, 0.55)",
            borderWidth: 1,
            textStyle: {
                color: "#f5f5f0"
            },
            formatter(params) {
                const point = params?.[0]
                const row = rows[point?.dataIndex]
                if(!point || !row) return ""
                return [
                    `<strong>${title}</strong>`,
                    `${row.version ? `${row.version} · ` : ""}${row.phase ? `第 ${row.phase} 期` : row.label}`,
                    `血量：${formatHp(point.value)}`
                ].join("<br/>")
            }
        },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: labels,
            axisLine: {lineStyle: {color: "rgba(245, 245, 240, 0.35)"}},
            axisTick: {show: false},
            axisLabel: {
                color: "rgba(245, 245, 240, 0.68)",
                fontSize: 11,
                hideOverlap: true
            }
        },
        yAxis: {
            type: "value",
            min: 0,
            axisLine: {show: true, lineStyle: {color: "rgba(245, 245, 240, 0.35)"}},
            axisTick: {show: false},
            axisLabel: {
                color: "rgba(245, 245, 240, 0.72)",
                formatter: value => formatHp(value)
            },
            splitLine: {
                lineStyle: {
                    color: "rgba(255, 255, 255, 0.1)"
                }
            }
        },
        series: [{
            name: title,
            type: "line",
            data: values,
            smooth: true,
            symbol: "circle",
            symbolSize: 8,
            showSymbol: true,
            lineStyle: {
                width: 3,
                color: "#fbfe00"
            },
            itemStyle: {
                color: "#050505",
                borderColor: "#fbfe00",
                borderWidth: 3
            },
            emphasis: {
                scale: 1.35,
                itemStyle: {
                    color: "#fbfe00"
                }
            },
            areaStyle: {
                color: {
                    type: "linear",
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                        {offset: 0, color: "rgba(251, 254, 0, 0.18)"},
                        {offset: 1, color: "rgba(251, 254, 0, 0)"}
                    ]
                }
            }
        }]
    }
}

function renderChart(targetRef, instanceKey, rows, title) {
    const element = targetRef.value
    if(!element || !rows.length) return

    let instance = instanceKey === "total" ? totalChartInstance : bossChartInstance

    // `v-if` 会重建图表容器，旧实例仍然绑定在旧 DOM 上，需要在这里重新挂载。
    if(instance && instance.getDom() !== element) {
        instance.dispose()
        instance = null
        if(instanceKey === "total") totalChartInstance = null
        else bossChartInstance = null
    }

    if(!instance) {
        instance = echarts.init(element)
    }

    instance.setOption(makeLineOption(rows, title), true)
    instance.resize()

    if(instanceKey === "total") totalChartInstance = instance
    else bossChartInstance = instance
}

async function refreshCharts() {
    await nextTick()
    if(activePanel.value === "hp-chart") {
        renderChart(totalChartRef, "total", sortedPhases.value, "危局总血量")
    }
    if(activePanel.value === "monster-compare" && !bossChartLoading.value && !bossChartError.value) {
        renderChart(bossChartRef, "boss", bossChart.value, selectedBossName.value || "Boss 血量")
    }
}

function resizeCharts() {
    totalChartInstance?.resize()
    bossChartInstance?.resize()
}

async function selectBoss(name) {
    selectedBossName.value = name
    bossChartLoading.value = true
    bossChartError.value = ""
    try {
        const data = await getCrisisBossChart(name, "normal")
        bossChart.value = Array.isArray(data) ? data : []
    }
    catch(err) {
        bossChartError.value = err.message || "Boss 趋势接口暂时不可用"
        bossChart.value = []
    }
    finally {
        bossChartLoading.value = false
    }
}

watch(bossOptions, (options) => {
    if(!selectedBossName.value && options.length) {
        selectBoss(options[0].boss_name)
    }
})

watch([activePanel, sortedPhases, bossChart, bossChartLoading, bossChartError], refreshCharts, {flush: "post"})

onMounted(async () => {
    window.addEventListener("resize", resizeCharts)
    loading.value = true
    try {
        const [phaseData, bossData] = await Promise.all([
            getCrisisPhases(),
            getCrisisBosses({roomType: "normal"})
        ])
        phases.value = Array.isArray(phaseData) ? phaseData : []
        bossOptions.value = Array.isArray(bossData) ? bossData : []
        selectedPhaseId.value = latestPhase.value?.id || ""
        selectedChartPhaseId.value = latestPhase.value?.id || ""
    }
    catch(err) {
        error.value = err.message || "危局强袭接口暂时不可用"
    }
    finally {
        loading.value = false
        refreshCharts()
    }
})

onBeforeUnmount(() => {
    window.removeEventListener("resize", resizeCharts)
    totalChartInstance?.dispose()
    bossChartInstance?.dispose()
})
</script>

<style scoped>
.crisis-page {
    --zzz-yellow: #fbfe00;
    --zzz-bg: #050505;
    --zzz-ink-2: #171717;
    --zzz-ink-3: #242424;
    --zzz-fg: #f5f5f0;
    --zzz-dim: rgba(245, 245, 240, 0.58);
    --zzz-line: rgba(255, 255, 255, 0.16);
    --site-navbar-height: 71px;
    display: flex;
    min-height: 100vh;
    padding-top: var(--site-navbar-height);
    background:
        radial-gradient(circle at 80% 12%, rgba(251, 254, 0, 0.12), transparent 30rem),
        #050505 url("/zzz-assets/tab-bg-point.webp") repeat;
    color: var(--zzz-fg);
    box-sizing: border-box;
}

.crisis-sidebar {
    width: 230px;
    min-height: calc(100vh - var(--site-navbar-height));
    position: sticky;
    top: var(--site-navbar-height);
    padding: 1.4rem 0.9rem;
    border-right: 2px solid #000;
    background: #050505;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
}

.back-link {
    color: var(--zzz-dim);
    font-size: 0.8rem;
    text-decoration: none;
}

.back-link:hover {
    color: var(--zzz-yellow);
}

.side-title {
    margin: 0;
    padding-bottom: 0.85rem;
    border-bottom: 1px solid var(--zzz-line);
    font-size: 1.35rem;
    font-weight: 900;
}

.side-title::after {
    content: "";
    display: block;
    width: 2.8rem;
    height: 4px;
    margin-top: 0.55rem;
    background: var(--zzz-yellow);
    transform: skew(-24deg);
}

.side-nav {
    display: grid;
    gap: 0.45rem;
}

.side-nav-button {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    width: 100%;
    min-height: 2.7rem;
    padding: 0.65rem 0.8rem;
    border: 1px solid #000;
    border-radius: 0.35rem;
    background: var(--zzz-ink-2);
    color: rgba(245, 245, 240, 0.86);
    text-align: left;
}

.side-nav-button span {
    width: 0.5rem;
    height: 0.5rem;
    border: 1px solid rgba(245, 245, 240, 0.38);
    transform: skew(-24deg);
}

.side-nav-button.active {
    background: var(--zzz-yellow);
    color: #080808;
    font-weight: 800;
}

.side-nav-button.active span {
    background: #080808;
    border-color: #080808;
}

.side-mark {
    margin-top: auto;
    color: transparent;
    font-size: 1rem;
    font-weight: 900;
    letter-spacing: 0.16em;
    -webkit-text-stroke: 1px var(--zzz-line);
}

.crisis-content {
    flex: 1;
    min-width: 0;
    padding: clamp(1rem, 3vw, 2rem);
    overflow: auto;
}

.mobile-head {
    display: none;
}

.panel-head {
    padding: 1.1rem 1.2rem;
    border: 1px solid var(--zzz-line);
    border-radius: 1rem 1rem 0.25rem 1rem;
    background: rgba(23, 23, 23, 0.9);
}

.eyebrow {
    color: var(--zzz-yellow);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
}

.panel-head h2 {
    margin: 0.35rem 0 0;
    font-size: clamp(1.7rem, 4vw, 3rem);
    font-weight: 900;
}

.panel-head p,
.status-card,
.phase-button span,
.phase-button em,
.boss-card p,
.buff-card p,
.chart-detail p,
.score-card p {
    color: var(--zzz-dim);
}

.status-card {
    margin-top: 1rem;
    padding: 1rem;
    border: 1px solid var(--zzz-line);
    background: rgba(255, 255, 255, 0.06);
}

.status-card.error {
    border-color: rgba(255, 120, 120, 0.38);
    color: #ffc5c5;
}

.history-layout {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    gap: 1rem;
    margin-top: 1rem;
}

.phase-list,
.boss-picker {
    display: grid;
    align-content: start;
    gap: 0.55rem;
    max-height: calc(100vh - 10rem);
    overflow: auto;
}

.phase-button,
.boss-option {
    border: 1px solid var(--zzz-line);
    background: rgba(255, 255, 255, 0.055);
    color: var(--zzz-fg);
    text-align: left;
}

.phase-button {
    display: grid;
    gap: 0.25rem;
    padding: 0.8rem;
}

.phase-button strong,
.phase-button em {
    font-style: normal;
}

.phase-button.active,
.boss-option.active {
    border-color: var(--zzz-yellow);
    box-shadow: inset 0 0 0 1px var(--zzz-yellow);
}

.phase-detail,
.chart-box,
.chart-detail,
.score-card {
    border: 1px solid var(--zzz-line);
    border-radius: 1rem 1rem 0.25rem 1rem;
    background: rgba(23, 23, 23, 0.88);
}

.phase-detail {
    padding: 1rem;
}

.detail-title-row,
.chart-summary {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
}

.detail-title-row h3,
.chart-detail h3 {
    margin: 0.3rem 0 0;
    font-size: 1.5rem;
}

.detail-title-row > strong {
    color: var(--zzz-yellow);
    font-size: 1.6rem;
}

.boss-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 1rem;
}

.boss-card {
    display: grid;
    grid-template-columns: 86px minmax(0, 1fr);
    gap: 0.85rem;
    padding: 0.8rem;
    border: 1px solid var(--zzz-line);
    background: rgba(255, 255, 255, 0.05);
}

.boss-card img,
.boss-option img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    background: #111;
}

.boss-card span {
    color: var(--zzz-yellow);
    font-size: 0.75rem;
}

.boss-card h4,
.buff-card strong {
    display: block;
    margin: 0.25rem 0;
}

.buff-grid {
    display: grid;
    gap: 0.75rem;
    margin-top: 0.75rem;
}

.buff-card {
    padding: 0.9rem;
    border: 1px solid var(--zzz-line);
    background: rgba(251, 254, 0, 0.06);
}

.chart-panel,
.monster-layout,
.score-layout {
    margin-top: 1rem;
}

.chart-summary {
    margin-bottom: 1rem;
}

.chart-summary article {
    flex: 1;
    padding: 1rem;
    border: 1px solid var(--zzz-line);
    background: rgba(255, 255, 255, 0.055);
}

.chart-summary span,
.score {
    display: block;
    color: var(--zzz-yellow);
    font-size: 1.9rem;
    font-weight: 900;
}

.chart-box {
    padding: 1rem;
    overflow-x: auto;
}

.echart-line {
    min-width: 760px;
    width: 100%;
    height: 360px;
}

.chart-detail {
    margin-top: 1rem;
    padding: 1rem;
}

.monster-layout {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    gap: 1rem;
}

.boss-option {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr);
    gap: 0.7rem;
    align-items: center;
    padding: 0.55rem;
}

.boss-option img {
    border-radius: 0.35rem;
}

.monster-chart {
    min-height: 360px;
}

.score-layout {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
}

.score-card {
    padding: 1.2rem;
}

@media (max-width: 900px) {
    .crisis-page {
        display: block;
        padding-top: var(--site-navbar-height);
    }

    .crisis-sidebar {
        display: none;
    }

    .mobile-head {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1rem;
    }

    .history-layout,
    .monster-layout,
    .score-layout,
    .boss-grid {
        grid-template-columns: 1fr;
    }

    .phase-list,
    .boss-picker {
        max-height: none;
    }
}
</style>

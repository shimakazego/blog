<template>
    <main class="defense-page">
        <aside class="defense-sidebar">
            <RouterLink class="back-link"
                        to="/#game-guides">返回游戏攻略</RouterLink>

            <div class="variant-switch">
                <button v-for="variant in variants"
                        :key="variant.id"
                        type="button"
                        class="variant-button"
                        :class="{active: activeVariant === variant.id}"
                        @click="activeVariant = variant.id">
                    {{ variant.label }}
                </button>
            </div>

            <h1 class="side-title">式舆防卫战</h1>

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

            <div class="side-mark">SHIYU</div>
        </aside>

        <section class="defense-content">
            <header class="mobile-head">
                <RouterLink class="back-link"
                            to="/#game-guides">返回</RouterLink>
                <strong>式舆防卫战</strong>
            </header>

            <div class="panel-head">
                <div class="panel-head-top">
                    <span class="eyebrow">SHIYU DEFENSE / {{ activeVariantLabel }} / {{ activePanelLabel }}</span>
                    <div class="mobile-variant-switch">
                        <button v-for="variant in variants"
                                :key="variant.id"
                                type="button"
                                class="variant-button"
                                :class="{active: activeVariant === variant.id}"
                                @click="activeVariant = variant.id">
                            {{ variant.shortLabel }}
                        </button>
                    </div>
                </div>
                <h2>{{ activePanelLabel }}</h2>
                <p>{{ activePanelDescription }}</p>
            </div>

            <p v-if="loading"
               class="status-card">数据加载中...</p>
            <p v-else-if="error"
               class="status-card error">{{ error }}</p>
            <p v-else-if="!sortedSeasons.length"
               class="status-card">当前没有可展示的式舆防卫战数据。</p>

            <template v-else>
                <section v-if="activePanel === 'history'"
                         class="history-layout">
                    <div class="phase-list">
                        <button v-for="season in seasonList"
                                :key="season.id || `${season.version}-${season.phase}`"
                                type="button"
                                class="phase-button"
                                :class="{active: selectedSeason?.id === season.id}"
                                @click="selectedSeasonId = season.id">
                            <strong>{{ formatSeasonTitle(season) }}</strong>
                            <span>{{ season.dateRange || formatDateRange(season) }}</span>
                            <em>{{ formatHp(season.totalHp) }}</em>
                        </button>
                    </div>

                    <article v-if="selectedSeason"
                             class="phase-detail">
                        <div class="detail-title-row">
                            <div>
                                <span class="eyebrow">SEASON DETAIL</span>
                                <h3>{{ formatSeasonTitle(selectedSeason) }}</h3>
                                <p class="detail-subline">{{ selectedSeason.nodeType || "未知节点" }} · {{ selectedSeason.dateRange || formatDateRange(selectedSeason) }}</p>
                            </div>
                            <strong>{{ formatHp(selectedSeason.totalHp) }}</strong>
                        </div>

                        <div class="summary-grid">
                            <article class="summary-card">
                                <span>防线</span>
                                <strong>{{ selectedSeason.frontiers?.length || 0 }}</strong>
                            </article>
                            <article class="summary-card">
                                <span>房间</span>
                                <strong>{{ countSeasonRooms(selectedSeason) }}</strong>
                            </article>
                            <article class="summary-card">
                                <span>波次</span>
                                <strong>{{ countSeasonWaves(selectedSeason) }}</strong>
                            </article>
                        </div>

                        <div class="frontier-list">
                            <article v-for="frontier in selectedSeason.frontiers || []"
                                     :key="frontier.id"
                                     class="frontier-card">
                                <div class="frontier-head">
                                    <div>
                                        <h4>{{ frontier.title }}</h4>
                                        <p>Lv{{ frontier.level || "?" }} · {{ frontier.rooms?.length || 0 }} 个房间</p>
                                    </div>
                                </div>

                                <div class="room-list">
                                    <article v-for="room in frontier.rooms || []"
                                             :key="room.id"
                                             class="room-card">
                                        <div class="room-head">
                                            <div>
                                                <strong>{{ room.label }}</strong>
                                                <span>Lv{{ room.level || "?" }} · {{ room.battleRooms?.length || 0 }} 个战斗房间</span>
                                            </div>
                                            <em>{{ formatHp(sumRoomHp(room)) }}</em>
                                        </div>

                                        <div v-if="room.roomBuff?.name || room.roomBuff?.lines?.length"
                                             class="room-buff-card">
                                            <strong>{{ room.roomBuff?.name || "关卡增益" }}</strong>
                                            <p>{{ formatBuffLines(room.roomBuff?.lines) }}</p>
                                        </div>

                                        <div v-if="room.zoneBuffs?.length"
                                             class="zone-buff-card">
                                            <span>区域 Buff</span>
                                            <p>{{ room.zoneBuffs.join(" / ") }}</p>
                                        </div>

                                        <div class="battle-room-list">
                                            <section v-for="battleRoom in room.battleRooms || []"
                                                     :key="battleRoom.id"
                                                     class="battle-room-card">
                                                <div class="battle-room-head">
                                                    <div>
                                                        <strong>{{ battleRoom.label }}</strong>
                                                        <span>{{ battleRoom.waveCount || battleRoom.waves?.length || 0 }} Wave</span>
                                                    </div>
                                                    <div class="trait-pills">
                                                        <small v-if="battleRoom.weakness?.length">弱点 {{ battleRoom.weakness.join("、") }}</small>
                                                        <small v-if="battleRoom.resistance?.length">抗性 {{ battleRoom.resistance.join("、") }}</small>
                                                    </div>
                                                </div>

                                                <div class="wave-list">
                                                    <div v-for="wave in battleRoom.waves || []"
                                                         :key="wave.label"
                                                         class="wave-block">
                                                        <span class="wave-label">{{ wave.label }}</span>
                                                        <div class="enemy-grid">
                                                            <article v-for="enemy in wave.enemies || []"
                                                                     :key="enemy.id"
                                                                     class="enemy-chip"
                                                                     :class="{'enemy-chip--boss': enemy.isBoss}">
                                                                <div class="enemy-chip-image">
                                                                    <img v-if="enemy.imageUrl"
                                                                         :src="assetUrl(enemy.imageUrl)"
                                                                         :alt="enemy.name">
                                                                    <span v-else>NO IMG</span>
                                                                </div>
                                                                <div class="enemy-chip-body">
                                                                    <strong>{{ enemy.name }}</strong>
                                                                    <p>HP {{ formatHp(enemy.hpValue || enemy.hp) }}</p>
                                                                    <p v-if="enemy.defense !== undefined">防御 {{ enemy.defense }}</p>
                                                                    <p v-if="enemy.weakness">弱点 {{ enemy.weakness }}</p>
                                                                    <p v-if="enemy.resistance && enemy.resistance !== '无'">抗性 {{ enemy.resistance }}</p>
                                                                </div>
                                                            </article>
                                                        </div>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>
                                    </article>
                                </div>
                            </article>
                        </div>
                    </article>
                </section>

                <section v-else-if="activePanel === 'hp-chart'"
                         class="chart-panel">
                    <div class="chart-summary">
                        <article>
                            <span>{{ sortedSeasons.length }}</span>
                            <strong>期数</strong>
                        </article>
                        <article>
                            <span>{{ formatHp(maxTotalHp) }}</span>
                            <strong>最高总血量</strong>
                        </article>
                        <article>
                            <span>{{ formatHp(latestSeason?.totalHp) }}</span>
                            <strong>最新总血量</strong>
                        </article>
                    </div>

                    <div class="chart-box">
                        <div ref="totalChartRef"
                             class="echart-line"
                             role="img"
                             aria-label="式舆防卫战总血量折线图"/>
                    </div>

                    <article v-if="selectedChartSeason"
                             class="chart-detail">
                        <span class="eyebrow">SELECTED POINT</span>
                        <h3>{{ formatSeasonTitle(selectedChartSeason) }}</h3>
                        <p>{{ selectedChartSeason.dateRange || formatDateRange(selectedChartSeason) }} · 总血量 {{ formatHp(selectedChartSeason.totalHp) }}</p>
                    </article>
                </section>

                <section v-else
                         class="room-compare-layout">
                    <div class="room-picker">
                        <button v-for="room in roomCompareOptions"
                                :key="room.key"
                                type="button"
                                class="room-option"
                                :class="{active: selectedRoomKey === room.key}"
                                @click="selectedRoomKey = room.key">
                            <strong>{{ room.frontierTitle }}</strong>
                            <span>{{ room.roomLabel }}</span>
                        </button>
                    </div>

                    <div class="chart-box room-chart">
                        <div ref="roomChartRef"
                             class="echart-line"
                             role="img"
                             aria-label="房间血量趋势图"/>
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
import {getDefenseSeasons} from "/src/data/zzzApi.js"

echarts.use([GridComponent, TooltipComponent, LineChart, CanvasRenderer])

const panels = [
    {id: "history", label: "往期详情", description: "按期数浏览防线、房间、Wave 与敌人配置。"},
    {id: "hp-chart", label: "血量折线图", description: "查看式舆防卫战总血量随期数变化的趋势。"},
    {id: "room-compare", label: "单独房间对比", description: "选择某个固定房间后查看它在各期中的血量变化。"}
]

const variants = [
    {id: "new", label: "新式舆", shortLabel: "新"},
    {id: "old", label: "旧式舆", shortLabel: "旧"}
]

const activePanel = ref("history")
const activeVariant = ref("new")
const newSeasons = ref([])
const oldSeasons = ref([])
const selectedSeasonId = ref("")
const selectedChartSeasonId = ref("")
const selectedRoomKey = ref("")
const loading = ref(true)
const error = ref("")
const totalChartRef = ref(null)
const roomChartRef = ref(null)
let totalChartInstance = null
let roomChartInstance = null

const activePanelMeta = computed(() => panels.find(panel => panel.id === activePanel.value) || panels[0])
const activePanelLabel = computed(() => activePanelMeta.value.label)
const activePanelDescription = computed(() => activePanelMeta.value.description)
const activeVariantLabel = computed(() => variants.find(variant => variant.id === activeVariant.value)?.label || "新式舆")
const currentSeasons = computed(() => activeVariant.value === "new" ? newSeasons.value : oldSeasons.value)
const sortedSeasons = computed(() => [...currentSeasons.value].sort((a, b) => getSeasonSortValue(a) - getSeasonSortValue(b)))
const seasonList = computed(() => [...sortedSeasons.value].reverse())
const latestSeason = computed(() => sortedSeasons.value[sortedSeasons.value.length - 1])
const selectedSeason = computed(() => sortedSeasons.value.find(season => season.id === selectedSeasonId.value) || latestSeason.value)
const selectedChartSeason = computed(() => sortedSeasons.value.find(season => season.id === selectedChartSeasonId.value) || latestSeason.value)
const maxTotalHp = computed(() => Math.max(...sortedSeasons.value.map(season => Number(season.totalHp) || 0), 1))

const roomCompareOptions = computed(() => {
    const season = selectedSeason.value
    if(!season) return []
    return flattenRooms(season).map(room => ({
        key: buildRoomKey(room.frontier, room.room),
        frontierTitle: room.frontier.title || "未知防线",
        roomLabel: room.room.label || "未知房间"
    }))
})

const roomCompareRows = computed(() => {
    if(!selectedRoomKey.value) return []
    return sortedSeasons.value
        .map(season => {
            const matched = flattenRooms(season).find(item => buildRoomKey(item.frontier, item.room) === selectedRoomKey.value)
            if(!matched) return null
            return {
                id: season.id,
                version: season.version,
                phase: season.phase,
                label: `${season.version}-${parsePhaseNumber(season.phase)}`,
                totalHp: sumRoomHp(matched.room)
            }
        })
        .filter(Boolean)
})

function assetUrl(path) {
    if(!path) return ""
    if(/^https?:\/\//.test(path)) return path
    return path.startsWith("/") ? path : `/${path}`
}

function parsePhaseNumber(phase) {
    return String(phase || "").match(/\d+/)?.[0] || String(phase || "")
}

function getSeasonSortValue(season) {
    const version = String(season?.version || "").match(/\d+(?:\.\d+)?/)?.[0] || "0"
    const phase = parsePhaseNumber(season?.phase)
    const id = String(season?.id || season?.seasonId || "").match(/\d/g)?.join("") || "0"
    return Number(version) * 10000 + Number(phase) * 100 + Number(id) / 100000
}

function formatHp(value) {
    const number = Number(String(value).replace(/,/g, ""))
    if(!Number.isFinite(number)) return "—"
    if(number >= 100000000) return `${(number / 100000000).toFixed(2)} 亿`
    if(number >= 10000) return `${(number / 10000).toFixed(1)} 万`
    return String(number)
}

function formatSeasonTitle(season) {
    if(!season) return "未知期数"
    return `${season.version} · ${season.phase}`
}

function formatDateRange(season) {
    return `${season.startDate || season.start_date || "未知开始"} → ${season.endDate || season.end_date || "未知结束"}`
}

function countSeasonRooms(season) {
    return flattenRooms(season).length
}

function countSeasonWaves(season) {
    return flattenRooms(season).reduce((sum, item) => sum + (item.room.battleRooms || []).reduce((acc, battleRoom) => acc + (battleRoom.waves || []).length, 0), 0)
}

function flattenRooms(season) {
    return (season?.frontiers || []).flatMap(frontier => (frontier.rooms || []).map(room => ({frontier, room})))
}

function buildRoomKey(frontier, room) {
    return `${frontier?.title || ""}::${room?.label || ""}`
}

function sumRoomHp(room) {
    return (room?.battleRooms || []).reduce((sum, battleRoom) => sum + (battleRoom.waves || []).reduce((acc, wave) => acc + (wave.enemies || []).reduce((enemySum, enemy) => enemySum + (Number(enemy.hpValue) || Number(String(enemy.hp || "").replace(/,/g, "")) || 0), 0), 0), 0)
}

function formatBuffLines(lines) {
    return Array.isArray(lines) ? lines.join(" / ") : "暂无描述"
}

function makeLineOption(rows, title) {
    return {
        backgroundColor: "transparent",
        color: ["#fbfe00"],
        grid: {
            top: 28,
            right: 28,
            bottom: 44,
            left: 78
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
                    `${row.version} · ${row.phase}`,
                    `血量：${formatHp(point.value)}`
                ].join("<br/>")
            }
        },
        xAxis: {
            type: "category",
            boundaryGap: false,
            data: rows.map(item => item.label),
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
            data: rows.map(item => Number(item.totalHp) || 0),
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

    let instance = instanceKey === "total" ? totalChartInstance : roomChartInstance
    if(instance && instance.getDom() !== element) {
        instance.dispose()
        instance = null
        if(instanceKey === "total") totalChartInstance = null
        else roomChartInstance = null
    }

    if(!instance) {
        instance = echarts.init(element)
    }

    instance.setOption(makeLineOption(rows, title), true)
    instance.resize()

    if(instanceKey === "total") totalChartInstance = instance
    else roomChartInstance = instance
}

async function refreshCharts() {
    await nextTick()
    if(activePanel.value === "hp-chart") {
        renderChart(totalChartRef, "total", sortedSeasons.value.map(season => ({
            id: season.id,
            version: season.version,
            phase: season.phase,
            label: `${season.version}-${parsePhaseNumber(season.phase)}`,
            totalHp: season.totalHp
        })), `${activeVariantLabel.value}总血量`)
    }
    if(activePanel.value === "room-compare" && roomCompareRows.value.length) {
        renderChart(roomChartRef, "room", roomCompareRows.value, `${selectedRoomKey.value.split("::").join(" / ")} 血量`)
    }
}

function resizeCharts() {
    totalChartInstance?.resize()
    roomChartInstance?.resize()
}

watch(activeVariant, () => {
    const latest = sortedSeasons.value[sortedSeasons.value.length - 1]
    selectedSeasonId.value = latest?.id || ""
    selectedChartSeasonId.value = latest?.id || ""
})

watch(selectedSeason, season => {
    const options = season ? flattenRooms(season).map(item => buildRoomKey(item.frontier, item.room)) : []
    if(options.length && !options.includes(selectedRoomKey.value)) {
        selectedRoomKey.value = options[0]
    }
})

watch([activePanel, activeVariant, sortedSeasons, roomCompareRows], refreshCharts, {flush: "post"})

onMounted(async () => {
    window.addEventListener("resize", resizeCharts)
    loading.value = true
    try {
        const [newData, oldData] = await Promise.all([
            getDefenseSeasons("new"),
            getDefenseSeasons("old")
        ])
        newSeasons.value = Array.isArray(newData) ? newData : []
        oldSeasons.value = Array.isArray(oldData) ? oldData : []
        const latest = [...(Array.isArray(newData) ? newData : [])].sort((a, b) => getSeasonSortValue(a) - getSeasonSortValue(b)).at(-1)
        selectedSeasonId.value = latest?.id || ""
        selectedChartSeasonId.value = latest?.id || ""
    }
    catch(err) {
        error.value = err.message || "防卫战接口暂时不可用"
    }
    finally {
        loading.value = false
        refreshCharts()
    }
})

onBeforeUnmount(() => {
    window.removeEventListener("resize", resizeCharts)
    totalChartInstance?.dispose()
    roomChartInstance?.dispose()
})
</script>

<style scoped>
.defense-page {
    --zzz-yellow: #fbfe00;
    --zzz-bg: #050505;
    --zzz-ink-2: #171717;
    --zzz-fg: #f5f5f0;
    --zzz-dim: rgba(245, 245, 240, 0.58);
    --zzz-line: rgba(255, 255, 255, 0.16);
    --site-navbar-height: 71px;
    display: flex;
    min-height: 100vh;
    padding-top: var(--site-navbar-height);
    background:
        radial-gradient(circle at 82% 12%, rgba(251, 254, 0, 0.1), transparent 28rem),
        #050505 url("/zzz-assets/tab-bg-point.webp") repeat;
    color: var(--zzz-fg);
    box-sizing: border-box;
}

.defense-sidebar {
    width: 238px;
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

.variant-switch,
.mobile-variant-switch {
    display: flex;
    gap: 0.5rem;
}

.variant-button {
    min-height: 2.35rem;
    padding: 0.45rem 0.75rem;
    border: 1px solid var(--zzz-line);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
    color: var(--zzz-dim);
    font-size: 0.78rem;
}

.variant-button.active {
    border-color: var(--zzz-yellow);
    background: var(--zzz-yellow);
    color: #080808;
    font-weight: 800;
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

.defense-content {
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

.panel-head-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
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
.detail-subline,
.room-head span,
.frontier-head p,
.room-buff-card p,
.zone-buff-card p,
.chart-detail p,
.battle-room-head span,
.trait-pills small,
.enemy-chip p,
.room-option span {
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
.room-picker {
    display: grid;
    align-content: start;
    gap: 0.55rem;
    max-height: calc(100vh - 10rem);
    overflow: auto;
}

.phase-button,
.room-option {
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
.room-option.active {
    border-color: var(--zzz-yellow);
    box-shadow: inset 0 0 0 1px var(--zzz-yellow);
}

.phase-detail,
.chart-box,
.chart-detail {
    border: 1px solid var(--zzz-line);
    border-radius: 1rem 1rem 0.25rem 1rem;
    background: rgba(23, 23, 23, 0.88);
}

.phase-detail {
    padding: 1rem;
}

.detail-title-row,
.chart-summary,
.frontier-head,
.room-head,
.battle-room-head,
.panel-head-top {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
}

.detail-title-row h3,
.chart-detail h3 {
    margin: 0.3rem 0 0;
    font-size: 1.5rem;
}

.detail-title-row > strong,
.room-head em {
    color: var(--zzz-yellow);
    font-size: 1.6rem;
    font-style: normal;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 1rem;
}

.summary-card,
.room-buff-card,
.zone-buff-card,
.battle-room-card,
.room-card,
.frontier-card {
    border: 1px solid var(--zzz-line);
    background: rgba(255, 255, 255, 0.05);
}

.summary-card {
    padding: 0.9rem;
}

.summary-card span {
    display: block;
    color: var(--zzz-dim);
    font-size: 0.76rem;
}

.summary-card strong {
    display: block;
    margin-top: 0.2rem;
    color: var(--zzz-yellow);
    font-size: 1.4rem;
}

.frontier-list,
.room-list,
.battle-room-list,
.wave-list {
    display: grid;
    gap: 0.9rem;
}

.frontier-list {
    margin-top: 1rem;
}

.frontier-card,
.room-card,
.battle-room-card {
    padding: 0.9rem;
}

.frontier-head h4,
.room-head strong,
.battle-room-head strong,
.enemy-chip-body strong {
    margin: 0;
}

.room-buff-card,
.zone-buff-card {
    padding: 0.75rem 0.85rem;
}

.room-buff-card strong,
.zone-buff-card span {
    display: block;
    margin-bottom: 0.35rem;
}

.trait-pills {
    display: grid;
    gap: 0.15rem;
    text-align: right;
}

.wave-block {
    display: grid;
    gap: 0.45rem;
}

.wave-label {
    color: var(--zzz-yellow);
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.06em;
}

.enemy-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
}

.enemy-chip {
    display: grid;
    grid-template-columns: 68px minmax(0, 1fr);
    gap: 0.75rem;
    padding: 0.75rem;
    border: 1px solid var(--zzz-line);
    background: rgba(255, 255, 255, 0.045);
}

.enemy-chip--boss {
    border-color: rgba(251, 254, 0, 0.35);
    background: rgba(251, 254, 0, 0.06);
}

.enemy-chip-image {
    width: 68px;
    height: 86px;
    overflow: hidden;
    background: #111;
}

.enemy-chip-image img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.enemy-chip-body {
    min-width: 0;
}

.chart-panel,
.room-compare-layout {
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

.chart-summary span {
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

.room-compare-layout {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    gap: 1rem;
}

.room-option {
    display: grid;
    gap: 0.2rem;
    padding: 0.7rem 0.8rem;
}

.mobile-variant-switch {
    display: none;
}

@media (max-width: 960px) {
    .history-layout,
    .room-compare-layout,
    .enemy-grid,
    .summary-grid {
        grid-template-columns: 1fr;
    }

    .detail-title-row,
    .frontier-head,
    .room-head,
    .battle-room-head {
        flex-direction: column;
    }

    .trait-pills {
        text-align: left;
    }
}

@media (max-width: 900px) {
    .defense-page {
        display: block;
        padding-top: var(--site-navbar-height);
    }

    .defense-sidebar {
        display: none;
    }

    .mobile-head {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1rem;
    }

    .mobile-variant-switch {
        display: flex;
    }

    .phase-list,
    .room-picker {
        max-height: none;
    }

    .panel-head-top {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>

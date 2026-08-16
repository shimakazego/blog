<template>
    <PageSection ref="sectionRef"
                 :id="props.id"
                 variant="default">
        <PageSectionHeader title="百合动漫"/>

        <PageSectionContent>
            <div class="yuri-wrap">
                <!-- 搜索 + 筛选工具栏 -->
                <div class="yuri-toolbar">
                    <div class="yuri-search">
                        <i class="pi pi-search yuri-search-icon"/>
                        <input v-model="searchInput"
                               class="yuri-search-input"
                               type="text"
                               placeholder="搜索作品名称…"
                               aria-label="搜索作品名称"
                               @input="onSearchInput"/>
                        <button v-if="searchInput"
                                class="yuri-search-clear"
                                type="button"
                                aria-label="清空搜索"
                                @click="clearSearch">
                            <i class="pi pi-times"/>
                        </button>
                    </div>

                    <div class="yuri-toolbar-divider"/>

                    <label class="yuri-filter-block">
                        <span class="yuri-filter-label">年份</span>
                        <select v-model="selectedYear"
                                class="yuri-select"
                                aria-label="按年份筛选"
                                @change="onFilterChange">
                            <option value="">全部年份</option>
                            <option v-for="year in yearOptions"
                                    :key="year"
                                    :value="year">
                                {{ year }}
                            </option>
                        </select>
                    </label>

                    <div class="yuri-rating-filter"
                         role="group"
                         aria-label="按评分筛选">
                        <span class="yuri-filter-label">评分</span>
                        <button v-for="option in ratingOptions"
                                :key="option.label"
                                type="button"
                                class="yuri-rating-btn"
                                :class="{'is-active': selectedMinScore === option.value}"
                                @click="onRatingChange(option.value)">
                            {{ option.label }}
                        </button>
                    </div>
                </div>

                <!-- 结果信息 -->
                <div class="yuri-meta">
                    <span class="yuri-meta-count">
                        <i class="pi pi-heart-fill yuri-meta-heart"/>
                        共 {{ yuriWorksState.length }} 部作品
                    </span>
                    <button v-if="hasActiveFilters"
                            type="button"
                            class="yuri-meta-reset"
                            @click="resetFilters">
                        <i class="pi pi-filter-slash"/> 重置筛选
                    </button>
                </div>

                <!-- 作品卡片 -->
                <div class="row g-3">
                    <div v-for="(work, index) in pagedWorks"
                         :key="work.id ?? work.name"
                         class="col-12 col-md-6 col-xl-4">
                        <article class="yuri-card"
                                 :style="{animationDelay: `${(index % 3) * 70}ms`}">
                            <a :href="work.primaryUrl"
                               target="_blank"
                               rel="noopener noreferrer"
                               class="yuri-card-cover">
                                <img :src="work.cover"
                                     @error="handleCoverError"
                                     :alt="work.name"
                                     loading="lazy">
                                <span v-if="work.kind"
                                      class="yuri-card-kind">
                                    {{ work.kind }}
                                </span>

                                <div v-if="work.score"
                                     class="yuri-card-score">
                                    <span class="yuri-card-score-value">{{ work.score }}</span>
                                    <span class="yuri-card-score-label">{{ work.scoreLabel }}</span>
                                </div>

                                <div class="yuri-card-overlay">
                                    <span class="yuri-card-overlay-text">
                                        <i class="pi pi-external-link me-1"/>查看豆瓣详情
                                    </span>
                                </div>
                            </a>

                            <div class="yuri-card-body">
                                <div class="yuri-card-head">
                                    <h3 class="yuri-card-title">{{ work.name }}</h3>
                                    <p v-if="work.titleOriginal"
                                       class="yuri-card-original">
                                        {{ work.titleOriginal }}
                                    </p>
                                </div>

                                <div v-if="work.metaLine.length"
                                     class="yuri-meta-row">
                                    <span v-for="meta in work.metaLine"
                                          :key="meta">
                                        {{ meta }}
                                    </span>
                                </div>

                                <div v-if="work.score"
                                     class="yuri-rating-row">
                                    <div class="yuri-rating-stars"
                                         :aria-label="`评分 ${work.score} / 10`">
                                        <span v-for="starIndex in 5"
                                              :key="starIndex"
                                              class="yuri-rating-star"
                                              :class="getStarClass(work.starValue, starIndex)">
                                            ★
                                        </span>
                                    </div>
                                    <span v-if="work.scoreCountText"
                                          class="yuri-rating-count">
                                        {{ work.scoreCountText }}
                                    </span>
                                </div>

                                <p class="yuri-card-summary">{{ work.summary }}</p>

                                <dl v-if="work.details.length"
                                    class="yuri-detail-list">
                                    <template v-for="detail in work.details"
                                              :key="detail.label">
                                        <dt>{{ detail.label }}</dt>
                                        <dd>{{ detail.value }}</dd>
                                    </template>
                                </dl>
                            </div>
                        </article>
                    </div>
                </div>

                <!-- 空状态 -->
                <div v-if="!pagedWorks.length && !isLoading"
                     class="yuri-empty">
                    <div class="yuri-empty-icon">
                        <i class="pi pi-heart-fill"/>
                    </div>
                    <p class="yuri-empty-title">没有找到匹配的作品</p>
                    <p class="yuri-empty-hint">换个关键词，或者放宽年份 / 评分条件再试试</p>
                    <button type="button"
                            class="yuri-empty-reset"
                            @click="resetFilters">
                        清空筛选条件
                    </button>
                </div>

                <!-- 分页 -->
                <div v-if="totalPages > 1"
                     class="yuri-pagination">
                    <button class="yuri-page-btn"
                            type="button"
                            :disabled="currentPage === 1"
                            @click="goToPage(currentPage - 1)">
                        上一页
                    </button>

                    <button v-for="page in visiblePages"
                            :key="page"
                            type="button"
                            class="yuri-page-btn"
                            :class="{'is-active': page === currentPage}"
                            @click="goToPage(page)">
                        {{ page }}
                    </button>

                    <button class="yuri-page-btn"
                            type="button"
                            :disabled="currentPage === totalPages"
                            @click="goToPage(currentPage + 1)">
                        下一页
                    </button>
                </div>
            </div>
        </PageSectionContent>
    </PageSection>
</template>

<script setup>
import {computed, nextTick, onBeforeUnmount, onMounted, ref} from "vue"
import PageSection from "/src/vue/components/layout/PageSection.vue"
import PageSectionHeader from "/src/vue/components/layout/PageSectionHeader.vue"
import PageSectionContent from "/src/vue/components/layout/PageSectionContent.vue"
import {yuriWorks as yuriFallbacks} from "/src/data/blogMockData.js"
import {listYuriEntries, resolveApiOrigin} from "/src/data/blogApi.js"

const props = defineProps({
    id: String
})

const PAGE_SIZE = 30
const sectionRef = ref(null)
const allWorks = ref([])
const yuriWorksState = ref([])
const currentPage = ref(1)
const isLoading = ref(false)
const API_ORIGIN = resolveApiOrigin().replace(/\/$/, "")

const searchInput = ref("")
const selectedYear = ref("")
const selectedMinScore = ref(null)

const ratingOptions = [
    {label: "全部", value: null},
    {label: "9分+", value: 9},
    {label: "8分+", value: 8},
    {label: "7分+", value: 7},
    {label: "6分+", value: 6}
]

const fallbackCovers = [
    "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80"
]

const entryTypeLabels = {
    anime: "动画",
    animation: "动画",
    movie: "电影",
    film: "电影",
    tv: "剧集",
    series: "剧集",
    ova: "OVA",
    comic: "漫画",
    manga: "漫画",
    novel: "小说",
    game: "游戏"
}

const yearOptions = computed(() => {
    const years = [...new Set(
        allWorks.value
            .map((work) => work.releaseYear)
            .filter((year) => year !== undefined && year !== null && year !== "")
    )]
    return years.sort((left, right) => Number(right) - Number(left))
})

const hasActiveFilters = computed(() => {
    return Boolean(searchInput.value.trim()) ||
        Boolean(selectedYear.value) ||
        selectedMinScore.value !== null
})

const totalPages = computed(() => Math.max(1, Math.ceil(yuriWorksState.value.length / PAGE_SIZE)))

const pagedWorks = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return yuriWorksState.value.slice(start, start + PAGE_SIZE)
})

const visiblePages = computed(() => {
    const pages = []
    const start = Math.max(1, currentPage.value - 2)
    const end = Math.min(totalPages.value, start + 4)

    for(let page = start; page <= end; page += 1) {
        pages.push(page)
    }

    return pages
})

let searchTimer = null

function onSearchInput() {
    clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
        applyFilters()
    }, 300)
}

function onFilterChange() {
    applyFilters()
}

function onRatingChange(value) {
    selectedMinScore.value = value
    applyFilters()
}

function clearSearch() {
    searchInput.value = ""
    applyFilters()
}

function resetFilters() {
    searchInput.value = ""
    selectedYear.value = ""
    selectedMinScore.value = null
    applyFilters()
}

async function goToPage(page) {
    currentPage.value = Math.min(totalPages.value, Math.max(1, page))
    await nextTick()
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            scrollToSectionTop()
        })
    })
}

function scrollToSectionTop() {
    const sectionElement = sectionRef.value?.$el ?? sectionRef.value
    if(!sectionElement) {
        return
    }

    const navHeight = document.querySelector(".foxy-navbar")?.getBoundingClientRect().height ?? 70
    const sectionTop = sectionElement.getBoundingClientRect().top + window.scrollY

    window.scrollTo({
        top: Math.max(0, sectionTop - navHeight),
        behavior: "smooth"
    })

    for(const container of getScrollableAncestors(sectionElement)) {
        const containerRect = container.getBoundingClientRect()
        const offsetTop = sectionElement.getBoundingClientRect().top - containerRect.top + container.scrollTop

        container.scrollTo({
            top: Math.max(0, offsetTop - 12),
            behavior: "smooth"
        })
    }
}

function getScrollableAncestors(element) {
    const containers = []
    let current = element.parentElement

    while(current) {
        const style = window.getComputedStyle(current)
        const overflowY = style.overflowY
        const canScroll = /(auto|scroll|overlay)/.test(overflowY) && current.scrollHeight > current.clientHeight

        if(canScroll) {
            containers.push(current)
        }

        current = current.parentElement
    }

    return containers
}

function toDisplayText(value = "") {
    if(!value) {
        return ""
    }

    return String(value)
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function pickScore(entry) {
    const rawScore = entry.score ?? entry.ratingValue
    if(rawScore === undefined || rawScore === null || rawScore === "") {
        return null
    }

    return String(rawScore)
}

function parseScoreCount(entry) {
    const directCount = entry.ratingCount ?? entry.scoreCount
    if(directCount !== undefined && directCount !== null && directCount !== "") {
        const numeric = Number(String(directCount).replace(/[^\d]/g, ""))
        return Number.isFinite(numeric) && numeric > 0 ? numeric : null
    }

    const byline = String(entry.byline || "")
    const match = byline.match(/(\d[\d,]*)\s*(?:人评价|ratings?)/i)
    return match ? Number(match[1].replace(/,/g, "")) : null
}

function formatScoreCount(count) {
    return count ? `${count}人评价` : null
}

function getStarValue(score) {
    const numeric = Number(score)
    if(!Number.isFinite(numeric)) {
        return 0
    }

    return Math.max(0, Math.min(5, numeric / 2))
}

function getStarClass(starValue, starIndex) {
    if(starValue >= starIndex) {
        return "is-full"
    }

    if(starValue >= starIndex - 0.5) {
        return "is-half"
    }

    return "is-empty"
}

function normalizeCoverSource(url) {
    if(!url) {
        return ""
    }

    if(url.startsWith("/")) {
        return `${API_ORIGIN}${url}`
    }

    try {
        const parsed = new URL(url)
        if(parsed.pathname.startsWith("/media/")) {
            return `${API_ORIGIN}${parsed.pathname}${parsed.search}`
        }
    }
    catch {
        return url
    }

    return url
}

function handleCoverError(event) {
    const image = event?.target
    if(!image || image.dataset.fallbackApplied === "1") {
        return
    }

    image.dataset.fallbackApplied = "1"
    image.src = fallbackCovers[Math.floor(Math.random() * fallbackCovers.length)]
}

function buildMetaLine({releaseYear, countriesText, originCountry, entryTypeLabel}) {
    return [releaseYear, countriesText || originCountry, entryTypeLabel].filter(Boolean)
}

function buildDetails(entry) {
    return [
        {label: "导演", value: entry.directorsText},
        {label: "主演", value: entry.castsText},
        {label: "类型", value: entry.genresText || entry.kind},
        {label: "制片国家/地区", value: entry.countriesText || entry.originCountry},
        {label: "年份", value: entry.yearText || entry.releaseYear}
    ].filter((detail) => detail.value)
}

function normalizeFallbackEntry(entry, index) {
    const primaryUrl = entry.links?.[0]?.url || "#"
    const cover = entry.cover || fallbackCovers[index % fallbackCovers.length]
    const score = pickScore(entry)
    const scoreCount = parseScoreCount(entry)
    const normalized = {
        id: `fallback-${index}`,
        name: entry.titleZh || entry.name,
        titleOriginal: entry.titleOriginal || null,
        kind: entry.kind || "站内整理",
        entryTypeLabel: "收藏卡片",
        releaseYear: entry.releaseYear || null,
        originCountry: entry.originCountry || null,
        countriesText: entry.countriesText || entry.originCountry || null,
        yearText: entry.yearText || entry.releaseYear || null,
        directorsText: entry.directorsText || null,
        castsText: entry.castsText || null,
        genresText: entry.genresText || entry.kind || null,
        summary: entry.summary || entry.note || "这条作品还没有补上详细简介，后面会继续慢慢完善。",
        resourceUrl: primaryUrl,
        primaryUrl,
        cover,
        score,
        scoreLabel: "站内推荐",
        scoreCount,
        scoreCountText: formatScoreCount(scoreCount),
        starValue: getStarValue(score)
    }

    return {
        ...normalized,
        metaLine: buildMetaLine(normalized),
        details: buildDetails(normalized)
    }
}

function normalizeEntry(entry, index) {
    if(entry.links) {
        return normalizeFallbackEntry(entry, index)
    }

    const score = pickScore(entry)
    const scoreCount = parseScoreCount(entry)
    const entryTypeLabel = entryTypeLabels[entry.entryType] || toDisplayText(entry.entryType) || "作品条目"
    const kind = entry.kind || entry.categoryName || entryTypeLabel
    const primaryUrl = entry.doubanUrl || entry.resourceUrl || "#"
    const normalized = {
        id: entry.id ?? `entry-${index}`,
        name: entry.titleZh || entry.name || entry.titleOriginal || "未命名条目",
        titleOriginal: entry.titleOriginal || (entry.titleZh && entry.name && entry.titleZh !== entry.name ? entry.name : null),
        kind,
        entryTypeLabel,
        releaseYear: entry.releaseYear || null,
        originCountry: entry.originCountry || null,
        countriesText: entry.countriesText || entry.originCountry || null,
        yearText: entry.yearText || entry.releaseYear || null,
        directorsText: entry.directorsText || null,
        castsText: entry.castsText || null,
        genresText: entry.genresText || entry.kind || null,
        summary: entry.summary || entry.note || "这条作品还没有补上完整摘要，后面会继续整理。",
        resourceUrl: entry.resourceUrl || null,
        primaryUrl,
        cover: normalizeCoverSource(entry.coverUrl || entry.externalCoverUrl || fallbackCovers[index % fallbackCovers.length]),
        score,
        scoreLabel: entry.doubanUrl ? "豆瓣评分" : "站内推荐",
        scoreCount,
        scoreCountText: formatScoreCount(scoreCount),
        starValue: getStarValue(score)
    }

    return {
        ...normalized,
        metaLine: buildMetaLine(normalized),
        details: buildDetails(normalized)
    }
}

function sortByYearDesc(entries) {
    return [...entries].sort((left, right) => {
        const leftYear = Number(left.releaseYear || left.yearText || 0)
        const rightYear = Number(right.releaseYear || right.yearText || 0)

        if(rightYear !== leftYear) {
            return rightYear - leftYear
        }

        return String(left.name || "").localeCompare(String(right.name || ""), "zh-Hans-CN")
    })
}

function filterClientSide(entries) {
    const keyword = searchInput.value.trim().toLowerCase()
    let result = entries

    if(keyword) {
        result = result.filter((work) => {
            return String(work.name || "").toLowerCase().includes(keyword) ||
                String(work.titleOriginal || "").toLowerCase().includes(keyword) ||
                String(work.kind || "").toLowerCase().includes(keyword)
        })
    }

    if(selectedYear.value) {
        result = result.filter((work) => String(work.releaseYear) === String(selectedYear.value))
    }

    if(selectedMinScore.value !== null) {
        result = result.filter((work) => {
            const score = Number(work.score)
            return Number.isFinite(score) && score >= selectedMinScore.value
        })
    }

    return result
}

async function applyFilters() {
    isLoading.value = true

    const params = {status: "published"}
    const keyword = searchInput.value.trim()
    if(keyword) {
        params.search = keyword
    }
    if(selectedYear.value) {
        params.year = selectedYear.value
    }
    if(selectedMinScore.value !== null) {
        params.minScore = selectedMinScore.value
    }

    try {
        const entries = await listYuriEntries(params)
        yuriWorksState.value = sortByYearDesc(entries.map(normalizeEntry))
    }
    catch (error) {
        console.error("Failed to load yuri entries:", error)
        yuriWorksState.value = filterClientSide(allWorks.value)
    }
    finally {
        isLoading.value = false
        currentPage.value = 1
    }
}

onMounted(async () => {
    const fallbacks = sortByYearDesc(yuriFallbacks.map(normalizeEntry))
    allWorks.value = fallbacks
    yuriWorksState.value = fallbacks

    try {
        const entries = await listYuriEntries({status: "published"})
        if(entries.length) {
            allWorks.value = sortByYearDesc(entries.map(normalizeEntry))
            yuriWorksState.value = [...allWorks.value]
        }
    }
    catch (error) {
        console.error("Failed to load yuri entries:", error)
    }
})

onBeforeUnmount(() => {
    clearTimeout(searchTimer)
})
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";

.yuri-wrap {
    position: relative;
    z-index: 1;
}

/* ============ 工具栏 ============ */
.yuri-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.85rem;
    padding: 0.85rem 1rem;
    margin-bottom: 1.1rem;
    border-radius: 1.25rem;
    border: 1px solid rgba(219, 39, 119, 0.16);
    background: rgba(255, 255, 255, 0.78);
    box-shadow: 0 14px 34px rgba(190, 24, 93, 0.10);
    backdrop-filter: blur(8px);
}

.yuri-search {
    position: relative;
    flex: 1 1 16rem;
    min-width: 14rem;
}

.yuri-search-icon {
    position: absolute;
    left: 0.95rem;
    top: 50%;
    transform: translateY(-50%);
    color: #be185d;
    font-size: 0.85rem;
    opacity: 0.65;
    pointer-events: none;
}

.yuri-search-input {
    width: 100%;
    padding: 0.62rem 2.5rem 0.62rem 2.5rem;
    border-radius: 999px;
    border: 1px solid rgba(219, 39, 119, 0.22);
    background: rgba(255, 255, 255, 0.92);
    color: #4c0519;
    font-size: 0.95rem;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.yuri-search-input::placeholder {
    color: rgba(157, 23, 77, 0.5);
}

.yuri-search-input:focus {
    border-color: #ec4899;
    box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.16);
}

.yuri-search-clear {
    position: absolute;
    right: 0.65rem;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.55rem;
    height: 1.55rem;
    border: none;
    border-radius: 50%;
    background: rgba(219, 39, 119, 0.12);
    color: #be185d;
    font-size: 0.7rem;
    cursor: pointer;
    transition: background 0.2s ease;
}

.yuri-search-clear:hover {
    background: rgba(219, 39, 119, 0.24);
}

.yuri-toolbar-divider {
    width: 1px;
    height: 1.8rem;
    background: rgba(219, 39, 119, 0.18);
}

.yuri-filter-block {
    display: flex;
    align-items: center;
    gap: 0.55rem;
}

.yuri-filter-label {
    color: #9d174d;
    font-size: 0.82rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    white-space: nowrap;
}

.yuri-select {
    padding: 0.55rem 2.1rem 0.55rem 1rem;
    border-radius: 999px;
    border: 1px solid rgba(219, 39, 119, 0.22);
    background: rgba(255, 255, 255, 0.92);
    color: #4c0519;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    outline: none;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.yuri-select:focus {
    border-color: #ec4899;
    box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.16);
}

.yuri-rating-filter {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.28rem 0.35rem;
    border-radius: 999px;
    background: rgba(219, 39, 119, 0.08);
}

.yuri-rating-btn {
    padding: 0.42rem 0.85rem;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: #9d174d;
    font-size: 0.84rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
}

.yuri-rating-btn:hover {
    color: #db2777;
}

.yuri-rating-btn.is-active {
    background: linear-gradient(135deg, #f472b6, #db2777);
    color: #ffffff;
    box-shadow: 0 6px 14px rgba(219, 39, 119, 0.35);
}

/* ============ 结果信息 ============ */
.yuri-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.8rem;
    margin: 0.2rem 0.2rem 1.2rem;
}

.yuri-meta-count {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: #9d174d;
    font-size: 0.9rem;
    font-weight: 700;
}

.yuri-meta-heart {
    color: #ec4899;
    font-size: 0.8rem;
}

.yuri-meta-reset {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.42rem 0.9rem;
    border: 1px solid rgba(219, 39, 119, 0.25);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.85);
    color: #be185d;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
}

.yuri-meta-reset:hover {
    background: rgba(219, 39, 119, 0.1);
    border-color: rgba(219, 39, 119, 0.45);
}

/* ============ 卡片 ============ */
.yuri-card {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
    border-radius: 1.4rem;
    border: 1px solid rgba(219, 39, 119, 0.10);
    background: linear-gradient(165deg, #ffffff 0%, #fdf2f8 100%);
    box-shadow: 0 12px 30px rgba(190, 24, 93, 0.08);
    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
    animation: yuri-rise 0.5s ease both;
}

.yuri-card:hover {
    transform: translateY(-6px);
    border-color: rgba(236, 72, 153, 0.35);
    box-shadow: 0 22px 44px rgba(190, 24, 93, 0.16);
}

@keyframes yuri-rise {
    from {
        opacity: 0;
        transform: translateY(14px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.yuri-card-cover {
    position: relative;
    display: block;
    aspect-ratio: 16 / 9.5;
    overflow: hidden;
    background: linear-gradient(135deg, #fbcfe8, #e9d5ff);
}

.yuri-card-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.5s ease;
}

.yuri-card:hover .yuri-card-cover img {
    transform: scale(1.06);
}

.yuri-card-kind {
    position: absolute;
    top: 0.8rem;
    left: 0.8rem;
    z-index: 2;
    max-width: calc(100% - 1.6rem);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 0.28rem 0.7rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.9);
    color: #be185d;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.14);
}

.yuri-card-score {
    position: absolute;
    top: 0.8rem;
    right: 0.8rem;
    z-index: 2;
    display: flex;
    align-items: baseline;
    gap: 0.32rem;
    padding: 0.3rem 0.72rem;
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(17, 24, 39, 0.92), rgba(30, 41, 59, 0.92));
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
    backdrop-filter: blur(4px);
}

.yuri-card-score-value {
    color: #fcd34d;
    font-size: 1.05rem;
    font-weight: 800;
    line-height: 1;
}

.yuri-card-score-label {
    color: rgba(255, 255, 255, 0.72);
    font-size: 0.6rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
}

.yuri-card-overlay {
    position: absolute;
    inset: auto 0 0 0;
    padding: 1rem 1.1rem;
    background: linear-gradient(180deg, transparent, rgba(76, 5, 25, 0.78));
    color: rgba(255, 255, 255, 0.95);
    opacity: 0;
    transition: opacity 0.25s ease;
}

.yuri-card-overlay-text {
    font-size: 0.88rem;
    font-weight: 700;
}

.yuri-card:hover .yuri-card-overlay {
    opacity: 1;
}

.yuri-card-body {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    flex: 1;
    padding: 1.1rem 1.15rem 1.25rem;
}

.yuri-card-head {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
}

.yuri-card-title {
    margin: 0;
    color: #4c0519;
    font-size: 1.12rem;
    line-height: 1.32;
}

.yuri-card-original {
    margin: 0;
    color: rgba(157, 23, 77, 0.72);
    font-size: 0.84rem;
    line-height: 1.45;
}

.yuri-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}

.yuri-meta-row span {
    padding: 0.26rem 0.62rem;
    border-radius: 999px;
    background: rgba(236, 72, 153, 0.10);
    color: #be185d;
    font-size: 0.78rem;
    font-weight: 600;
}

.yuri-rating-row {
    display: flex;
    align-items: center;
    gap: 0.55rem;
}

.yuri-rating-stars {
    display: flex;
    gap: 0.1rem;
    font-size: 0.82rem;
    line-height: 1;
}

.yuri-rating-star {
    color: rgba(190, 24, 93, 0.18);
}

.yuri-rating-star.is-full,
.yuri-rating-star.is-half {
    color: #f59e0b;
}

.yuri-rating-count {
    color: rgba(157, 23, 77, 0.7);
    font-size: 0.78rem;
}

.yuri-card-summary {
    margin: 0;
    color: rgba(76, 5, 25, 0.86);
    font-weight: 600;
    font-size: 0.92rem;
    line-height: 1.7;
}

.yuri-detail-list {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.35rem 0.7rem;
    margin: 0;
    padding-top: 0.7rem;
    border-top: 1px dashed rgba(219, 39, 119, 0.18);
}

.yuri-detail-list dt {
    margin: 0;
    color: #9d174d;
    font-size: 0.8rem;
    font-weight: 800;
}

.yuri-detail-list dd {
    margin: 0;
    color: rgba(76, 5, 25, 0.78);
    font-size: 0.8rem;
    line-height: 1.6;
}

/* ============ 空状态 ============ */
.yuri-empty {
    padding: 3.5rem 1rem;
    text-align: center;
}

.yuri-empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 4.5rem;
    height: 4.5rem;
    margin: 0 auto 1rem;
    border-radius: 50%;
    background: linear-gradient(135deg, #fbcfe8, #f9a8d4);
    color: #be185d;
    font-size: 1.6rem;
    box-shadow: 0 12px 30px rgba(219, 39, 119, 0.25);
}

.yuri-empty-title {
    margin: 0 0 0.3rem;
    color: #4c0519;
    font-size: 1.05rem;
    font-weight: 800;
}

.yuri-empty-hint {
    margin: 0;
    color: rgba(157, 23, 77, 0.75);
    font-size: 0.9rem;
}

.yuri-empty-reset {
    margin-top: 0.9rem;
    padding: 0.55rem 1.25rem;
    border: none;
    border-radius: 999px;
    background: linear-gradient(135deg, #f472b6, #db2777);
    color: #ffffff;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 8px 20px rgba(219, 39, 119, 0.3);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.yuri-empty-reset:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 26px rgba(219, 39, 119, 0.4);
}

/* ============ 分页 ============ */
.yuri-pagination {
    margin-top: 1.75rem;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
}

.yuri-page-btn {
    min-width: 2.7rem;
    padding: 0.58rem 0.9rem;
    border-radius: 999px;
    border: 1px solid rgba(219, 39, 119, 0.18);
    background: rgba(255, 255, 255, 0.95);
    color: #4c0519;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s ease;
}

.yuri-page-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: rgba(236, 72, 153, 0.5);
    color: #db2777;
}

.yuri-page-btn.is-active {
    background: linear-gradient(135deg, #f472b6, #db2777);
    border-color: #db2777;
    color: #ffffff;
    box-shadow: 0 6px 16px rgba(219, 39, 119, 0.35);
}

.yuri-page-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

/* ============ 响应式 ============ */
@media (max-width: 575.98px) {
    .yuri-toolbar {
        flex-direction: column;
        align-items: stretch;
    }

    .yuri-toolbar-divider {
        display: none;
    }

    .yuri-filter-block,
    .yuri-rating-filter {
        justify-content: center;
    }

    .yuri-detail-list {
        grid-template-columns: 1fr;
        gap: 0.16rem;
    }
}
</style>

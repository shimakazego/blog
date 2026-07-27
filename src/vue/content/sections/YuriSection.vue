<template>
    <PageSection ref="sectionRef"
                 :id="props.id"
                 variant="default">
        <PageSectionHeader
            title="百合动漫"
            subtitle="整理豆瓣导入作品，当前每页展示 30 条。"/>

        <PageSectionContent>
            <div class="row g-3">
                <div v-for="work in pagedWorks"
                     :key="work.id ?? work.name"
                     class="col-12 col-md-6 col-xl-4">
                    <article class="yuri-card">
                        <a :href="work.primaryUrl"
                           target="_blank"
                           rel="noopener noreferrer"
                           class="yuri-card-cover">
                            <img :src="work.cover"
                                 :alt="work.name">
                            <div class="yuri-card-overlay">
                                <span class="yuri-card-overlay-text">查看豆瓣详情</span>
                            </div>
                        </a>

                        <div class="yuri-card-body">
                            <div class="yuri-card-head">
                                <div class="yuri-card-head-main">
                                    <div class="yuri-card-kind">{{ work.kind }}</div>
                                    <h3 class="yuri-card-title">{{ work.name }}</h3>
                                    <p v-if="work.titleOriginal"
                                       class="yuri-card-original">
                                        {{ work.titleOriginal }}
                                    </p>
                                </div>

                                <div v-if="work.score"
                                     class="yuri-card-score">
                                    <div class="yuri-card-score-top">
                                        <span class="yuri-card-score-value">{{ work.score }}</span>
                                        <span class="yuri-card-score-label">{{ work.scoreLabel }}</span>
                                    </div>
                                    <div class="yuri-rating-stars"
                                         :aria-label="`评分 ${work.score} / 10`">
                                        <span v-for="starIndex in 5"
                                              :key="starIndex"
                                              class="yuri-rating-star"
                                              :class="getStarClass(work.starValue, starIndex)">
                                            ★
                                        </span>
                                    </div>
                                    <div v-if="work.scoreCountText"
                                         class="yuri-rating-count">
                                        {{ work.scoreCountText }}
                                    </div>
                                </div>
                            </div>

                            <div v-if="work.metaLine.length"
                                 class="yuri-meta-row">
                                <span v-for="meta in work.metaLine"
                                      :key="meta">
                                    {{ meta }}
                                </span>
                            </div>

                            <p class="yuri-card-summary">{{ work.summary }}</p>

                            <dl class="yuri-detail-list">
                                <template v-for="detail in work.details"
                                          :key="detail.label">
                                    <dt>{{ detail.label }}</dt>
                                    <dd>{{ detail.value }}</dd>
                                </template>
                            </dl>

                            <!-- <div class="yuri-links">
                                <a :href="work.primaryUrl"
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   class="yuri-link yuri-link-primary">
                                    豆瓣详情
                                </a>
                                <a v-if="work.resourceUrl && work.resourceUrl !== work.primaryUrl"
                                   :href="work.resourceUrl"
                                   target="_blank"
                                   rel="noopener noreferrer"
                                   class="yuri-link">
                                    外部资源
                                </a>
                            </div> -->
                        </div>
                    </article>
                </div>
            </div>

            <div v-if="totalPages > 1"
                 class="yuri-pagination">
                <button class="yuri-page-btn"
                        :disabled="currentPage === 1"
                        @click="goToPage(currentPage - 1)">
                    上一页
                </button>

                <button v-for="page in visiblePages"
                        :key="page"
                        class="yuri-page-btn"
                        :class="{'is-active': page === currentPage}"
                        @click="goToPage(page)">
                    {{ page }}
                </button>

                <button class="yuri-page-btn"
                        :disabled="currentPage === totalPages"
                        @click="goToPage(currentPage + 1)">
                    下一页
                </button>
            </div>
        </PageSectionContent>
    </PageSection>
</template>

<script setup>
import {computed, nextTick, onMounted, ref} from "vue"
import PageSection from "/src/vue/components/layout/PageSection.vue"
import PageSectionHeader from "/src/vue/components/layout/PageSectionHeader.vue"
import PageSectionContent from "/src/vue/components/layout/PageSectionContent.vue"
import {yuriWorks as yuriFallbacks} from "/src/data/blogMockData.js"
import {listYuriEntries} from "/src/data/blogApi.js"

const props = defineProps({
    id: String
})

const PAGE_SIZE = 30
const sectionRef = ref(null)
const yuriWorksState = ref([])
const currentPage = ref(1)

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
        cover: entry.coverUrl || entry.externalCoverUrl || fallbackCovers[index % fallbackCovers.length],
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

onMounted(async () => {
    yuriWorksState.value = sortByYearDesc(yuriFallbacks.map(normalizeEntry))

    try {
        const entries = await listYuriEntries({status: "published"})
        if(entries.length) {
            yuriWorksState.value = sortByYearDesc(entries.map(normalizeEntry))
            currentPage.value = 1
        }
    }
    catch (error) {
        console.error("Failed to load yuri entries:", error)
    }
})
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";

.yuri-card {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border-radius: 1.5rem;
    border: 1px solid rgba($dark, 0.08);
    background:
        linear-gradient(180deg, rgba($white, 0.98), rgba($light-1, 0.92)),
        radial-gradient(circle at top left, rgba($primary, 0.1), transparent 50%);
    box-shadow: 0 18px 40px rgba($dark, 0.08);
}

.yuri-card-cover {
    position: relative;
    display: block;
    aspect-ratio: 16 / 10;
    overflow: hidden;
}

.yuri-card-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.45s ease;
}

.yuri-card-overlay {
    position: absolute;
    inset: auto 0 0 0;
    padding: 1rem 1.1rem;
    background: linear-gradient(180deg, transparent, rgba(17, 24, 39, 0.84));
    color: rgba($white, 0.94);
    opacity: 0;
    transition: opacity 0.25s ease;
}

.yuri-card-overlay-text {
    font-size: 0.9rem;
    font-weight: 700;
}

.yuri-card:hover .yuri-card-cover img {
    transform: scale(1.05);
}

.yuri-card:hover .yuri-card-overlay {
    opacity: 1;
}

.yuri-card-body {
    padding: 1.2rem 0.8rem 1.3rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
}

.yuri-card-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.9rem;
}

.yuri-card-kind {
    color: $text-muted;
    text-transform: uppercase;
    font-size: 0.74rem;
    letter-spacing: 0.12em;
}

.yuri-card-title {
    margin: 0.32rem 0 0;
    line-height: 1.15;
    font-size: 1.18rem;
}

.yuri-card-original {
    margin: 0.25rem 0 0;
    color: $text-muted;
    font-size: 0.88rem;
    line-height: 1.45;
}

.yuri-card-score {
    min-width: 7rem;
    padding: 0.72rem 0.78rem;
    border-radius: 1rem;
    background: #111827;
    color: #f9fafb;
    text-align: center;
    flex-shrink: 0;
}

.yuri-card-score-top {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.35rem;
}

.yuri-card-score-value {
    display: block;
    font-size: 1.35rem;
    font-weight: 800;
    line-height: 1;
}

.yuri-card-score-label {
    display: block;
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba($white, 0.72);
}

.yuri-rating-stars {
    margin-top: 0.42rem;
    display: flex;
    justify-content: center;
    gap: 0.08rem;
    font-size: 0.8rem;
    line-height: 1;
}

.yuri-rating-star {
    color: rgba(255, 255, 255, 0.18);
}

.yuri-rating-star.is-full,
.yuri-rating-star.is-half {
    color: #f6c453;
}

.yuri-rating-count {
    margin-top: 0.35rem;
    font-size: 0.74rem;
    color: rgba($white, 0.74);
}

.yuri-meta-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    color: $text-muted;
    font-size: 0.86rem;
}

.yuri-meta-row span {
    padding: 0.28rem 0.62rem;
    border-radius: 999px;
    background: rgba($dark, 0.04);
}

.yuri-card-summary {
    margin: 0;
    color: $dark;
    font-weight: 700;
    line-height: 1.68;
}

.yuri-detail-list {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.4rem 0.65rem;
    margin: 0;
}

.yuri-detail-list dt {
    margin: 0;
    color: $text-muted;
    font-size: 0.86rem;
    font-weight: 700;
}

.yuri-detail-list dd {
    margin: 0;
    color: $text-muted;
    font-size: 0.86rem;
    line-height: 1.62;
}

.yuri-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0;
}

.yuri-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.56rem 0.92rem;
    border-radius: 999px;
    border: 1px solid rgba($primary, 0.22);
    background: rgba($primary, 0.06);
    color: $primary;
    font-weight: 700;
    transition: all 0.2s ease;
}

.yuri-link-primary {
    background: $primary;
    color: $text-normal-contrast;
    border-color: $primary;
}

.yuri-link:hover {
    transform: translateY(-1px);
    background: rgba($primary, 0.14);
}

.yuri-link-primary:hover {
    background: rgba($primary, 0.9);
    color: $text-normal-contrast;
}

.yuri-pagination {
    margin-top: 1.75rem;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.55rem;
}

.yuri-page-btn {
    min-width: 2.7rem;
    padding: 0.6rem 0.9rem;
    border-radius: 999px;
    border: 1px solid rgba($primary, 0.18);
    background: rgba($white, 0.95);
    color: $dark;
    font-weight: 700;
    transition: all 0.2s ease;
}

.yuri-page-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    border-color: rgba($primary, 0.45);
    color: $primary;
}

.yuri-page-btn.is-active {
    background: $primary;
    border-color: $primary;
    color: $text-normal-contrast;
}

.yuri-page-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}

@include media-breakpoint-down(sm) {
    .yuri-card-head {
        flex-direction: column;
    }

    .yuri-card-score {
        width: 100%;
        min-width: 0;
    }

    .yuri-detail-list {
        grid-template-columns: 1fr;
        gap: 0.16rem;
    }
}
</style>

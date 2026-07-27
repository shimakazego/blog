<template>
    <PageSection :id="props.id"
                 variant="default">
        <PageSectionHeader title="游戏攻略"
                           subtitle="收集星铁和绝区零的高难入口，先做成可持续更新的情报板。" />

        <PageSectionContent>
            <div class="game-layout row g-4">
                <div class="col-12 col-xl-7">
                    <div class="game-board">
                        <div class="game-board-head">
                            <div>
                                <div class="game-kicker">Video Tracker</div>
                                <h2 class="game-title">最新高难关卡追踪板</h2>
                            </div>
                            <span class="badge rounded-pill text-bg-warning game-badge">时效优先</span>
                        </div>

                        <div class="game-feed">
                            <article v-for="guide in gameGuidesState"
                                     :key="guide.id ?? guide.title"
                                     class="game-item">
                                <div class="game-item-meta">
                                    <span class="game-game">{{ guide.game }}</span>
                                    <span class="game-date">{{ guide.date }}</span>
                                </div>

                                <h3 class="game-item-title">{{ guide.title }}</h3>
                                <p class="game-item-summary">{{ guide.summary }}</p>

                                <div class="game-item-footer">
                                    <div class="game-tags">
                                        <span v-for="tag in guide.tags"
                                              :key="tag"
                                              class="badge rounded-pill text-bg-light game-tag">
                                            {{ tag }}
                                        </span>
                                    </div>

                                    <a :href="guide.url"
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       class="game-link">
                                        查看入口
                                    </a>
                                </div>
                            </article>
                        </div>
                    </div>
                </div>

                <div class="col-12 col-xl-5">
                    <div class="game-side h-100">
                        <div class="game-side-card">
                            <div class="game-kicker">玩法说明</div>
                            <h3 class="game-side-title">这里会按版本和活动逐步补全</h3>
                            <p class="game-side-text">
                                当前接口已经接到 NAS 后端，后面可以继续扩展成后台录入、抓取来源、版本筛选和过期标记。
                            </p>
                        </div>

                        <div class="game-side-card game-side-card-dark">
                            <div class="game-kicker">字段建议</div>
                            <ul class="game-list">
                                <li>游戏名、版本号、关卡名</li>
                                <li>视频链接、来源、发布时间</li>
                                <li>难度、配队门槛、备注</li>
                                <li>是否过期、是否推荐</li>
                            </ul>
                        </div>

                        <div class="game-side-card">
                            <div class="game-kicker">后续方向</div>
                            <div class="game-side-pill">适合继续加版本筛选、搜索和简易后台</div>
                        </div>
                    </div>
                </div>
            </div>
        </PageSectionContent>
    </PageSection>
</template>

<script setup>
import {onMounted, ref} from "vue"
import PageSection from "/src/vue/components/layout/PageSection.vue"
import PageSectionHeader from "/src/vue/components/layout/PageSectionHeader.vue"
import PageSectionContent from "/src/vue/components/layout/PageSectionContent.vue"
import {gameGuides as gameGuideFallbacks} from "/src/data/blogMockData.js"
import {listGameGuides} from "/src/data/blogApi.js"

const props = defineProps({
    id: String
})

const gameGuidesState = ref([...gameGuideFallbacks])

function formatDate(value) {
    if(!value) {
        return "持续更新"
    }

    const date = new Date(value)
    if(Number.isNaN(date.getTime())) {
        return value
    }

    return date.toISOString().slice(0, 10)
}

function buildGuideTags(guide) {
    return [guide.versionLabel, guide.difficulty, guide.sourceName]
        .filter(Boolean)
}

function normalizeGuide(guide) {
    return {
        id: guide.id,
        game: guide.game,
        title: guide.title,
        date: formatDate(guide.publishedAt),
        status: guide.status,
        source: guide.sourceName || "外部来源",
        url: guide.sourceUrl || "#",
        summary: guide.summary || "这条攻略还没有补充摘要。",
        tags: buildGuideTags(guide)
    }
}

onMounted(async () => {
    try {
        const guides = await listGameGuides({status: "published"})
        if(guides.length) {
            gameGuidesState.value = guides.map(normalizeGuide)
        }
    }
    catch (error) {
        console.error("Failed to load game guides:", error)
    }
})
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";

.game-board,
.game-side-card {
    border-radius: 1.75rem;
    border: 1px solid rgba($dark, 0.08);
    background: linear-gradient(180deg, rgba($white, 0.98), rgba($light-1, 0.9));
    box-shadow: 0 18px 40px rgba($dark, 0.08);
}

.game-board {
    padding: 1.6rem;
}

.game-board-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
    margin-bottom: 1rem;
}

.game-kicker {
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.75rem;
}

.game-title,
.game-side-title {
    margin: 0.5rem 0 0;
    line-height: 1.12;
}

.game-feed {
    display: grid;
    gap: 1rem;
}

.game-item {
    padding: 1.2rem 1.15rem;
    border-radius: 1.3rem;
    background: rgba($light-1, 0.9);
    border: 1px solid rgba($dark, 0.05);
}

.game-item-meta,
.game-item-footer {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
}

.game-item-meta {
    color: $text-muted;
    font-size: 0.9rem;
}

.game-game {
    font-weight: 700;
    color: $primary;
}

.game-item-title {
    margin: 0.7rem 0 0;
}

.game-item-summary {
    margin: 0.7rem 0 0;
    color: $text-muted;
    line-height: 1.8;
}

.game-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.game-link {
    white-space: nowrap;
    color: $primary;
    font-weight: 700;
}

.game-side {
    display: grid;
    gap: 1rem;
}

.game-side-card {
    padding: 1.35rem;
}

.game-side-card-dark {
    background: linear-gradient(180deg, rgba($dark, 0.95), rgba($dark, 0.9));
    color: $text-normal-contrast;
}

.game-side-card-dark .game-kicker {
    color: rgba($white, 0.65);
}

.game-side-text {
    margin: 0.8rem 0 0;
    color: inherit;
    line-height: 1.8;
}

.game-list {
    margin: 0.75rem 0 0;
    padding-left: 1.1rem;
    color: inherit;
    line-height: 1.9;
}

.game-side-pill {
    margin-top: 0.8rem;
    display: inline-flex;
    padding: 0.65rem 0.9rem;
    border-radius: 999px;
    background: rgba($primary, 0.1);
    color: $primary;
    font-weight: 700;
}

@include media-breakpoint-down(lg) {
    .game-board,
    .game-side-card {
        border-radius: 1.35rem;
    }

    .game-item-meta,
    .game-item-footer {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>

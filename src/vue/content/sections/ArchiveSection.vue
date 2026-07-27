<template>
    <PageSection :id="props.id"
                 variant="default">
        <PageSectionHeader title="文章归档"
                           subtitle="文章和随笔都会先放在这里，优先接真实接口，再慢慢补内容详情。" />

        <PageSectionContent>
            <div class="archive-grid row g-4 align-items-stretch">
                <div class="col-12 col-xl-5">
                    <div class="archive-intro-card h-100">
                        <div class="archive-intro-kicker">Writing Desk</div>
                        <h2 class="archive-intro-title">
                            把零散想法整理成可以回看的文字仓库
                        </h2>
                        <p class="archive-intro-text">
                            这里会同时收纳正式文章、短随笔、项目记录和阶段性思考。现在先把展示层接到
                            NAS 后端，后面再补文章详情页和录入后台。
                        </p>

                        <div class="archive-stats">
                            <div v-for="stat in stats"
                                 :key="stat.label"
                                 class="archive-stat">
                                <div class="archive-stat-value">{{ stat.value }}</div>
                                <div class="archive-stat-label">{{ stat.label }}</div>
                            </div>
                        </div>

                        <div class="archive-feature">
                            <div class="archive-feature-label">当前写作方向</div>
                            <div class="archive-feature-tags">
                                <span v-for="tag in focusTags"
                                      :key="tag"
                                      class="badge rounded-pill text-bg-dark-subtle archive-pill">
                                    {{ tag }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-12 col-xl-7">
                    <div class="archive-list">
                        <div v-for="post in postsState"
                             :key="post.id ?? post.title"
                             class="archive-card">
                            <div class="archive-card-top">
                                <div>
                                    <span class="badge rounded-pill text-bg-warning archive-type">
                                        {{ post.type }}
                                    </span>
                                    <h3 class="archive-card-title">{{ post.title }}</h3>
                                </div>
                                <div class="archive-card-meta">
                                    <span>{{ post.date }}</span>
                                    <span>{{ post.readTime }}</span>
                                </div>
                            </div>

                            <p class="archive-card-excerpt">
                                {{ post.excerpt }}
                            </p>

                            <div class="archive-card-footer">
                                <div class="archive-tags">
                                    <span v-for="tag in post.tags"
                                          :key="tag"
                                          class="badge rounded-pill text-bg-light archive-tag">
                                        #{{ tag }}
                                    </span>
                                </div>

                                <span class="archive-mood">{{ post.mood }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageSectionContent>
    </PageSection>
</template>

<script setup>
import {computed, onMounted, ref} from "vue"
import PageSection from "/src/vue/components/layout/PageSection.vue"
import PageSectionHeader from "/src/vue/components/layout/PageSectionHeader.vue"
import PageSectionContent from "/src/vue/components/layout/PageSectionContent.vue"
import {archivePosts as archivePostFallbacks} from "/src/data/blogMockData.js"
import {listPosts} from "/src/data/blogApi.js"

const props = defineProps({
    id: String
})

const postsState = ref([...archivePostFallbacks])

const stats = computed(() => {
    const articleCount = postsState.value.filter((post) => post.type === "文章").length
    const essayCount = postsState.value.filter((post) => post.type === "随笔").length

    return [
        {label: "文章", value: String(articleCount).padStart(2, "0")},
        {label: "随笔", value: String(essayCount).padStart(2, "0")},
        {label: "已发布", value: String(postsState.value.length).padStart(2, "0")}
    ]
})

const focusTags = computed(() => {
    const tags = new Set()

    postsState.value.forEach((post) => {
        ;(post.tags || []).forEach((tag) => tags.add(tag))
    })

    return Array.from(tags).slice(0, 4)
})

function formatDate(value) {
    if(!value) {
        return "未发布"
    }

    const date = new Date(value)
    if(Number.isNaN(date.getTime())) {
        return value
    }

    return date.toISOString().slice(0, 10)
}

function estimateReadTime(summary = "") {
    const length = String(summary || "").trim().length
    const minutes = Math.max(3, Math.min(12, Math.ceil(length / 45) || 3))
    return `${minutes} min`
}

function buildTags(post, typeLabel) {
    const tagSet = new Set([typeLabel])

    if(post.slug) {
        tagSet.add(post.slug.replace(/-/g, " "))
    }

    return Array.from(tagSet)
}

function normalizePost(post) {
    const type = post.type === "essay" ? "随笔" : "文章"

    return {
        id: post.id,
        type,
        title: post.title,
        date: formatDate(post.publishedAt || post.createdAt),
        readTime: estimateReadTime(post.summary),
        mood: post.status === "published" ? "已发布" : "草稿",
        excerpt: post.summary || "这篇内容还没有补充摘要，后续会继续完善。",
        tags: buildTags(post, type)
    }
}

onMounted(async () => {
    try {
        const posts = await listPosts({status: "published"})
        if(posts.length) {
            postsState.value = posts.map(normalizePost)
        }
    }
    catch (error) {
        console.error("Failed to load archive posts:", error)
    }
})
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";

.archive-grid {
    align-items: stretch;
}

.archive-intro-card,
.archive-card {
    border: 1px solid rgba($dark, 0.08);
    border-radius: 1.75rem;
    background:
        linear-gradient(180deg, rgba($white, 0.95), rgba($light-1, 0.88)),
        radial-gradient(circle at top left, rgba($primary, 0.12), transparent 50%);
    box-shadow: 0 18px 40px rgba($dark, 0.08);
}

.archive-intro-card {
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: 100%;
}

.archive-intro-kicker,
.archive-feature-label {
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.75rem;
    color: $text-muted;
}

.archive-intro-title {
    margin-top: 0.75rem;
    margin-bottom: 0;
    line-height: 1.1;
}

.archive-intro-text {
    margin: 1rem 0 0;
    font-size: 1rem;
    color: $text-muted;
}

.archive-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 1.5rem;
}

.archive-stat {
    padding: 0.9rem 0.8rem;
    border-radius: 1rem;
    background: rgba($white, 0.72);
    border: 1px solid rgba($dark, 0.06);
}

.archive-stat-value {
    font-family: $headings-font-family;
    font-size: 1.55rem;
    line-height: 1;
}

.archive-stat-label {
    margin-top: 0.35rem;
    color: $text-muted;
    font-size: 0.9rem;
}

.archive-feature {
    margin-top: 1.5rem;
}

.archive-feature-tags,
.archive-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.archive-pill,
.archive-tag {
    font-weight: 500;
}

.archive-list {
    display: grid;
    gap: 1rem;
}

.archive-card {
    padding: 1.4rem 1.45rem;
}

.archive-card-top {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
}

.archive-type {
    margin-bottom: 0.55rem;
}

.archive-card-title {
    margin-bottom: 0;
    line-height: 1.2;
}

.archive-card-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    color: $text-muted;
    font-size: 0.9rem;
    white-space: nowrap;
}

.archive-card-excerpt {
    margin: 1rem 0 1.1rem;
    color: $text-muted;
    line-height: 1.8;
}

.archive-card-footer {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
}

.archive-mood {
    color: $primary;
    font-weight: 700;
    white-space: nowrap;
}

@include media-breakpoint-down(lg) {
    .archive-intro-card,
    .archive-card {
        border-radius: 1.35rem;
    }

    .archive-card-top,
    .archive-card-footer {
        flex-direction: column;
        align-items: flex-start;
    }

    .archive-card-meta {
        align-items: flex-start;
    }
}

@include media-breakpoint-down(sm) {
    .archive-stats {
        grid-template-columns: 1fr;
    }
}
</style>

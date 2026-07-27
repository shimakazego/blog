<template>
    <PageSection :id="props.id"
                 variant="default">
        <PageSectionHeader title="百合动漫"
                           subtitle="做成一个配置驱动的收藏书架，先接真实接口，再慢慢补资源和封面。" />

        <PageSectionContent>
            <div class="yuri-layout row g-4">
                <div class="col-12 col-xl-4">
                    <div class="yuri-info-card h-100">
                        <div class="yuri-info-kicker">Shelf Config</div>
                        <h2 class="yuri-info-title">一个能继续扩展的百合收藏目录</h2>
                        <p class="yuri-info-text">
                            现在的结构已经可以从数据库读取名字、评分、资源链接和短评。后面只要补图片上传和后台录入，就能继续扩展。
                        </p>

                        <div class="yuri-code-block">
                            <div class="yuri-code-title">entry schema</div>
                            <pre>{
  name,
  kind,
  byline,
  note,
  resourceUrl
}</pre>
                        </div>

                        <div class="yuri-note">
                            先把内容结构跑通，评论区和详情页都可以后置。
                        </div>
                    </div>
                </div>

                <div class="col-12 col-xl-8">
                    <div class="row g-3">
                        <div v-for="work in yuriWorksState"
                             :key="work.id ?? work.name"
                             class="col-12 col-lg-6">
                            <article class="yuri-card h-100">
                                <div class="yuri-card-cover">
                                    <img :src="work.cover"
                                         :alt="work.name">
                                </div>

                                <div class="yuri-card-body">
                                    <div class="d-flex justify-content-between align-items-start gap-2">
                                        <div>
                                            <div class="yuri-card-kind">{{ work.kind }}</div>
                                            <h3 class="yuri-card-title">{{ work.name }}</h3>
                                        </div>
                                        <span class="badge rounded-pill text-bg-dark yuri-score">{{ work.score }}</span>
                                    </div>

                                    <p class="yuri-card-byline">{{ work.byline }}</p>
                                    <p class="yuri-card-note">{{ work.note }}</p>

                                    <div class="yuri-tags">
                                        <span v-for="tag in work.tags"
                                              :key="tag"
                                              class="badge rounded-pill text-bg-light yuri-tag">
                                            {{ tag }}
                                        </span>
                                    </div>

                                    <div v-if="work.links.length"
                                         class="yuri-links">
                                        <a v-for="link in work.links"
                                           :key="link.label"
                                           :href="link.url"
                                           target="_blank"
                                           rel="noopener noreferrer"
                                           class="yuri-link">
                                            {{ link.label }}
                                        </a>
                                    </div>
                                </div>
                            </article>
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
import {yuriWorks as yuriFallbacks} from "/src/data/blogMockData.js"
import {listYuriEntries} from "/src/data/blogApi.js"

const props = defineProps({
    id: String
})

const yuriWorksState = ref([...yuriFallbacks])

const fallbackCovers = [
    "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80"
]

function normalizeEntry(entry, index) {
    return {
        id: entry.id,
        name: entry.name,
        byline: entry.byline || "等待补充短评",
        cover: entry.coverUrl || fallbackCovers[index % fallbackCovers.length],
        kind: entry.kind || "条目",
        score: entry.score || "A",
        note: entry.note || "这条内容还没有补充详细推荐语。",
        tags: [entry.kind, entry.status === "published" ? "已上架" : "草稿"].filter(Boolean),
        links: entry.resourceUrl ? [{label: "资源入口", url: entry.resourceUrl}] : []
    }
}

onMounted(async () => {
    try {
        const entries = await listYuriEntries({status: "published"})
        if(entries.length) {
            yuriWorksState.value = entries.map(normalizeEntry)
        }
    }
    catch (error) {
        console.error("Failed to load yuri entries:", error)
    }
})
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";

.yuri-info-card,
.yuri-card {
    border-radius: 1.75rem;
    border: 1px solid rgba($dark, 0.08);
    background: linear-gradient(180deg, rgba($white, 0.97), rgba($light-1, 0.9));
    box-shadow: 0 18px 40px rgba($dark, 0.08);
}

.yuri-info-card {
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
}

.yuri-info-kicker,
.yuri-code-title {
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 0.74rem;
    color: $text-muted;
}

.yuri-info-title {
    margin: 0.75rem 0 0;
    line-height: 1.12;
}

.yuri-info-text {
    margin: 1rem 0 0;
    color: $text-muted;
    line-height: 1.8;
}

.yuri-code-block {
    margin-top: 1.25rem;
    padding: 1rem 1.1rem;
    border-radius: 1.25rem;
    background: #111827;
    color: #d1d5db;
}

.yuri-code-block pre {
    margin: 0.5rem 0 0;
    color: inherit;
    font-size: 0.92rem;
    line-height: 1.7;
    white-space: pre-wrap;
}

.yuri-note {
    margin-top: auto;
    padding-top: 1.25rem;
    color: $primary;
    font-weight: 700;
}

.yuri-card {
    overflow: hidden;
    display: flex;
    flex-direction: column;
    min-height: 100%;
}

.yuri-card-cover {
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

.yuri-card:hover .yuri-card-cover img {
    transform: scale(1.05);
}

.yuri-card-body {
    padding: 1.25rem 1.25rem 1.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
}

.yuri-card-kind {
    color: $text-muted;
    text-transform: uppercase;
    font-size: 0.74rem;
    letter-spacing: 0.12em;
}

.yuri-card-title {
    margin: 0.3rem 0 0;
}

.yuri-score {
    align-self: flex-start;
    margin-top: 0.2rem;
}

.yuri-card-byline,
.yuri-card-note {
    margin: 0;
    line-height: 1.75;
}

.yuri-card-byline {
    color: $dark;
    font-weight: 600;
}

.yuri-card-note {
    color: $text-muted;
}

.yuri-tags,
.yuri-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.yuri-link {
    display: inline-flex;
    align-items: center;
    padding: 0.5rem 0.85rem;
    border-radius: 999px;
    border: 1px solid rgba($primary, 0.22);
    background: rgba($primary, 0.06);
    color: $primary;
    font-weight: 700;
    transition: all 0.2s ease;
}

.yuri-link:hover {
    background: rgba($primary, 0.12);
    transform: translateY(-1px);
}

@include media-breakpoint-down(lg) {
    .yuri-info-card,
    .yuri-card {
        border-radius: 1.35rem;
    }
}
</style>

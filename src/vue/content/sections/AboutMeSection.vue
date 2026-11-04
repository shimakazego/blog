<template>
    <PageSection :id="props.id"
                 variant="default">
        <PageSectionHeader title="关于博主"/>

        <PageSectionContent>
            <div class="about-layout row g-4">
                <div class="col-12 col-xl-4">
                    <div class="about-card about-profile h-100">
                        <div class="about-avatar">菅</div>
                        <div class="about-name">菅名のBlog</div>
                        <div class="about-role">前端工程师</div>
                        <p class="about-text">
                            无论何时，要开心
                        </p>
                        <div class="about-tags">
                            <span class="badge rounded-pill text-bg-light about-tag">Vue 3</span>
                            <span class="badge rounded-pill text-bg-light about-tag">设计感</span>
                            <span class="badge rounded-pill text-bg-light about-tag">ACGN</span>
                            <span class="badge rounded-pill text-bg-light about-tag">Node.js</span>
                        </div>
                    </div>
                </div>

                <div class="col-12 col-xl-8">
                    <div class="row g-3">
                        <div v-for="item in aboutHighlights"
                             :key="item.label"
                             class="col-12 col-lg-4">
                            <div class="about-card about-highlight h-100">
                                <div class="about-highlight-label">{{ item.label }}</div>
                                <div class="about-highlight-value">{{ item.value }}</div>
                                <p class="about-highlight-detail">{{ item.detail }}</p>
                            </div>
                        </div>

                        <div class="col-12">
                            <div class="about-card about-roadmap">
                                <div class="about-roadmap-head">
                                    <div>
                                        <div class="about-highlight-label">下一步</div>
                                        <h3 class="about-roadmap-title">准备构建 Agent 智能体</h3>
                                    </div>
                                    <span class="badge rounded-pill text-bg-success">进行中</span>
                                </div>

                                <div class="about-roadmap-list">
                                    <div class="about-roadmap-item" v-for="step in roadmap" :key="step.title">
                                        <div class="about-roadmap-step">{{ step.step }}</div>
                                        <div class="about-roadmap-copy">
                                            <strong>{{ step.title }}</strong>
                                            <p>{{ step.text }}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PageSectionContent>
    </PageSection>
</template>

<script setup>
import PageSection from "/src/vue/components/layout/PageSection.vue"
import PageSectionHeader from "/src/vue/components/layout/PageSectionHeader.vue"
import PageSectionContent from "/src/vue/components/layout/PageSectionContent.vue"
import {aboutHighlights} from "/src/data/blogMockData.js"

const props = defineProps({
    id: String
})

const roadmap = [
    {
        step: "01",
        title: "站点主体已完成",
        text: "前端、后端和内容模块基本稳定，后续以维护和细节补充为主。"
    },
    {
        step: "02",
        title: "构建 Agent 智能体",
        text: "准备用 Python + LangGraph 搭一个智能体，接入大模型 API。"
    },
    {
        step: "03",
        title: "探索 LLM 场景",
        text: "具体用途还没定，可能做站内聊天、内容整理或主动推送。"
    }
]
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";

.about-card {
    border-radius: 1.75rem;
    border: 1px solid rgba($dark, 0.08);
    background: linear-gradient(180deg, rgba($white, 0.98), rgba($light-1, 0.9));
    box-shadow: 0 18px 40px rgba($dark, 0.08);
    /* 白卡自含：内部文字固定深色，不随暗色主题变浅 */
    color: #212529;
}

.about-profile {
    padding: 1.75rem;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.about-avatar {
    width: 4.8rem;
    height: 4.8rem;
    border-radius: 1.5rem;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, $primary, lighten($primary, 20%));
    color: $white;
    font-family: $headings-font-family;
    font-size: 2.2rem;
    box-shadow: 0 12px 28px rgba($primary, 0.3);
}

.about-name {
    margin-top: 1rem;
    font-family: $headings-font-family;
    font-size: 1.8rem;
}

.about-role {
    color: $text-muted;
    margin-top: 0.25rem;
}

.about-text {
    margin: 1rem 0 0;
    line-height: 1.85;
    color: $text-muted;
}

.about-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1.25rem;
}

.about-highlight {
    padding: 1.4rem;
}

.about-highlight-label {
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-size: 0.75rem;
}

.about-highlight-value {
    margin-top: 0.55rem;
    font-family: $headings-font-family;
    font-size: 2rem;
    line-height: 1;
}

.about-highlight-detail {
    margin: 0.8rem 0 0;
    color: $text-muted;
    line-height: 1.8;
}

.about-roadmap {
    padding: 1.45rem;
}

.about-roadmap-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
}

.about-roadmap-title {
    margin: 0.5rem 0 0;
    line-height: 1.15;
}

.about-roadmap-list {
    margin-top: 1.2rem;
    display: grid;
    gap: 0.9rem;
}

.about-roadmap-item {
    display: grid;
    grid-template-columns: 4rem 1fr;
    gap: 1rem;
    padding: 1rem 1rem 1rem 0.8rem;
    border-radius: 1.15rem;
    background: rgba($light-1, 0.95);
}

.about-roadmap-step {
    width: 3rem;
    height: 3rem;
    border-radius: 1rem;
    display: grid;
    place-items: center;
    background: rgba($primary, 0.12);
    color: $primary;
    font-weight: 800;
    font-family: $headings-font-family;
}

.about-roadmap-copy p {
    margin: 0.35rem 0 0;
    color: $text-muted;
    line-height: 1.75;
}

@include media-breakpoint-down(lg) {
    .about-card {
        border-radius: 1.35rem;
    }

    .about-roadmap-head {
        flex-direction: column;
    }
}
</style>

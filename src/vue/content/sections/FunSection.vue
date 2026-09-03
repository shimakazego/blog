<template>
    <PageSection :id="props.id"
                 variant="default">
        <PageSectionHeader title="开心一下"
                           subtitle="收集一些轻松、有趣、打开就能玩的 Web 小项目。"/>

        <PageSectionContent>
            <div class="fun-layout row g-4">
                <div class="col-12 col-xl-5">
                    <article class="fun-feature h-100">
                        <div class="fun-feature-top">
                            <div class="fun-kicker">Featured Toy</div>
                            <span class="badge rounded-pill text-bg-warning fun-status">优先推荐</span>
                        </div>

                        <div class="fun-feature-title">黑塔转圈圈</div>
                        <p class="fun-feature-text">
                            点一下转一圈，轻松解压。
                        </p>

                        <div class="fun-feature-actions">
                            <a href="/herta-kuru/index.html"
                               target="_blank"
                               rel="noopener noreferrer"
                               class="fun-action fun-action-primary">
                                Demo
                            </a>
                            <a href="https://github.com/duiqt/herta_kuru"
                               target="_blank"
                               rel="noopener noreferrer"
                               class="fun-action">
                                Repo
                            </a>
                        </div>

                        <!-- <div class="fun-feature-ribbon">
                            后面还可以继续补更多轻量的互动玩具，先把这三个稳定入口搭起来。
                        </div> -->
                    </article>
                </div>

                <div class="col-12 col-xl-7">
                    <div class="row g-3">
                        <div v-for="project in funProjects"
                             :key="project.name"
                             class="col-12 col-lg-6">
                            <article class="fun-card h-100"
                                     :style="{ '--accent': project.accent }">
                                <div class="fun-card-head">
                                    <div class="fun-card-badge">{{ project.badge }}</div>
                                    <div class="fun-card-dot"/>
                                </div>

                                <h3 class="fun-card-title">{{ project.name }}</h3>
                                <p class="fun-card-text">{{ project.description }}</p>

                                <div class="fun-card-links">
                                    <a :href="project.demo"
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       class="fun-link">
                                        Demo
                                    </a>
                                    <a :href="project.repo"
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       class="fun-link">
                                        Repo
                                    </a>
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
import PageSection from "/src/vue/components/layout/PageSection.vue"
import PageSectionHeader from "/src/vue/components/layout/PageSectionHeader.vue"
import PageSectionContent from "/src/vue/components/layout/PageSectionContent.vue"

const props = defineProps({
    id: String
})

const funProjects = [
    {
        name: "MiKuTap",
        badge: "节奏互动",
        description: "点击、拖拽、敲键盘都会产生节奏与图形反馈，很适合当作站内的互动玩具。",
        demo: "/mikutap/index.html",
        repo: "https://github.com/HFIProgramming/mikutap",
        accent: "#56e6e0"
    },
    {
        name: "原神启动",
        badge: "主题网页",
        description: "偏展示型的主题页面，风格和前两个不一样，适合放在这里丰富整体气质。",
        demo: "/genshin-start/index.html",
        repo: "https://github.com/suijiya/Klee",
        accent: "#ffb36b"
    }
]
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";

.fun-feature,
.fun-card {
    border-radius: 1.75rem;
    border: 1px solid rgba($dark, 0.08);
    background: linear-gradient(180deg, rgba($white, 0.98), rgba($light-1, 0.88));
    box-shadow: 0 18px 40px rgba($dark, 0.08);
    /* 白卡自含：卡内文字固定深色，不随暗色主题变浅 */
    color: #212529;
}

.fun-feature {
    padding: 1.7rem;
    display: flex;
    flex-direction: column;
    min-height: 100%;
}

.fun-feature-top,
.fun-card-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
}

.fun-kicker {
    color: $text-muted;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.75rem;
}

.fun-feature-title {
    margin-top: 0.85rem;
    font-family: $headings-font-family;
    font-size: clamp(2rem, 3.5vw, 3.15rem);
    line-height: 1;
}

.fun-feature-text {
    margin: 1rem 0 0;
    color: #6c757d;
    line-height: 1.85;
}

.fun-feature-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1.25rem;
}

.fun-action {
    padding: 0.75rem 1rem;
    border-radius: 999px;
    border: 1px solid rgba($dark, 0.12);
    color: #212529;
    font-weight: 700;
}

.fun-action-primary {
    background: $primary;
    color: $white;
    border-color: $primary;
}

.fun-feature-ribbon {
    margin-top: auto;
    padding-top: 1.25rem;
    color: $primary;
    font-weight: 700;
}

.fun-card {
    padding: 1.35rem;
    min-height: 100%;
    position: relative;
    overflow: hidden;
}

.fun-card::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 18%, transparent), transparent 55%);
    pointer-events: none;
}

.fun-card-head,
.fun-card-title,
.fun-card-text,
.fun-card-links {
    position: relative;
    z-index: 1;
}

.fun-card-badge {
    color: #6c757d;
    font-size: 0.8rem;
}

.fun-card-dot {
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 0 6px color-mix(in srgb, var(--accent) 16%, transparent);
}

.fun-card-title {
    margin: 1rem 0 0;
}

.fun-card-text {
    margin: 0.8rem 0 0;
    color: #6c757d;
    line-height: 1.8;
}

.fun-card-links {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.25rem;
}

.fun-link {
    padding: 0.6rem 0.85rem;
    border-radius: 999px;
    background: rgba($dark, 0.05);
    color: #212529;
    font-weight: 700;
}

@include media-breakpoint-down(lg) {
    .fun-feature,
    .fun-card {
        border-radius: 1.35rem;
    }
}
</style>

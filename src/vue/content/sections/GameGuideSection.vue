<template>
  <PageSection :id="props.id" variant="default" class="zzz-guide-section">
    <PageSectionContent>
      <main class="zzz-home">
        <div class="zzz-home-bg" aria-hidden="true" />

        <div class="zzz-home-inner">
          <div class="zzz-toolbar">
            <div>
              <span class="zzz-eyebrow">菅名のBlog / GAME GUIDE</span>
              <p class="zzz-status">
                <span class="zzz-status-dot" />
                {{ apiStatus }}
              </p>
            </div>
          </div>

          <header class="zzz-hero">
            <!-- <span class="zzz-tag">非官方 · 玩家自制工具站</span> -->
            <h1 class="zzz-display zzz-title">ZZZ-HP</h1>
            <p class="zzz-hero-copy">
              <span style="background-color: #91bc00">绝区零 · 数据查询与伤害计算工具</span>
              <img src="/zzz-assets/Bangboo.gif" alt="" class="zzz-bangboo" />
            </p>
          </header>

          <nav class="zzz-mode-grid" aria-label="ZZZ-HP 公开功能">
            <RouterLink
              v-for="mode in modes"
              :key="mode.path"
              :to="mode.path"
              class="zzz-mode-card"
            >
              <span class="zzz-mode-number zzz-display">{{ mode.number }}</span>
              <span class="zzz-mode-body">
                <strong>{{ mode.title }}</strong>
                <small>{{ mode.english }}</small>
                <em>{{ mode.description }}</em>
              </span>
              <span class="zzz-mode-arrow">↗</span>
            </RouterLink>
          </nav>

          <section class="zzz-summary-panel">
            <!-- <p>
              这里作为 ZZZ-HP 在菅名のBlog 内的入口页。点击上方卡片会进入独立页面，
              页面内提供返回按钮，回到博客的游戏攻略锚点。
            </p> -->
            <div class="zzz-stat-row">
              <div v-for="item in statCards" :key="item.label">
                <strong>{{ item.value }}</strong>
                <span>{{ item.label }}</span>
              </div>
            </div>
          </section>

          <aside class="zzz-about-panel">
            <div class="zzz-about-head">
              <span class="zzz-eyebrow">ABOUT / 关于网站</span>
              <h2 class="zzz-about-title">本工具箱的数据与功能来自开源项目 <b>ZZZ-HP</b></h2>
            </div>
            <p class="zzz-about-copy">
              危局强袭、式舆防卫战、角色计算器与临界推演等模块由 ZZZ-HP 开发组在群里共创维护，
              本站以入口形式接入，数据与功能均同步自该项目。
            </p>
            <div class="zzz-about-links">
              <a class="zzz-about-link"
                 href="https://zzz-hp.top/"
                 target="_blank"
                 rel="noopener noreferrer">
                <strong>主站</strong>
                <span>zzz-hp.top</span>
                <em>↗</em>
              </a>
              <a class="zzz-about-link"
                 href="https://github.com/Nie7bai/ZZZ-HP"
                 target="_blank"
                 rel="noopener noreferrer">
                <strong>项目来源</strong>
                <span>github.com/Nie7bai/ZZZ-HP</span>
                <em>↗</em>
              </a>
            </div>
          </aside>
        </div>
      </main>
    </PageSectionContent>
  </PageSection>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import PageSection from "/src/vue/components/layout/PageSection.vue";
import PageSectionContent from "/src/vue/components/layout/PageSectionContent.vue";
import { getZzzOverview } from "/src/data/zzzApi.js";

const props = defineProps({
  id: String,
});

const apiStatus = ref("正在连接 NAS API");
const stats = ref({
  agents: "—",
  wengines: "—",
  defenseSeasons: "—",
  crisisSeasons: "—"
});

const statCards = computed(() => [
  { label: "代理人资料", value: stats.value.agents },
  { label: "音擎资料", value: stats.value.wengines },
  { label: "防卫赛季", value: stats.value.defenseSeasons },
  { label: "危局赛季", value: stats.value.crisisSeasons }
]);

const modes = [
  {
    id: "crisis",
    path: "/zzz/crisis-assault",
    number: "01",
    title: "危局强袭",
    english: "CRISIS ASSAULT",
    description: "往期血量、分数反推与期数对比",
  },
  {
    id: "defense",
    path: "/zzz/defense",
    number: "02",
    title: "式舆防卫战",
    english: "SHIYU DEFENSE",
    description: "防卫战数据、房间与敌人信息",
  },
  {
    id: "calculator",
    path: "/zzz/calculator",
    number: "03",
    title: "角色计算器",
    english: "DAMAGE CALC",
    description: "面板、词条与伤害计算",
  },
  {
    id: "deduction",
    path: "/zzz/deduction",
    number: "04",
    title: "临界推演",
    english: "CRITICAL DEDUCTION",
    description: "推演模式数据浏览",
  },
  
];

async function loadZzzOverview() {
  try {
    const overview = await getZzzOverview();
    const agents = overview.agents.length;
    const wengines = overview.wengines.length;
    const defenseSeasons =
      overview.newDefenseSeasons.length + overview.oldDefenseSeasons.length;
    const crisisSeasons = overview.crisisSeasons.length;

    stats.value.agents = String(agents);
    stats.value.wengines = String(wengines);
    stats.value.defenseSeasons = String(defenseSeasons);
    stats.value.crisisSeasons = String(crisisSeasons);
    apiStatus.value = "NAS API 已连接";
  } catch (error) {
    console.warn("ZZZ-HP overview API is unavailable:", error);
    apiStatus.value = "演示模式 · 等待 NAS API";
  }
}

onMounted(loadZzzOverview);
</script>

<style lang="scss" scoped>
.zzz-guide-section {
  background: var(--zzz-bg);
  padding-top: 0 !important;
}

.zzz-home {
  position: relative;
  min-height: 72vh;
  overflow: hidden;
  border: 1px solid #000;
  background: var(--zzz-bg);
  color: var(--zzz-fg);
}

.zzz-home-bg {
  position: absolute;
  inset: -8%;
  opacity: 0.24;
  background: url("/zzz-assets/bg-collage.webp") center / cover no-repeat;
  animation: zzz-drift 18s ease-in-out infinite alternate;
}

.zzz-home-inner {
  position: relative;
  z-index: 1;
  width: min(1100px, 100%);
  margin: 0 auto;
  padding: clamp(2rem, 6vw, 5rem) clamp(1rem, 4vw, 3rem);
}

.zzz-toolbar,
.zzz-module-heading,
.zzz-changelog-heading,
.zzz-changelog-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.zzz-eyebrow {
  display: block;
  color: var(--zzz-dim);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.zzz-status {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0.45rem 0 0;
  color: var(--zzz-dim);
  font-size: 0.8rem;
}

.zzz-status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: #91bc00;
}

.zzz-hero {
  margin: clamp(3rem, 3vw, 7rem) 0 2rem;
}

.zzz-tag {
  display: inline-flex;
  padding: 0.25rem 0.8rem;
  background: var(--zzz-yellow);
  color: #090909;
  font-family: "JetBrains Mono", monospace;
  font-size: 0.7rem;
  font-weight: 700;
}

.zzz-display {
  font-family: "Archivo Black", "Microsoft YaHei", sans-serif;
  font-weight: 900;
}

.zzz-title {
  display: inline-block;
  margin: 0.75rem 0 0;
  padding: 0.02em 0.14em 0.06em;
  background: var(--zzz-yellow);
  color: #090909;
  font-size: clamp(3.8rem, 12vw, 8rem);
  line-height: 0.95;
  transform: skew(-7deg);
}

.zzz-hero-copy {
  display: flex;
  align-items: flex-end;
  gap: 0.75rem;
  margin: 1rem 0 0;
  font-size: clamp(1rem, 2.2vw, 1.35rem);
  font-weight: 800;
  letter-spacing: 0.12em;
}

.zzz-bangboo {
  width: 2.5rem;
  height: 2.5rem;
  object-fit: contain;
}

.zzz-mode-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 0.75rem;
}

.zzz-mode-card {
  grid-column: span 6;
  display: flex;
  align-items: center;
  gap: 1rem;
  min-height: 7rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--zzz-line);
  border-radius: 1rem 1rem 0.25rem 1rem;
  background: var(--zzz-card);
  color: var(--zzz-fg);
  text-align: left;
  text-decoration: none;
  transition: 0.18s ease;
}

.zzz-mode-card:hover {
  border-color: var(--zzz-yellow);
  background: var(--zzz-yellow);
  color: #090909;
  transform: translateY(-2px);
}

.zzz-mode-number {
  color: var(--zzz-yellow);
  font-size: 2.4rem;
}

.zzz-mode-card:hover .zzz-mode-number {
  color: #090909;
}

.zzz-mode-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.2rem;
}

.zzz-mode-body strong {
  font-size: 1.05rem;
}

.zzz-mode-body small {
  color: var(--zzz-dim);
  font-family: "JetBrains Mono", monospace;
  font-size: 0.65rem;
  letter-spacing: 0.12em;
}

.zzz-mode-card:hover small,
.zzz-mode-card:hover em {
  color: rgba(9, 9, 9, 0.65);
}

.zzz-mode-body em {
  color: var(--zzz-dim);
  font-size: 0.76rem;
  font-style: normal;
}

.zzz-mode-arrow {
  margin-left: auto;
  font-size: 1.4rem;
}

.zzz-summary-panel {
  margin-top: 1rem;
  padding: clamp(1rem, 3vw, 1.6rem);
  border: 1px solid var(--zzz-line);
  border-radius: 1rem 1rem 0.25rem 1rem;
  background: color-mix(in srgb, var(--zzz-card) 94%, transparent);
}

.zzz-summary-panel p {
  max-width: 48rem;
  margin: 0;
  color: var(--zzz-dim);
  line-height: 1.8;
}

.zzz-stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.75rem;
  margin-top: 1.3rem;
}

.zzz-stat-row div {
  padding: 0.9rem;
  border-left: 3px solid var(--zzz-yellow);
  background: rgba(127, 127, 127, 0.1);
}

.zzz-stat-row strong,
.zzz-stat-row span {
  display: block;
}

.zzz-stat-row strong {
  font-size: 1.7rem;
}

.zzz-stat-row span {
  margin-top: 0.2rem;
  color: var(--zzz-dim);
  font-size: 0.75rem;
}

/* ── 关于网站 / 来源注明 ── */
.zzz-about-panel {
  margin-top: 1rem;
  padding: clamp(1.1rem, 3vw, 1.6rem);
  border: 1px solid var(--zzz-line);
  border-left: 4px solid var(--zzz-yellow);
  border-radius: 0.25rem 1rem 1rem 0.25rem;
  background: color-mix(in srgb, var(--zzz-card) 96%, transparent);
}

.zzz-about-head {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.zzz-about-title {
  margin: 0;
  font-size: clamp(1.05rem, 2.4vw, 1.4rem);
  line-height: 1.5;
}

.zzz-about-title b {
  color: var(--zzz-yellow);
}

.zzz-about-copy {
  max-width: 52rem;
  margin: 0.6rem 0 0;
  color: var(--zzz-dim);
  font-size: 0.85rem;
  line-height: 1.8;
}

.zzz-about-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

.zzz-about-link {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.6rem;
  min-width: 15rem;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--zzz-line);
  border-radius: 0.5rem 0.5rem 0.15rem 0.5rem;
  background: rgba(127, 127, 127, 0.08);
  color: var(--zzz-fg);
  text-decoration: none;
  transition: 0.16s ease;
}

.zzz-about-link:hover {
  border-color: var(--zzz-yellow);
  background: var(--zzz-yellow);
  color: #090909;
}

.zzz-about-link strong {
  font-family: "JetBrains Mono", monospace;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
}

.zzz-about-link span {
  color: var(--zzz-dim);
  font-size: 0.82rem;
}

.zzz-about-link em {
  font-style: normal;
  font-size: 1rem;
}

@keyframes zzz-drift {
  from {
    transform: scale(1.02) translate(-1%, -1%);
  }
  to {
    transform: scale(1.08) translate(1%, 1%);
  }
}

@media (max-width: 768px) {
  .zzz-mode-card,
  .zzz-mode-card:last-child {
    grid-column: span 12;
  }

  .zzz-stat-row {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) and (max-width: 1080px) {
  .zzz-stat-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

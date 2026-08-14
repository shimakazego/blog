<template>
    <main class="zzz-page">
        <div class="zzz-page-bg"
             aria-hidden="true"/>

        <div class="zzz-page-inner">
            <RouterLink class="zzz-back"
                        to="/#game-guides">
                ← 返回游戏攻略
            </RouterLink>

            <header class="zzz-page-header">
                <span class="zzz-eyebrow">{{ eyebrow }}</span>
                <h1>{{ title }}</h1>
                <p>{{ description }}</p>
            </header>

            <slot/>
        </div>
    </main>
</template>

<script setup>
defineProps({
    eyebrow: String,
    title: String,
    description: String
})
</script>

<style lang="scss" scoped>
.zzz-page {
    --zzz-yellow: #fbfe00;
    --zzz-bg: #050505;
    --zzz-fg: #f5f5f0;
    --zzz-dim: rgba(245, 245, 240, 0.58);
    --zzz-card: #171717;
    --zzz-line: rgba(255, 255, 255, 0.16);
    position: relative;
    min-height: 100vh;
    overflow: hidden;
    background: var(--zzz-bg);
    color: var(--zzz-fg);
}

.zzz-page-bg {
    position: fixed;
    inset: -8%;
    opacity: 0.16;
    background: url("/zzz-assets/bg-collage.webp") center / cover no-repeat;
    animation: zzz-bg-drift 20s ease-in-out infinite alternate;
}

.zzz-page-inner {
    position: relative;
    z-index: 1;
    width: min(1180px, 100%);
    margin: 0 auto;
    padding: clamp(1.25rem, 4vw, 3rem);
}

.zzz-back {
    display: inline-flex;
    margin-bottom: clamp(2rem, 6vw, 4rem);
    padding: 0.5rem 0.8rem;
    border: 1px solid var(--zzz-line);
    border-radius: 0.4rem;
    color: var(--zzz-fg);
    font-size: 0.82rem;
    text-decoration: none;
}

.zzz-back:hover {
    background: var(--zzz-yellow);
    color: #080808;
}

.zzz-eyebrow {
    color: var(--zzz-yellow);
    font-family: "JetBrains Mono", monospace;
    font-size: 0.76rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
}

.zzz-page-header {
    max-width: 760px;
}

.zzz-page-header h1 {
    margin: 0.55rem 0 0;
    font-family: "Archivo Black", "Microsoft YaHei", sans-serif;
    font-size: clamp(2.4rem, 8vw, 5.8rem);
    line-height: 0.95;
}

.zzz-page-header p {
    margin: 1rem 0 0;
    color: var(--zzz-dim);
    font-size: 1rem;
    line-height: 1.8;
}

:deep(.zzz-grid) {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.9rem;
    margin-top: 2rem;
}

:deep(.zzz-card) {
    padding: 1rem;
    border: 1px solid var(--zzz-line);
    border-radius: 1rem 1rem 0.25rem 1rem;
    background: var(--zzz-card);
}

:deep(.zzz-card h2),
:deep(.zzz-card h3) {
    margin: 0;
}

:deep(.zzz-card p),
:deep(.zzz-muted) {
    color: var(--zzz-dim);
    line-height: 1.75;
}

:deep(.zzz-stat) {
    display: block;
    margin-bottom: 0.3rem;
    color: var(--zzz-yellow);
    font-family: "Archivo Black", "Microsoft YaHei", sans-serif;
    font-size: 2.4rem;
    line-height: 1;
}

:deep(.zzz-list) {
    display: grid;
    gap: 0.75rem;
    margin-top: 2rem;
}

:deep(.zzz-row) {
    display: grid;
    grid-template-columns: minmax(90px, 0.4fr) minmax(0, 1fr) minmax(90px, 0.5fr);
    gap: 0.8rem;
    align-items: center;
    padding: 0.85rem 1rem;
    border: 1px solid var(--zzz-line);
    background: rgba(255, 255, 255, 0.055);
}

:deep(.zzz-row strong) {
    color: var(--zzz-fg);
}

:deep(.zzz-row span) {
    color: var(--zzz-dim);
    font-size: 0.84rem;
}

:deep(.zzz-error) {
    margin-top: 2rem;
    padding: 1rem;
    border: 1px solid rgba(255, 120, 120, 0.35);
    background: rgba(255, 120, 120, 0.08);
    color: #ffc5c5;
}

@keyframes zzz-bg-drift {
    from { transform: scale(1.02) translate(-1%, -1%); }
    to { transform: scale(1.08) translate(1%, 1%); }
}

@media (max-width: 800px) {
    :deep(.zzz-grid) {
        grid-template-columns: 1fr;
    }

    :deep(.zzz-row) {
        grid-template-columns: 1fr;
    }
}
</style>

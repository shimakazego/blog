<template>
    <button type="button"
            class="theme-toggle"
            :title="isDark ? '切换到亮色模式' : '切换到暗色模式'"
            :aria-label="isDark ? '切换到亮色模式' : '切换到暗色模式'"
            @click="themeStore.toggleTheme()">
        <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'" aria-hidden="true"/>
    </button>
</template>

<script setup>
import {computed} from "vue"
import {useThemeStore} from "/src/stores/theme"

const themeStore = useThemeStore()
const isDark = computed(() => themeStore.mode === "dark")
</script>

<style lang="scss" scoped>
.theme-toggle {
    position: fixed;
    right: 1.1rem;
    bottom: 1.1rem;
    z-index: 9999;
    display: grid;
    place-items: center;
    width: 2.9rem;
    height: 2.9rem;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 0.7rem 0.7rem 0.15rem 0.7rem;
    background: rgba(12, 12, 12, 0.85);
    color: #fbfe00;
    font-size: 1.15rem;
    line-height: 1;
    cursor: pointer;
    box-shadow:
        0 4px 16px rgba(0, 0, 0, 0.5),
        inset 0 0 0 2px rgba(251, 254, 0, 0.35);
    transition:
        transform 0.15s ease,
        color 0.15s ease,
        background-color 0.15s ease;
}

.theme-toggle:hover {
    transform: translateY(-2px) scale(1.04);
    background: #1a1a1a;
}

.theme-toggle:focus-visible {
    outline: 2px solid #fbfe00;
    outline-offset: 2px;
}

:global(html[data-theme='light']) .theme-toggle {
    border-color: rgba(0, 0, 0, 0.3);
    background: rgba(250, 248, 242, 0.92);
    color: #141412;
    box-shadow:
        0 4px 16px rgba(0, 0, 0, 0.22),
        inset 0 0 0 2px rgba(20, 20, 18, 0.3);
}

:global(html[data-theme='light']) .theme-toggle:hover {
    background: #fbfe00;
}
</style>
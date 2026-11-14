<template>
    <nav class="foxy-mobile-tabbar" aria-label="板块导航">
        <button v-for="item in props.items"
                :key="item.path"
                type="button"
                class="foxy-mobile-tab"
                :class="{ 'is-active': item.isActive }"
                :aria-current="item.isActive ? 'page' : undefined"
                @click="_onItemClicked(item)">
            <span class="foxy-mobile-tab-icon-shell">
                <img v-if="customIcon(item) === 'bangboo'"
                     class="foxy-mobile-tab-img is-bangboo"
                     src="/zzz-assets/Bangboo.gif"
                     alt=""
                     aria-hidden="true"/>
                <img v-else-if="customIcon(item) === 'giraffe'"
                     class="foxy-mobile-tab-img is-giraffe"
                     src="/images/nav/yuri-giraffe.png"
                     alt=""
                     aria-hidden="true"/>
                <i v-else
                   :class="item.faIcon"
                   class="foxy-mobile-tab-icon"/>
            </span>
            <span class="foxy-mobile-tab-label">{{ item.label }}</span>
        </button>
    </nav>
</template>

<script setup>
import {useRouter} from "vue-router"

const router = useRouter()

/* 移动端专属的图片图标：原版素材，不改色不重绘 */
const CUSTOM_ICON_BY_PATH = {
    "#game-guides": "bangboo",
    "#yuri": "giraffe"
}

const props = defineProps({
    items: {
        type: Array,
        default: () => []
    }
})

const customIcon = (item) => {
    return CUSTOM_ICON_BY_PATH[item?.path] || null
}

const _onItemClicked = (item) => {
    if(!item?.path) {
        return
    }

    if(String(item.path).startsWith("#")) {
        if(window.location.hash !== item.path) {
            window.location.hash = item.path
        }
        window.scrollTo({top: 0, behavior: "instant"})
        return
    }

    router.push(item.path)
}
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";

nav.foxy-mobile-tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 900;

    display: none;
    padding-bottom: env(safe-area-inset-bottom, 0px);

    background: rgba(23, 24, 27, 0.94);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 -12px 32px rgba(0, 0, 0, 0.32);
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);

    @include media-breakpoint-down(lg) {
        display: flex;
    }
}

button.foxy-mobile-tab {
    flex: 1 1 0;
    min-width: 0;
    height: 3.5rem;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.14rem;

    border: 0;
    background: transparent;
    /* 所有图标统一为白色系（图片 logo 保持原色，不做染色） */
    color: rgba(255, 255, 255, 0.55);

    font-family: $font-family-base;
    font-size: 0.66rem;
    font-weight: 600;
    letter-spacing: 0.04em;

    -webkit-tap-highlight-color: transparent;
    transition: color 0.2s ease;
}

span.foxy-mobile-tab-icon-shell {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.1rem;
    height: 1.55rem;
    border-radius: 0.45rem;
    transition: background 0.2s ease, transform 0.15s ease;
}

i.foxy-mobile-tab-icon {
    font-size: 1.02rem;
    line-height: 1;
}

img.foxy-mobile-tab-img {
    display: block;
    width: 1.45rem;
    height: 1.45rem;
    object-fit: contain;
    opacity: 0.55;
    transition: opacity 0.2s ease;
}

img.foxy-mobile-tab-img.is-bangboo {
    width: 1.5rem;
    height: 1.5rem;
}

img.foxy-mobile-tab-img.is-giraffe {
    width: 1.32rem;
    height: 1.32rem;
    border-radius: 50%;
}

span.foxy-mobile-tab-label {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

button.foxy-mobile-tab:active span.foxy-mobile-tab-icon-shell {
    transform: scale(0.88);
}

button.foxy-mobile-tab.is-active {
    color: #ffffff;
}

button.foxy-mobile-tab.is-active span.foxy-mobile-tab-icon-shell {
    background: rgba($primary, 0.28);
    box-shadow: 0 0 12px rgba($primary, 0.18);
}

button.foxy-mobile-tab.is-active img.foxy-mobile-tab-img {
    opacity: 1;
}

button.foxy-mobile-tab.is-active span.foxy-mobile-tab-label {
    color: lighten($primary, 16%);
}
</style>

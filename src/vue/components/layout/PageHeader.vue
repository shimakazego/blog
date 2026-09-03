<template>
    <header :id="id"
            class="foxy-header">
        <BackgroundPromo :faded="false"/>
        <SakuraOverlay :count="18"/>

        <!-- Content -->
        <div class="container-xxl">
            <article class="foxy-hero-header">
                <!-- Logo -->
                <!-- <ImageView :src="logoUrl"
                           :spinner-enabled="true"
                           :alt="title"
                           class="foxy-hero-header-logo"/> -->

                <!-- Texts -->
                <h1 class="heading"
                    v-html="parsedTitle"/>
                <h4 class="subheading"
                    v-html="parsedSubtitle"/>

                <!-- Button -->
                <Link v-if="showButton"
                      :url="props.buttonUrl">
                    <XLButton :label="buttonLabel"
                              :icon="buttonIcon"
                              :class="`mt-4`"/>
                </Link>
            </article>
        </div>
    </header>
</template>

<script setup>
import BackgroundPromo from "/src/vue/components/layout/BackgroundPromo.vue"
import SakuraOverlay from "/src/vue/components/effects/SakuraOverlay.vue"
import ImageView from "/src/vue/components/generic/ImageView.vue"
import {useUtils} from "/src/composables/utils.js"
import {computed} from "vue"
import Link from "/src/vue/components/generic/Link.vue"
import XLButton from "/src/vue/components/widgets/XLButton.vue"

const utils = useUtils()

const props = defineProps({
    id: String,
    title: String,
    subtitle: String,
    logoUrl: String,
    showButton: Boolean,
    buttonLabel: String,
    buttonIcon: String,
    buttonUrl: String
})

const parsedTitle = computed(() => {
    return utils.parseCustomText(props.title)
})

const parsedSubtitle = computed(() => {
    return utils.parseCustomText(props.subtitle)
})
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";

header.foxy-header {
    --height: clamp(650px, 100vh, 1050px);
    --content-margin-top: 80px;
    --max-logo-proportion:45vw;
    --max-logo-height:50vh;
    @include media-breakpoint-down(xl) {--max-logo-height: 35vh;}
    @include media-breakpoint-down(lg) {--max-logo-height: 30vh; }
    @include media-breakpoint-down(md) {--content-margin-top: 65px;}

    --content-height: calc(var(--height) - var(--content-margin-top));
    --logo-proportion: clamp(190px, 45vw, min(37.5vh, 35vw, 350px));

    position: relative;
    z-index: 0; /* 建立 stacking context，让 z-index:-1 的背景图绘制在 header 内而不是 body 之下 */
    height: var(--height);
    overflow: hidden;

    div.container-xxl {
        display: flex;
        align-items: center;
        justify-content: center;

        height: var(--height);
        padding-left: 1rem;
        padding-right: 1rem;
        padding-bottom: 2rem;
        position: relative;
        z-index: 1;
    }

    article.foxy-hero-header {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        padding-top:var(--content-margin-top);
    }

    div.foxy-hero-header-logo {
        height: var(--logo-proportion);
        width: var(--logo-proportion);
    }

    h1.heading {
        color:$white;
        text-transform: uppercase;
        text-align: center;
        font-weight: 700;
        font-size: calc(var(--logo-proportion)/6);
        padding: calc(var(--logo-proportion)/8) 0 calc(var(--logo-proportion)/180);
    }

    h4.subheading {
        font-family: $font-family-base;
        color: $light-5;

        font-size: clamp(16px, calc(var(--logo-proportion)/14), 100px);
        padding: calc(var(--logo-proportion)/20) 0;
        line-height: 24px;
        text-align: center;
    }
}
</style>

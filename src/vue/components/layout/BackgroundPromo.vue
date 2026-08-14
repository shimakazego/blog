<template>
    <div class="foxy-promo-background"
         :class="{
             'is-loaded': isLoaded,
             'is-placeholder-hidden': isLoaded
         }">
        <div class="foxy-promo-background-image foxy-promo-background-image-placeholder"/>
        <div class="foxy-promo-background-image foxy-promo-background-image-full"/>
        <div :class="`foxy-promo-background-overlay-${faded ? `faded` : `default`}`"/>
    </div>
</template>

<script setup>
import {onMounted, ref} from "vue"

defineProps({
    faded: Boolean
})

const isLoaded = ref(false)

onMounted(() => {
    const heroImage = new Image()

    heroImage.decoding = "async"
    heroImage.src = "/images/logo/background.jpg"

    const markLoaded = () => {
        isLoaded.value = true
    }

    if (heroImage.complete) {
        markLoaded()
        return
    }

    heroImage.addEventListener("load", markLoaded, {once: true})
    heroImage.addEventListener("error", markLoaded, {once: true})
})
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";

div.foxy-promo-background {
    position: absolute;
    height: calc(100% + 4rem);
    width: 100%;
    z-index: -1;
    overflow: hidden;
}

div.foxy-promo-background-image {
    position: absolute;
    inset: 0;
    background-position: center;
    background-size: cover;
    transition: opacity 480ms ease, filter 480ms ease, transform 720ms ease;
}

div.foxy-promo-background-image-placeholder {
    background-image: url('/images/logo/background-placeholder.jpg');
    filter: blur(18px) saturate(1.05) brightness(0.94);
    transform: scale(1.12);
}

div.foxy-promo-background-image-full {
    background-image: url('/images/logo/background.jpg');
    filter: saturate(1.18) contrast(1.08) brightness(1.03);
    opacity: 0;
    transform: scale(1.04);
}

div.foxy-promo-background.is-loaded {
    div.foxy-promo-background-image-full {
        opacity: 1;
        transform: scale(1);
    }
}

div.foxy-promo-background.is-placeholder-hidden {
    div.foxy-promo-background-image-placeholder {
        opacity: 0;
    }
}

div.foxy-promo-background-overlay-default {
    position: relative;
    height: 100%;
    width: 100%;

    background-image: -webkit-gradient(linear, left top, left bottom, from(rgba(18, 22, 32, 0.34)), color-stop(40%, rgba(18, 22, 32, 0.46)), color-stop(70%, rgba(18, 22, 32, 0.68)), to(rgba(18, 22, 32, 0.9)));
    background-image: linear-gradient(180deg, rgba(18, 22, 32, 0.34) 0%, rgba(18, 22, 32, 0.46) 40%, rgba(18, 22, 32, 0.68) 70%, rgba(18, 22, 32, 0.9) 100%);
}

div.foxy-promo-background-overlay-faded {
    position: relative;
    height: 100%;
    width: 100%;

    background-image: -webkit-gradient(linear, left top, left bottom, from(rgba(18, 22, 32, 0.48)), color-stop(40%, rgba(18, 22, 32, 0.58)), color-stop(70%, rgba(18, 22, 32, 0.76)), to(rgba(18, 22, 32, 0.94)));
    background-image: linear-gradient(180deg, rgba(18, 22, 32, 0.48) 0%, rgba(18, 22, 32, 0.58) 40%, rgba(18, 22, 32, 0.76) 70%, rgba(18, 22, 32, 0.94) 100%);
}
</style>

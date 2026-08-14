<template>
    <div class="foxy-promo-background">
        <div :class="`foxy-promo-background-overlay-${faded ? `faded` : `default`}`"/>
    </div>
</template>

<script setup>
const props = defineProps({
    faded: Boolean
})
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";

div.foxy-promo-background {
    position: absolute;
    height: calc(100% + 4rem);
    width: 100%;
    z-index: -1;

    background-image: url('/images/logo/background.jpeg');
    background-position: center;
    background-size: cover;
    filter: saturate(1.18) contrast(1.08) brightness(1.03);
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

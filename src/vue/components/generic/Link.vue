<template>
    <router-link v-if="isRouterLink"
                 :to="url">
        <slot/>
    </router-link>

    <button v-else-if="isHashLink"
            class="btn-link-wrapper"
            @click="_onHashLinkClicked">
        <slot/>
    </button>

    <a v-else-if="isExternalLink"
       class="btn-link-wrapper"
       :href="url"
       target="_blank">
        <slot/>
    </a>
</template>

<script setup>
import {computed} from "vue"

const props = defineProps({
    url: String
})

const isRouterLink = computed(() => {
    return String(props.url).charAt(0) === "/"
})

const isHashLink = computed(() => {
    return String(props.url).charAt(0) === "#"
})

const isExternalLink = computed(() => {
    return String(props.url).includes('http')
})

const _onHashLinkClicked = () => {
    if(props.url === "#") {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        })
        window.location.hash = ''
        return
    }

    window.location.hash = props.url
}
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";

button.btn-link-wrapper {
    padding: 0;
    margin: 0;
    background: transparent;
    border: 0;
    outline: none;
    box-shadow: none;
}
</style>

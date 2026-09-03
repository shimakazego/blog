<template>
    <div class="foxy-section-header">
        <h1 class="foxy-section-header-title" v-html="parsedTitle"/>
        <h5 class="foxy-section-header-subtitle pt-1" v-html="parsedSubtitle"/>
    </div>
</template>

<script setup>
import {computed} from "vue"
import {useUtils} from "/src/composables/utils.js"

const utils = useUtils()

const props = defineProps({
    title: String,
    subtitle: String,
    contrast: Boolean
})

const parsedTitle = computed(() => {
    return utils.parseCustomText(props.title, props.contrast)
})

const parsedSubtitle = computed(() => {
    return utils.parseCustomText(props.subtitle)
})
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";

div.foxy-section-header {
    @include generate-dynamic-styles-with-hash((
        xxxl: (margin-bottom: 4rem),
        xxl:  (margin-bottom: 3rem),
        lg:   (margin-bottom: 3rem),
        md:   (margin-bottom: 2.75rem),
        sm:   (margin-bottom: 2.5rem),
    ));

    text-align: center;
}

h1 {
    text-transform: uppercase;
    color: inherit;
}

h5 {
    font-family: $font-family-base;
    color: var(--blog-muted);
}
</style>
<template>
    <div class="foxy-page-wrapper"
         :class="{
             'foxy-page-wrapper-no-padding': noPadding,
             'foxy-page-wrapper-tabbed-content': tabbed && activeSection?.id !== 'hero'
         }"
         :id="props.id">
        <component v-if="tabbed && activeSection"
                   :is="activeSection.component"
                   :id="activeSection.id"
                   :key="activeSection.id"/>

        <component v-else
                   v-for="sectionInfo in sections"
                   :is="sectionInfo.component"
                   :id="sectionInfo.id"/>
    </div>
</template>

<script setup>
import SectionInfo from "/src/models/SectionInfo.js"
import {computed, inject, onBeforeMount, watch} from "vue"
import {useRoute} from "vue-router"

const currentPageSections = inject("currentPageSections")
const currentPageActiveSectionId = inject("currentPageActiveSectionId")
const route = useRoute()

const props = defineProps({
    id: String,
    noPadding: Boolean,
    tabbed: Boolean,
    sections: {
        type: Array,
        validator(value) { return value.every(item => item instanceof SectionInfo) },
        required: true
    }
})

const activeSection = computed(() => {
    if(!props.tabbed)
        return null

    return props.sections.find(section => section.id === currentPageActiveSectionId?.value) || props.sections[0]
})

onBeforeMount(() => {
    currentPageSections.value = props.sections
    if(props.tabbed) {
        _syncActiveSection(route.hash)
    }
})

watch(() => route.hash, (hash) => {
    if(props.tabbed) {
        _syncActiveSection(hash)
    }
})

const _syncActiveSection = (hash) => {
    const hashId = String(hash || "").replace("#", "")
    const targetSection = props.sections.find(section => section.id === hashId)
    currentPageActiveSectionId.value = targetSection?.id || props.sections[0]?.id
}
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";

div.foxy-page-wrapper {
    @include generate-dynamic-styles-with-hash((
        xxxl: (padding-top:2rem),
        xxl: (padding-top:2.75rem),
        lg: (padding-top:3.5rem),
    ));
}

div.foxy-page-wrapper-no-padding {
    padding-top: 0!important;
}

div.foxy-page-wrapper-tabbed-content {
    padding-top: $navbar-height !important;
}
</style>

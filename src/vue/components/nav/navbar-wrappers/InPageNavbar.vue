<template>
    <Navbar :brand-logo="logo"
            :brand-label="label"
            brand-url="#"
            :link-list="linkList"
            :expandable="true"/>
</template>

<script setup>
import Navbar from "/src/vue/components/nav/navbar/Navbar.vue"
import {computed, inject, onMounted, onUnmounted, ref, watch} from "vue"
import {useRoute, useRouter} from "vue-router"
import {useLayout} from "/src/composables/layout.js"

const route = useRoute()
const router = useRouter()
const layout = useLayout()

/**
 * @type {{value: SectionInfo[]}}
 */
const currentPageSections = inject("currentPageSections")
const currentPageActiveSectionId = inject("currentPageActiveSectionId")

const LoaderAnimationStatus = inject("LoaderAnimationStatus")
const loaderAnimationStatus = inject("loaderAnimationStatus")

const currentSection = ref(null)

const props = defineProps({
    logo: String,
    label: String
})

const linkList = computed(() => {
    const sections = currentPageSections?.value
    if(!sections || !sections.length)
        return []

    return sections.map(section => {
        return {
            path: section.hash,
            label: section.name,
            faIcon: section.faIcon,
            isActive: (currentPageActiveSectionId?.value || currentSection.value?.id) === section.id
        }
    }).filter(section => section.label && section.path)
})

onMounted(() => {
    window.addEventListener('scroll', _onWindowEvent)
    window.addEventListener('resize', _onWindowEvent)
    _initSpyScroll()
})

onUnmounted(() => {
    window.removeEventListener('scroll', _onWindowEvent)
    window.removeEventListener('resize', _onWindowEvent)
})

watch(() => loaderAnimationStatus.value, () => {
    if(loaderAnimationStatus.value === LoaderAnimationStatus.LEAVING) {
        _onWindowEvent()
    }
})

const _initSpyScroll = () => {
    setTimeout(() => {
        _onWindowEvent()
        _scrollHashSectionIntoView()
    }, 400)
}

const _scrollHashSectionIntoView = () => {
    const hash = route.hash
    if(!hash)
        return

    const sectionDiv = document.querySelector(hash)
    if(sectionDiv) {
        layout.scrollIntoView(sectionDiv)
    }
}

const _onWindowEvent = () => {
    let lowestOffset = null

    if(window.scrollY < window.innerHeight/4) {
        currentSection.value = null
        return
    }

    const sections = currentPageSections?.value
    for (const section of sections) {
        const sectionDiv = document.querySelector(section.hash)
        if (!sectionDiv) continue

        const offset = Math.abs(sectionDiv.getBoundingClientRect().y)
        if (lowestOffset === null || offset < lowestOffset) {
            lowestOffset = offset
            currentSection.value = section
        }
    }
}
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";
</style>

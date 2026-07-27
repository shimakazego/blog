<template>
    <slot/>
</template>

<script setup>
import {provide, ref} from "vue"
import {useSettings} from "/src/composables/settings.js"

const settings = useSettings()

/**
 * Global state CONSTANTS
 **/
const loaderEnabled = settings.getLoaderEnabled()

const LoaderAnimationStatus = {
    INITIALIZED: "initialized",
    RENDERED: "rendered",
    TRACKING_PROGRESS: "tracking_progress",
    LEAVING: "leaving"
}

/**
 * Global state FLAGS
 **/
const currentPageSections = ref([])
const currentPageActiveSectionId = ref(null)
const loaderActive = ref(true)
const loaderPageRefreshCount = ref(0)
const loaderSmoothTransitionEnabled = ref(true)
const loaderAnimationStatus = ref(null)
const projectModalTarget = ref(null)
const spinnerActive = ref(false)
const spinnerMessage = ref("")

/**
 * @param {Boolean} enabled
 * @param {String} [message=""]
 */
const setSpinnerEnabled = (enabled, message) => {
    spinnerActive.value = enabled
    spinnerMessage.value = message
}

provide("loaderEnabled", loaderEnabled)
provide("LoaderAnimationStatus", LoaderAnimationStatus)

provide("currentPageSections", currentPageSections)
provide("currentPageActiveSectionId", currentPageActiveSectionId)
provide("loaderActive", loaderActive)
provide("loaderPageRefreshCount", loaderPageRefreshCount)
provide("loaderSmoothTransitionEnabled", loaderSmoothTransitionEnabled)
provide("loaderAnimationStatus", loaderAnimationStatus)
provide("projectModalTarget", projectModalTarget)
provide("spinnerActive", spinnerActive)
provide("spinnerMessage", spinnerMessage)

provide("setSpinnerEnabled", setSpinnerEnabled)
</script>

<style lang="scss" scoped>

</style>

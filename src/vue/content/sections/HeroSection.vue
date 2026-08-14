<template>
    <!-- Heading Section -->
    <PageHeader :id="props.id"
                title="菅名のBlog"
                logo-url="/images/logo/agency-logo.png"
                :show-button="true"
                button-icon="fa-solid fa-search"
                button-label="关于我"
                button-url="#about"/>
</template>

<script setup>
import PageHeader from "/src/vue/components/layout/PageHeader.vue"

const props = defineProps({
    id: String
})
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";
</style>

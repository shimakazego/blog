<template>
    <!-- Heading Section -->
    <PageHeader :id="props.id"
                title="*Foxy* Landing Page"
                subtitle="An agency template by <strong>Ryan Balieiro</strong> – made with <strong>Vue3</strong> and <strong>Bootstrap 5</strong>"
                logo-url="/images/logo/agency-logo.png"
                :show-button="true"
                button-icon="fa-solid fa-search"
                button-label="Find Out More"
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

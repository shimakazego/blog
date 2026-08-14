<template>
    <!-- About Section -->
    <PageSection variant="default"
                 :id="props.id">
        <!-- Title -->
        <PageSectionHeader title="*About* Template"
                           subtitle="Get to know more about the project!"/>

        <!-- Content -->
        <PageSectionContent>
            <!-- About Template -->
            <ArticleInfoBlock image="/images/logo/agency-logo.png"
                              :paragraphs="[
                                  `<b>Ryan Balieiro</b> created <em>Foxy</em>, a free Vue3 and Bootstrap5 theme. The downloadable files consist of the entire source code, including HTML, CSS, and Javascript. Please feel free to download and customize the theme as you wish.`,
                                  `The template available on <a href='github.com'>GitHub</a> is a valuable resource for developers, as it provides a free and accessible solution for various projects. Hosted on the platform, the template allows users to easily access and utilize the source code, making it a convenient starting point for web development endeavors.`,
                                  `With this template, you have the freedom to create custom sections, fill pre-existing ones with your own content, and personalize the colors, fonts, and much more to your liking. In case you encounter any challenges while attempting to customize or run this template, please feel free to reach out to me without any hesitation. I would be more than happy to extend my assistance and help you out in every possible way.`
                              ]"/>
        </PageSectionContent>

        <!-- Footer -->
        <PageSectionFooter title="Get it for *free!*"
                           description="Do you want to use and/or customize this template? Feel free to clone it from the official Github repo!"
                           :include-divider="true"
                           button-label="Download Now!"
                           button-fa-icon="fa-solid fa-download"
                           button-url="https://github.com/ryanbalieiro/vue-agency-landing-page-template"/>
    </PageSection>
</template>

<script setup>
import PageSection from "/src/vue/components/layout/PageSection.vue"
import PageSectionHeader from "/src/vue/components/layout/PageSectionHeader.vue"
import PageSectionContent from "/src/vue/components/layout/PageSectionContent.vue"
import PageSectionFooter from "/src/vue/components/layout/PageSectionFooter.vue"
import ArticleInfoBlock from "/src/vue/components/articles/ArticleInfoBlock.vue"

const props = defineProps({
    id: String
})
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";
</style>

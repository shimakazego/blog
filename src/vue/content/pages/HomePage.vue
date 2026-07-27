<template>
    <PageWrapper id="foxy-home-page"
                 :no-padding="true"
                 :tabbed="true"
                 :sections="sections"/>
</template>

<script setup>
import PageWrapper from "/src/vue/components/layout/PageWrapper.vue"
import SectionInfo from "/src/models/SectionInfo.js"
import AboutMeSection from "/src/vue/content/sections/AboutMeSection.vue"
import ArchiveSection from "/src/vue/content/sections/ArchiveSection.vue"
import FunSection from "/src/vue/content/sections/FunSection.vue"
import HeroSection from "/src/vue/content/sections/HeroSection.vue"
import GameGuideSection from "/src/vue/content/sections/GameGuideSection.vue"
import YuriSection from "/src/vue/content/sections/YuriSection.vue"

const sections = [
    new SectionInfo('hero',         HeroSection,            '首页',          'pi pi-home'),
    new SectionInfo('archive',      ArchiveSection,         '文章归档',      'pi pi-book'),
    new SectionInfo('yuri',         YuriSection,            '百合动漫',      'pi pi-heart'),
    new SectionInfo('game-guides',  GameGuideSection,       '游戏攻略',      'pi pi-play-circle'),
    new SectionInfo('fun',          FunSection,             '开心一下',      'pi pi-sparkles'),
    new SectionInfo('about',        AboutMeSection,         '关于博主',      'pi pi-id-card')
]
</script>

<style lang="scss" scoped>
</style>

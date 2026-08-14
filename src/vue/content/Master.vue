<template>
    <Navigation logo="/images/logo/agency-logo-small.png"
                label="*菅名のBlog*"/>

    <router-view/>

    <Footer>
        <FooterBlock :darken="false"
                     :row="true">
            <FooterColumn title="关于本站"
                          faIcon="pi pi-lightbulb me-2"
                          :description="[
                              `这里是菅名のBlog 的前端起点，后续会逐步补充文章、百合动漫、游戏攻略和 Web 小玩具。`
                          ]"
                          :links="[
                              {label: `文章归档`, href: `#archive`, faIcon: null},
                              {label: `百合动漫`, href: `#yuri`, faIcon: null},
                              {label: `游戏攻略`, href: `#game-guides`, faIcon: null},
                          ]"
                          :displayLinksAsButtons="false"/>

            <FooterColumn title="站点入口"
                          faIcon=""
                          :description="[]"
                          :links="[
                              {label: `GitHub`, href: `https://github.com/shimakazego`, faIcon: `fa-brands fa-github`},
                              {label: `Bilibili`, href: `https://www.bilibili.com`, faIcon: `fa-brands fa-bilibili`},
                              {label: `Dnspod`, href: `https://console.dnspod.cn/dns/list`, faIcon: `pi pi-globe`},
                          ]"
                          :displayLinksAsButtons="true"/>

            <FooterColumn title="当前规划"
                          faIcon="pi pi-envelope me-2 pe-1"
                          :description="[
                              `先把静态前端页面做漂亮，再逐步接入轻量后端和文件服务。`,
                              `文章归档和游戏攻略后续大概率需要数据库支持。`
                          ]"
                          :links="[
                              {label: `NAS 部署`, href: `#fun`, faIcon: 'pi pi-server'},
                              {label: `关于博主`, href: `#about`, faIcon: 'pi pi-id-card'},
                          ]"
                          :displayLinksAsButtons="false"/>
        </FooterBlock>

        <FooterBlock :darken="true"
                     :row="false">
            <FooterCopyright holder="菅名のBlog"
                             url="https://github.com/shimakazego"
                             license="All Rights Reserved."/>
        </FooterBlock>
    </Footer>
</template>

<script setup>
import Navigation from "/src/vue/components/nav/Navigation.vue"
import Footer from "/src/vue/components/footer/Footer.vue"
import FooterBlock from "/src/vue/components/footer/FooterBlock.vue"
import FooterCopyright from "/src/vue/components/footer/FooterCopyright.vue"
import FooterColumn from "/src/vue/components/footer/FooterColumn.vue"
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";
</style>

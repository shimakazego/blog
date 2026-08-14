<template>
  <Navigation logo="/images/logo/agency-logo-small.png" label="*菅名のBlog*" />

  <router-view />
  <FooterBlock :darken="true" :row="false">
    <FooterCopyright
      holder="菅名のBlog"
      url="https://github.com/shimakazego"
      license="All Rights Reserved."
    />
  </FooterBlock>
  <!-- <Footer>
    <FooterBlock :darken="false" :row="true">
      <FooterColumn
        title="关于本站"
        faIcon="pi pi-lightbulb me-2"
        :description="[
          `这里是菅名のBlog 的前端起点，后续会逐步补充文章、百合动漫、游戏攻略和 Web 小玩具。`,
        ]"
        :links="[
          { label: `百合动漫`, href: `#yuri`, faIcon: null },
          { label: `游戏攻略`, href: `#game-guides`, faIcon: null },
        ]"
        :displayLinksAsButtons="false"
      />

      <FooterColumn
        title="社交媒体"
        faIcon=""
        :description="[]"
        :links="[
          {
            label: `GitHub`,
            href: `https://github.com/shimakazego`,
            faIcon: `fa-brands fa-github`,
          },
          {
            label: `Bilibili`,
            href: `https://space.bilibili.com/4002872`,
            faIcon: `fa-brands fa-bilibili`,
          },
        ]"
        :displayLinksAsButtons="true"
      />

      <FooterColumn
        title="当前规划"
        faIcon="pi pi-envelope me-2 pe-1"
        :description="[]"
        :displayLinksAsButtons="false"
      />
    </FooterBlock>

    <FooterBlock :darken="true" :row="false">
      <FooterCopyright
        holder="菅名のBlog"
        url="https://github.com/shimakazego"
        license="All Rights Reserved."
      />
    </FooterBlock>
  </Footer> -->
</template>

<script setup>
import Navigation from "/src/vue/components/nav/Navigation.vue";
import Footer from "/src/vue/components/footer/Footer.vue";
import FooterBlock from "/src/vue/components/footer/FooterBlock.vue";
import FooterCopyright from "/src/vue/components/footer/FooterCopyright.vue";
import FooterColumn from "/src/vue/components/footer/FooterColumn.vue";
</script>

<style lang="scss" scoped>
@import "/src/scss/_theming.scss";
</style>

import "./scss/style.scss"
import {createApp} from "vue"
import {createRouter, createWebHistory} from "vue-router"
import {createPinia} from "pinia"
import App from "/src/vue/stack/App.vue"
import HomePage from "/src/vue/content/pages/HomePage.vue"
import LicensePage from "/src/vue/content/pages/LicensePage.vue"
import PolicyPage from "/src/vue/content/pages/PolicyPage.vue"
import ZzzCalculatorPage from "/src/vue/content/pages/zzz/ZzzCalculatorPage.vue"
import ZzzCrisisPage from "/src/vue/content/pages/zzz/ZzzCrisisPage.vue"
import ZzzDeductionPage from "/src/vue/content/pages/zzz/ZzzDeductionPage.vue"
import ZzzDefensePage from "/src/vue/content/pages/zzz/ZzzDefensePage.vue"

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: "/",
            name: "home",
            component: HomePage,
            props: {
                label: "首页",
                faIcon: "pi pi-home",
                inPageNavbar: true,
                shouldAlwaysPreload: true,
                breadcrumbs: []
            }
        },

        // {
        //     path: "/privacy-policy",
        //     name: "policy",
        //     component: PolicyPage,
        //     props: {
        //         label: "Privacy Policy",
        //         faIcon: "pi pi-hammer",
        //         inPageNavbar: false,
        //         shouldAlwaysPreload: false,
        //         breadcrumbs: [
        //             "/"
        //         ]
        //     }
        // },

        // {
        //     path: "/license",
        //     name: "license",
        //     component: LicensePage,
        //     props: {
        //         label: "License",
        //         faIcon: "pi pi-briefcase",
        //         inPageNavbar: false,
        //         shouldAlwaysPreload: false,
        //         breadcrumbs: [
        //             "/"
        //         ]
        //     }
        // },

        {
            path: "/zzz/crisis-assault",
            name: "zzz-crisis-assault",
            component: ZzzCrisisPage,
            props: {
                label: "危局强袭",
                faIcon: "pi pi-bolt",
                inPageNavbar: false,
                shouldAlwaysPreload: false,
                breadcrumbs: ["/#game-guides"]
            }
        },

        {
            path: "/zzz/defense",
            name: "zzz-defense",
            component: ZzzDefensePage,
            props: {
                label: "式舆防卫战",
                faIcon: "pi pi-shield",
                inPageNavbar: false,
                shouldAlwaysPreload: false,
                breadcrumbs: ["/#game-guides"]
            }
        },

        // {
        //     path: "/zzz/deduction",
        //     name: "zzz-deduction",
        //     component: ZzzDeductionPage,
        //     props: {
        //         label: "临界推演",
        //         faIcon: "pi pi-sitemap",
        //         inPageNavbar: false,
        //         shouldAlwaysPreload: false,
        //         breadcrumbs: ["/#game-guides"]
        //     }
        // },

        {
            path: "/zzz/calculator",
            name: "zzz-calculator",
            component: ZzzCalculatorPage,
            props: {
                label: "角色计算器",
                faIcon: "pi pi-calculator",
                inPageNavbar: false,
                shouldAlwaysPreload: false,
                breadcrumbs: ["/#game-guides"]
            }
        },

        {
            path: "/:pathMatch(.*)*",
            redirect: "/"
        }
    ]
})

createApp(App).use(createPinia()).use(router).mount("#app")

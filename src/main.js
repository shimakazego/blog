import "./scss/style.scss"
import "/src/assets/zzz-color-vars.css"
import "/src/assets/zzz-theme.css"
import "/src/assets/interknot.css"
import {createApp} from "vue"
import {createRouter, createWebHistory} from "vue-router"
import {createPinia} from "pinia"
import App from "/src/vue/stack/App.vue"
import HomePage from "/src/vue/content/pages/HomePage.vue"
import {createModePanelRouteRecords} from "/src/router/modePanelRoutes"
import {initTheme} from "/src/stores/theme"

initTheme()

const ZzzCalculatorPage = () => import("/src/vue/content/pages/zzz/ZzzCalculatorPage.vue")
const ZzzCrisisPage = () => import("/src/vue/content/pages/zzz/ZzzCrisisPage.vue")
const ZzzDefensePage = () => import("/src/vue/content/pages/zzz/ZzzDefensePage.vue")
const ZzzDefenseSelectPage = () => import("/src/vue/content/pages/zzz/ZzzDefenseSelectPage.vue")
const ZzzDeductionPage = () => import("/src/vue/content/pages/zzz/ZzzDeductionPage.vue")

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

        {
            path: "/zzz/defense",
            name: "zzz-defense-select",
            component: ZzzDefenseSelectPage,
            meta: {hideSiteChrome: true}
        },

        {
            path: "/zzz/calculator",
            name: "zzz-calculator",
            component: ZzzCalculatorPage,
            meta: {hideSiteChrome: true}
        },

        ...createModePanelRouteRecords({
            basePath: "/zzz/crisis-assault",
            component: ZzzCrisisPage,
            mode: "crisis-assault",
            routeName: "zzz-crisis",
            meta: {hideSiteChrome: true}
        }),

        ...createModePanelRouteRecords({
            basePath: "/zzz/defense/old",
            component: ZzzDefensePage,
            mode: "defense",
            routeName: "zzz-defense-old",
            meta: {defenseVariant: "old", title: "旧·式舆防卫战", hideSiteChrome: true}
        }),

        ...createModePanelRouteRecords({
            basePath: "/zzz/defense/new",
            component: ZzzDefensePage,
            mode: "defense",
            routeName: "zzz-defense-new",
            meta: {defenseVariant: "new", title: "新·式舆防卫战", hideSiteChrome: true}
        }),

        ...createModePanelRouteRecords({
            basePath: "/zzz/deduction",
            component: ZzzDeductionPage,
            mode: "deduction",
            routeName: "zzz-deduction",
            meta: {hideSiteChrome: true}
        }),

        {
            path: "/:pathMatch(.*)*",
            redirect: "/"
        }
    ]
})

createApp(App).use(createPinia()).use(router).mount("#app")
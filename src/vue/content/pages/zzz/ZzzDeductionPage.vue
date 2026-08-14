<template>
    <ZzzPageShell eyebrow="CRITICAL DEDUCTION"
                  title="临界推演"
                  description="原项目这一块目前更适合后续深迁移。第一版先复用 Boss 基础资料，做成推演素材入口。">
        <p v-if="error"
           class="zzz-error">{{ error }}</p>

        <section class="zzz-grid">
            <article class="zzz-card">
                <span class="zzz-stat">{{ bosses.length }}</span>
                <h2>Boss 资料</h2>
                <p>可作为推演模式的数据底座。</p>
            </article>
            <article class="zzz-card">
                <span class="zzz-stat">{{ weaknessCount }}</span>
                <h2>弱点记录</h2>
                <p>已带弱点字段的敌人资料。</p>
            </article>
            <article class="zzz-card">
                <span class="zzz-stat">{{ resistanceCount }}</span>
                <h2>抗性记录</h2>
                <p>已带抗性字段的敌人资料。</p>
            </article>
        </section>

        <section class="zzz-list">
            <article v-for="boss in bosses.slice(0, 14)"
                     :key="boss.id || boss.boss_name"
                     class="zzz-row">
                <strong>{{ boss.bossName || boss.boss_name }}</strong>
                <span>弱点：{{ boss.weakness || "暂无" }}</span>
                <span>抗性：{{ boss.resistance || "暂无" }}</span>
            </article>
        </section>
    </ZzzPageShell>
</template>

<script setup>
import {computed, onMounted, ref} from "vue"
import ZzzPageShell from "./ZzzPageShell.vue"
import {getBossInfoList} from "/src/data/zzzApi.js"

const bosses = ref([])
const error = ref("")
const weaknessCount = computed(() => bosses.value.filter(item => item.weakness).length)
const resistanceCount = computed(() => bosses.value.filter(item => item.resistance).length)

onMounted(async () => {
    try {
        const data = await getBossInfoList()
        bosses.value = Array.isArray(data) ? data : []
    }
    catch(err) {
        error.value = err.message || "临界推演数据暂时不可用"
    }
})
</script>

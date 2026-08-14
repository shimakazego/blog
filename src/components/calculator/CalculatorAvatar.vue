<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { resolveAssetUrl } from '@/utils/gameData'

const props = defineProps<{
  avatarImage?: string | null
  name: string
}>()

const loadFailed = ref(false)
const imageUrl = computed(() => resolveAssetUrl(props.avatarImage))
const fallback = computed(() => props.name.trim().slice(0, 1) || '?')

watch(
  () => props.avatarImage,
  () => {
    loadFailed.value = false
  },
)

function onImgError() {
  loadFailed.value = true
}
</script>

<template>
  <span
    class="calculator-avatar"
    :title="imageUrl && loadFailed ? `头像加载失败: ${imageUrl}` : undefined"
  >
    <img v-if="imageUrl && !loadFailed" :src="imageUrl" :alt="name" @error="onImgError" />
    <span v-else class="fallback">{{ fallback }}</span>
  </span>
</template>

<style scoped>
.calculator-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--calc-border, #3a404b);
  background: linear-gradient(135deg, #263449, #1f2736);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.calculator-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fallback {
  font-size: 0.84rem;
  font-weight: 700;
  color: #d9e7ff;
}
</style>

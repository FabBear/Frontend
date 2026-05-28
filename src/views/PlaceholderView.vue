<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const title = computed(() => {
  return typeof route.meta.title === 'string' ? route.meta.title : '준비 중';
});
</script>

<template>
  <section class="surface-card placeholder-view">
    <p class="placeholder-view__eyebrow">Route Placeholder</p>
    <h2 class="section-title">{{ title }}</h2>
    <p class="section-subtitle">이 화면은 후속 Task에서 실제 UI로 교체됩니다.</p>
  </section>
</template>

<style scoped>
.placeholder-view {
  display: grid;
  gap: var(--space-2);
  padding: var(--spacing-card);
}

.placeholder-view__eyebrow {
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
}
</style>

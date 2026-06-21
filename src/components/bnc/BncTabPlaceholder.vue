<script setup lang="ts">
import { computed } from 'vue';

import { BNC_TAB_EMPTY_STATE } from '@/constants/bnc';

import type { BncTabId } from '@/types/bnc';

const props = defineProps<{
  activeTab: BncTabId;
}>();

const content = computed(() => BNC_TAB_EMPTY_STATE[props.activeTab]);
</script>

<template>
  <section class="bnc-tab-placeholder">
    <h3>{{ content.title }}</h3>
    <p>{{ content.description }}</p>
  </section>
</template>

<style scoped>
.bnc-tab-placeholder {
  display: grid;
  min-height: 320px;
  align-content: start;
  gap: var(--space-2);
  padding: var(--space-5);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-top: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.bnc-tab-placeholder h3,
.bnc-tab-placeholder p {
  margin: 0;
}

.bnc-tab-placeholder h3 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

.bnc-tab-placeholder p {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}
</style>

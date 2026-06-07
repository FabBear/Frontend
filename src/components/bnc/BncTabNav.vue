<script setup lang="ts">
import type { BncTabId, BncTabOption } from '@/types/bnc';

defineProps<{
  tabs: BncTabOption[];
  activeTab: BncTabId;
}>();

defineEmits<{
  select: [tabId: BncTabId];
}>();
</script>

<template>
  <div class="bnc-tab-nav" role="tablist" aria-label="병목 대응 센터 탭">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="bnc-tab-nav__button"
      :class="{ 'bnc-tab-nav__button--active': tab.id === activeTab }"
      type="button"
      role="tab"
      :aria-selected="tab.id === activeTab"
      @click="$emit('select', tab.id)"
    >
      <span class="bnc-tab-nav__label">{{ tab.label }}</span>
      <span class="bnc-tab-nav__description">{{ tab.description }}</span>
    </button>
  </div>
</template>

<style scoped>
.bnc-tab-nav {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
}

.bnc-tab-nav__button {
  display: grid;
  gap: var(--space-1);
  min-height: 68px;
  padding: var(--space-3);
  color: var(--color-fg);
  text-align: left;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  cursor: pointer;
}

.bnc-tab-nav__button:hover,
.bnc-tab-nav__button--active {
  border-color: var(--color-state-selected-border);
  background: var(--color-state-selected-bg);
}

.bnc-tab-nav__label {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.bnc-tab-nav__description {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

@media (max-width: 1100px) {
  .bnc-tab-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

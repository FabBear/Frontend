<script setup lang="ts">
import type { BncTabId, BncTabOption } from '@/types/bnc';

defineProps<{
  tabs: BncTabOption[];
  activeTab: BncTabId;
  disabledTabs?: Set<BncTabId>;
}>();

defineEmits<{
  select: [tabId: BncTabId];
}>();
</script>

<template>
  <nav class="bnc-tab-nav" role="tablist" aria-label="병목 대응 센터 탭">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="bnc-tab-nav__tab"
      :class="{ 'bnc-tab-nav__tab--active': tab.id === activeTab }"
      type="button"
      role="tab"
      :aria-selected="tab.id === activeTab"
      :disabled="disabledTabs?.has(tab.id)"
      @click="$emit('select', tab.id)"
    >
      {{ tab.label }}
    </button>
  </nav>
</template>

<style scoped>
.bnc-tab-nav {
  display: flex;
  border-bottom: 1px solid var(--color-border-default);
  background: var(--color-bg-card);
  padding: 0 var(--space-4);
  gap: var(--space-1);
}

.bnc-tab-nav__tab {
  padding: var(--space-3) var(--space-3);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  cursor: pointer;
  white-space: nowrap;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.bnc-tab-nav__tab:hover {
  color: var(--color-fg);
}

.bnc-tab-nav__tab:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.bnc-tab-nav__tab--active {
  color: var(--color-action-primary);
  border-bottom-color: var(--color-action-primary);
}
</style>

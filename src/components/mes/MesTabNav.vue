<script setup lang="ts">
import { MES_TABS } from '@/constants/mes';

import type { MesViewMode } from '@/types/mes';

interface Props {
  activeTab: MesViewMode;
}

defineProps<Props>();

const emit = defineEmits<{
  change: [tab: MesViewMode];
}>();
</script>

<template>
  <nav class="mes-tab-nav" aria-label="MES 모니터링 탭">
    <button
      v-for="tab in MES_TABS"
      :key="tab.value"
      class="mes-tab-nav__button"
      :class="{ 'mes-tab-nav__button--active': activeTab === tab.value }"
      type="button"
      @click="emit('change', tab.value)"
    >
      {{ tab.label }}
    </button>
  </nav>
</template>

<style scoped>
.mes-tab-nav {
  display: flex;
  gap: 0;
  overflow-x: auto;
}

.mes-tab-nav__button {
  border: none;
  border-bottom: 3px solid transparent;
  background: transparent;
  padding: 9px 20px;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  transition:
    border-color var(--transition-fast),
    color var(--transition-fast);
}

.mes-tab-nav__button--active {
  border-bottom-color: var(--color-action-primary);
  color: var(--color-fg-strong);
}
</style>

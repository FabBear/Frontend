<script setup lang="ts">
import type { MachineComparisonTarget } from '@/types/machine';

interface Props {
  title: string;
  selectedIds: string[];
  options: MachineComparisonTarget[];
}

defineProps<Props>();

const emit = defineEmits<{
  toggle: [id: string];
}>();
</script>

<template>
  <details class="machine-compare-dropdown">
    <summary>
      <span>
        <strong>{{ title }}</strong>
        <small>{{ selectedIds.length }}개 선택</small>
      </span>
    </summary>
    <div class="machine-compare-dropdown__panel">
      <label v-for="option in options" :key="option.id" class="machine-compare-dropdown__option">
        <input :checked="selectedIds.includes(option.id)" type="checkbox" @change="emit('toggle', option.id)" />
        <span>
          <strong>{{ option.code }}</strong>
          <small>{{ option.groupLabel }}</small>
        </span>
      </label>
    </div>
  </details>
</template>

<style scoped>
.machine-compare-dropdown {
  position: relative;
  min-width: 260px;
}

.machine-compare-dropdown summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  list-style: none;
}

.machine-compare-dropdown summary::-webkit-details-marker {
  display: none;
}

.machine-compare-dropdown summary span,
.machine-compare-dropdown__option span {
  display: grid;
  gap: 2px;
}

.machine-compare-dropdown strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

.machine-compare-dropdown small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.machine-compare-dropdown__panel {
  position: absolute;
  z-index: var(--z-index-dropdown);
  display: grid;
  gap: var(--space-1);
  width: min(420px, 84vw);
  max-height: 360px;
  margin-top: var(--space-1);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: var(--space-2);
  box-shadow: var(--shadow-panel);
  overflow: auto;
}

.machine-compare-dropdown__option {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: var(--space-2);
  align-items: start;
  border-radius: var(--radius-sm);
  padding: var(--space-2);
  cursor: pointer;
}

.machine-compare-dropdown__option:hover {
  background: var(--color-state-hover);
}
</style>

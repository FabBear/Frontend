<script setup lang="ts">
interface Props {
  value: number;
  color: string;
  label?: string;
  max?: number;
}

const props = withDefaults(defineProps<Props>(), {
  label: undefined,
  max: 1,
});

function getWidth(value: number) {
  if (props.max <= 0) return '0%';
  const percent = Math.min(Math.max((value / props.max) * 100, 0), 100);
  return `${percent}%`;
}
</script>

<template>
  <div class="mes-metric-bar">
    <div v-if="label" class="mes-metric-bar__header">
      <span>{{ label }}</span>
      <strong :style="{ color }"><slot /></strong>
    </div>
    <div v-else class="mes-metric-bar__compact">
      <strong :style="{ color }"><slot /></strong>
      <span class="mes-metric-bar__track">
        <span class="mes-metric-bar__fill" :style="{ width: getWidth(value), backgroundColor: color }" />
      </span>
    </div>
    <span v-if="label" class="mes-metric-bar__track">
      <span class="mes-metric-bar__fill" :style="{ width: getWidth(value), backgroundColor: color }" />
    </span>
  </div>
</template>

<style scoped>
.mes-metric-bar {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.mes-metric-bar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.mes-metric-bar__header strong {
  font-weight: var(--font-weight-semibold);
}

.mes-metric-bar__compact {
  display: grid;
  grid-template-columns: 4.5em minmax(44px, 1fr);
  align-items: center;
  gap: var(--space-2);
}

.mes-metric-bar__compact strong {
  font-weight: var(--font-weight-semibold);
}

.mes-metric-bar__track {
  display: block;
  overflow: hidden;
  height: 5px;
  border-radius: var(--radius-pill);
  background: var(--color-border-subtle);
}

.mes-metric-bar__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
}
</style>

<script setup lang="ts">
interface Props {
  title: string;
  value: string;
  valueColor?: string;
  delta?: number;
  deltaUnit?: string;
  isPositiveGood?: boolean;
  subtitle?: string;
  note?: string;
}

const props = withDefaults(defineProps<Props>(), {
  valueColor: undefined,
  delta: undefined,
  deltaUnit: undefined,
  isPositiveGood: true,
  subtitle: undefined,
  note: undefined,
});

// isPositiveGood: true  → 값이 오를수록 좋음 (throughput, RTF 등)
// isPositiveGood: false → 값이 오를수록 나쁨 (WIP, Q-time 등)
function getDeltaClass() {
  if (props.delta === undefined) return '';
  const isImproved = props.isPositiveGood ? props.delta >= 0 : props.delta <= 0;
  return isImproved ? 'kpi-card__delta--good' : 'kpi-card__delta--bad';
}

function formatDelta() {
  if (props.delta === undefined) return '';
  const prefix = props.delta >= 0 ? '▲' : '▼';
  const abs = Math.abs(props.delta);
  const formatted = Number.isInteger(abs) ? abs.toFixed(0) : abs.toFixed(1);
  return `${prefix} ${formatted}${props.deltaUnit ?? ''}`;
}
</script>

<template>
  <article class="kpi-card">
    <p class="kpi-card__title">{{ title }}</p>
    <div class="kpi-card__value-row">
      <strong class="kpi-card__value" :style="valueColor ? { color: valueColor } : {}">
        {{ value }}
      </strong>
      <span v-if="delta !== undefined" class="kpi-card__delta" :class="getDeltaClass()">
        {{ formatDelta() }}
      </span>
    </div>
    <p v-if="subtitle" class="kpi-card__subtitle">{{ subtitle }}</p>
    <p v-if="note" class="kpi-card__note">{{ note }}</p>
  </article>
</template>

<style scoped>
.kpi-card {
  display: grid;
  align-content: start;
  gap: var(--space-1);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
}

.kpi-card__title {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.kpi-card__value-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-2);
}

.kpi-card__value {
  color: var(--color-fg-strong);
  font-size: var(--font-size-xl);
  line-height: var(--line-height-tight);
}

.kpi-card__delta {
  flex-shrink: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.kpi-card__delta--good {
  color: var(--color-status-success);
}

.kpi-card__delta--bad {
  color: var(--color-status-danger);
}

.kpi-card__subtitle {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.kpi-card__note {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}
</style>

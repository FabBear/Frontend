<script setup lang="ts">
import type { MachineMetricDefinition, MachineMetricKey } from '@/types/machine';

interface Props {
  metrics: MachineMetricDefinition[];
  selectedMetricKeys: MachineMetricKey[];
}

defineProps<Props>();

const emit = defineEmits<{
  toggle: [metricKey: MachineMetricKey];
}>();
</script>

<template>
  <section class="metric-palette" aria-label="분석 지표 선택">
    <div>
      <h2>분석 지표</h2>
      <p>체크하면 트렌드와 비교 카드에 추가됩니다.</p>
    </div>
    <div class="metric-palette__chips">
      <button
        v-for="metric in metrics"
        :key="metric.key"
        class="metric-palette__chip"
        :class="{ 'metric-palette__chip--active': selectedMetricKeys.includes(metric.key) }"
        type="button"
        @click="emit('toggle', metric.key)"
      >
        <span>{{ selectedMetricKeys.includes(metric.key) ? '✓' : '+' }}</span>
        {{ metric.label }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.metric-palette {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.metric-palette h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.metric-palette p {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.metric-palette__chips {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-1);
}

.metric-palette__chip {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-pill);
  background: var(--color-bg-card);
  padding: 5px 11px;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.metric-palette__chip--active {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
}
</style>

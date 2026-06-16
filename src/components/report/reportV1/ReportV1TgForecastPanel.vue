<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import type { ReportV1TgForecastRow } from '@/utils/reportV1DisplayAdapter';
import { formatValue, isBadWhenIncreased } from '@/utils/reportV1Formatters';

const props = defineProps<{
  groups: Array<{ toolgroup: string; rows: ReportV1TgForecastRow[] }>;
}>();

const selectedTg = ref(props.groups[0]?.toolgroup ?? '');

watch(
  () => props.groups,
  (groups) => {
    if (!groups.find((g) => g.toolgroup === selectedTg.value)) {
      selectedTg.value = groups[0]?.toolgroup ?? '';
    }
  }
);

const selectedRows = computed(() => props.groups.find((g) => g.toolgroup === selectedTg.value)?.rows ?? []);

function forecastCellClass(kpi: string, action: number | null, noAction: number | null): string {
  if (action === null || noAction === null || action === noAction) return '';
  const improved = isBadWhenIncreased(kpi) ? action < noAction : action > noAction;
  return improved ? 'is-improved' : 'is-worsened';
}
</script>

<template>
  <div class="tg-forecast-panel">
    <div class="tg-forecast-panel__chips" role="tablist" aria-label="Tool Group 선택">
      <button
        v-for="group in groups"
        :key="group.toolgroup"
        type="button"
        role="tab"
        :aria-selected="group.toolgroup === selectedTg"
        :class="['tg-forecast-panel__chip', { 'tg-forecast-panel__chip--active': group.toolgroup === selectedTg }]"
        @click="selectedTg = group.toolgroup"
      >
        {{ group.toolgroup }}
      </button>
    </div>

    <table v-if="selectedRows.length" class="tg-forecast-panel__table">
      <thead>
        <tr>
          <th>KPI</th>
          <th>현재</th>
          <th>무대응</th>
          <th>대응 후</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in selectedRows" :key="row.kpi">
          <td>{{ row.label }}</td>
          <td>{{ formatValue(row.kpi, row.unit, row.current) }}</td>
          <td class="tg-forecast-panel__no-action">{{ formatValue(row.kpi, row.unit, row.noAction) }}</td>
          <td :class="['tg-forecast-panel__action', forecastCellClass(row.kpi, row.action, row.noAction)]">
            {{ formatValue(row.kpi, row.unit, row.action) }}
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="tg-forecast-panel__empty">전망 데이터 없음</p>
  </div>
</template>

<style scoped>
.tg-forecast-panel {
  display: grid;
  gap: var(--space-3);
}

.tg-forecast-panel__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tg-forecast-panel__chip {
  padding: 4px var(--space-3);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-pill);
  background: var(--color-bg-page);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition:
    background 120ms,
    color 120ms,
    border-color 120ms;
  white-space: nowrap;
}

.tg-forecast-panel__chip:hover {
  border-color: var(--color-action-primary);
  color: var(--color-action-primary);
}

.tg-forecast-panel__chip--active {
  background: var(--color-action-primary);
  border-color: var(--color-action-primary);
  color: #ffffff;
}

.tg-forecast-panel__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.tg-forecast-panel__table th,
.tg-forecast-panel__table td {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-subtle);
  text-align: left;
  vertical-align: middle;
}

.tg-forecast-panel__table th {
  background: var(--color-bg-surface);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.tg-forecast-panel__no-action {
  color: var(--color-fg-muted);
}

.tg-forecast-panel__action.is-improved {
  color: var(--color-status-success);
  font-weight: var(--font-weight-semibold);
}

.tg-forecast-panel__action.is-worsened {
  color: var(--color-status-danger);
  font-weight: var(--font-weight-semibold);
}

.tg-forecast-panel__empty {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}
</style>

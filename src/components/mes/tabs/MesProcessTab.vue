<script setup lang="ts">
import { computed, ref } from 'vue';

import { getProcessAreaAxisLabel, getProcessAreaSortOrder } from '@/constants/processArea';

import type { MesMonitoringData } from '@/types/mes';

import MesProcessKpiCards from '@/components/mes/MesProcessKpiCards.vue';
import MesProcessKpiTable from '@/components/mes/MesProcessKpiTable.vue';
import MesTrendChart from '@/components/mes/MesTrendChart.vue';

import { getMesQtimeColor, getMesUtilizationColor } from '@/utils/mesMetrics';

interface Props {
  data: MesMonitoringData;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  navigateToProcess: [areaCode: string];
}>();

type ProcessViewMode = 'card' | 'table';

const processViewMode = ref<ProcessViewMode>('table');

const sortedProcesses = computed(() =>
  [...props.data.processSummaries].sort(
    (a, b) => getProcessAreaSortOrder(a.areaCode) - getProcessAreaSortOrder(b.areaCode)
  )
);

const utilizationChart = computed(() => {
  const maxValues = sortedProcesses.value.map((p) => p.maxUtilizationRate);
  const maxPct = maxValues.length > 0 ? Math.ceil(Math.max(...maxValues) * 100) : 100;

  return {
    labels: sortedProcesses.value.map((p) => getProcessAreaAxisLabel(p.areaCode, p.areaNameKo)),
    avgValues: sortedProcesses.value.map((p) => p.avgUtilizationRate),
    maxValues,
    maxColors: sortedProcesses.value.map((p) => getMesUtilizationColor(p.maxUtilizationRate)),
    max: Math.min(100, maxPct + 5),
  };
});

const qtimeChart = computed(() => {
  const toDay = (min: number | null) => (min == null ? 0 : Number((min / 60 / 24).toFixed(1)));
  const avgValues = sortedProcesses.value.map((p) => toDay(p.avgQtimeMin));
  const maxValues = sortedProcesses.value.map((p) => toDay(p.maxQtimeMin));

  return {
    labels: sortedProcesses.value.map((p) => getProcessAreaAxisLabel(p.areaCode, p.areaNameKo)),
    avgValues,
    maxValues,
    maxColors: sortedProcesses.value.map((p) => getMesQtimeColor(p.maxQtimeMin)),
    max: Math.max(12, Math.ceil(Math.max(...maxValues) + 2)),
  };
});
</script>

<template>
  <section class="mes-process-tab">
    <div class="mes-process-tab__charts">
      <MesTrendChart
        title="공정별 가동률 (최대 / 평균)"
        :labels="utilizationChart.labels"
        :series="[
          {
            name: '최대 가동률',
            values: utilizationChart.maxValues,
            colorToken: '--color-chart-violet',
            showInLegend: false,
            showLabel: true,
          },
          {
            name: '평균 가동률',
            values: utilizationChart.avgValues,
            colorToken: '--color-chart-blue',
            opacity: 0.7,
            showInLegend: false,
            showLabel: false,
          },
        ]"
        :bar-colors="utilizationChart.maxColors"
        :show-legend="false"
        :color-legend="[
          { label: '평균 가동률', colorToken: '--color-chart-blue' },
          { label: 'Critical ≥90%', colorToken: '--color-risk-critical' },
          { label: 'High ≥85%', colorToken: '--color-risk-high' },
          { label: 'Medium ≥70%', colorToken: '--color-risk-medium' },
          { label: 'Low <70%', colorToken: '--color-risk-low' },
        ]"
        chart-type="bar"
        orientation="horizontal"
        value-mode="ratio"
        :min="0"
        :max="utilizationChart.max"
        :height="300"
        :target-line="{ name: 'Critical 90%', value: 0.9, colorToken: '--color-risk-critical' }"
        bar-category-gap="40%"
      />
      <MesTrendChart
        title="공정별 Q-time (최대 / 평균)"
        subtitle="대기일 · 목표선 10일"
        :labels="qtimeChart.labels"
        :series="[
          {
            name: '최대 Q-time',
            values: qtimeChart.maxValues,
            colorToken: '--color-chart-violet',
            showInLegend: false,
            showLabel: true,
          },
          {
            name: '평균 Q-time',
            values: qtimeChart.avgValues,
            colorToken: '--color-chart-blue',
            opacity: 0.7,
            showInLegend: false,
            showLabel: false,
          },
        ]"
        :bar-colors="qtimeChart.maxColors"
        :target-line="{ name: '', value: 10, colorToken: '--color-status-danger' }"
        :color-legend="[
          { label: '평균 Q-time', colorToken: '--color-chart-blue' },
          { label: '< 5일 정상', colorToken: '--color-status-success' },
          { label: '5~10일 주의', colorToken: '--color-status-warning' },
          { label: '> 10일 위험', colorToken: '--color-status-danger' },
        ]"
        chart-type="bar"
        orientation="horizontal"
        value-suffix="일"
        :min="0"
        :max="qtimeChart.max"
        :height="300"
      />
    </div>

    <section class="mes-process-tab__detail">
      <header class="mes-process-tab__detail-header">
        <div>
          <h3>공정별 KPI 상세</h3>
          <span>{{ sortedProcesses.length }}개 공정</span>
        </div>
        <div class="mes-process-tab__view-toggle" role="group" aria-label="공정별 KPI 보기 방식">
          <button
            type="button"
            :class="{ 'mes-process-tab__view-button--active': processViewMode === 'table' }"
            @click="processViewMode = 'table'"
          >
            테이블 보기
          </button>
          <button
            type="button"
            :class="{ 'mes-process-tab__view-button--active': processViewMode === 'card' }"
            @click="processViewMode = 'card'"
          >
            카드 보기
          </button>
        </div>
      </header>

      <MesProcessKpiTable
        v-if="processViewMode === 'table'"
        :process-summaries="sortedProcesses"
        @select-process="emit('navigateToProcess', $event)"
      />
      <MesProcessKpiCards
        v-else
        :process-summaries="sortedProcesses"
        @select-process="emit('navigateToProcess', $event)"
      />
    </section>
  </section>
</template>

<style scoped>
.mes-process-tab {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.mes-process-tab__charts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.mes-process-tab__detail {
  display: grid;
  gap: var(--space-3);
}

.mes-process-tab__detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.mes-process-tab__detail-header h3 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.mes-process-tab__detail-header span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.mes-process-tab__view-toggle {
  display: flex;
  gap: var(--space-1);
}

.mes-process-tab__view-toggle button {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: transparent;
  padding: 4px 12px;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.mes-process-tab__view-toggle button.mes-process-tab__view-button--active {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
  font-weight: var(--font-weight-semibold);
}

@media (max-width: 1100px) {
  .mes-process-tab__charts {
    grid-template-columns: 1fr;
  }

  .mes-process-tab__detail-header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

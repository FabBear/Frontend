<script setup lang="ts">
import { computed, ref } from 'vue';

import { getProcessAreaSortOrder } from '@/constants/processArea';

import type { MesMonitoringData } from '@/types/mes';

import MesProcessKpiCards from '@/components/mes/MesProcessKpiCards.vue';
import MesProcessKpiTable from '@/components/mes/MesProcessKpiTable.vue';
import MesTrendChart from '@/components/mes/MesTrendChart.vue';

import { getMesQtimeColor, getMesUtilizationColor } from '@/utils/mesMetrics';

interface Props {
  data: MesMonitoringData;
}

const props = defineProps<Props>();
type ProcessViewMode = 'card' | 'table';

const processViewMode = ref<ProcessViewMode>('table');

const sortedProcesses = computed(() =>
  [...props.data.processSummaries].sort(
    (a, b) => getProcessAreaSortOrder(a.areaCode) - getProcessAreaSortOrder(b.areaCode)
  )
);

const utilizationChart = computed(() => ({
  labels: sortedProcesses.value.map((process) => process.areaName),
  avgValues: sortedProcesses.value.map((process) => process.avgUtilizationRate),
  maxValues: sortedProcesses.value.map((process) => process.maxUtilizationRate),
  maxColors: sortedProcesses.value.map((process) => getMesUtilizationColor(process.maxUtilizationRate)),
}));

const qtimeChart = computed(() => {
  const values = sortedProcesses.value.map((process) =>
    process.avgQtimeMin === null ? 0 : Number((process.avgQtimeMin / 60 / 24).toFixed(1))
  );

  return {
    labels: sortedProcesses.value.map((process) => process.areaName),
    values,
    colors: sortedProcesses.value.map((process) => getMesQtimeColor(process.avgQtimeMin)),
    max: Math.max(12, Math.ceil(Math.max(...values) + 2)),
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
        :max="100"
        :height="220"
        :target-line="{ name: 'Critical 90%', value: 90, colorToken: '--color-risk-critical' }"
        bar-category-gap="40%"
      />
      <MesTrendChart
        title="공정별 Q-time"
        subtitle="대기일 · 목표선 10일"
        :labels="qtimeChart.labels"
        :series="[
          {
            name: 'Q-time',
            values: qtimeChart.values,
            colorToken: '--color-chart-blue',
            showInLegend: false,
            showLabel: true,
          },
        ]"
        :bar-colors="qtimeChart.colors"
        :target-line="{ name: '목표 10일', value: 10, colorToken: '--color-status-danger' }"
        :color-legend="[
          { label: '< 5일 정상', colorToken: '--color-status-success' },
          { label: '5~10일 주의', colorToken: '--color-status-warning' },
          { label: '> 10일 위험', colorToken: '--color-status-danger' },
        ]"
        chart-type="bar"
        orientation="horizontal"
        value-suffix="일"
        :min="0"
        :max="qtimeChart.max"
        :height="220"
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

      <MesProcessKpiTable v-if="processViewMode === 'table'" :process-summaries="sortedProcesses" />
      <MesProcessKpiCards v-else :process-summaries="sortedProcesses" :tool-groups="data.toolGroups" />
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

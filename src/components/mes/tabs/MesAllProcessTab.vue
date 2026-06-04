<script setup lang="ts">
import { computed } from 'vue';

import { getProcessAreaAxisLabel, getProcessAreaSortOrder } from '@/constants/processArea';

import type { MesMonitoringData } from '@/types/mes';

import MesBottleneckDistChart from '@/components/mes/MesBottleneckDistChart.vue';
import MesFabHeatmap from '@/components/mes/MesFabHeatmap.vue';
import MesKpiCardGrid from '@/components/mes/MesKpiCardGrid.vue';
import MesTrendChart from '@/components/mes/MesTrendChart.vue';

interface Props {
  data: MesMonitoringData;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  selectToolGroup: [tgId: string];
}>();

const wipChartRange = computed(() => {
  const values = props.data.wipTrend;
  if (values.length === 0) return { min: undefined, max: undefined };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max(10, Math.ceil((max - min) * 0.15));
  return {
    min: Math.max(0, Math.floor(min - padding)),
    max: Math.ceil(max + padding),
  };
});

const utilizationChartRange = computed(() => {
  const allValues = props.data.utilizationSeries.flatMap((s) => s.values);
  if (allValues.length === 0) return { min: 0, max: 100 };
  const minPct = Math.floor(Math.min(...allValues) * 100);
  const maxPct = Math.ceil(Math.max(...allValues) * 100);
  return {
    min: Math.max(0, minPct - 5),
    max: Math.min(100, maxPct + 5),
  };
});

const processWipChart = computed(() => {
  const sorted = [...props.data.processSummaries]
    .filter((p) => p.areaCode !== 'DEF_MET')
    .sort((a, b) => getProcessAreaSortOrder(a.areaCode) - getProcessAreaSortOrder(b.areaCode));

  const values = sorted.map((p) => p.wipCount);
  const max = Math.max(10, Math.ceil(Math.max(...values) * 1.15));

  return {
    labels: sorted.map((p) => getProcessAreaAxisLabel(p.areaCode, p.areaNameKo)),
    values,
    max,
  };
});
</script>

<template>
  <section class="mes-all-process-tab">
    <MesKpiCardGrid :cards="data.kpiCards" :columns="6" />

    <div class="mes-all-process-tab__charts">
      <MesTrendChart
        title="FAB 평균 가동률 추이"
        subtitle="전체 FAB 평균"
        :labels="data.days"
        :series="data.utilizationSeries"
        value-mode="ratio"
        :min="utilizationChartRange.min"
        :max="utilizationChartRange.max"
      />
      <MesTrendChart
        title="WIP 추이 (전체 FAB)"
        subtitle="WIP Lot 합계"
        :labels="data.days"
        :series="[{ name: 'WIP', values: data.wipTrend, colorToken: '--color-status-info' }]"
        :min="wipChartRange.min"
        :max="wipChartRange.max"
        :show-legend="false"
      />
      <MesTrendChart
        title="공정별 대기 Lot"
        subtitle="Def_Met 제외 · 공정 순서"
        class="mes-all-process-tab__large-chart"
        fill-height
        :labels="processWipChart.labels"
        :series="[
          {
            name: '대기 Lot',
            values: processWipChart.values,
            colorToken: '--color-chart-blue',
            showInLegend: false,
            showLabel: true,
          },
        ]"
        chart-type="bar"
        orientation="horizontal"
        :show-legend="false"
        :min="0"
        :max="processWipChart.max"
        :height="180"
      />
      <MesBottleneckDistChart class="mes-all-process-tab__large-chart" :tool-groups="data.toolGroups" />
    </div>

    <MesFabHeatmap
      :process-summaries="data.processSummaries"
      :tool-groups="data.toolGroups"
      @select-tool-group="emit('selectToolGroup', $event)"
    />
  </section>
</template>

<style scoped>
.mes-all-process-tab {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.mes-all-process-tab__charts {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: 260px 360px;
  gap: var(--space-3);
}

.mes-all-process-tab__charts > * {
  height: 100%;
  min-height: 0;
}

.mes-all-process-tab__large-chart {
  height: 100%;
}

@media (max-width: 1100px) {
  .mes-all-process-tab__charts {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    grid-auto-rows: 320px;
  }
}
</style>

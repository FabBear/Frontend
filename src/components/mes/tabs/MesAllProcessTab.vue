<script setup lang="ts">
import { computed } from 'vue';

import { getProcessAreaSortOrder } from '@/constants/processArea';

import type { MesMonitoringData } from '@/types/mes';

import MesBottleneckDistChart from '@/components/mes/MesBottleneckDistChart.vue';
import MesFabHeatmap from '@/components/mes/MesFabHeatmap.vue';
import MesKpiCardGrid from '@/components/mes/MesKpiCardGrid.vue';
import MesTrendChart from '@/components/mes/MesTrendChart.vue';

interface Props {
  data: MesMonitoringData;
}

const props = defineProps<Props>();

const processWipChart = computed(() => {
  const sorted = [...props.data.processSummaries]
    .filter((p) => p.areaCode !== 'DEF_MET')
    .sort((a, b) => getProcessAreaSortOrder(a.areaCode) - getProcessAreaSortOrder(b.areaCode));

  const values = sorted.map((p) => p.wipCount);
  const max = Math.max(10, Math.ceil(Math.max(...values) * 1.15));

  return {
    labels: sorted.map((p) => p.areaNameKo),
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
        title="가동률 트렌드 - 상위 병목 TG"
        subtitle="MES 스냅샷"
        :labels="data.days"
        :series="data.utilizationSeries"
        value-mode="ratio"
        :min="50"
        :max="100"
      />
      <MesTrendChart
        title="WIP 추이 (전체 FAB)"
        subtitle="WIP Lot 합계"
        :labels="data.days"
        :series="[{ name: 'WIP', values: data.wipTrend, colorToken: '--color-status-info' }]"
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

    <MesFabHeatmap :process-summaries="data.processSummaries" :tool-groups="data.toolGroups" />
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

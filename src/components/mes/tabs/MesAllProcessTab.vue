<script setup lang="ts">
import { computed } from 'vue';

import type { MesMonitoringData } from '@/types/mes';

import MesBottleneckDistChart from '@/components/mes/MesBottleneckDistChart.vue';
import MesFabHeatmap from '@/components/mes/MesFabHeatmap.vue';
import MesKpiCardGrid from '@/components/mes/MesKpiCardGrid.vue';
import MesTrendChart from '@/components/mes/MesTrendChart.vue';

import { getMesUtilizationColor } from '@/utils/mesMetrics';

interface Props {
  data: MesMonitoringData;
}

const props = defineProps<Props>();

const processWipSeries = computed(() => {
  const items = [...props.data.processSummaries]
    .filter((process) => process.wipCount > 0)
    .sort((a, b) => b.wipCount - a.wipCount);

  return {
    labels: items.map((process) => process.areaName),
    values: items.map((process) => process.wipCount),
    colors: items.map((process) => getMesUtilizationColor(process.maxUtilizationRate)),
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
        subtitle="대기 Lot 합계"
        :labels="data.days"
        :series="[{ name: 'WIP', values: data.wipTrend, colorToken: '--color-status-info' }]"
        :show-legend="false"
      />
      <MesTrendChart
        title="공정별 대기 Lot"
        subtitle="최근 스냅샷"
        :labels="processWipSeries.labels"
        :series="[{ name: '대기 Lot', values: processWipSeries.values }]"
        chart-type="bar"
        :show-legend="false"
        :bar-colors="processWipSeries.colors"
      />
      <MesBottleneckDistChart :tool-groups="data.toolGroups" />
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
  gap: var(--space-3);
}

@media (max-width: 1100px) {
  .mes-all-process-tab__charts {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue';

import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import type { KpiTrendSeries } from '@/types/dashboard';

import { resolveCssFontSize, resolveCssVar } from '@/utils/chart';
import { formatMetricValue } from '@/utils/format';

echarts.use([CanvasRenderer, LineChart, GridComponent, TooltipComponent]);

const props = defineProps<{
  trend: KpiTrendSeries | null;
}>();

const chartOption = computed(() => {
  const trend = props.trend;
  if (!trend) return null;

  const axisColor = resolveCssVar('var(--color-fg-muted)');
  const gridColor = resolveCssVar('var(--color-border-subtle)');
  const lineColor = resolveCssVar(`var(${trend.colorToken ?? '--color-action-primary'})`);
  const fontSize = resolveCssFontSize('--font-size-base');

  return {
    grid: { top: 18, right: 24, bottom: 26, left: 8, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' },
    tooltip: {
      trigger: 'axis',
      textStyle: { fontSize },
      valueFormatter: (value: number) => formatMetricValue(value, trend.valueFormat),
    },
    xAxis: {
      type: 'category',
      data: trend.xLabels,
      boundaryGap: false,
      axisLabel: { color: axisColor, fontSize },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: gridColor } },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: axisColor,
        fontSize,
        formatter: (value: number) => formatMetricValue(value, trend.valueFormat),
      },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
    },
    series: [
      {
        name: trend.title,
        type: 'line',
        data: trend.values,
        smooth: true,
        symbolSize: 5,
        lineStyle: { color: lineColor, width: 3 },
        itemStyle: { color: lineColor },
        areaStyle: { color: lineColor, opacity: 0.08 },
      },
    ],
  };
});
</script>

<template>
  <div class="dashboard-kpi-trend-chart">
    <VChart v-if="chartOption" class="dashboard-kpi-trend-chart__canvas" :option="chartOption" autoresize />
    <p v-else class="dashboard-kpi-trend-chart__empty">추이 데이터 없음</p>
  </div>
</template>

<style scoped>
.dashboard-kpi-trend-chart {
  min-width: 0;
  height: 320px;
}

.dashboard-kpi-trend-chart__canvas {
  width: 100%;
  height: 100%;
}

.dashboard-kpi-trend-chart__empty {
  display: grid;
  height: 100%;
  place-items: center;
  border: var(--border-width-default) dashed var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}
</style>

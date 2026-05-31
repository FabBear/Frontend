<script setup lang="ts">
import { computed } from 'vue';

import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import { resolveCssFontSize, resolveCssVar } from '@/utils/chart';
import { toRatioPercentNumber } from '@/utils/format';

use([CanvasRenderer, BarChart, LineChart, GridComponent, LegendComponent, TooltipComponent]);

interface ChartSeries {
  name: string;
  values: number[];
  colorToken?: string;
}

interface Props {
  title: string;
  subtitle: string;
  labels: string[];
  series: ChartSeries[];
  chartType?: 'line' | 'bar';
  valueMode?: 'ratio' | 'number';
  min?: number;
  max?: number;
  showLegend?: boolean;
  barColors?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  chartType: 'line',
  valueMode: 'number',
  min: undefined,
  max: undefined,
  showLegend: true,
  barColors: undefined,
});

function normalizeValue(value: number) {
  return props.valueMode === 'ratio' ? toRatioPercentNumber(value) : value;
}

function formatValue(value: number) {
  return props.valueMode === 'ratio' ? `${value}%` : value.toLocaleString('ko-KR');
}

const chartOption = computed(() => {
  const axisColor = resolveCssVar('var(--color-fg-muted)');
  const gridColor = resolveCssVar('var(--color-border-subtle)');
  const chartFontSize = resolveCssFontSize('--font-size-sm');

  return {
    color: props.series.map((item) => resolveCssVar(item.colorToken ?? 'var(--color-status-info)')),
    grid: { top: 18, right: 18, bottom: props.showLegend ? 34 : 22, left: 10, containLabel: true },
    legend: {
      show: props.showLegend,
      bottom: 0,
      textStyle: { color: axisColor, fontSize: chartFontSize },
      itemWidth: 10,
      itemHeight: 8,
    },
    tooltip: {
      trigger: 'axis',
      textStyle: { fontSize: chartFontSize },
      formatter: (params: { seriesName: string; marker: string; value: number }[]) =>
        params.map((item) => `${item.marker}${item.seriesName}: <b>${formatValue(item.value)}</b>`).join('<br/>'),
    },
    xAxis: {
      type: 'category',
      data: props.labels,
      axisLabel: { color: axisColor, fontSize: chartFontSize },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: gridColor } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      min: props.min,
      max: props.max,
      axisLabel: { color: axisColor, fontSize: chartFontSize, formatter: formatValue },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
    },
    series: props.series.map((item) => ({
      name: item.name,
      type: props.chartType,
      data: item.values.map((value, index) => ({
        value: normalizeValue(value),
        itemStyle: props.barColors?.[index] ? { color: resolveCssVar(props.barColors[index]) } : undefined,
      })),
      smooth: props.chartType === 'line',
      symbolSize: 6,
      lineStyle: { width: 2 },
      areaStyle: props.series.length === 1 && props.chartType === 'line' ? { opacity: 0.12 } : undefined,
      barMaxWidth: 24,
    })),
  };
});
</script>

<template>
  <section class="mes-trend-chart">
    <header class="mes-trend-chart__header">
      <h3>{{ title }}</h3>
      <span>{{ subtitle }}</span>
    </header>
    <VChart class="mes-trend-chart__chart" :option="chartOption" autoresize />
  </section>
</template>

<style scoped>
.mes-trend-chart {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.mes-trend-chart__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.mes-trend-chart__header h3 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.mes-trend-chart__header span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.mes-trend-chart__chart {
  width: 100%;
  height: 180px;
}
</style>

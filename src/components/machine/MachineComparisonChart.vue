<script setup lang="ts">
import { computed } from 'vue';

import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import type { MachineAnalysisSeries, MachineMetricDefinition, MachineMetricKey } from '@/types/machine';

import { resolveCssFontSize, resolveCssVar } from '@/utils/chart';

use([CanvasRenderer, LineChart, GridComponent, LegendComponent, TooltipComponent]);

interface Props {
  series: MachineAnalysisSeries[];
  metrics: MachineMetricDefinition[];
  selectedMetricKeys: MachineMetricKey[];
  trendLabels: string[];
}

const props = defineProps<Props>();

const SERIES_COLOR_TOKENS = [
  '--color-chart-blue',
  '--color-chart-violet',
  '--color-status-success',
  '--color-risk-high',
  '--color-risk-medium',
  '--color-status-danger',
  '--color-status-info',
  '--color-status-down',
];

const activeMetrics = computed(() => props.metrics.filter((m) => props.selectedMetricKeys.includes(m.key)));

function buildChartOption(metricDef: MachineMetricDefinition) {
  const axisColor = resolveCssVar('var(--color-fg-muted)');
  const gridColor = resolveCssVar('var(--color-border-subtle)');
  const fontSize = resolveCssFontSize('--font-size-sm');
  const isRatio = metricDef.valueFormat === 'ratio';

  const echartsSeries = props.series.map((s, i) => {
    const colorToken = SERIES_COLOR_TOKENS[i % SERIES_COLOR_TOKENS.length];
    const color = resolveCssVar(`var(${colorToken})`);
    const vals = s.values[metricDef.key] ?? [];

    return {
      name: `${s.label} · ${s.groupLabel}`,
      type: 'line',
      data: isRatio ? vals.map((v) => +(v * 100).toFixed(1)) : vals.map((v) => +v.toFixed(2)),
      smooth: true,
      symbolSize: 5,
      lineStyle: { color, width: 2 },
      itemStyle: { color },
      areaStyle: props.series.length === 1 ? { color, opacity: 0.08 } : undefined,
    };
  });

  return {
    grid: { top: 12, right: 12, bottom: props.series.length > 4 ? 56 : 40, left: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      textStyle: { fontSize },
      formatter: (params: { seriesName: string; marker: string; value: number }[]) =>
        params.map((p) => `${p.marker}${p.seriesName}: <b>${p.value}${isRatio ? '%' : ''}</b>`).join('<br/>'),
    },
    legend: {
      show: props.series.length > 0,
      bottom: 0,
      data: echartsSeries.map((s) => s.name),
      textStyle: { color: axisColor, fontSize },
      itemWidth: 10,
      itemHeight: 8,
      type: 'scroll',
    },
    xAxis: {
      type: 'category',
      data: props.trendLabels,
      axisLabel: { color: axisColor, fontSize },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: gridColor } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: axisColor,
        fontSize,
        formatter: isRatio ? (v: number) => `${v}%` : undefined,
      },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
    },
    series: echartsSeries,
    color: props.series.map((_, i) => resolveCssVar(`var(${SERIES_COLOR_TOKENS[i % SERIES_COLOR_TOKENS.length]})`)),
  };
}
</script>

<template>
  <div class="comparison-chart">
    <p v-if="series.length === 0" class="comparison-chart__empty">위에서 비교할 대상을 선택하세요.</p>

    <template v-else>
      <section v-for="metric in activeMetrics" :key="metric.key" class="comparison-chart__panel">
        <h3 class="comparison-chart__metric-title">
          {{ metric.label }}
          <span>{{ metric.unit === '%' ? '% (기간 평균)' : 'lot' }}</span>
        </h3>
        <VChart class="comparison-chart__canvas" :option="buildChartOption(metric)" autoresize />
      </section>
    </template>
  </div>
</template>

<style scoped>
.comparison-chart {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.comparison-chart__empty {
  padding: var(--space-4);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  text-align: center;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}

.comparison-chart__panel {
  display: grid;
  gap: var(--space-2);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
}

.comparison-chart__metric-title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.comparison-chart__metric-title span {
  margin-left: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-normal);
}

.comparison-chart__canvas {
  width: 100%;
  height: 200px;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';

import { ScatterChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import type { MesProcessSummary } from '@/types/mes';

import { resolveCssFontSize, resolveCssVar } from '@/utils/chart';
import { formatNumber, formatQtimeDays, formatRatioPercent } from '@/utils/format';
import { getMesUtilizationColor } from '@/utils/mesMetrics';

use([CanvasRenderer, ScatterChart, GridComponent, TooltipComponent]);

interface Props {
  processSummaries: MesProcessSummary[];
}

type SignalPoint = {
  value: [number, number, number];
  process: MesProcessSummary;
  wipShare: number;
  itemStyle: { color: string };
};

const props = defineProps<Props>();

const chartData = computed(() => {
  const totalWip = props.processSummaries.reduce((sum, process) => sum + process.wipCount, 0);

  return props.processSummaries
    .filter((process) => process.wipCount > 0)
    .map<SignalPoint>((process) => {
      const wipShare = process.wipCount / Math.max(totalWip, 1);
      const qtimeDays = (process.avgQtimeMin ?? 0) / 60 / 24;

      return {
        value: [process.maxUtilizationRate * 100, wipShare * 100, qtimeDays],
        process,
        wipShare,
        itemStyle: { color: resolveCssVar(getMesUtilizationColor(process.maxUtilizationRate)) },
      };
    });
});

const chartOption = computed(() => {
  const axisColor = resolveCssVar('var(--color-fg-muted)');
  const gridColor = resolveCssVar('var(--color-border-subtle)');
  const chartFontSize = resolveCssFontSize('--font-size-sm');

  return {
    grid: { top: 20, right: 18, bottom: 30, left: 10, containLabel: true },
    tooltip: {
      trigger: 'item',
      textStyle: { fontSize: chartFontSize },
      formatter: (param: { data?: SignalPoint; marker: string }) => {
        const point = param.data;
        if (!point) return '';

        return [
          `<b>${point.process.areaNameKo}</b>`,
          `${param.marker}최대 가동률: <b>${formatRatioPercent(point.process.maxUtilizationRate)}</b>`,
          `WIP 비중: <b>${(point.wipShare * 100).toFixed(1)}%</b>`,
          `WIP Lot: <b>${formatNumber(point.process.wipCount)}</b>`,
          `Q-time: <b>${formatQtimeDays(point.process.avgQtimeMin)}</b>`,
        ].join('<br/>');
      },
    },
    xAxis: {
      type: 'value',
      name: '최대 가동률',
      min: 0,
      max: 100,
      nameTextStyle: { color: axisColor, fontSize: chartFontSize },
      axisLabel: { color: axisColor, fontSize: chartFontSize, formatter: '{value}%' },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
    },
    yAxis: {
      type: 'value',
      name: 'WIP 비중',
      min: 0,
      max: 100,
      nameTextStyle: { color: axisColor, fontSize: chartFontSize },
      axisLabel: { color: axisColor, fontSize: chartFontSize, formatter: '{value}%' },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
    },
    series: [
      {
        type: 'scatter',
        data: chartData.value,
        symbolSize: (value: [number, number, number]) => Math.max(9, Math.min(28, 8 + value[2] * 0.7)),
        emphasis: { scale: 1.2 },
      },
    ],
  };
});
</script>

<template>
  <section class="mes-bottleneck-signal-chart">
    <header class="mes-bottleneck-signal-chart__header">
      <h3>공정별 병목 신호</h3>
      <span>가동률 × WIP 비중 × Q-time</span>
    </header>
    <VChart class="mes-bottleneck-signal-chart__chart" :option="chartOption" autoresize />
  </section>
</template>

<style scoped>
.mes-bottleneck-signal-chart {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.mes-bottleneck-signal-chart__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.mes-bottleneck-signal-chart__header h3 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.mes-bottleneck-signal-chart__header span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.mes-bottleneck-signal-chart__chart {
  width: 100%;
  height: 240px;
}
</style>

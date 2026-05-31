<script setup lang="ts">
import { computed } from 'vue';

import { BarChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import { PROCESS_AREA_ORDER } from '@/constants/processArea';
import { RISK_LEVEL_META } from '@/constants/riskLevel';

import type { MesToolGroupMetric } from '@/types/mes';

import { resolveCssFontSize, resolveCssVar } from '@/utils/chart';

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent, LegendComponent]);

interface Props {
  toolGroups: MesToolGroupMetric[];
}

const props = defineProps<Props>();

const chartData = computed(() => {
  const areaMap = new Map<string, { code: string; CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number }>();

  for (const tg of props.toolGroups) {
    if (!areaMap.has(tg.areaCode)) {
      areaMap.set(tg.areaCode, { code: tg.areaCode, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });
    }
    areaMap.get(tg.areaCode)![tg.riskGrade]++;
  }

  const areas = [...areaMap.values()].sort((a, b) => {
    const indexA = PROCESS_AREA_ORDER.indexOf(a.code);
    const indexB = PROCESS_AREA_ORDER.indexOf(b.code);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  return {
    names: areas.map((a) => a.code),
    critical: areas.map((a) => a.CRITICAL),
    high: areas.map((a) => a.HIGH),
    medium: areas.map((a) => a.MEDIUM),
    low: areas.map((a) => a.LOW),
  };
});

const chartOption = computed(() => {
  const axisColor = resolveCssVar('var(--color-fg-muted)');
  const gridColor = resolveCssVar('var(--color-border-subtle)');
  const chartFontSize = resolveCssFontSize('--font-size-sm');

  const makeBar = (grade: 'critical' | 'high' | 'medium' | 'low', data: number[]) => ({
    name: RISK_LEVEL_META[grade].label,
    type: 'bar',
    stack: 'total',
    barMaxWidth: 40,
    itemStyle: { color: resolveCssVar(RISK_LEVEL_META[grade].color) },
    data,
  });

  return {
    grid: { top: 36, right: 12, bottom: 44, left: 10, containLabel: true },
    legend: {
      top: 4,
      right: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: axisColor, fontSize: chartFontSize },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      textStyle: { fontSize: chartFontSize },
      formatter: (params: { seriesName: string; value: number; marker: string; axisValue?: string }[]) => {
        const total = params.reduce((s, p) => s + p.value, 0);
        const rows = params
          .filter((p) => p.value > 0)
          .map((p) => `${p.marker}${p.seriesName}: <b>${p.value}</b>개`)
          .join('<br/>');
        return `${params[0]?.axisValue ?? ''}<br/>${rows}<br/>합계: <b>${total}</b>개`;
      },
    },
    xAxis: {
      type: 'category',
      data: chartData.value.names,
      axisLabel: { color: axisColor, fontSize: chartFontSize, interval: 0, rotate: 20 },
      axisLine: { lineStyle: { color: gridColor } },
    },
    yAxis: {
      type: 'value',
      name: 'TG 수',
      nameTextStyle: { color: axisColor, fontSize: chartFontSize },
      axisLabel: { color: axisColor, fontSize: chartFontSize },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
    },
    series: [
      makeBar('critical', chartData.value.critical),
      makeBar('high', chartData.value.high),
      makeBar('medium', chartData.value.medium),
      makeBar('low', chartData.value.low),
    ],
  };
});
</script>

<template>
  <section class="mes-bottleneck-dist-chart">
    <header class="mes-bottleneck-dist-chart__header">
      <h3>공정별 위험도 분포</h3>
      <span>TG 수 · 위험도별</span>
    </header>
    <VChart class="mes-bottleneck-dist-chart__chart" :option="chartOption" autoresize />
  </section>
</template>

<style scoped>
.mes-bottleneck-dist-chart {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.mes-bottleneck-dist-chart__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.mes-bottleneck-dist-chart__header h3 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.mes-bottleneck-dist-chart__header span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.mes-bottleneck-dist-chart__chart {
  width: 100%;
  height: 240px;
}
</style>

<script setup lang="ts">
import { computed } from 'vue';

import { LineChart } from 'echarts/charts';
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import { type MetricValueFormat, formatMetricValue } from '@/utils/format';

use([CanvasRenderer, LineChart, GridComponent, MarkLineComponent, TooltipComponent]);

interface Props {
  values: number[];
  colorToken: string;
  xLabels?: string[];
  valueFormat: MetricValueFormat;
  targetValue?: number;
}

const props = defineProps<Props>();

function resolveColor(token: string) {
  if (typeof window === 'undefined') {
    return token;
  }

  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}

function withAlpha(color: string, alpha: number): string {
  const normalized = color.startsWith('#') ? color : resolveColor(color);
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const option = computed(() => {
  const { values, colorToken, xLabels, targetValue } = props;
  const hasAxes = Boolean(xLabels?.length);
  const color = resolveColor(colorToken);
  const borderColor = resolveColor('--color-border-default');
  const gridColor = resolveColor('--color-border-subtle');
  const mutedColor = resolveColor('--color-fg-muted');
  const surfaceColor = resolveColor('--color-bg-surface');
  const textColor = resolveColor('--color-fg');

  return {
    animation: false,
    grid: {
      top: 8,
      right: hasAxes ? 8 : 4,
      bottom: hasAxes ? 28 : 8,
      left: hasAxes ? 52 : 4,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      show: hasAxes,
      data: xLabels ?? values.map((_, i) => i),
      axisLine: { lineStyle: { color: borderColor } },
      axisTick: { show: false },
      axisLabel: {
        color: mutedColor,
        fontSize: 11,
        interval: 5,
      },
    },
    yAxis: {
      type: 'value',
      show: hasAxes,
      splitNumber: 3,
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
      axisLabel: {
        color: mutedColor,
        fontSize: 11,
        formatter: (v: number) => formatMetricValue(v, props.valueFormat),
      },
      min: (v: { min: number }) => +(v.min * 0.996).toFixed(4),
      max: (v: { max: number }) => +(v.max * 1.004).toFixed(4),
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line', lineStyle: { color, type: 'dashed', width: 1 } },
      backgroundColor: surfaceColor,
      borderColor,
      borderWidth: 1,
      textStyle: { color: textColor, fontSize: 12 },
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0];
        return `${p.name}<br/>${formatMetricValue(p.value, props.valueFormat)}`;
      },
    },
    series: [
      {
        type: 'line',
        data: values,
        smooth: 0.4,
        symbol: hasAxes ? 'circle' : 'none',
        symbolSize: 4,
        itemStyle: { color },
        lineStyle: { color, width: 1.5 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: withAlpha(color, 0.2) },
              { offset: 1, color: withAlpha(color, 0) },
            ],
          },
        },
        markLine: targetValue
          ? {
              symbol: 'none',
              label: {
                color: mutedColor,
                formatter: `목표 ${formatMetricValue(targetValue, props.valueFormat)}`,
                fontSize: 10,
              },
              lineStyle: {
                color: mutedColor,
                type: 'dashed',
                width: 1,
              },
              data: [{ yAxis: targetValue }],
            }
          : undefined,
      },
    ],
  };
});
</script>

<template>
  <VChart class="kpi-chart" :option="option" autoresize />
</template>

<style scoped>
.kpi-chart {
  width: 100%;
  height: 100%;
}
</style>

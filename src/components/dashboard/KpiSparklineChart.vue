<script setup lang="ts">
import { computed } from 'vue';

import { LineChart } from 'echarts/charts';
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import { resolveCssVar } from '@/utils/chart';
import { type MetricValueFormat, formatMetricValue } from '@/utils/format';

use([CanvasRenderer, LineChart, GridComponent, MarkLineComponent, TooltipComponent]);

interface Props {
  values: number[];
  colorToken: string;
  xLabels?: string[];
  valueFormat: MetricValueFormat;
  targetValue?: number;
  showAxes?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showAxes: true,
});

function withAlpha(color: string, alpha: number): string {
  const normalized = color.trim();
  if (normalized.startsWith('rgb')) {
    const nums = normalized.match(/\d+/g)!;
    return `rgba(${nums[0]},${nums[1]},${nums[2]},${alpha})`;
  }
  const hex =
    normalized.length === 4
      ? `#${normalized[1]}${normalized[1]}${normalized[2]}${normalized[2]}${normalized[3]}${normalized[3]}`
      : normalized;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function getAxisLabelInterval(labels?: string[]) {
  const count = labels?.length ?? 0;
  if (count <= 8) return 0;
  return 5;
}

const option = computed(() => {
  const { values, colorToken, xLabels, targetValue } = props;
  const hasLabels = Boolean(xLabels?.length);
  const hasAxes = props.showAxes && hasLabels;
  const hasTarget = typeof targetValue === 'number' && Number.isFinite(targetValue);
  const axisValues = hasTarget && hasAxes ? [...values, targetValue] : values;
  const axisMin = Math.min(...axisValues);
  const axisMax = Math.max(...axisValues);
  const axisPadding = Math.max((axisMax - axisMin) * 0.08, Math.abs(axisMax) * 0.004, 0.2);
  const color = resolveCssVar(colorToken);
  const borderColor = resolveCssVar('--color-border-default');
  const gridColor = resolveCssVar('--color-border-subtle');
  const mutedColor = resolveCssVar('--color-fg-muted');
  const targetLineColor = resolveCssVar('--color-border-strong');
  const surfaceColor = resolveCssVar('--color-bg-surface');
  const textColor = resolveCssVar('--color-fg');

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
        interval: getAxisLabelInterval(xLabels),
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
      min: +Math.max(0, axisMin - axisPadding).toFixed(4),
      max: +(axisMax + axisPadding).toFixed(4),
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
        markLine:
          hasTarget && hasAxes
            ? {
                symbol: 'none',
                label: {
                  show: hasAxes,
                  color: mutedColor,
                  formatter: `목표 ${formatMetricValue(targetValue, props.valueFormat)}`,
                  fontSize: 10,
                },
                lineStyle: {
                  color: targetLineColor,
                  type: 'dashed',
                  width: 1.4,
                  opacity: 0.95,
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

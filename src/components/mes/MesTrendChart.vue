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
  opacity?: number;
  showInLegend?: boolean;
  showLabel?: boolean;
}

interface Props {
  title: string;
  subtitle?: string;
  labels: string[];
  series: ChartSeries[];
  chartType?: 'line' | 'bar';
  orientation?: 'vertical' | 'horizontal';
  valueMode?: 'ratio' | 'number';
  min?: number;
  max?: number;
  showLegend?: boolean;
  barColors?: string[];
  height?: number;
  valueSuffix?: string;
  targetLine?: {
    name: string;
    value: number;
    colorToken?: string;
  };
  colorLegend?: { label: string; colorToken: string }[];
  showLabel?: boolean;
  barCategoryGap?: string;
  fillHeight?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  chartType: 'line',
  orientation: 'vertical',
  valueMode: 'number',
  min: undefined,
  max: undefined,
  subtitle: undefined,
  showLegend: true,
  barColors: undefined,
  height: 180,
  valueSuffix: '',
  targetLine: undefined,
  colorLegend: undefined,
  showLabel: false,
  barCategoryGap: '20%',
  fillHeight: false,
});

function normalizeValue(value: number) {
  return props.valueMode === 'ratio' ? toRatioPercentNumber(value) : value;
}

function formatValue(value: number) {
  const formattedValue = props.valueMode === 'ratio' ? `${value}%` : value.toLocaleString('ko-KR');
  return `${formattedValue}${props.valueSuffix}`;
}

const chartOption = computed(() => {
  const axisColor = resolveCssVar('var(--color-fg-muted)');
  const gridColor = resolveCssVar('var(--color-border-subtle)');
  const chartFontSize = resolveCssFontSize('--font-size-sm');
  const isHorizontal = props.orientation === 'horizontal';
  const categoryAxis = {
    type: 'category',
    data: props.labels,
    inverse: isHorizontal,
    axisLabel: { color: axisColor, fontSize: chartFontSize },
    axisTick: { show: false },
    axisLine: { lineStyle: { color: gridColor } },
    splitLine: { show: false },
  };
  const valueAxis = {
    type: 'value',
    min: props.min,
    max: props.max,
    axisLabel: { color: axisColor, fontSize: chartFontSize, formatter: formatValue },
    splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
  };
  const targetLineColor = resolveCssVar(props.targetLine?.colorToken ?? 'var(--color-border-strong)');

  return {
    color: props.series.map((item) => resolveCssVar(item.colorToken ?? 'var(--color-status-info)')),
    grid: {
      top: 18,
      right: 18,
      bottom: props.showLegend ? 34 : 22,
      left: isHorizontal ? 24 : 10,
      containLabel: true,
    },
    legend: {
      show: props.showLegend,
      bottom: 0,
      data: props.series.filter((s) => s.showInLegend !== false).map((s) => s.name),
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
    xAxis: isHorizontal ? valueAxis : categoryAxis,
    yAxis: isHorizontal ? categoryAxis : valueAxis,
    series: props.series.map((item, seriesIndex) => ({
      name: item.name,
      type: props.chartType,
      data: item.values.map((value, index) => ({
        value: normalizeValue(value),
        itemStyle:
          props.barColors?.[index] && (props.series.length === 1 || seriesIndex === 0)
            ? { color: resolveCssVar(props.barColors[index]) }
            : item.opacity !== undefined
              ? { opacity: item.opacity }
              : undefined,
      })),
      label: {
        show: (item.showLabel ?? props.showLabel) && props.chartType === 'bar',
        position: isHorizontal ? 'right' : 'top',
        formatter: ({ value }: { value: number }) => formatValue(value),
        color: axisColor,
        fontSize: chartFontSize,
      },
      smooth: props.chartType === 'line',
      symbolSize: 6,
      lineStyle: { width: 2 },
      areaStyle: props.series.length === 1 && props.chartType === 'line' ? { opacity: 0.12 } : undefined,
      barMaxWidth: 24,
      barCategoryGap: seriesIndex === 0 ? props.barCategoryGap : undefined,
      markLine:
        props.targetLine && seriesIndex === 0
          ? {
              symbol: 'none',
              label: { color: axisColor, fontSize: chartFontSize, formatter: props.targetLine.name },
              lineStyle: { color: targetLineColor, type: 'dashed' },
              data: [
                isHorizontal
                  ? { xAxis: normalizeValue(props.targetLine.value) }
                  : { yAxis: normalizeValue(props.targetLine.value) },
              ],
            }
          : undefined,
    })),
  };
});
</script>

<template>
  <section class="mes-trend-chart" :class="{ 'mes-trend-chart--fill': fillHeight }">
    <header class="mes-trend-chart__header">
      <h3>{{ title }}</h3>
      <span v-if="subtitle">{{ subtitle }}</span>
    </header>
    <div v-if="fillHeight" class="mes-trend-chart__chart-wrap">
      <VChart class="mes-trend-chart__chart" :option="chartOption" autoresize />
    </div>
    <VChart v-else class="mes-trend-chart__chart" :style="{ height: `${height}px` }" :option="chartOption" autoresize />
    <footer v-if="colorLegend" class="mes-trend-chart__color-legend">
      <span v-for="item in colorLegend" :key="item.label" class="mes-trend-chart__color-legend-item">
        <i :style="{ backgroundColor: resolveCssVar(item.colorToken) }" />
        {{ item.label }}
      </span>
    </footer>
  </section>
</template>

<style scoped>
.mes-trend-chart {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.mes-trend-chart--fill {
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
}

.mes-trend-chart--fill .mes-trend-chart__chart-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
}

.mes-trend-chart--fill .mes-trend-chart__chart {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
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
}

.mes-trend-chart__color-legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
  margin-top: var(--space-2);
}

.mes-trend-chart__color-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.mes-trend-chart__color-legend-item i {
  display: inline-block;
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
</style>

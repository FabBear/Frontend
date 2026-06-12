<script setup lang="ts">
import { computed } from 'vue';

import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import { resolveCssVar } from '@/utils/chart';

use([CanvasRenderer, LineChart, GridComponent, TooltipComponent, LegendComponent]);

interface TrendProps {
  title?: string;
  labels: string[];
  series: Array<{ name: string; data: number[] }>;
}

const props = defineProps<{ data: TrendProps }>();

const option = computed(() => {
  const fg = resolveCssVar('--color-fg-muted') || '#888';
  const grid = resolveCssVar('--color-border-subtle') || '#ddd';
  const palette = ['#6366f1', '#f59e0b', '#10b981'];
  return {
    color: palette,
    grid: { top: 28, left: 36, right: 12, bottom: 22 },
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: fg, fontSize: 10 }, itemHeight: 8, itemWidth: 12, top: 0 },
    xAxis: {
      type: 'category',
      data: props.data.labels,
      axisLabel: { color: fg, fontSize: 9 },
      axisLine: { lineStyle: { color: grid } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: fg, fontSize: 9 },
      splitLine: { lineStyle: { color: grid, type: 'dashed' } },
    },
    series: props.data.series.map((s) => ({
      name: s.name,
      type: 'line',
      data: s.data,
      smooth: true,
      symbolSize: 4,
      lineStyle: { width: 2 },
    })),
  };
});
</script>

<template>
  <figure class="chat-card-trend">
    <figcaption v-if="data.title">{{ data.title }}</figcaption>
    <VChart class="chat-card-trend__chart" :option="option" autoresize />
  </figure>
</template>

<style scoped>
.chat-card-trend {
  margin: 0;
}
.chat-card-trend figcaption {
  margin-bottom: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.chat-card-trend__chart {
  width: 100%;
  height: 170px;
}
</style>

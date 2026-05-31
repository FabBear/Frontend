<script setup lang="ts">
import { computed } from 'vue';

import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import { toRiskLevel } from '@/composables/useBottleneckMonitoring';

import { RISK_LEVEL_META } from '@/constants/riskLevel';

import type { BottleneckToolGroupItem } from '@/types/bottleneckMonitoring';

import { toRatioPercentNumber } from '@/utils/format';

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent]);

interface Props {
  toolGroups: BottleneckToolGroupItem[];
}

const props = defineProps<Props>();

function resolveColor(colorValue: string) {
  if (typeof window === 'undefined' || !document.body) return '#888';
  const temp = document.createElement('span');
  temp.style.color = colorValue;
  document.body.appendChild(temp);
  const resolvedColor = getComputedStyle(temp).color;
  document.body.removeChild(temp);

  return resolvedColor || '#888';
}

function resolveFontSize(token: string) {
  if (typeof window === 'undefined' || !document.body) return 16;
  const temp = document.createElement('span');
  temp.style.fontSize = `var(${token})`;
  document.body.appendChild(temp);
  const parsedValue = Number.parseFloat(getComputedStyle(temp).fontSize);
  document.body.removeChild(temp);

  return Number.isNaN(parsedValue) ? 16 : parsedValue;
}

const chartOption = computed(() => {
  const items = [...props.toolGroups].reverse();
  const names = items.map((tg) => tg.tgName);
  const probs = items.map((tg) => toRatioPercentNumber(tg.bottleneckProb));
  const baseFontSize = resolveFontSize('--font-size-base');
  const colors = items.map((tg) => {
    const level = toRiskLevel(tg.riskGrade);
    return resolveColor(RISK_LEVEL_META[level].color);
  });

  return {
    grid: { top: 8, right: 48, bottom: 8, left: 8, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'none' },
      textStyle: { fontSize: baseFontSize },
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0];
        return `${p.name}<br/><b>${p.value}%</b>`;
      },
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLabel: { formatter: '{value}%', fontSize: baseFontSize },
      splitLine: { lineStyle: { type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLabel: {
        fontSize: baseFontSize,
        overflow: 'truncate',
        width: 160,
      },
    },
    series: [
      {
        type: 'bar',
        data: probs.map((value, i) => ({ value, itemStyle: { color: colors[i] } })),
        barMaxWidth: 20,
        label: {
          show: true,
          position: 'right',
          fontSize: baseFontSize,
          formatter: '{c}%',
        },
      },
    ],
  };
});
</script>

<template>
  <div class="bottleneck-ranking-chart">
    <div v-if="toolGroups.length === 0" class="bottleneck-ranking-chart__empty">표시할 데이터가 없습니다.</div>
    <VChart v-else class="bottleneck-ranking-chart__chart" :option="chartOption" autoresize />
  </div>
</template>

<style scoped>
.bottleneck-ranking-chart {
  min-height: 260px;
}

.bottleneck-ranking-chart__chart {
  width: 100%;
  height: 260px;
}

.bottleneck-ranking-chart__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 260px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}
</style>

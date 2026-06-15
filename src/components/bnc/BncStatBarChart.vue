<script lang="ts">
export type StatBarTone = 'danger' | 'success' | 'muted' | 'primary';

export interface StatBarItem {
  label: string;
  /** 막대 값 (부호 = 방향). 0 기준축에서 좌(−)/우(+)로 뻗는다. */
  value: number;
  tone: StatBarTone;
  /** 막대 끝에 표시할 텍스트 (예: "Δ +0.399 ★", "-100.0%") */
  valueText: string;
  /** 툴팁 보조 줄 (예: "p<0.001 · 유의", "7 → 0 · 신뢰도 HIGH") */
  subText?: string;
}
</script>

<script setup lang="ts">
import { computed } from 'vue';

import { BarChart } from 'echarts/charts';
import { GridComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { SVGRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import { resolveCssFontSize, resolveCssVar } from '@/utils/chart';

// SVG 렌더러로 고정 — 레티나/고DPI에서 canvas 흐림 없이 항상 선명.
// (다른 컴포넌트가 전역에 CanvasRenderer를 등록해 둬서, init-options로도 svg를 명시한다.)
use([SVGRenderer, BarChart, GridComponent, TooltipComponent, MarkLineComponent]);

const props = defineProps<{ items: StatBarItem[]; height?: number }>();

const TONE_VAR: Record<StatBarTone, string> = {
  danger: '--color-status-danger',
  success: '--color-status-success',
  muted: '--color-fg-muted',
  primary: '--color-action-primary',
};

const chartOption = computed(() => {
  // ECharts category 축은 아래→위로 쌓이므로, 첫 항목이 위로 오도록 역순.
  const items = [...props.items].reverse();
  const fontSize = resolveCssFontSize('--font-size-xs');
  const labelColor = resolveCssVar('--color-fg-strong');
  const mutedColor = resolveCssVar('--color-fg-muted');
  const lineColor = resolveCssVar('--color-border-default');
  const surface = resolveCssVar('--color-bg-surface');

  // 0 중심 대칭축 + 30% 여유 → 막대 끝 라벨 공간 확보
  const maxAbs = Math.max(0.0001, ...items.map((i) => Math.abs(i.value)));
  const bound = maxAbs * 1.3;

  return {
    grid: { top: 6, right: 16, bottom: 22, left: 8, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' },
    tooltip: {
      trigger: 'item',
      backgroundColor: surface,
      borderColor: lineColor,
      textStyle: { color: labelColor, fontSize },
      formatter: (p: { dataIndex: number }) => {
        const it = items[p.dataIndex];
        return `<b>${it.label}</b><br/>${it.valueText}${it.subText ? `<br/>${it.subText}` : ''}`;
      },
    },
    xAxis: {
      type: 'value',
      min: -bound,
      max: bound,
      axisLabel: { color: mutedColor, fontSize },
      axisLine: { show: false },
      splitLine: { lineStyle: { color: lineColor, type: 'dashed', opacity: 0.5 } },
    },
    yAxis: {
      type: 'category',
      data: items.map((i) => i.label),
      axisLabel: { color: labelColor, fontSize, fontWeight: 600 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: lineColor } },
    },
    series: [
      {
        type: 'bar',
        barWidth: '52%',
        label: {
          show: true,
          formatter: (p: { dataIndex: number }) => items[p.dataIndex].valueText,
          color: mutedColor,
          fontSize,
        },
        data: items.map((i) => ({
          value: i.value,
          itemStyle: { color: resolveCssVar(TONE_VAR[i.tone]), borderRadius: 3 },
          // 막대 바깥쪽 끝에 값 라벨 (양수=오른쪽, 음수=왼쪽)
          label: { position: i.value >= 0 ? 'right' : 'left' },
        })),
        markLine: {
          silent: true,
          symbol: 'none',
          data: [{ xAxis: 0 }],
          lineStyle: { color: lineColor },
          label: { show: false },
        },
      },
    ],
  };
});
</script>

<template>
  <VChart
    class="bnc-stat-chart"
    :option="chartOption"
    :init-options="{ renderer: 'svg' }"
    :style="{ height: `${height ?? 168}px` }"
    autoresize
  />
</template>

<style scoped>
.bnc-stat-chart {
  width: 100%;
}
</style>

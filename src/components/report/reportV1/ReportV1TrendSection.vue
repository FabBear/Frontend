<script setup lang="ts">
import MesTrendChart from '@/components/mes/MesTrendChart.vue';

import type { ReportV1TrendSeries } from '@/utils/reportV1DisplayAdapter';
import { formatNumber, formatTrendSlope, formatValue } from '@/utils/reportV1Formatters';
import { trendClass } from '@/utils/reportV1TrendChart';

defineProps<{
  series: ReportV1TrendSeries[];
}>();

function colorToken(key: string): string {
  if (key === 'q_time_min') return '--color-status-danger';
  if (key === 'wip') return '--color-action-primary';
  return '--color-status-success';
}

function valueMode(key: string): 'ratio' | 'number' {
  return key.includes('util') ? 'ratio' : 'number';
}

function valueSuffix(key: string): string {
  if (key === 'q_time_min') return '분';
  if (key === 'wip') return ' Lot';
  return '';
}
</script>

<template>
  <section class="report-v1__panel">
    <div class="report-v1__panel-head">
      <h3>기간 추이</h3>
      <span>cause.trend_series 기준 · wait_ratio 시계열 없음</span>
    </div>
    <div class="report-v1__trend-chart-grid">
      <article v-for="item in series" :key="item.key" class="report-v1__trend-chart-card">
        <MesTrendChart
          :title="item.label"
          :subtitle="`${formatTrendSlope(item)} · R² ${formatNumber(item.r2, 2)} · ${item.significant ? '유의 추세' : '관찰 추세'}`"
          :labels="item.timeLabels.map((label) => label.replace('분', ''))"
          :series="[{ name: item.label, values: item.values, colorToken: colorToken(item.key) }]"
          :height="240"
          :value-mode="valueMode(item.key)"
          :value-suffix="valueSuffix(item.key)"
          :show-legend="false"
        />
        <div class="report-v1__trend-card-summary">
          <span :class="['report-v1__legend-dot', trendClass(item.key)]" />
          <strong>현재 {{ formatValue(item.key, item.key === 'wip' ? 'lots' : 'ratio', item.values.at(-1)) }}</strong>
        </div>
      </article>
    </div>
  </section>
</template>

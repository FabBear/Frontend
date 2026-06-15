<script setup lang="ts">
import { computed, nextTick, onBeforeUpdate, onMounted, ref, watch } from 'vue';

import { BarChart, LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, MarkLineComponent, TooltipComponent } from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import type { MachineAnalysisSeries, MachineMetricDefinition, MachineMetricKey } from '@/types/machine';

import { resolveCssFontSize, resolveCssVar } from '@/utils/chart';
import { formatNumber, formatRatioPercent } from '@/utils/format';

echarts.use([CanvasRenderer, LineChart, BarChart, GridComponent, LegendComponent, TooltipComponent, MarkLineComponent]);

const CHART_GROUP = 'analysis-comparison';

interface Props {
  series: MachineAnalysisSeries[];
  metrics: MachineMetricDefinition[];
  selectedMetricKeys: MachineMetricKey[];
  trendLabels: string[];
}

const props = defineProps<Props>();

type ChartMode = 'trend' | 'snapshot';
const chartMode = ref<ChartMode>('trend');
const chartUpdateOptions = { notMerge: true };

const activeMetrics = computed(() => props.metrics.filter((m) => props.selectedMetricKeys.includes(m.key)));

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

function seriesColor(i: number): string {
  return resolveCssVar(`var(${SERIES_COLOR_TOKENS[i % SERIES_COLOR_TOKENS.length]})`);
}

// ── 차트 옵션: 추이(라인) ─────────────────────────────────────────────
function buildTrendOption(metricDef: MachineMetricDefinition) {
  const axisColor = resolveCssVar('var(--color-fg-muted)');
  const gridColor = resolveCssVar('var(--color-border-subtle)');
  const fontSize = resolveCssFontSize('--font-size-base');
  const isRatio = metricDef.valueFormat === 'ratio';

  // 전체 평균 기준선 계산
  const allVals = props.series.flatMap((s) => s.values[metricDef.key] ?? []);
  const globalAvg = allVals.length > 0 ? allVals.reduce((a, b) => a + b, 0) / allVals.length : null;
  const avgDisplay =
    isRatio && globalAvg !== null ? +(globalAvg * 100).toFixed(1) : globalAvg !== null ? +globalAvg.toFixed(2) : null;

  return {
    grid: {
      top: 12,
      right: 12,
      bottom: props.series.length > 3 ? 56 : 36,
      left: 8,
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel',
    },
    tooltip: { trigger: 'axis', textStyle: { fontSize } },
    legend: {
      show: props.series.length > 1,
      bottom: 0,
      data: props.series.map((s) => s.label),
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
      axisLabel: { color: axisColor, fontSize, formatter: isRatio ? (v: number) => `${v}%` : undefined },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
    },
    series: props.series.map((s, i) => {
      const vals = s.values[metricDef.key] ?? [];
      const color = seriesColor(i);
      return {
        name: s.label,
        type: 'line',
        data: isRatio ? vals.map((v) => +(v * 100).toFixed(1)) : vals.map((v) => +v.toFixed(2)),
        smooth: true,
        symbolSize: 5,
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        areaStyle: props.series.length === 1 ? { color, opacity: 0.08 } : undefined,
        ...(avgDisplay !== null
          ? {
              markLine: {
                silent: true,
                symbol: 'none',
                label: {
                  formatter: `평균 ${avgDisplay}${isRatio ? '%' : ''}`,
                  color: axisColor,
                  fontSize: fontSize - 1,
                },
                lineStyle: { type: 'dashed', color: axisColor, opacity: 0.5 },
                data: [{ yAxis: avgDisplay }],
              },
            }
          : {}),
      };
    }),
    color: props.series.map((_, i) => seriesColor(i)),
  };
}

// ── 차트 옵션: 현재값(바) ─────────────────────────────────────────────
function buildSnapshotOption(metricDef: MachineMetricDefinition) {
  const axisColor = resolveCssVar('var(--color-fg-muted)');
  const gridColor = resolveCssVar('var(--color-border-subtle)');
  const fontSize = resolveCssFontSize('--font-size-base');
  const isRatio = metricDef.valueFormat === 'ratio';

  const rows = props.series
    .map((s, i) => {
      const vals = s.values[metricDef.key] ?? [];
      const raw = vals.length > 0 ? vals[vals.length - 1] : 0;
      const value = isRatio ? +(raw * 100).toFixed(1) : +raw.toFixed(2);
      return {
        label: s.label,
        value,
        itemStyle: { color: seriesColor(i) },
      };
    })
    .sort((a, b) => b.value - a.value);

  return {
    grid: { top: 8, right: 72, bottom: 8, left: 8, outerBoundsMode: 'same', outerBoundsContain: 'axisLabel' },
    tooltip: { trigger: 'axis', textStyle: { fontSize } },
    xAxis: {
      type: 'value',
      axisLabel: { color: axisColor, fontSize, formatter: isRatio ? (v: number) => `${v}%` : undefined },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
    },
    yAxis: {
      type: 'category',
      data: rows.map((row) => row.label),
      inverse: true,
      axisLabel: { color: axisColor, fontSize, fontWeight: 700 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: gridColor } },
    },
    series: [
      {
        type: 'bar',
        data: rows.map(({ value, itemStyle }) => ({ value, itemStyle })),
        barMaxWidth: 22,
        label: {
          show: true,
          position: 'right',
          formatter: ({ value }: { value: number }) => `${value}${isRatio ? '%' : ''}`,
          color: resolveCssVar('var(--color-fg-strong)'),
          fontSize,
          fontWeight: 700,
        },
      },
    ],
  };
}

// ── ECharts tooltip 동기화 ─────────────────────────────────────────────
const chartRefs = ref<InstanceType<typeof VChart>[]>([]);

async function connectChartGroup() {
  await nextTick();
  const instances = chartRefs.value.map((ref) => ref?.chart).filter(Boolean) as echarts.ECharts[];
  instances.forEach((inst) => {
    inst.group = CHART_GROUP;
  });
  if (instances.length > 1) echarts.connect(CHART_GROUP);
}

onBeforeUpdate(() => {
  chartRefs.value = [];
});

onMounted(() => {
  void connectChartGroup();
});

watch(
  () => activeMetrics.value.map((metric) => metric.key).join('|'),
  () => {
    void connectChartGroup();
  }
);

// ── 수치 요약 테이블 ──────────────────────────────────────────────────
function metricStats(s: MachineAnalysisSeries, m: MachineMetricDefinition) {
  const vals = s.values[m.key] ?? [];
  if (vals.length === 0) return { current: null, avg: null, max: null, min: null };
  const current = vals[vals.length - 1];
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return {
    current,
    avg,
    max: Math.max(...vals),
    min: Math.min(...vals),
  };
}

function fmt(value: number | null, m: MachineMetricDefinition): string {
  if (value === null) return '—';
  return m.valueFormat === 'ratio' ? formatRatioPercent(value) : formatNumber(value);
}
</script>

<template>
  <div class="comparison-chart">
    <p v-if="series.length === 0" class="comparison-chart__empty">위에서 비교할 대상을 선택하세요.</p>

    <template v-else>
      <!-- 뷰 토글 -->
      <div class="comparison-chart__toolbar">
        <div class="comparison-chart__mode-toggle" role="group" aria-label="차트 유형">
          <button
            type="button"
            class="comparison-chart__mode-btn"
            :class="{ 'comparison-chart__mode-btn--active': chartMode === 'trend' }"
            @click="chartMode = 'trend'"
          >
            기간 추이
          </button>
          <button
            type="button"
            class="comparison-chart__mode-btn"
            :class="{ 'comparison-chart__mode-btn--active': chartMode === 'snapshot' }"
            @click="chartMode = 'snapshot'"
          >
            최신값 비교
          </button>
        </div>
        <span class="comparison-chart__hint">
          {{
            chartMode === 'trend'
              ? '선택 기간의 시간 흐름을 봅니다.'
              : '선택 기간의 마지막 KPI 포인트만 대상끼리 비교합니다.'
          }}
        </span>
      </div>

      <!-- 차트 그리드 (2열) -->
      <div class="comparison-chart__grid">
        <section v-for="(metric, idx) in activeMetrics" :key="metric.key" class="comparison-chart__panel">
          <h3 class="comparison-chart__metric-title">
            {{ metric.label }}
            <span>{{ metric.unit === '%' ? '%' : 'lot' }}</span>
          </h3>
          <VChart
            :key="`${chartMode}-${metric.key}`"
            :ref="
              (el) => {
                if (el) chartRefs[idx] = el as InstanceType<typeof VChart>;
              }
            "
            class="comparison-chart__canvas"
            :option="chartMode === 'trend' ? buildTrendOption(metric) : buildSnapshotOption(metric)"
            :update-options="chartUpdateOptions"
            :group="CHART_GROUP"
            autoresize
          />
        </section>
      </div>

      <!-- 수치 요약 테이블 -->
      <div class="comparison-chart__summary-wrap">
        <table
          class="comparison-chart__summary"
          :class="{ 'comparison-chart__summary--snapshot': chartMode === 'snapshot' }"
        >
          <thead>
            <tr>
              <th>대상</th>
              <th v-for="m in activeMetrics" :key="m.key" class="comparison-chart__summary-group" :colspan="4">
                {{ m.label }}
              </th>
            </tr>
            <tr class="comparison-chart__summary-subhead">
              <th></th>
              <template v-for="m in activeMetrics" :key="`sub-${m.key}`">
                <th class="comparison-chart__summary-metric-start">현재</th>
                <th>평균</th>
                <th>최대</th>
                <th>최소</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in series" :key="s.id">
              <td class="comparison-chart__summary-target">
                <span class="comparison-chart__summary-target-inner">
                  <span class="comparison-chart__summary-dot" :style="{ background: seriesColor(i) }" />
                  <span class="comparison-chart__summary-text">
                    <strong>{{ s.label }}</strong>
                    <small>{{ s.groupLabel }}</small>
                  </span>
                </span>
              </td>
              <template v-for="m in activeMetrics" :key="`${s.id}-${m.key}`">
                <td
                  class="comparison-chart__summary-val comparison-chart__summary-val--current comparison-chart__summary-metric-start"
                >
                  {{ fmt(metricStats(s, m).current, m) }}
                </td>
                <td class="comparison-chart__summary-val">{{ fmt(metricStats(s, m).avg, m) }}</td>
                <td class="comparison-chart__summary-val">{{ fmt(metricStats(s, m).max, m) }}</td>
                <td class="comparison-chart__summary-val">{{ fmt(metricStats(s, m).min, m) }}</td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
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
  padding: var(--space-5);
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  text-align: center;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}

/* 툴바 */
.comparison-chart__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.comparison-chart__mode-toggle {
  display: inline-flex;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: 2px;
  gap: 2px;
}

.comparison-chart__mode-btn {
  border: var(--border-width-default) solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
  padding: 5px 14px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  transition: all 0.1s;
}

.comparison-chart__mode-btn--active {
  border-color: var(--color-action-primary);
  background: var(--color-action-primary);
  color: var(--color-text-inverse);
  box-shadow: 0 0 0 2px var(--color-action-primary-soft);
}

.comparison-chart__hint {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

/* 차트 2열 그리드 */
.comparison-chart__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: var(--space-3);
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
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.comparison-chart__metric-title span {
  margin-left: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-normal);
}

.comparison-chart__canvas {
  width: 100%;
  height: 220px;
}

/* 수치 요약 테이블 */
.comparison-chart__summary-wrap {
  overflow: auto;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
}

.comparison-chart__summary {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-bg-card);
  font-size: var(--font-size-base);
}

.comparison-chart__summary th,
.comparison-chart__summary td {
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
  padding: 10px var(--space-3);
  text-align: right;
  white-space: nowrap;
}

.comparison-chart__summary th {
  background: var(--color-bg-surface);
  color: var(--color-fg-muted);
  font-weight: var(--font-weight-bold);
}

.comparison-chart__summary th.comparison-chart__summary-group {
  text-align: left;
}

.comparison-chart__summary-metric-start {
  padding-left: var(--space-3);
}

.comparison-chart__summary th:first-child,
.comparison-chart__summary td:first-child {
  position: sticky;
  left: 0;
  z-index: 1;
  min-width: 180px;
  max-width: 240px;
  border-right: var(--border-width-default) solid var(--color-border-default);
  background: var(--color-bg-card);
  text-align: left;
  padding-left: var(--space-3);
}

.comparison-chart__summary thead th:first-child {
  z-index: 3;
  background: var(--color-bg-surface);
}

.comparison-chart__summary-subhead th {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-normal);
  border-bottom-color: var(--color-border-default);
}

.comparison-chart__summary-target-inner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.comparison-chart__summary-text {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.comparison-chart__summary-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.comparison-chart__summary-target strong {
  color: var(--color-fg-strong);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comparison-chart__summary-target small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comparison-chart__summary-val {
  color: var(--color-fg);
  font-variant-numeric: tabular-nums;
}

.comparison-chart__summary-val--current {
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-bold);
}

.comparison-chart__summary--snapshot .comparison-chart__summary-subhead .comparison-chart__summary-metric-start,
.comparison-chart__summary--snapshot .comparison-chart__summary-val--current {
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
}

.comparison-chart__summary--snapshot .comparison-chart__summary-val--current {
  box-shadow: inset 0 0 0 1px var(--color-action-primary-border);
}
</style>

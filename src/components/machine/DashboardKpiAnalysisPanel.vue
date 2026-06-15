<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { fetchDashboardKpi, fetchDashboardTrendsForPeriod } from '@/services/dashboardService';

import type { FabKpiSnapshot, KpiTrendSeries } from '@/types/dashboard';
import type { DashboardTrendKey } from '@/types/dashboardApi';
import type { MachinePeriodRange } from '@/types/machine';

import DashboardKpiTrendChart from '@/components/machine/DashboardKpiTrendChart.vue';

import { formatMetricValue, formatNumber, formatRatioPercent } from '@/utils/format';

const props = defineProps<{
  kpiKey: DashboardTrendKey;
  periodRange: MachinePeriodRange | null;
}>();

const emit = defineEmits<{
  selectKpi: [key: DashboardTrendKey];
}>();

const KPI_KEYS: DashboardTrendKey[] = ['rtf', 'throughput24h', 'avgQtimeMin', 'wip'];

const KPI_LABELS: Record<DashboardTrendKey, string> = {
  rtf: 'RTF',
  throughput24h: 'Throughput',
  avgQtimeMin: 'Q-time',
  wip: 'WIP',
};

const kpi = ref<FabKpiSnapshot | null>(null);
const trends = ref<KpiTrendSeries[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

interface KpiDetail {
  title: string;
  value: string;
  period: string;
  interpretation: string;
  positiveGood: boolean;
}

type SummaryTone = 'neutral' | 'good' | 'bad';

const selectedTrend = computed(() => trends.value.find((trend) => trend.key === props.kpiKey) ?? null);

const detail = computed<KpiDetail | null>(() => {
  if (!kpi.value) return null;

  switch (props.kpiKey) {
    case 'rtf':
      return {
        title: 'RTF',
        value: formatRatioPercent(kpi.value.rtf),
        period: '선택 기간',
        interpretation: 'RTF는 높을수록 공정 흐름이 원활합니다.',
        positiveGood: true,
      };
    case 'throughput24h':
      return {
        title: 'Daily Throughput',
        value: `${formatNumber(kpi.value.throughput24h)} ${kpi.value.throughputUnit}`,
        period: '선택 기간',
        interpretation: 'Throughput은 높을수록 같은 기간 내 처리량이 많습니다.',
        positiveGood: true,
      };
    case 'avgQtimeMin':
      return {
        title: '평균 Q-time',
        value: formatDaysFromMinutes(kpi.value.avgQtimeMin),
        period: '선택 기간',
        interpretation: 'Q-time은 낮을수록 Lot 대기가 줄어든 상태입니다.',
        positiveGood: false,
      };
    case 'wip':
      return {
        title: 'WIP',
        value: `${formatNumber(kpi.value.wipCount)} ${kpi.value.wipUnit}`,
        period: '선택 기간',
        interpretation: 'WIP는 낮을수록 공정 내 대기 재공이 줄어든 상태입니다.',
        positiveGood: false,
      };
    default:
      return null;
  }
});

const summaryRows = computed(() => {
  const currentDetail = detail.value;
  const stats = periodStats.value;
  if (!currentDetail) return [];

  return [
    { label: '현재값', value: currentDetail.value, tone: 'neutral' },
    {
      label: props.kpiKey === 'throughput24h' ? '선택 기간 일 평균' : '선택 기간 평균',
      value: stats.average,
      tone: 'neutral',
    },
    { label: '시작값', value: stats.first, tone: 'neutral' },
    { label: '마지막값', value: stats.last, tone: 'neutral' },
    {
      label: '시작 대비 변화',
      value: stats.change,
      tone: stats.tone,
    },
    {
      label: props.kpiKey === 'avgQtimeMin' ? '최저/최고' : '최고/최저',
      value: stats.range,
      tone: 'neutral',
    },
  ];
});

const periodStats = computed(() => {
  const values = selectedTrend.value?.values ?? [];
  const currentDetail = detail.value;
  const trend = selectedTrend.value;

  if (!trend || !currentDetail || values.length === 0) {
    return {
      average: '-',
      first: '-',
      last: '-',
      change: '-',
      range: '-',
      tone: 'neutral',
    };
  }

  const first = values[0];
  const last = values[values.length - 1];
  const avg = average(values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const delta = last - first;
  const tone: SummaryTone =
    delta === 0 ? 'neutral' : currentDetail.positiveGood ? (delta > 0 ? 'good' : 'bad') : delta < 0 ? 'good' : 'bad';

  return {
    average: formatPeriodValue(avg, trend),
    first: formatPeriodValue(first, trend),
    last: formatPeriodValue(last, trend),
    change: formatPeriodDelta(delta, currentDetail.positiveGood),
    range:
      props.kpiKey === 'avgQtimeMin'
        ? `${formatPeriodValue(min, trend)} / ${formatPeriodValue(max, trend)}`
        : `${formatPeriodValue(max, trend)} / ${formatPeriodValue(min, trend)}`,
    tone,
  };
});

async function loadPanelData() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const trendPromise = props.periodRange
      ? fetchDashboardTrendsForPeriod(props.periodRange, KPI_KEYS)
      : Promise.resolve<KpiTrendSeries[]>([]);
    const [kpiData, trendData] = await Promise.all([fetchDashboardKpi(), trendPromise]);
    kpi.value = kpiData;
    trends.value = trendData;
  } catch {
    errorMessage.value = '공장 KPI 추이 데이터를 불러오지 못했습니다.';
  } finally {
    loading.value = false;
  }
}

function formatDaysFromMinutes(value: number | null): string {
  if (value === null) return '-';
  return `${(value / 60 / 24).toFixed(2)}일`;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatPeriodValue(value: number | null, trend: KpiTrendSeries): string {
  if (value === null) return '-';
  const formatted = formatMetricValue(value, trend.valueFormat);

  if (props.kpiKey === 'avgQtimeMin') return `${formatted}일`;
  if (props.kpiKey === 'throughput24h') return `${formatted} lots/일`;
  if (props.kpiKey === 'wip') return `${formatted} lots`;
  return formatted;
}

function formatPeriodDelta(value: number | null, positiveGood: boolean): string {
  if (value === null) return '-';
  if (value === 0) {
    if (props.kpiKey === 'rtf') return '0.0%p';
    if (props.kpiKey === 'avgQtimeMin') return '0.00일';
    if (props.kpiKey === 'throughput24h') return '0 lots/일';
    return '0 lots';
  }

  const prefix = value > 0 ? '▲' : '▼';
  const abs = Math.abs(value);
  const improved = positiveGood ? value > 0 : value < 0;
  const suffix = improved ? ' 개선' : ' 악화';

  if (props.kpiKey === 'rtf') return `${prefix} ${abs.toFixed(1)}%p${suffix}`;
  if (props.kpiKey === 'avgQtimeMin') return `${prefix} ${abs.toFixed(2)}일${suffix}`;
  if (props.kpiKey === 'throughput24h') return `${prefix} ${formatNumber(Math.round(abs))} lots/일${suffix}`;
  return `${prefix} ${formatNumber(Math.round(abs))} lots${suffix}`;
}

onMounted(() => {
  void loadPanelData();
});

watch(
  () => [props.periodRange?.preset, props.periodRange?.from, props.periodRange?.to],
  () => {
    void loadPanelData();
  }
);
</script>

<template>
  <section class="dashboard-kpi-analysis" aria-label="공장 KPI 추이 분석">
    <header class="dashboard-kpi-analysis__header">
      <div>
        <span>공장 KPI</span>
        <h2>전체 공장 추이</h2>
      </div>
      <div class="dashboard-kpi-analysis__selector" role="group" aria-label="KPI 선택">
        <button
          v-for="key in KPI_KEYS"
          :key="key"
          type="button"
          class="dashboard-kpi-analysis__selector-btn"
          :class="{ 'dashboard-kpi-analysis__selector-btn--active': key === kpiKey }"
          @click="emit('selectKpi', key)"
        >
          {{ KPI_LABELS[key] }}
        </button>
      </div>
    </header>

    <p v-if="loading" class="dashboard-kpi-analysis__state">KPI 추이 데이터를 불러오는 중입니다.</p>
    <p v-else-if="errorMessage" class="dashboard-kpi-analysis__state dashboard-kpi-analysis__state--error">
      {{ errorMessage }}
    </p>

    <template v-else-if="detail">
      <div class="dashboard-kpi-analysis__body">
        <div class="dashboard-kpi-analysis__chart-pane">
          <div class="dashboard-kpi-analysis__chart-head">
            <div>
              <h3>{{ detail.title }}</h3>
              <p>{{ selectedTrend?.subtitle ?? detail.period }}</p>
            </div>
            <strong>{{ detail.value }}</strong>
          </div>
          <DashboardKpiTrendChart :trend="selectedTrend" />
        </div>

        <aside class="dashboard-kpi-analysis__summary" aria-label="선택 KPI 요약">
          <div
            v-for="row in summaryRows"
            :key="row.label"
            class="dashboard-kpi-analysis__summary-row"
            :class="`dashboard-kpi-analysis__summary-row--${row.tone}`"
          >
            <span>{{ row.label }}</span>
            <strong>{{ row.value }}</strong>
          </div>
          <p>{{ detail.interpretation }}</p>
        </aside>
      </div>
    </template>
  </section>
</template>

<style scoped>
.dashboard-kpi-analysis {
  display: grid;
  gap: var(--space-3);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
}

.dashboard-kpi-analysis__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  min-width: 0;
}

.dashboard-kpi-analysis__header span {
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.dashboard-kpi-analysis__header h2,
.dashboard-kpi-analysis__chart-head h3,
.dashboard-kpi-analysis__chart-head p,
.dashboard-kpi-analysis__summary p {
  margin: 0;
}

.dashboard-kpi-analysis__header h2 {
  margin-top: 2px;
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.dashboard-kpi-analysis__selector {
  display: inline-flex;
  flex-shrink: 0;
  gap: 2px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: 2px;
}

.dashboard-kpi-analysis__selector-btn {
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  padding: 6px 12px;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  transition:
    background 0.1s,
    color 0.1s;
}

.dashboard-kpi-analysis__selector-btn:hover {
  background: var(--color-state-hover);
  color: var(--color-fg);
}

.dashboard-kpi-analysis__selector-btn--active {
  background: var(--color-action-primary);
  color: var(--color-text-inverse);
}

.dashboard-kpi-analysis__state {
  margin: 0;
  border: var(--border-width-default) dashed var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  padding: var(--space-4);
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  text-align: center;
}

.dashboard-kpi-analysis__state--error {
  border-color: var(--color-status-danger);
  color: var(--color-status-danger);
}

.dashboard-kpi-analysis__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: var(--space-3);
  align-items: stretch;
  min-width: 0;
}

.dashboard-kpi-analysis__chart-pane {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.dashboard-kpi-analysis__chart-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  min-width: 0;
}

.dashboard-kpi-analysis__chart-head h3 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.dashboard-kpi-analysis__chart-head p {
  margin-top: 2px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.dashboard-kpi-analysis__chart-head strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.dashboard-kpi-analysis__summary {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  border-left: var(--border-width-default) solid var(--color-border-subtle);
  padding-left: var(--space-3);
  min-width: 0;
}

.dashboard-kpi-analysis__summary-row {
  display: grid;
  gap: 3px;
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
  padding-bottom: var(--space-2);
}

.dashboard-kpi-analysis__summary-row span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.dashboard-kpi-analysis__summary-row strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  line-height: 1.25;
}

.dashboard-kpi-analysis__summary-row--good strong {
  color: var(--color-status-success);
}

.dashboard-kpi-analysis__summary-row--bad strong {
  color: var(--color-status-danger);
}

.dashboard-kpi-analysis__summary p {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

@media (max-width: 980px) {
  .dashboard-kpi-analysis__header,
  .dashboard-kpi-analysis__chart-head {
    align-items: stretch;
    flex-direction: column;
  }

  .dashboard-kpi-analysis__selector {
    overflow-x: auto;
  }

  .dashboard-kpi-analysis__body {
    grid-template-columns: 1fr;
  }

  .dashboard-kpi-analysis__summary {
    border-left: 0;
    border-top: var(--border-width-default) solid var(--color-border-subtle);
    padding-top: var(--space-3);
    padding-left: 0;
  }
}
</style>

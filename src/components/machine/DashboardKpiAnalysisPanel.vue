<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { fetchDashboardKpi, fetchDashboardTrends } from '@/services/dashboardService';

import type { FabKpiSnapshot, KpiTrendSeries } from '@/types/dashboard';
import type { DashboardTrendKey } from '@/types/dashboardApi';

import { formatMetricValue, formatNumber, formatRatioPercent } from '@/utils/format';

const props = defineProps<{
  kpiKey: DashboardTrendKey;
}>();

const kpi = ref<FabKpiSnapshot | null>(null);
const trends = ref<KpiTrendSeries[]>([]);
const loading = ref(false);
const errorMessage = ref<string | null>(null);

interface KpiDetail {
  title: string;
  description: string;
  value: string;
  delta: string;
  period: string;
  target: string;
  interpretation: string;
  positiveGood: boolean;
}

const selectedTrend = computed(() => trends.value.find((trend) => trend.key === props.kpiKey) ?? null);

const detail = computed<KpiDetail | null>(() => {
  if (!kpi.value) return null;

  switch (props.kpiKey) {
    case 'rtf':
      return {
        title: 'RTF 상세 추이',
        description: '공장 전체 흐름 속도를 최근 24시간 기준으로 확인합니다.',
        value: formatRatioPercent(kpi.value.rtf),
        delta: formatDelta(kpi.value.rtfDelta, '%p', true, 100),
        period: '최근 24시간',
        target:
          typeof selectedTrend.value?.targetValue === 'number'
            ? `${formatMetricValue(selectedTrend.value.targetValue, 'percent')} 이상`
            : '목표 기준 없음',
        interpretation: 'RTF는 높을수록 공정 흐름이 원활하다는 의미입니다.',
        positiveGood: true,
      };
    case 'throughput24h':
      return {
        title: 'Daily Throughput 상세 추이',
        description: '일 단위 산출량 흐름을 최근 7일 기준으로 확인합니다.',
        value: `${formatNumber(kpi.value.throughput24h)} ${kpi.value.throughputUnit}`,
        delta: formatDelta(kpi.value.throughputDelta, ` ${kpi.value.throughputUnit}`, true),
        period: '최근 7일',
        target: '일별 집계 기준',
        interpretation: 'Throughput은 높을수록 같은 기간 내 처리량이 증가했다는 의미입니다.',
        positiveGood: true,
      };
    case 'avgQtimeMin':
      return {
        title: '평균 Q-time 상세 추이',
        description: '대기 시간 흐름을 최근 24시간 기준으로 확인합니다.',
        value: formatDaysFromMinutes(kpi.value.avgQtimeMin),
        delta: formatDelta(minutesToDays(kpi.value.qtimeDelta), '일', false),
        period: '최근 24시간',
        target:
          typeof selectedTrend.value?.targetValue === 'number'
            ? `${selectedTrend.value.targetValue.toFixed(1)}일 이하`
            : '목표 기준 없음',
        interpretation: 'Q-time은 낮을수록 Lot 대기가 줄어든 상태입니다.',
        positiveGood: false,
      };
    case 'wip':
      return {
        title: 'WIP 상세 추이',
        description: '전체 대기 Lot 합산 흐름을 최근 24시간 기준으로 확인합니다.',
        value: `${formatNumber(kpi.value.wipCount)} ${kpi.value.wipUnit}`,
        delta: formatDelta(kpi.value.wipDelta, ` ${kpi.value.wipUnit}`, false),
        period: '최근 24시간',
        target: kpi.value.wipTarget === null ? '목표 기준 없음' : `${formatNumber(kpi.value.wipTarget)} 이하`,
        interpretation: 'WIP는 낮을수록 공정 내 대기 재공이 줄어든 상태입니다.',
        positiveGood: false,
      };
    default:
      return null;
  }
});

const deltaTone = computed(() => {
  const current = kpi.value;
  const currentDetail = detail.value;
  if (!current || !currentDetail) return 'neutral';

  const rawDelta =
    props.kpiKey === 'rtf'
      ? current.rtfDelta
      : props.kpiKey === 'throughput24h'
        ? current.throughputDelta
        : props.kpiKey === 'avgQtimeMin'
          ? current.qtimeDelta
          : current.wipDelta;
  if (rawDelta === null || rawDelta === 0) return 'neutral';
  const improved = currentDetail.positiveGood ? rawDelta > 0 : rawDelta < 0;
  return improved ? 'good' : 'bad';
});

async function loadPanelData() {
  loading.value = true;
  errorMessage.value = null;
  try {
    const [kpiData, trendData] = await Promise.all([fetchDashboardKpi(), fetchDashboardTrends()]);
    kpi.value = kpiData;
    trends.value = trendData;
  } catch {
    errorMessage.value = '대시보드 KPI 상세 데이터를 불러오지 못했습니다.';
  } finally {
    loading.value = false;
  }
}

function formatDaysFromMinutes(value: number | null): string {
  if (value === null) return '-';
  return `${(value / 60 / 24).toFixed(2)}일`;
}

function minutesToDays(value: number | null): number | null {
  return value === null ? null : value / 60 / 24;
}

function formatDelta(value: number | null, unit: string, positiveGood: boolean, scale = 1): string {
  if (value === null) return '-';
  if (value === 0) return `0${unit}`;
  const scaled = value * scale;
  const prefix = scaled > 0 ? '▲' : '▼';
  const abs = Math.abs(scaled);
  const decimals = Number.isInteger(abs) ? 0 : abs < 1 ? 2 : 1;
  const improved = positiveGood ? scaled > 0 : scaled < 0;
  const suffix = improved ? ' 개선' : ' 악화';
  return `${prefix} ${abs.toFixed(decimals)}${unit}${suffix}`;
}

onMounted(() => {
  void loadPanelData();
});

watch(
  () => props.kpiKey,
  () => {
    if (!kpi.value || trends.value.length === 0) {
      void loadPanelData();
    }
  }
);
</script>

<template>
  <section class="dashboard-kpi-analysis" aria-label="대시보드 KPI 상세 분석">
    <header class="dashboard-kpi-analysis__header">
      <div>
        <span>대시보드 KPI 상세</span>
        <h2>{{ detail?.title ?? 'KPI 상세 추이' }}</h2>
      </div>
      <p v-if="detail">{{ detail.period }}</p>
    </header>

    <p v-if="loading" class="dashboard-kpi-analysis__state">KPI 상세 데이터를 불러오는 중입니다.</p>
    <p v-else-if="errorMessage" class="dashboard-kpi-analysis__state dashboard-kpi-analysis__state--error">
      {{ errorMessage }}
    </p>

    <template v-else-if="detail">
      <div class="dashboard-kpi-analysis__summary">
        <div>
          <span>현재값</span>
          <strong>{{ detail.value }}</strong>
        </div>
        <div>
          <span>전일 동시간 대비</span>
          <strong :class="`dashboard-kpi-analysis__delta--${deltaTone}`">{{ detail.delta }}</strong>
        </div>
        <div>
          <span>기준</span>
          <strong>{{ detail.target }}</strong>
        </div>
      </div>

      <p class="dashboard-kpi-analysis__drill-hint">
        <strong>{{ detail.interpretation }}</strong>
        아래 차트에서 이 KPI에 가장 크게 기여한 Tool Group을 기간을 바꿔가며 비교하세요.
      </p>
    </template>
  </section>
</template>

<style scoped>
.dashboard-kpi-analysis {
  display: grid;
  gap: var(--space-3);
  border: var(--border-width-default) solid
    color-mix(in srgb, var(--color-action-primary) 30%, var(--color-border-default));
  border-radius: var(--radius-lg);
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--color-action-primary) 8%, transparent), transparent 44%),
    var(--color-bg-card);
  padding: var(--space-4);
  box-shadow: var(--shadow-sm);
}

.dashboard-kpi-analysis__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.dashboard-kpi-analysis__header span {
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.dashboard-kpi-analysis__header h2,
.dashboard-kpi-analysis__header p,
.dashboard-kpi-analysis__note p {
  margin: 0;
}

.dashboard-kpi-analysis__header h2 {
  margin-top: 2px;
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.dashboard-kpi-analysis__header p {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.dashboard-kpi-analysis__summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.dashboard-kpi-analysis__summary div {
  display: grid;
  gap: 4px;
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-bg-surface) 78%, transparent);
  padding: var(--space-3);
}

.dashboard-kpi-analysis__summary span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.dashboard-kpi-analysis__summary strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

.dashboard-kpi-analysis__delta--good {
  color: var(--color-status-success) !important;
}

.dashboard-kpi-analysis__delta--bad {
  color: var(--color-status-danger) !important;
}

.dashboard-kpi-analysis__delta--neutral {
  color: var(--color-fg-strong) !important;
}

.dashboard-kpi-analysis__drill-hint {
  margin: 0;
  border-left: 3px solid color-mix(in srgb, var(--color-action-primary) 55%, transparent);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-action-primary) 6%, var(--color-bg-page));
  padding: var(--space-2) var(--space-3);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.dashboard-kpi-analysis__drill-hint strong {
  color: var(--color-fg-strong);
}

.dashboard-kpi-analysis__state {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.dashboard-kpi-analysis__state--error {
  color: var(--color-status-danger);
}

@media (max-width: 900px) {
  .dashboard-kpi-analysis__summary {
    grid-template-columns: 1fr;
  }
}
</style>

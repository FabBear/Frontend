<script setup lang="ts">
import { computed } from 'vue';

import type { FabKpiSnapshot, KpiTrendSeries } from '@/types/dashboard';
import type { DashboardTrendKey } from '@/types/dashboardApi';

import KpiCard from '@/components/base/KpiCard.vue';
import KpiSparklineChart from '@/components/dashboard/KpiSparklineChart.vue';

import { formatMetricValue, formatNumber, formatRatioPercent } from '@/utils/format';

interface Props {
  kpi: FabKpiSnapshot;
  trends?: KpiTrendSeries[] | null;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  selectKpi: [key: DashboardTrendKey];
}>();

interface CardDef {
  key: DashboardTrendKey;
  title: string;
  value: string;
  delta?: number;
  deltaUnit: string;
  isPositiveGood: boolean;
  subtitle?: string;
  trend?: KpiTrendSeries;
}

function formatNullableNumberWithUnit(value: number | null, unit: string): string {
  return value === null ? '-' : `${formatNumber(value)} ${formatDisplayUnit(unit)}`;
}

function formatNullableDecimal(value: number | null, fractionDigits = 1): string {
  return value === null
    ? '-'
    : value.toLocaleString('ko-KR', {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
      });
}

function formatNullableDaysFromMinutes(value: number | null): string {
  return value === null ? '-' : `${formatNullableDecimal(value / 60 / 24, 2)}일`;
}

function toPercentPointDelta(value: number | null): number | undefined {
  return value === null ? undefined : value * 100;
}

function toDelta(value: number | null): number | undefined {
  return value === null ? undefined : value;
}

function toDayDeltaFromMinutes(value: number | null): number | undefined {
  return value === null ? undefined : value / 60 / 24;
}

function formatDisplayUnit(unit: string): string {
  if (unit === 'min') return '분';
  return unit;
}

const trendByKey = computed(() => new Map((props.trends ?? []).map((trend) => [trend.key, trend])));

const cards = computed<CardDef[]>(() => [
  {
    key: 'rtf',
    title: 'RTF',
    value: formatRatioPercent(props.kpi.rtf),
    delta: toPercentPointDelta(props.kpi.rtfDelta),
    deltaUnit: '%p',
    isPositiveGood: true,
    trend: trendByKey.value.get('rtf'),
  },
  {
    key: 'throughput24h',
    title: 'Daily Throughput',
    value: formatNumber(props.kpi.throughput24h),
    delta: toDelta(props.kpi.throughputDelta),
    deltaUnit: ' lots',
    isPositiveGood: true,
    subtitle: `단위 ${props.kpi.throughputUnit}`,
    trend: trendByKey.value.get('throughput24h'),
  },
  {
    key: 'avgQtimeMin',
    title: '평균 Q-time',
    value: formatNullableDaysFromMinutes(props.kpi.avgQtimeMin),
    delta: toDayDeltaFromMinutes(props.kpi.qtimeDelta),
    deltaUnit: '일',
    isPositiveGood: false,
    trend: trendByKey.value.get('avgQtimeMin'),
  },
  {
    key: 'wip',
    title: 'WIP',
    value: formatNullableNumberWithUnit(props.kpi.wipCount, props.kpi.wipUnit),
    delta: toDelta(props.kpi.wipDelta),
    deltaUnit: ` ${props.kpi.wipUnit}`,
    isPositiveGood: false,
    subtitle:
      props.kpi.wipTarget === null
        ? '전체 대기 Lot 합산'
        : `목표 ≤ ${formatNumber(props.kpi.wipTarget)} · 전체 대기 Lot 합산`,
    trend: trendByKey.value.get('wip'),
  },
]);

function getTrendPeriodLabel(card: CardDef): string {
  return card.key === 'throughput24h' ? '최근 7일' : '최근 24시간';
}

function getTrendBaselineLabel(card: CardDef): string {
  const trend = card.trend;
  if (typeof trend?.targetValue !== 'number') {
    return card.key === 'throughput24h' ? '상세 분석에서 일별 확인' : '상세 분석에서 기준 확인';
  }

  if (card.key === 'rtf') return `목표 ${formatMetricValue(trend.targetValue, trend.valueFormat)} 이상`;
  if (card.key === 'avgQtimeMin') return `목표 ${trend.targetValue.toFixed(1)}일 이하`;
  if (card.key === 'wip') return `목표 ${formatNumber(trend.targetValue)} 이하`;
  return `목표 ${formatMetricValue(trend.targetValue, trend.valueFormat)}`;
}
</script>

<template>
  <section class="dashboard-kpi-summary" aria-label="대시보드 KPI 요약">
    <header class="dashboard-kpi-summary__header">
      <h2>핵심 KPI</h2>
      <span>전일 동시간 대비</span>
    </header>

    <div class="dashboard-kpi-summary__grid">
      <KpiCard
        v-for="card in cards"
        :key="card.key"
        :title="card.title"
        :value="card.value"
        :delta="card.delta"
        :delta-unit="card.deltaUnit"
        :is-positive-good="card.isPositiveGood"
        :subtitle="card.subtitle"
        clickable
        @click="emit('selectKpi', card.key)"
      >
        <template #trend>
          <div class="dashboard-kpi-summary__trend">
            <div class="dashboard-kpi-summary__trend-chart">
              <KpiSparklineChart
                v-if="card.trend && card.trend.values.length >= 2"
                :values="card.trend.values"
                :color-token="card.trend.colorToken"
                :x-labels="card.trend.xLabels"
                :value-format="card.trend.valueFormat"
                :target-value="card.trend.targetValue"
                :show-axes="false"
              />
              <p v-else class="dashboard-kpi-summary__trend-empty">추이 데이터 부족</p>
            </div>
            <div class="dashboard-kpi-summary__trend-meta">
              <span>{{ getTrendPeriodLabel(card) }}</span>
              <span>{{ getTrendBaselineLabel(card) }}</span>
            </div>
          </div>
        </template>
      </KpiCard>
    </div>
  </section>
</template>

<style scoped>
.dashboard-kpi-summary {
  display: grid;
  gap: var(--space-2);
}

.dashboard-kpi-summary__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  min-width: 0;
}

.dashboard-kpi-summary__header h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.dashboard-kpi-summary__header span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.dashboard-kpi-summary__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

.dashboard-kpi-summary__trend {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100%;
  min-width: 0;
  gap: 2px;
}

.dashboard-kpi-summary__trend-chart {
  min-width: 0;
  min-height: 0;
}

.dashboard-kpi-summary__trend-empty {
  display: grid;
  min-height: 100%;
  place-items: center;
  border: var(--border-width-default) dashed var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.dashboard-kpi-summary__trend-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
  color: var(--color-fg-muted);
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  line-height: 1.2;
}

.dashboard-kpi-summary__trend-meta span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1180px) {
  .dashboard-kpi-summary__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .dashboard-kpi-summary__header {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--space-1);
  }

  .dashboard-kpi-summary__header span {
    white-space: normal;
  }

  .dashboard-kpi-summary__grid {
    grid-template-columns: 1fr;
  }
}
</style>

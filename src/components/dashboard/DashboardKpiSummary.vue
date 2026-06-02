<script setup lang="ts">
import { computed } from 'vue';

import type { FabKpiSnapshot } from '@/types/dashboard';

import KpiCard from '@/components/base/KpiCard.vue';

import { formatKoMonthDayTime, formatNumber, formatRatioPercent } from '@/utils/format';

interface Props {
  kpi: FabKpiSnapshot;
}

const props = defineProps<Props>();

interface CardDef {
  key: string;
  title: string;
  value: string;
  delta?: number;
  deltaUnit: string;
  isPositiveGood: boolean;
  subtitle?: string;
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

const cards = computed<CardDef[]>(() => [
  {
    key: 'rtf',
    title: 'RTF',
    value: formatRatioPercent(props.kpi.rtf),
    delta: toPercentPointDelta(props.kpi.rtfDelta),
    deltaUnit: '%p',
    isPositiveGood: true,
  },
  {
    key: 'throughput',
    title: 'Daily Throughput',
    value: formatNumber(props.kpi.throughput24h),
    delta: toDelta(props.kpi.throughputDelta),
    deltaUnit: ' lots',
    isPositiveGood: true,
    subtitle: `단위 ${props.kpi.throughputUnit}`,
  },
  {
    key: 'qtime',
    title: '평균 Q-time',
    value: formatNullableDaysFromMinutes(props.kpi.avgQtimeMin),
    delta: toDayDeltaFromMinutes(props.kpi.qtimeDelta),
    deltaUnit: '일',
    isPositiveGood: false,
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
  },
]);

const measuredAtLabel = computed(() => `${formatKoMonthDayTime(props.kpi.updatedAt)} 기준`);
</script>

<template>
  <section class="dashboard-kpi-summary" aria-label="대시보드 KPI 요약">
    <header class="dashboard-kpi-summary__header">
      <h2>핵심 KPI</h2>
      <span>{{ measuredAtLabel }} · 전일 동시간 대비</span>
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
      />
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
  font-size: var(--font-size-base);
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
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-3);
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
}
</style>

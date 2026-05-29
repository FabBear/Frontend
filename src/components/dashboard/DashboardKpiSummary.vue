<script setup lang="ts">
import { computed } from 'vue';

import type { FabKpiSnapshot } from '@/types/dashboard';

interface Props {
  kpi: FabKpiSnapshot;
}

const props = defineProps<Props>();

interface KpiCard {
  key: string;
  title: string;
  value: string;
  delta: number;
  deltaUnit: string;
  isPositiveGood: boolean;
  note?: string;
}

const kpiCards = computed<KpiCard[]>(() => [
  {
    key: 'rtf',
    title: 'RTF',
    value: formatPercent(props.kpi.rtf),
    delta: props.kpi.rtfDelta * 100,
    deltaUnit: '%p',
    isPositiveGood: true,
    note: '실적 3,468 / 계획 3,680',
  },
  {
    key: 'throughput',
    title: 'Daily Throughput',
    value: formatNumber(props.kpi.throughput24h),
    delta: props.kpi.throughputDelta,
    deltaUnit: ' lots',
    isPositiveGood: true,
  },
  {
    key: 'qtime',
    title: '평균 Q-time',
    value: `${props.kpi.avgQtimeDays.toFixed(2)}일`,
    delta: props.kpi.qtimeDelta,
    deltaUnit: '일',
    isPositiveGood: false,
  },
  {
    key: 'wip',
    title: 'WIP',
    value: formatNumber(props.kpi.wipCount),
    delta: props.kpi.wipDelta,
    deltaUnit: ' lots',
    isPositiveGood: false,
    note: '목표 ≤ 3,500 · 전체 대기 Lot 합산',
  },
]);

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function getDeltaClass(card: KpiCard) {
  const isImproved = card.isPositiveGood ? card.delta >= 0 : card.delta <= 0;
  return isImproved ? 'dashboard-kpi-summary__delta--good' : 'dashboard-kpi-summary__delta--bad';
}

function formatDelta(card: KpiCard) {
  const prefix = card.delta >= 0 ? '▲' : '▼';
  const value = Math.abs(card.delta);
  const formattedValue = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
  return `${prefix} ${formattedValue}${card.deltaUnit}`;
}
</script>

<template>
  <section class="dashboard-kpi-summary" aria-label="대시보드 KPI 요약">
    <article v-for="card in kpiCards" :key="card.key" class="dashboard-kpi-summary__card">
      <p class="dashboard-kpi-summary__title">{{ card.title }}</p>
      <div class="dashboard-kpi-summary__value-row">
        <strong class="dashboard-kpi-summary__value">{{ card.value }}</strong>
        <span class="dashboard-kpi-summary__delta" :class="getDeltaClass(card)">
          {{ formatDelta(card) }}
        </span>
      </div>
      <p v-if="card.note" class="dashboard-kpi-summary__note">{{ card.note }}</p>
    </article>
  </section>
</template>

<style scoped>
.dashboard-kpi-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-3);
}

.dashboard-kpi-summary__card {
  display: grid;
  min-height: 104px;
  align-content: center;
  gap: var(--space-2);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
}

.dashboard-kpi-summary__title {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.dashboard-kpi-summary__value-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--space-3);
}

.dashboard-kpi-summary__value {
  color: var(--color-fg-strong);
  font-size: var(--font-size-xl);
  line-height: var(--line-height-tight);
}

.dashboard-kpi-summary__delta {
  flex-shrink: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.dashboard-kpi-summary__delta--good {
  color: var(--color-status-success);
}

.dashboard-kpi-summary__delta--bad {
  color: var(--color-status-danger);
}

.dashboard-kpi-summary__note {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}
</style>

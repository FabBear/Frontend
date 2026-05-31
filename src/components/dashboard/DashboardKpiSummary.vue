<script setup lang="ts">
import { computed } from 'vue';

import { KPI_TARGETS } from '@/constants/kpiTargets';

import type { FabKpiSnapshot } from '@/types/dashboard';

import KpiCard from '@/components/base/KpiCard.vue';

import { formatNumber, formatRatioPercent } from '@/utils/format';

interface Props {
  kpi: FabKpiSnapshot;
}

const props = defineProps<Props>();

interface CardDef {
  key: string;
  title: string;
  value: string;
  delta: number;
  deltaUnit: string;
  isPositiveGood: boolean;
  subtitle?: string;
}

const cards = computed<CardDef[]>(() => [
  {
    key: 'rtf',
    title: 'RTF',
    value: formatRatioPercent(props.kpi.rtf),
    delta: props.kpi.rtfDelta * 100,
    deltaUnit: '%p',
    isPositiveGood: true,
    subtitle: `실적 ${formatNumber(props.kpi.throughput24h)} / 계획 ${formatNumber(KPI_TARGETS.throughputPlan)}`,
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
    subtitle: `목표 ≤ ${formatNumber(KPI_TARGETS.wipCount)} · 전체 대기 Lot 합산`,
  },
]);
</script>

<template>
  <section class="dashboard-kpi-summary" aria-label="대시보드 KPI 요약">
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
  </section>
</template>

<style scoped>
.dashboard-kpi-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-3);
}
</style>

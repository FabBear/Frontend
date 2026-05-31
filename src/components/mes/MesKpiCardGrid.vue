<script setup lang="ts">
import { RISK_LEVEL_META, type RiskLevel } from '@/constants/riskLevel';

import type { MesKpiCard } from '@/types/mes';

import KpiCard from '@/components/base/KpiCard.vue';

interface Props {
  cards: MesKpiCard[];
  columns?: 5 | 6;
}

withDefaults(defineProps<Props>(), {
  columns: 5,
});

const TONE_COLOR: Record<NonNullable<MesKpiCard['tone']>, string> = {
  critical: RISK_LEVEL_META.critical.color,
  high: RISK_LEVEL_META.high.color,
  medium: RISK_LEVEL_META.medium.color,
  low: RISK_LEVEL_META.low.color,
  info: 'var(--color-status-info)',
  success: 'var(--color-status-success)',
  warning: 'var(--color-status-warning)',
  danger: 'var(--color-status-danger)',
};

function getToneColor(tone?: RiskLevel | 'info' | 'success' | 'warning' | 'danger') {
  return tone ? TONE_COLOR[tone] : undefined;
}
</script>

<template>
  <div class="mes-kpi-card-grid" :class="`mes-kpi-card-grid--cols-${columns}`">
    <KpiCard
      v-for="card in cards"
      :key="card.key"
      :title="card.title"
      :value="card.value"
      :value-color="getToneColor(card.tone)"
      :delta="card.delta"
      :delta-unit="card.deltaUnit"
      :is-positive-good="card.isPositiveGood"
      :subtitle="card.subtitle"
      :note="card.note"
    />
  </div>
</template>

<style scoped>
.mes-kpi-card-grid {
  display: grid;
  gap: var(--space-2);
}

.mes-kpi-card-grid--cols-5 {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.mes-kpi-card-grid--cols-6 {
  grid-template-columns: repeat(6, minmax(0, 1fr));
}

@media (max-width: 1280px) {
  .mes-kpi-card-grid--cols-5,
  .mes-kpi-card-grid--cols-6 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>

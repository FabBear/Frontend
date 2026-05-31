<script setup lang="ts">
import { RISK_LEVEL_META, type RiskLevel } from '@/constants/riskLevel';

import type { MesKpiCard } from '@/types/mes';

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
  return tone ? TONE_COLOR[tone] : 'var(--color-fg-strong)';
}
</script>

<template>
  <div class="mes-kpi-card-grid" :class="`mes-kpi-card-grid--cols-${columns}`">
    <article v-for="card in cards" :key="card.key" class="mes-kpi-card-grid__card">
      <span>{{ card.title }}</span>
      <strong :style="{ color: getToneColor(card.tone) }">{{ card.value }}</strong>
      <small>{{ card.subtitle }}</small>
      <em v-if="card.deltaText">{{ card.deltaText }}</em>
    </article>
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

.mes-kpi-card-grid__card {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-surface);
  padding: var(--space-3);
}

.mes-kpi-card-grid__card span,
.mes-kpi-card-grid__card small,
.mes-kpi-card-grid__card em {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.mes-kpi-card-grid__card strong {
  display: block;
  margin: var(--space-1) 0;
  font-size: var(--font-size-xl);
}

.mes-kpi-card-grid__card em {
  display: block;
  margin-top: var(--space-1);
  font-style: normal;
}

@media (max-width: 1280px) {
  .mes-kpi-card-grid--cols-5,
  .mes-kpi-card-grid--cols-6 {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>

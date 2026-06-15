<script setup lang="ts">
import type { BncActionPlan } from '@/types/bnc';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BncStatBarChart from '@/components/bnc/BncStatBarChart.vue';
import type { StatBarItem } from '@/components/bnc/BncStatBarChart.vue';

defineProps<{
  plans: BncActionPlan[];
}>();

function planKpiChartItems(plan: BncActionPlan): StatBarItem[] {
  return plan.metrics
    .filter((m) => !m.label.includes('종합'))
    .map((m): StatBarItem => {
      const pct = m.pctDelta ?? 0;
      const isPositive = m.tone === 'positive';
      const isNegative = m.tone === 'negative';
      return {
        label: m.label,
        value: pct,
        tone: pct === 0 ? 'muted' : isPositive ? 'success' : isNegative ? 'danger' : 'muted',
        valueText: pct === 0 ? '변화 없음' : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
        subText: `${m.before} → ${m.after}`,
      };
    });
}
</script>

<template>
  <section class="bnc-solutions__section">
    <div class="bnc-solutions__section-hd">
      <h3>KPI 영향 비교</h3>
      <span>현재 기준 대비 변화율 (%) · 개선 방향 = 음수</span>
    </div>
    <div class="bnc-solutions__chart-grid">
      <div
        v-for="plan in plans"
        :key="plan.planId"
        class="bnc-solutions__chart-plan"
        :class="{ 'bnc-solutions__chart-plan--recommended': plan.recommended }"
      >
        <div class="bnc-solutions__chart-plan-hd">
          <span class="bnc-solutions__chart-plan-name">{{ plan.actionLabel ?? plan.title }}</span>
          <BaseBadge v-if="plan.recommended" variant="success">AI 추천</BaseBadge>
          <span v-if="plan.confidence !== null" class="bnc-solutions__chart-plan-conf">
            신뢰도 {{ Math.round((plan.confidence ?? 0) * 100) }}%
          </span>
        </div>
        <BncStatBarChart :items="planKpiChartItems(plan)" :height="160" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.bnc-solutions__section {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}

.bnc-solutions__section-hd {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  min-width: 0;
}

.bnc-solutions__section-hd h3 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.bnc-solutions__section-hd span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-solutions__chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: var(--space-3);
  min-width: 0;
}

.bnc-solutions__chart-plan {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  min-width: 0;
}

.bnc-solutions__chart-plan--recommended {
  border-color: color-mix(in srgb, var(--color-status-success) 30%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-status-success) 4%, var(--color-bg-page));
}

.bnc-solutions__chart-plan-hd {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.bnc-solutions__chart-plan-name {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__chart-plan-conf {
  margin-left: auto;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}
</style>

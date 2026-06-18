<script setup lang="ts">
import type { BncActionPlan, BncBaselineSnapshotItem } from '@/types/bnc';

import BncStatBarChart from '@/components/bnc/BncStatBarChart.vue';
import type { StatBarItem } from '@/components/bnc/BncStatBarChart.vue';

defineProps<{
  plans: BncActionPlan[];
  currentOptionMetrics: BncBaselineSnapshotItem[];
}>();

function planDesc(plan: BncActionPlan): string[] {
  return [plan.expectedImpact, plan.riskText, ...(plan.tradeoffs ?? [])]
    .map((line) => (typeof line === 'string' ? line.trim() : null))
    .filter((line): line is string => Boolean(line));
}

function currentDesc(metrics: BncBaselineSnapshotItem[]): string[] {
  return metrics.map((metric) => `${metric.label}: ${metric.caption ?? metric.value}`).filter(Boolean);
}

function currentKpiChartItems(metrics: BncBaselineSnapshotItem[]): StatBarItem[] {
  return metrics
    .filter((m) => !m.label.includes('종합'))
    .map((m): StatBarItem => {
      const pct = m.pctDelta ?? 0;
      const tone = pct === 0 ? 'muted' : m.tone === 'negative' ? 'danger' : m.tone === 'positive' ? 'success' : 'muted';
      return {
        label: m.label,
        value: pct,
        tone,
        valueText: pct === 0 ? '변화 없음' : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`,
        subText: m.value,
      };
    });
}

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
      <h3>향후 KPI 영향 비교</h3>
      <span>현재 기준 대비 변화율 (%) · 초록=개선 · 빨강=악화</span>
    </div>
    <div class="bnc-solutions__chart-grid">
      <div class="bnc-solutions__chart-plan bnc-solutions__chart-plan--current">
        <div class="bnc-solutions__chart-plan-hd">
          <span class="bnc-solutions__chart-plan-name">현재 유지 (무대응)</span>
        </div>
        <BncStatBarChart :items="currentKpiChartItems(currentOptionMetrics)" :height="160" />
        <div v-if="currentDesc(currentOptionMetrics).length" class="bnc-solutions__chart-desc">
          <p v-for="line in currentDesc(currentOptionMetrics)" :key="line">{{ line }}</p>
        </div>
      </div>

      <div
        v-for="plan in plans"
        :key="plan.planId"
        class="bnc-solutions__chart-plan"
        :class="{ 'bnc-solutions__chart-plan--recommended': plan.recommended }"
      >
        <div class="bnc-solutions__chart-plan-hd">
          <span class="bnc-solutions__chart-plan-name">{{ plan.actionLabel ?? plan.title }}</span>
        </div>
        <BncStatBarChart :items="planKpiChartItems(plan)" :height="160" />
        <div v-if="planDesc(plan).length" class="bnc-solutions__chart-desc">
          <p v-for="line in planDesc(plan)" :key="line">{{ line }}</p>
        </div>
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

.bnc-solutions__chart-plan--current {
  border-color: color-mix(in srgb, var(--color-status-warning) 30%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-status-warning) 5%, var(--color-bg-page));
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

.bnc-solutions__chart-desc {
  display: grid;
  gap: var(--space-1);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border-subtle);
}

.bnc-solutions__chart-desc p {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.6;
}
</style>

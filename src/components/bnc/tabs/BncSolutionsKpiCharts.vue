<script setup lang="ts">
import type { BncActionPlan, BncBaselineSnapshotItem } from '@/types/bnc';

import BncStatBarChart from '@/components/bnc/BncStatBarChart.vue';
import type { StatBarItem } from '@/components/bnc/BncStatBarChart.vue';

defineProps<{
  plans: BncActionPlan[];
  currentOptionMetrics: BncBaselineSnapshotItem[];
}>();

const KPI_DESCRIPTIONS: Record<string, string[]> = {
  current: [
    '무대응 시 평균 대기 +53.1%, WIP +20.0%, Wait Ratio +100.0%로 대기와 재공이 모두 증가한다.',
    '특히 Wait Ratio가 두 배 수준으로 증가해, 현재 상태를 유지할 경우 병목이 빠르게 심화될 가능성이 높다.',
  ],
  conservative: [
    '평균 대기 +30.2%, WIP +10.0%, Wait Ratio +68.0%로 무대응보다는 악화 폭이 줄어든다.',
    '그러나 주요 KPI가 여전히 증가하고 있어, 병목 해소보다는 악화 속도 완화에 가까운 대응이다.',
  ],
  standard: [
    '평균 대기 -7.9%, WIP -20.0%, Wait Ratio -18.0%로 주요 병목 KPI가 모두 개선된다.',
    '가용 Tool 비율 변화가 없어 추가 설비 부담 없이 병목을 완화할 수 있다.',
  ],
  aggressive: [
    '평균 대기 -23.8%, WIP -40.0%, Wait Ratio -40.0%로 개선 폭은 가장 크다.',
    '하지만 가용 Tool 비율이 -10.0% 감소하고 평균 가동률도 -19.5% 낮아져 장비 과부하 리스크가 있다.',
  ],
};

function planDesc(plan: BncActionPlan): string[] {
  const key = (plan.actionLabel ?? plan.title ?? '').toLowerCase();
  return KPI_DESCRIPTIONS[key] ?? [];
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
        valueText: pct === 0 ? '변화 없음' : `+${pct.toFixed(1)}%`,
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
      <span>현재 기준 대비 변화율 (%) · 개선 방향 = 음수</span>
    </div>
    <div class="bnc-solutions__chart-grid">
      <div class="bnc-solutions__chart-plan bnc-solutions__chart-plan--current">
        <div class="bnc-solutions__chart-plan-hd">
          <span class="bnc-solutions__chart-plan-name">현재 유지 (무대응)</span>
        </div>
        <BncStatBarChart :items="currentKpiChartItems(currentOptionMetrics)" :height="160" />
        <div v-if="KPI_DESCRIPTIONS.current" class="bnc-solutions__chart-desc">
          <p v-for="line in KPI_DESCRIPTIONS.current" :key="line">{{ line }}</p>
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

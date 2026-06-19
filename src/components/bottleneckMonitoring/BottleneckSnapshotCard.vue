<script setup lang="ts">
import { computed } from 'vue';

import type { BncAlertMetrics } from '@/types/bnc';

import { formatNumber, formatRatioPercent, formatRiskScore } from '@/utils/format';

interface Props {
  title: string;
  subtitle: string;
  riskScore: number | null;
  alertMetrics: BncAlertMetrics | null;
  statusText: string | null;
  causeText: string | null;
}

const props = defineProps<Props>();

const metricCells = computed(() => {
  const metrics = props.alertMetrics;
  const score = props.riskScore ?? metrics?.compositeScore ?? null;

  return [
    { label: '위험 점수', value: formatRiskScore(score), tone: 'risk' },
    { label: '영향', value: metrics ? formatRatioPercent(metrics.impactScore) : '-', tone: 'risk' },
    { label: '후속 TG', value: metrics ? `${formatNumber(metrics.affectedCount)}개` : '-', tone: 'plain' },
    { label: 'CT 증가', value: metrics ? `${formatNumber(metrics.ctIncreaseMin)}분` : '-', tone: 'plain' },
    { label: '위험 Lot', value: metrics ? formatNumber(metrics.atRiskLots) : '-', tone: 'plain' },
  ];
});
</script>

<template>
  <section class="bottleneck-snapshot-card" aria-labelledby="snapshot-title">
    <header class="bottleneck-snapshot-card__header">
      <div class="bottleneck-snapshot-card__title-group">
        <h2 id="snapshot-title" class="bottleneck-snapshot-card__tg">{{ title }}</h2>
        <p class="bottleneck-snapshot-card__subtitle">{{ subtitle }}</p>
      </div>
    </header>

    <dl class="bottleneck-snapshot-card__meta">
      <div
        v-for="cell in metricCells"
        :key="cell.label"
        class="bottleneck-snapshot-card__kpi"
        :class="{ 'bottleneck-snapshot-card__kpi--risk': cell.tone === 'risk' }"
      >
        <dt>{{ cell.label }}</dt>
        <dd>{{ cell.value }}</dd>
      </div>
    </dl>

    <p class="bottleneck-snapshot-card__status-line"><span>대응 상태</span>{{ statusText ?? '분석 진행 중' }}</p>

    <p v-if="causeText" class="bottleneck-snapshot-card__cause" :title="causeText">
      <span>주요 원인</span>{{ causeText }}
    </p>
  </section>
</template>

<style scoped>
.bottleneck-snapshot-card {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  min-height: 112px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
}

.bottleneck-snapshot-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  min-width: 0;
}

.bottleneck-snapshot-card__title-group {
  min-width: 0;
}

.bottleneck-snapshot-card__tg {
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-snapshot-card__subtitle {
  overflow: hidden;
  margin-top: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-snapshot-card__meta {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  overflow: hidden;
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-border-subtle);
}

.bottleneck-snapshot-card__kpi {
  display: grid;
  align-content: center;
  min-width: 0;
  min-height: 58px;
  background: var(--color-bg-surface);
  padding: var(--space-2) var(--space-3);
}

.bottleneck-snapshot-card__kpi dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bottleneck-snapshot-card__kpi dd {
  overflow: hidden;
  margin: 2px 0 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.bottleneck-snapshot-card__kpi--risk dd {
  color: var(--color-status-danger);
}

.bottleneck-snapshot-card__status-line {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: start;
  margin: 0;
  max-width: 100%;
  border-radius: var(--radius-pill);
  background: var(--color-status-success-soft);
  padding: 4px 10px;
  color: var(--color-status-success);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
  white-space: nowrap;
}

.bottleneck-snapshot-card__status-line span {
  color: var(--color-fg-muted);
}

.bottleneck-snapshot-card__cause {
  display: grid;
  gap: 4px;
  margin: 0;
  border: var(--border-width-default) solid var(--color-action-primary-border);
  border-radius: var(--radius-md);
  background: var(--color-action-primary-soft);
  padding: var(--space-2);
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-normal);
}

.bottleneck-snapshot-card__cause span {
  display: block;
  margin-right: 0;
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

@media (max-width: 1120px) {
  .bottleneck-snapshot-card {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .bottleneck-snapshot-card__meta {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .bottleneck-snapshot-card__meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

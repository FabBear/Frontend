<script setup lang="ts">
import { computed } from 'vue';

import type { BncAlertCase, BncAlertMetrics, BncCaseDetail } from '@/types/bnc';

import { formatKoMonthDayTime, formatNumber, formatRatioPercent, formatRiskScore } from '@/utils/format';

const props = defineProps<{
  item: BncAlertCase;
  detail?: BncCaseDetail | null;
}>();

const metrics = computed<BncAlertMetrics | null>(() => props.item.alertMetrics ?? null);

// 위험 점수(composite) + 확산영향 지표. raw 확률은 노출하지 않는다.
const metricCells = computed(() => {
  const m = metrics.value;
  const score = props.item.riskScore ?? m?.compositeScore ?? null;
  return [
    { label: '위험 점수', value: formatRiskScore(score), tone: 'risk' },
    { label: '영향', value: m ? formatRatioPercent(m.impactScore) : '-', tone: 'risk' },
    { label: '후속 TG', value: m ? `${formatNumber(m.affectedCount)}개` : '-', tone: 'plain' },
    { label: 'CT 증가', value: m ? `${formatNumber(m.ctIncreaseMin)}분` : '-', tone: 'plain' },
    { label: '위험 Lot', value: m ? formatNumber(m.atRiskLots) : '-', tone: 'plain' },
  ];
});
</script>

<template>
  <section class="bnc-case-summary">
    <div class="bnc-case-summary__top">
      <div class="bnc-case-summary__id">
        <span class="bnc-case-summary__eyebrow"
          >{{ item.areaName }} · {{ formatKoMonthDayTime(item.detectedAt) }} 감지</span
        >
        <strong class="bnc-case-summary__title">{{ item.tgName }}</strong>
      </div>
    </div>

    <dl class="bnc-case-summary__metrics">
      <div v-for="cell in metricCells" :key="cell.label">
        <dt>{{ cell.label }}</dt>
        <dd :class="{ 'bnc-case-summary__metric--risk': cell.tone === 'risk' }">{{ cell.value }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.bnc-case-summary {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
}

.bnc-case-summary__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.bnc-case-summary__id {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.bnc-case-summary__eyebrow {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-case-summary__title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.bnc-case-summary__metrics {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1px;
  margin: 0;
  overflow: hidden;
  background: var(--color-border-subtle);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.bnc-case-summary__metrics div {
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-page);
}

.bnc-case-summary__metrics dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.bnc-case-summary__metrics dd {
  margin: 2px 0 0;
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.bnc-case-summary__metric--risk {
  color: var(--color-status-danger);
}

@media (max-width: 900px) {
  .bnc-case-summary__metrics {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .bnc-case-summary__metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

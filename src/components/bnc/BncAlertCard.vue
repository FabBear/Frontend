<script setup lang="ts">
import { computed } from 'vue';

import { RISK_LEVEL_META, riskGradeToLevel } from '@/constants/riskLevel';

import type { BncAlertCase } from '@/types/bnc';

import { formatKoMonthDayTime, formatNumber, formatRatioPercent, formatRiskScore } from '@/utils/format';

const props = defineProps<{
  item: BncAlertCase;
  selected?: boolean;
}>();

defineEmits<{
  select: [caseId: string];
}>();

const riskLevel = computed(() => riskGradeToLevel(props.item.riskGrade));
const riskMeta = computed(() => RISK_LEVEL_META[riskLevel.value]);

const progressRate = computed(() => {
  if (!props.item.totalSteps) return 0;
  return Math.round((props.item.stepProgress / props.item.totalSteps) * 100);
});

const alertMetrics = computed(() => props.item.alertMetrics ?? null);
const metrics = computed(() => [
  {
    label: '위험 점수',
    value: formatRiskScore(props.item.riskScore ?? alertMetrics.value?.compositeScore ?? null),
    tone: 'risk' as const,
  },
  { label: '영향', value: formatImpactMetric() },
  { label: '위험 Lot', value: formatNumber(alertMetrics.value?.atRiskLots ?? null) },
]);

function formatImpactMetric(): string {
  if (!alertMetrics.value) return '-';
  return alertMetrics.value.impactScore !== null
    ? formatRatioPercent(alertMetrics.value.impactScore)
    : `${formatNumber(alertMetrics.value.affectedCount)}개`;
}

const detectedTime = computed(() => `${formatKoMonthDayTime(props.item.detectedAt)} 감지`);

const cardStyle = computed(() => ({
  '--risk-color': riskMeta.value.color,
  '--risk-bg': riskMeta.value.background,
}));
</script>

<template>
  <button
    class="bnc-alert-card"
    :class="{ 'bnc-alert-card--selected': selected }"
    type="button"
    :style="cardStyle"
    :aria-pressed="selected"
    @click="$emit('select', item.caseId)"
  >
    <div class="bnc-alert-card__top">
      <span class="bnc-alert-card__area">{{ item.areaName }}</span>
      <span class="bnc-alert-card__risk-badge">{{ riskMeta.label }}</span>
    </div>

    <div class="bnc-alert-card__title-row">
      <strong class="bnc-alert-card__title">{{ item.tgName }}</strong>
      <time class="bnc-alert-card__time">{{ detectedTime }}</time>
    </div>

    <dl class="bnc-alert-card__metrics">
      <div
        v-for="metric in metrics"
        :key="metric.label"
        class="bnc-alert-card__metric"
        :class="`bnc-alert-card__metric--${metric.tone ?? 'default'}`"
      >
        <dt>{{ metric.label }}</dt>
        <dd>{{ metric.value }}</dd>
      </div>
    </dl>

    <div class="bnc-alert-card__progress-section">
      <div class="bnc-alert-card__progress-header">
        <span>에이전트 진행</span>
        <span>{{ item.stepProgress }}/{{ item.totalSteps }}</span>
      </div>
      <div class="bnc-alert-card__progress-bar">
        <span :style="{ width: `${Math.max(0, Math.min(progressRate, 100))}%` }" />
      </div>
    </div>
  </button>
</template>

<style scoped>
.bnc-alert-card {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: 6px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--risk-bg) 0%, transparent 38%), var(--color-bg-card);
  padding: 10px var(--space-3);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.06),
    0 12px 26px rgba(15, 23, 42, 0.04);
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.bnc-alert-card:hover {
  border-color: var(--color-border-strong);
}

.bnc-alert-card--selected {
  border-color: var(--color-border-strong);
}

.bnc-alert-card:focus-visible {
  outline: 2px solid var(--color-action-primary-border);
  outline-offset: 2px;
}

.bnc-alert-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.bnc-alert-card__area {
  overflow: hidden;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bnc-alert-card__risk-badge {
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--risk-color) 40%, transparent);
  border-radius: var(--radius-pill);
  background: var(--risk-bg);
  padding: 2px 8px;
  color: var(--risk-color);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.bnc-alert-card__title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.bnc-alert-card__title {
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bnc-alert-card__time {
  flex-shrink: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.bnc-alert-card__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin: 0;
  padding: 6px 0;
  border-top: var(--border-width-default) solid var(--color-border-subtle);
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
}

.bnc-alert-card__metric {
  display: grid;
  gap: 2px;
  padding-right: var(--space-3);
}

.bnc-alert-card__metric:not(:first-child) {
  padding-left: var(--space-3);
  border-left: var(--border-width-default) solid var(--color-border-subtle);
}

.bnc-alert-card__metric dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-alert-card__metric dd {
  margin: 0;
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bnc-alert-card__metric--risk dd {
  color: var(--risk-color);
}

.bnc-alert-card__progress-section {
  display: grid;
  gap: var(--space-1);
}

.bnc-alert-card__progress-header {
  display: flex;
  justify-content: space-between;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-alert-card__progress-bar {
  height: 4px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--color-border-subtle);
}

.bnc-alert-card__progress-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--risk-color);
  transition: width 0.4s ease;
}
</style>

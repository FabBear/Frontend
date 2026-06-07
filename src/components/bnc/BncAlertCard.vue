<script setup lang="ts">
import { computed } from 'vue';

import { BNC_STATUS_META, BNC_STEP_LABELS } from '@/constants/bnc';
import { RISK_LEVEL_META, riskGradeToLevel } from '@/constants/riskLevel';

import type { BncAlertCase } from '@/types/bnc';

import BaseBadge from '@/components/base/BaseBadge.vue';

import { formatKoMonthDayTime, formatNumber, formatRatioPercent } from '@/utils/format';

const props = defineProps<{
  item: BncAlertCase;
  selected?: boolean;
}>();

defineEmits<{
  select: [caseId: string];
}>();

const riskLevel = computed(() => riskGradeToLevel(props.item.riskGrade));
const riskMeta = computed(() => RISK_LEVEL_META[riskLevel.value]);
const progressRate = computed(() => Math.round((props.item.stepProgress / props.item.totalSteps) * 100));
const statusMeta = computed(() => BNC_STATUS_META[props.item.status]);
const currentStepLabel = computed(() =>
  props.item.currentStepName ? (BNC_STEP_LABELS[props.item.currentStepName] ?? props.item.currentStepName) : '-'
);
</script>

<template>
  <button
    class="bnc-alert-card"
    :class="{ 'bnc-alert-card--selected': selected }"
    :style="{ '--bnc-alert-accent': riskMeta.color }"
    type="button"
    :aria-pressed="selected"
    @click="$emit('select', item.caseId)"
  >
    <span class="bnc-alert-card__top">
      <span>
        <strong class="bnc-alert-card__title">{{ item.tgName }}</strong>
        <span class="bnc-alert-card__meta">{{ item.areaName }} · {{ formatKoMonthDayTime(item.detectedAt) }}</span>
      </span>
      <BaseBadge :variant="riskLevel">{{ riskMeta.label }}</BaseBadge>
    </span>

    <span class="bnc-alert-card__metrics">
      <span>
        <b>{{ formatRatioPercent(item.bottleneckProb) }}</b>
        <small>병목 확률</small>
      </span>
      <span>
        <b>{{ formatRatioPercent(item.utilizationRate) }}</b>
        <small>가동률</small>
      </span>
      <span>
        <b>{{ formatNumber(item.wipCount) }}</b>
        <small>WIP</small>
      </span>
    </span>

    <span class="bnc-alert-card__bottom">
      <BaseBadge :variant="statusMeta.variant">{{ statusMeta.label }}</BaseBadge>
      <span class="bnc-alert-card__progress"
        >{{ currentStepLabel }} · {{ item.stepProgress }}/{{ item.totalSteps }}</span
      >
    </span>

    <span class="bnc-alert-card__bar" aria-hidden="true">
      <span :style="{ width: `${progressRate}%` }" />
    </span>
  </button>
</template>

<style scoped>
.bnc-alert-card {
  display: grid;
  width: 100%;
  gap: var(--space-3);
  padding: var(--space-4);
  color: var(--color-fg);
  text-align: left;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-default);
  border-left: 4px solid var(--bnc-alert-accent);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
}

.bnc-alert-card:hover,
.bnc-alert-card--selected {
  border-color: var(--color-state-selected-border);
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.bnc-alert-card--selected {
  background: color-mix(in srgb, var(--color-action-primary-soft) 42%, var(--color-bg-card));
}

.bnc-alert-card__top,
.bnc-alert-card__bottom,
.bnc-alert-card__metrics {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.bnc-alert-card__title {
  display: block;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}

.bnc-alert-card__meta,
.bnc-alert-card__progress,
.bnc-alert-card__metrics small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.bnc-alert-card__metrics span {
  display: grid;
  gap: var(--space-1);
}

.bnc-alert-card__metrics b {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

.bnc-alert-card__bar {
  display: block;
  height: 4px;
  overflow: hidden;
  background: var(--color-border-subtle);
  border-radius: var(--radius-pill);
}

.bnc-alert-card__bar span {
  display: block;
  height: 100%;
  background: var(--bnc-alert-accent);
  border-radius: inherit;
}
</style>

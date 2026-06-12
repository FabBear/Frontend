<script setup lang="ts">
import { computed } from 'vue';

import { BNC_STATUS_META, BNC_STEP_LABELS } from '@/constants/bnc';
import { RISK_LEVEL_META, riskGradeToLevel } from '@/constants/riskLevel';

import type { BncAlertCase } from '@/types/bnc';

import BaseBadge from '@/components/base/BaseBadge.vue';

import { formatKoMonthDayTime, formatRatioPercent } from '@/utils/format';

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
const statusMeta = computed(() => BNC_STATUS_META[props.item.status]);
const currentStepLabel = computed(() =>
  props.item.currentStepName ? (BNC_STEP_LABELS[props.item.currentStepName] ?? props.item.currentStepName) : null
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
    <div class="bnc-alert-card__top">
      <div class="bnc-alert-card__id">
        <strong class="bnc-alert-card__title">{{ item.tgName }}</strong>
        <span class="bnc-alert-card__meta">{{ item.areaName }} · {{ formatKoMonthDayTime(item.detectedAt) }}</span>
      </div>
      <BaseBadge :variant="riskLevel">{{ riskMeta.label }}</BaseBadge>
    </div>

    <div class="bnc-alert-card__metrics">
      <span>
        <b>{{ formatRatioPercent(item.bottleneckProb) }}</b>
        <small>병목 확률</small>
      </span>
      <span>
        <b>{{ formatRatioPercent(item.utilizationRate) }}</b>
        <small>가동률</small>
      </span>
      <span>
        <b>{{ item.wipCount.toLocaleString() }}</b>
        <small>WIP</small>
      </span>
    </div>

    <div class="bnc-alert-card__footer">
      <BaseBadge :variant="statusMeta.variant">{{ statusMeta.label }}</BaseBadge>
      <span v-if="currentStepLabel" class="bnc-alert-card__step">
        {{ currentStepLabel }} · {{ item.stepProgress }}/{{ item.totalSteps }}
      </span>
      <span v-else class="bnc-alert-card__step">{{ item.stepProgress }}/{{ item.totalSteps }} 완료</span>
    </div>

    <div class="bnc-alert-card__bar" aria-hidden="true">
      <span :style="{ width: `${progressRate}%` }" />
    </div>
  </button>
</template>

<style scoped>
.bnc-alert-card {
  display: grid;
  width: 100%;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-3) var(--space-2);
  color: var(--color-fg);
  text-align: left;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-default);
  border-left: 3px solid var(--bnc-alert-accent);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.bnc-alert-card:hover {
  box-shadow: var(--shadow-sm);
}

.bnc-alert-card--selected {
  border-color: var(--color-state-selected-border);
  background: color-mix(in srgb, var(--color-action-primary-soft) 36%, var(--color-bg-card));
}

.bnc-alert-card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}

.bnc-alert-card__id {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.bnc-alert-card__title {
  display: block;
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bnc-alert-card__meta {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-alert-card__metrics {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--color-border-subtle);
  border-bottom: 1px solid var(--color-border-subtle);
}

.bnc-alert-card__metrics span {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
}

.bnc-alert-card__metrics b {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.bnc-alert-card__metrics small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-alert-card__footer {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.bnc-alert-card__step {
  overflow: hidden;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bnc-alert-card__bar {
  display: block;
  height: 3px;
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

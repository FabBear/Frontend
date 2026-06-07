<script setup lang="ts">
import { computed } from 'vue';

import { BNC_STATUS_META, BNC_STEP_LABELS } from '@/constants/bnc';
import { RISK_LEVEL_META, riskGradeToLevel } from '@/constants/riskLevel';

import type { BncAlertCase } from '@/types/bnc';

import BaseBadge from '@/components/base/BaseBadge.vue';

import { formatKoMonthDayTime, formatNumber, formatRatioPercent } from '@/utils/format';

const props = defineProps<{
  item: BncAlertCase;
}>();

const riskLevel = computed(() => riskGradeToLevel(props.item.riskGrade));
const riskMeta = computed(() => RISK_LEVEL_META[riskLevel.value]);
const statusMeta = computed(() => BNC_STATUS_META[props.item.status]);
const currentStepLabel = computed(() =>
  props.item.currentStepName ? (BNC_STEP_LABELS[props.item.currentStepName] ?? props.item.currentStepName) : '-'
);
</script>

<template>
  <section class="bnc-case-summary">
    <div class="bnc-case-summary__heading">
      <div>
        <span class="bnc-case-summary__eyebrow">{{ item.areaName }}</span>
        <h2 class="bnc-case-summary__title">{{ item.tgName }}</h2>
        <p class="bnc-case-summary__meta">{{ formatKoMonthDayTime(item.detectedAt) }} 감지</p>
      </div>
      <div class="bnc-case-summary__badges">
        <BaseBadge :variant="riskLevel">{{ riskMeta.label }}</BaseBadge>
        <BaseBadge :variant="statusMeta.variant">{{ statusMeta.label }}</BaseBadge>
      </div>
    </div>

    <dl class="bnc-case-summary__metrics">
      <div>
        <dt>병목 확률</dt>
        <dd>{{ formatRatioPercent(item.bottleneckProb) }}</dd>
      </div>
      <div>
        <dt>가동률</dt>
        <dd>{{ formatRatioPercent(item.utilizationRate) }}</dd>
      </div>
      <div>
        <dt>WIP</dt>
        <dd>{{ formatNumber(item.wipCount) }} Lot</dd>
      </div>
      <div>
        <dt>현재 단계</dt>
        <dd>{{ currentStepLabel }}</dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.bnc-case-summary {
  padding: var(--space-5);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
}

.bnc-case-summary__heading {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
}

.bnc-case-summary__badges {
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  justify-content: flex-end;
  gap: var(--space-2);
}

.bnc-case-summary__eyebrow {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.bnc-case-summary__title {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-xl);
}

.bnc-case-summary__meta {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

.bnc-case-summary__metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
  margin: var(--space-4) 0 0;
}

.bnc-case-summary__metrics div {
  min-width: 0;
  padding: var(--space-3);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.bnc-case-summary__metrics dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.bnc-case-summary__metrics dd {
  margin: var(--space-1) 0 0;
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .bnc-case-summary__metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

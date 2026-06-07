<script setup lang="ts">
import type { BncActionPlan } from '@/types/bnc';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';

import { formatRatioPercent } from '@/utils/format';

defineProps<{
  plan: BncActionPlan;
  selected?: boolean;
}>();

defineEmits<{
  select: [planId: string];
}>();
</script>

<template>
  <article class="solution-compare-card" :class="{ 'solution-compare-card--selected': selected }">
    <header class="solution-compare-card__header">
      <div>
        <span class="solution-compare-card__eyebrow">신뢰도 {{ formatRatioPercent(plan.confidence) }}</span>
        <h4>{{ plan.title }}</h4>
      </div>
      <BaseBadge v-if="plan.recommended" variant="success">추천</BaseBadge>
    </header>

    <p class="solution-compare-card__summary">{{ plan.summary }}</p>

    <dl class="solution-compare-card__info">
      <div>
        <dt>예상 효과</dt>
        <dd>{{ plan.expectedImpact }}</dd>
      </div>
      <div>
        <dt>리스크</dt>
        <dd>{{ plan.riskText }}</dd>
      </div>
    </dl>

    <div class="solution-compare-card__metrics">
      <span v-for="metric in plan.metrics" :key="metric.label">
        <b>{{ metric.label }}</b>
        {{ metric.before }} → {{ metric.after }}
        <em>{{ metric.delta }}</em>
      </span>
    </div>

    <BaseButton variant="ghost" size="sm" @click="$emit('select', plan.planId)">선택</BaseButton>
  </article>
</template>

<style scoped>
.solution-compare-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
}

.solution-compare-card--selected {
  background: var(--color-state-selected-bg);
  border-color: var(--color-state-selected-border);
}

.solution-compare-card__header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.solution-compare-card h4,
.solution-compare-card__summary,
.solution-compare-card__info {
  margin: 0;
}

.solution-compare-card h4 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}

.solution-compare-card__eyebrow,
.solution-compare-card__summary,
.solution-compare-card__info dt,
.solution-compare-card__metrics {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

.solution-compare-card__info {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.solution-compare-card__info dd {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-semibold);
}

.solution-compare-card__metrics {
  display: grid;
  gap: var(--space-2);
}

.solution-compare-card__metrics span {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2);
  background: var(--color-bg-page);
  border-radius: var(--radius-md);
}

.solution-compare-card__metrics b {
  color: var(--color-fg-strong);
}

.solution-compare-card__metrics em {
  color: var(--color-status-success);
  font-style: normal;
  font-weight: var(--font-weight-semibold);
}
</style>

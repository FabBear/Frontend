<script setup lang="ts">
import { computed } from 'vue';

import type { BncAgentStep } from '@/types/bnc';

import BaseBadge from '@/components/base/BaseBadge.vue';

import { formatKoMonthDayTime } from '@/utils/format';

const props = defineProps<{
  step: BncAgentStep;
}>();

const statusMeta = computed(() => {
  if (props.step.status === 'DONE') return { label: '완료', variant: 'success' as const };
  if (props.step.status === 'RUNNING') return { label: '실행 중', variant: 'info' as const };
  if (props.step.status === 'FAILED') return { label: '실패', variant: 'warning' as const };
  return { label: '대기', variant: 'info' as const };
});

const timeText = computed(() => {
  if (props.step.completedAt) return formatKoMonthDayTime(props.step.completedAt);
  if (props.step.startedAt) return formatKoMonthDayTime(props.step.startedAt);
  return '-';
});
</script>

<template>
  <article class="agent-progress-step">
    <span class="agent-progress-step__order">{{ step.stepOrder }}</span>
    <div class="agent-progress-step__body">
      <div class="agent-progress-step__header">
        <h4>{{ step.stepName }}</h4>
        <BaseBadge :variant="statusMeta.variant">{{ statusMeta.label }}</BaseBadge>
      </div>
      <p>{{ step.outputSummary ?? '아직 산출물이 없습니다.' }}</p>
      <span class="agent-progress-step__meta">시각 {{ timeText }} · 시도 {{ step.attemptNo }}회</span>
    </div>
  </article>
</template>

<style scoped>
.agent-progress-step {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
}

.agent-progress-step__order {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  color: var(--color-text-inverse);
  background: var(--color-action-primary);
  border-radius: var(--radius-pill);
  font-weight: var(--font-weight-bold);
}

.agent-progress-step__body {
  display: grid;
  min-width: 0;
  gap: var(--space-2);
}

.agent-progress-step__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.agent-progress-step h4,
.agent-progress-step p {
  margin: 0;
}

.agent-progress-step h4 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}

.agent-progress-step p,
.agent-progress-step__meta {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}
</style>

<script setup lang="ts">
import { computed } from 'vue';

import { BNC_STEP_LABELS } from '@/constants/bnc';

import type { BncAgentStep } from '@/types/bnc';

import { formatKoMonthDayTime } from '@/utils/format';

const props = defineProps<{
  step: BncAgentStep;
}>();

const statusMeta = computed(() => {
  if (props.step.status === 'DONE') return { label: '완료', mod: 'done' };
  if (props.step.status === 'RUNNING' || props.step.status === 'IN_PROGRESS') {
    return { label: '실행 중', mod: 'running' };
  }
  if (props.step.status === 'FAILED') return { label: '실패', mod: 'failed' };
  return { label: '대기', mod: 'waiting' };
});

const timeText = computed(() => {
  if (props.step.completedAt) return formatKoMonthDayTime(props.step.completedAt);
  if (props.step.startedAt) return formatKoMonthDayTime(props.step.startedAt);
  return null;
});

const stepLabel = computed(() => BNC_STEP_LABELS[props.step.stepName] ?? props.step.stepName);
</script>

<template>
  <button class="agent-step" :class="`agent-step--${statusMeta.mod}`" type="button">
    <div class="agent-step__track">
      <span class="agent-step__dot" />
      <span class="agent-step__line" />
    </div>
    <div class="agent-step__body">
      <div class="agent-step__header">
        <span class="agent-step__name">{{ stepLabel }}</span>
        <span class="agent-step__status">{{ statusMeta.label }}</span>
        <span v-if="timeText" class="agent-step__time">{{ timeText }}</span>
      </div>
      <p v-if="step.outputSummary" class="agent-step__output">{{ step.outputSummary }}</p>
    </div>
  </button>
</template>

<style scoped>
.agent-step {
  display: flex;
  gap: var(--space-3);
  align-items: stretch;
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: 0;
  text-align: left;
}

.agent-step:hover .agent-step__body {
  color: var(--color-action-primary);
}

.agent-step__track {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 14px;
}

.agent-step__dot {
  display: block;
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 50%;
  background: var(--color-border-default);
}

.agent-step--done .agent-step__dot {
  background: var(--color-status-success);
}

.agent-step--running .agent-step__dot {
  background: var(--color-action-primary);
  animation: dot-pulse 1.4s ease-in-out infinite;
}

.agent-step--failed .agent-step__dot {
  background: var(--color-status-danger);
}

.agent-step__line {
  flex: 1;
  width: 2px;
  min-height: 12px;
  margin-top: 4px;
  background: var(--color-border-subtle);
  border-radius: 1px;
}

.agent-step--done .agent-step__line {
  background: color-mix(in srgb, var(--color-status-success) 30%, var(--color-border-subtle));
}

.agent-step:last-child .agent-step__line {
  display: none;
}

.agent-step__body {
  flex: 1;
  min-width: 0;
  padding-bottom: var(--space-4);
}

.agent-step:last-child .agent-step__body {
  padding-bottom: 0;
}

.agent-step__header {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.agent-step__name {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.agent-step--waiting .agent-step__name {
  color: var(--color-fg-muted);
  font-weight: 400;
}

.agent-step__status {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-fg-muted);
}

.agent-step--done .agent-step__status {
  color: var(--color-status-success);
}
.agent-step--running .agent-step__status {
  color: var(--color-action-primary);
}
.agent-step--failed .agent-step__status {
  color: var(--color-status-danger);
}

.agent-step__time {
  margin-left: auto;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.agent-step__output {
  margin: var(--space-1) 0 0;
  color: var(--color-fg);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

@keyframes dot-pulse {
  0%,
  100% {
    opacity: 0.45;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.5);
  }
}
</style>

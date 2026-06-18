<script setup lang="ts">
import { computed } from 'vue';

import type { BncCaseDetail } from '@/types/bnc';

import AgentProgressStep from '@/components/bnc/AgentProgressStep.vue';

const props = defineProps<{
  detail: BncCaseDetail | null;
  loading?: boolean;
  errorMessage?: string | null;
}>();

defineEmits<{
  explainStep: [step: BncCaseDetail['agentProgress'][number]];
}>();

const orderedSteps = computed(() => [...(props.detail?.agentProgress ?? [])].sort((a, b) => a.stepOrder - b.stepOrder));
const completedStepOrder = computed(() =>
  Math.max(0, ...orderedSteps.value.filter((step) => step.status === 'DONE').map((step) => step.stepOrder))
);
const progressRate = computed(() => {
  if (orderedSteps.value.length === 0) return 0;
  return Math.round((completedStepOrder.value / orderedSteps.value.length) * 100);
});
const currentStep = computed(
  () =>
    orderedSteps.value.find((s) => s.status === 'FAILED') ??
    orderedSteps.value.find((s) => s.status === 'RUNNING' || s.status === 'IN_PROGRESS') ??
    orderedSteps.value.find((s) => s.status === 'WAITING' || s.status === 'PENDING') ??
    null
);
const isAllDone = computed(
  () => orderedSteps.value.length > 0 && orderedSteps.value.every((step) => step.status === 'DONE')
);
</script>

<template>
  <section class="bnc-progress-tab">
    <p v-if="loading" class="bnc-progress-tab__state">Agent 진행 상세를 불러오는 중입니다.</p>
    <p v-else-if="errorMessage" class="bnc-progress-tab__state bnc-progress-tab__state--error">
      {{ errorMessage }}
    </p>
    <p v-else-if="!detail" class="bnc-progress-tab__state">선택된 병목 케이스가 없습니다.</p>
    <p v-else-if="orderedSteps.length === 0" class="bnc-progress-tab__state">
      이 케이스에는 진행 중인 Agent 단계가 없습니다.
    </p>

    <template v-else>
      <!-- 상태 헤더 -->
      <header class="bnc-progress-tab__header">
        <div class="bnc-progress-tab__status">
          <span class="bnc-progress-tab__status-badge" :class="{ 'bnc-progress-tab__status-badge--done': isAllDone }">
            {{
              isAllDone
                ? '완료'
                : currentStep?.status === 'FAILED'
                  ? '실패'
                  : currentStep?.status === 'RUNNING' || currentStep?.status === 'IN_PROGRESS'
                    ? '실행 중'
                    : '대기'
            }}
          </span>
        </div>
        <span class="bnc-progress-tab__rate">{{ progressRate }}%</span>
      </header>

      <!-- 프로그레스 바 -->
      <div class="bnc-progress-tab__bar" aria-hidden="true">
        <span :style="{ width: `${progressRate}%` }" />
      </div>

      <!-- 타임라인 -->
      <div class="bnc-progress-tab__steps">
        <AgentProgressStep
          v-for="step in orderedSteps"
          :key="step.stepOrder"
          :step="step"
          @click="$emit('explainStep', step)"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.bnc-progress-tab {
  display: grid;
  align-content: start;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--color-bg-surface);
}

.bnc-progress-tab__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.bnc-progress-tab__status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.bnc-progress-tab__status-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-action-primary);
  background: var(--color-action-primary-soft);
  border-radius: var(--radius-pill);
  white-space: nowrap;
}

.bnc-progress-tab__status-badge--done {
  color: var(--color-status-success);
  background: var(--color-status-success-soft);
}

.bnc-progress-tab__rate {
  color: var(--color-action-primary);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.bnc-progress-tab__bar {
  height: 4px;
  overflow: hidden;
  background: var(--color-border-subtle);
  border-radius: var(--radius-pill);
}

.bnc-progress-tab__bar span {
  display: block;
  height: 100%;
  background: var(--color-action-primary);
  border-radius: inherit;
  transition: width var(--transition-normal);
}

.bnc-progress-tab__state {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

.bnc-progress-tab__state--error {
  color: var(--color-status-danger);
}

.bnc-progress-tab__steps {
  display: flex;
  flex-direction: column;
}
</style>

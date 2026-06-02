<script setup lang="ts">
import type { BottleneckAlertItem } from '@/types/dashboard';

import BaseButton from '@/components/base/BaseButton.vue';
import BottleneckAlertCard from '@/components/dashboard/BottleneckAlertCard.vue';

interface Props {
  alerts: BottleneckAlertItem[];
  isMock?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  openCenter: [];
  showSolutions: [caseId: string];
  analyzeCause: [caseId: string];
}>();

function handleShowSolutions(caseId: string) {
  emit('showSolutions', caseId);
}

function handleAnalyzeCause(caseId: string) {
  emit('analyzeCause', caseId);
}
</script>

<template>
  <section class="bottleneck-alert-list" aria-labelledby="bottleneck-alert-list-title">
    <header class="bottleneck-alert-list__header">
      <h2 id="bottleneck-alert-list-title">
        병목 위험 알림
        <span v-if="isMock" class="bottleneck-alert-list__mock-badge">샘플</span>
      </h2>
      <BaseButton size="sm" @click="emit('openCenter')">병목 대응 센터 →</BaseButton>
    </header>

    <div class="bottleneck-alert-list__items">
      <p v-if="alerts.length === 0" class="bottleneck-alert-list__empty">표시할 병목 위험 알림이 없습니다.</p>
      <BottleneckAlertCard
        v-for="alert in alerts"
        :key="alert.caseId"
        :alert="alert"
        @show-solutions="handleShowSolutions"
        @analyze-cause="handleAnalyzeCause"
      />
    </div>
  </section>
</template>

<style scoped>
.bottleneck-alert-list {
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100%;
  min-width: 0;
  gap: var(--space-2);
}

.bottleneck-alert-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bottleneck-alert-list__header h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}

.bottleneck-alert-list__items {
  display: grid;
  align-content: start;
  gap: var(--space-2);
}

.bottleneck-alert-list__mock-badge {
  display: inline-block;
  margin-left: var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--color-bg-surface);
  border: var(--border-width-default) solid var(--color-border-default);
  padding: 1px var(--space-2);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  vertical-align: middle;
}

.bottleneck-alert-list__empty {
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  padding: var(--space-3);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
}
</style>

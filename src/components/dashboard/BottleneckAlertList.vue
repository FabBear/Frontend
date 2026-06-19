<script setup lang="ts">
import type { BottleneckAlertItem } from '@/types/dashboard';

import BaseButton from '@/components/base/BaseButton.vue';
import BottleneckAlertCard from '@/components/dashboard/BottleneckAlertCard.vue';

interface Props {
  alerts: BottleneckAlertItem[];
}

defineProps<Props>();

const emit = defineEmits<{
  openCenter: [caseId: string];
  openMonitoring: [caseId: string];
  openMonitoringList: [];
}>();

function handleOpenCenter(caseId: string) {
  emit('openCenter', caseId);
}

function handleOpenMonitoring(caseId: string) {
  emit('openMonitoring', caseId);
}
</script>

<template>
  <section class="bottleneck-alert-list" aria-labelledby="bottleneck-alert-list-title">
    <div class="bottleneck-alert-list__card">
      <div class="bottleneck-alert-list__header">
        <h2 id="bottleneck-alert-list-title" class="bottleneck-alert-list__title">병목 위험 알림</h2>
        <BaseButton variant="primary" size="sm" @click="emit('openMonitoringList')">더보기</BaseButton>
      </div>

      <div class="bottleneck-alert-list__items">
        <p v-if="alerts.length === 0" class="bottleneck-alert-list__empty">표시할 병목 위험 알림이 없습니다.</p>
        <BottleneckAlertCard
          v-for="alert in alerts"
          :key="alert.caseId"
          :alert="alert"
          @open-center="handleOpenCenter"
          @open-monitoring="handleOpenMonitoring"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
/* 제목 + 카드를 세로로 배치 */
.bottleneck-alert-list {
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.bottleneck-alert-list__card {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--space-2);
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
}

.bottleneck-alert-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.bottleneck-alert-list__title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  white-space: nowrap;
}

.bottleneck-alert-list__items {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
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

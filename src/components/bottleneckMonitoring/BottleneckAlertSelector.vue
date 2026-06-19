<script setup lang="ts">
import type { BottleneckAlertItem } from '@/types/dashboard';

import BaseButton from '@/components/base/BaseButton.vue';
import BottleneckAlertCard from '@/components/dashboard/BottleneckAlertCard.vue';

interface Props {
  alerts: BottleneckAlertItem[];
  selectedCaseId: string | null;
  loading: boolean;
  errorMessage: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  selectAlert: [caseId: string];
  retry: [];
}>();
</script>

<template>
  <aside class="bottleneck-alert-selector" aria-labelledby="alert-selector-title">
    <div class="bottleneck-alert-selector__header">
      <div>
        <h2 id="alert-selector-title" class="bottleneck-alert-selector__title">병목 케이스</h2>
        <p class="bottleneck-alert-selector__summary">{{ alerts.length }}건</p>
      </div>
      <BaseButton variant="ghost" size="sm" :loading="loading" @click="emit('retry')">새로고침</BaseButton>
    </div>

    <div class="bottleneck-alert-selector__body">
      <p v-if="loading && alerts.length === 0" class="bottleneck-alert-selector__state">
        병목 알림을 불러오는 중입니다.
      </p>
      <p v-else-if="errorMessage" class="bottleneck-alert-selector__state bottleneck-alert-selector__state--error">
        {{ errorMessage }}
      </p>
      <p v-else-if="alerts.length === 0" class="bottleneck-alert-selector__state">선택할 병목 알림이 없습니다.</p>

      <div v-else class="bottleneck-alert-selector__list" role="list">
        <div v-for="alert in alerts" :key="alert.caseId" role="listitem">
          <BottleneckAlertCard
            :alert="alert"
            :selected="alert.caseId === selectedCaseId"
            selectable
            :show-center-button="false"
            @open-monitoring="emit('selectAlert', alert.caseId)"
          />
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.bottleneck-alert-selector {
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

.bottleneck-alert-selector__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.bottleneck-alert-selector__title {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  white-space: nowrap;
}

.bottleneck-alert-selector__summary {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.bottleneck-alert-selector__body {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  min-height: 0;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.bottleneck-alert-selector__state {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.bottleneck-alert-selector__state--error {
  color: var(--color-status-danger);
}

.bottleneck-alert-selector__list {
  display: grid;
  gap: var(--space-2);
}
</style>

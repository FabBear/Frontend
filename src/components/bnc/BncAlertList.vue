<script setup lang="ts">
import type { BncAlertCase } from '@/types/bnc';

import BaseButton from '@/components/base/BaseButton.vue';
import BncAlertCard from '@/components/bnc/BncAlertCard.vue';

defineProps<{
  cases: BncAlertCase[];
  selectedCaseId: string | null;
  loading?: boolean;
  errorMessage?: string | null;
  highPriorityCount: number;
}>();

defineEmits<{
  select: [caseId: string];
  retry: [];
}>();
</script>

<template>
  <aside class="bnc-alert-list">
    <header class="bnc-alert-list__header">
      <div>
        <h2 class="bnc-alert-list__title">병목 케이스</h2>
        <p class="bnc-alert-list__summary">미해결 우선 대응 {{ highPriorityCount }}건</p>
      </div>
      <BaseButton variant="ghost" size="sm" :loading="loading" @click="$emit('retry')">새로고침</BaseButton>
    </header>

    <p v-if="loading && cases.length === 0" class="bnc-alert-list__state">케이스를 불러오는 중입니다.</p>
    <p v-else-if="errorMessage" class="bnc-alert-list__state bnc-alert-list__state--error">
      {{ errorMessage }}
    </p>
    <p v-else-if="cases.length === 0" class="bnc-alert-list__state">대응이 필요한 병목 케이스가 없습니다.</p>

    <div v-else class="bnc-alert-list__items">
      <BncAlertCard
        v-for="item in cases"
        :key="item.caseId"
        :item="item"
        :selected="item.caseId === selectedCaseId"
        @select="$emit('select', $event)"
      />
    </div>
  </aside>
</template>

<style scoped>
.bnc-alert-list {
  display: grid;
  min-height: 0;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
}

.bnc-alert-list__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.bnc-alert-list__title {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

.bnc-alert-list__summary,
.bnc-alert-list__state {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

.bnc-alert-list__state--error {
  color: var(--color-status-danger);
}

.bnc-alert-list__items {
  display: grid;
  min-height: 0;
  max-height: calc(100vh - 220px);
  gap: var(--space-3);
  overflow: auto;
  padding-right: var(--space-1);
}
</style>

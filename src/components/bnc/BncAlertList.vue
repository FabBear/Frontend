<script setup lang="ts">
import type { BncAlertCase, BncPageInfo } from '@/types/bnc';

import BaseButton from '@/components/base/BaseButton.vue';
import BncAlertCard from '@/components/bnc/BncAlertCard.vue';

type PageButton = number | 'ellipsis-start' | 'ellipsis-end';

defineProps<{
  cases: BncAlertCase[];
  selectedCaseId: string | null;
  loading?: boolean;
  errorMessage?: string | null;
  highPriorityCount: number;
  pageInfo: BncPageInfo;
  totalPages: number;
  pageButtons: PageButton[];
}>();

defineEmits<{
  select: [caseId: string];
  retry: [];
  pageChange: [page: number];
}>();
</script>

<template>
  <aside class="bnc-alert-list">
    <div class="bnc-alert-list__header">
      <div>
        <h2 class="bnc-alert-list__title">병목 케이스</h2>
        <p class="bnc-alert-list__summary">
          {{ pageInfo.totalElements }}건 · 미해결 우선 대응 {{ highPriorityCount }}건
        </p>
      </div>
      <BaseButton variant="ghost" size="sm" :loading="loading" @click="$emit('retry')">새로고침</BaseButton>
    </div>

    <div class="bnc-alert-list__body">
      <p v-if="loading && cases.length === 0" class="bnc-alert-list__state">케이스를 불러오는 중입니다.</p>
      <p v-else-if="errorMessage" class="bnc-alert-list__state bnc-alert-list__state--error">
        {{ errorMessage }}
      </p>
      <p v-else-if="cases.length === 0" class="bnc-alert-list__state">대응이 필요한 병목 케이스가 없습니다.</p>

      <template v-else>
        <div class="bnc-alert-list__items" role="list">
          <BncAlertCard
            v-for="item in cases"
            :key="item.caseId"
            :item="item"
            :selected="item.caseId === selectedCaseId"
            role="listitem"
            @select="$emit('select', $event)"
          />
        </div>

        <div v-if="totalPages > 1" class="bnc-alert-list__pagination">
          <button
            class="bnc-alert-list__pagination-arrow"
            type="button"
            aria-label="이전 페이지"
            :disabled="pageInfo.page <= 0 || loading"
            @click="$emit('pageChange', pageInfo.page - 1)"
          >
            이전
          </button>
          <div class="bnc-alert-list__pagination-pages" aria-label="병목 케이스 페이지">
            <template v-for="page in pageButtons" :key="page">
              <span v-if="typeof page === 'string'" class="bnc-alert-list__pagination-ellipsis" aria-hidden="true">
                ...
              </span>
              <button
                v-else
                class="bnc-alert-list__pagination-page"
                :class="{ 'bnc-alert-list__pagination-page--active': page === pageInfo.page }"
                type="button"
                :aria-current="page === pageInfo.page ? 'page' : undefined"
                :disabled="loading"
                @click="$emit('pageChange', page)"
              >
                {{ page + 1 }}
              </button>
            </template>
          </div>
          <button
            class="bnc-alert-list__pagination-arrow"
            type="button"
            aria-label="다음 페이지"
            :disabled="pageInfo.page >= totalPages - 1 || loading"
            @click="$emit('pageChange', pageInfo.page + 1)"
          >
            다음
          </button>
        </div>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.bnc-alert-list {
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
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  white-space: nowrap;
}

.bnc-alert-list__summary {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.bnc-alert-list__body {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
}

.bnc-alert-list__state {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.bnc-alert-list__state--error {
  color: var(--color-status-danger);
}

.bnc-alert-list__items {
  display: grid;
  gap: var(--space-2);
}

.bnc-alert-list__pagination {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border-subtle);
}

.bnc-alert-list__pagination-pages {
  display: flex;
  min-width: 0;
  justify-content: center;
  gap: var(--space-1);
}

.bnc-alert-list__pagination-arrow,
.bnc-alert-list__pagination-page {
  min-width: 32px;
  min-height: 32px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  color: var(--color-fg);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.bnc-alert-list__pagination-arrow {
  padding: 0 var(--space-2);
}

.bnc-alert-list__pagination-page--active {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
}

.bnc-alert-list__pagination-arrow:disabled,
.bnc-alert-list__pagination-page:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.bnc-alert-list__pagination-ellipsis {
  display: inline-flex;
  min-width: 24px;
  align-items: center;
  justify-content: center;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}
</style>

<script setup lang="ts">
import { formatAlertAreaDisplay } from '@/constants/processArea';
import { RISK_LEVEL_META } from '@/constants/riskLevel';

import type { BottleneckAlertItem } from '@/types/dashboard';
import type { DashboardPageInfo } from '@/types/dashboardApi';

import { formatKoTime, formatRatioPercent } from '@/utils/format';

type PageButton = number | 'ellipsis-start' | 'ellipsis-end';

interface Props {
  alerts: BottleneckAlertItem[];
  selectedCaseId: string | null;
  loading: boolean;
  errorMessage: string | null;
  filterStartDate: string;
  filterEndDate: string;
  pageInfo: DashboardPageInfo;
  totalPages: number;
  pageButtons: PageButton[];
}

defineProps<Props>();

const emit = defineEmits<{
  'update:filterStartDate': [value: string];
  'update:filterEndDate': [value: string];
  applyPreset: [dayCount: number | null];
  dateFilterChange: [];
  pageChange: [page: number];
  selectAlert: [caseId: string];
}>();

function getAlertAreaDisplay(alert: BottleneckAlertItem) {
  return formatAlertAreaDisplay(alert.areaName, alert.tgName);
}
</script>

<template>
  <aside class="bottleneck-alert-selector" aria-labelledby="alert-selector-title">
    <header class="bottleneck-alert-selector__header">
      <h2 id="alert-selector-title">병목 알림</h2>
      <span>{{ pageInfo.totalElements }}건</span>
    </header>

    <div class="bottleneck-alert-selector__date-filter" aria-label="병목 알림 기간">
      <div class="bottleneck-alert-selector__date-presets">
        <button
          type="button"
          :class="{ 'bottleneck-alert-selector__date-preset--active': !filterStartDate && !filterEndDate }"
          @click="emit('applyPreset', null)"
        >
          전체
        </button>
        <button type="button" @click="emit('applyPreset', 1)">최근 1일</button>
        <button type="button" @click="emit('applyPreset', 7)">최근 7일</button>
      </div>
      <div class="bottleneck-alert-selector__date-inputs">
        <label>
          <span>시작일</span>
          <input
            :value="filterStartDate"
            type="date"
            @input="emit('update:filterStartDate', ($event.target as HTMLInputElement).value)"
            @change="emit('dateFilterChange')"
          />
        </label>
        <label>
          <span>종료일</span>
          <input
            :value="filterEndDate"
            type="date"
            @input="emit('update:filterEndDate', ($event.target as HTMLInputElement).value)"
            @change="emit('dateFilterChange')"
          />
        </label>
      </div>
    </div>

    <p v-if="loading" class="bottleneck-alert-selector__state">병목 알림을 불러오는 중입니다.</p>
    <p v-else-if="errorMessage" class="bottleneck-alert-selector__state bottleneck-alert-selector__state--error">
      {{ errorMessage }}
    </p>
    <p v-else-if="alerts.length === 0" class="bottleneck-alert-selector__state">선택할 병목 알림이 없습니다.</p>

    <template v-else>
      <div class="bottleneck-alert-selector__list" role="list">
        <button
          v-for="alert in alerts"
          :key="alert.caseId"
          class="bottleneck-alert-selector__row"
          :class="{
            'bottleneck-alert-selector__row--selected': alert.caseId === selectedCaseId,
            [`bottleneck-alert-selector__row--${alert.riskLevel}`]: true,
          }"
          type="button"
          role="listitem"
          :aria-pressed="alert.caseId === selectedCaseId"
          @click="emit('selectAlert', alert.caseId)"
        >
          <span class="bottleneck-alert-selector__row-line bottleneck-alert-selector__row-line--top">
            <span class="bottleneck-alert-selector__row-tg">{{ alert.tgName }}</span>
            <span class="bottleneck-alert-selector__row-prob">{{ formatRatioPercent(alert.bottleneckProb) }}</span>
          </span>
          <span class="bottleneck-alert-selector__row-area">{{ getAlertAreaDisplay(alert) }}</span>
          <span class="bottleneck-alert-selector__row-line">
            <span class="bottleneck-alert-selector__row-chip">{{ RISK_LEVEL_META[alert.riskLevel].label }}</span>
            <time class="bottleneck-alert-selector__row-time" :datetime="alert.detectedAt">
              {{ formatKoTime(alert.detectedAt) }}
            </time>
          </span>
        </button>
      </div>

      <div class="bottleneck-alert-selector__pagination">
        <button
          class="bottleneck-alert-selector__pagination-arrow"
          type="button"
          aria-label="이전 페이지"
          :disabled="pageInfo.page <= 0 || loading"
          @click="emit('pageChange', pageInfo.page - 1)"
        >
          이전
        </button>
        <div class="bottleneck-alert-selector__pagination-pages" aria-label="병목 알림 페이지">
          <template v-for="page in pageButtons" :key="page">
            <span
              v-if="typeof page === 'string'"
              class="bottleneck-alert-selector__pagination-ellipsis"
              aria-hidden="true"
            >
              ...
            </span>
            <button
              v-else
              class="bottleneck-alert-selector__pagination-page"
              :class="{ 'bottleneck-alert-selector__pagination-page--active': page === pageInfo.page }"
              type="button"
              :aria-current="page === pageInfo.page ? 'page' : undefined"
              :disabled="loading"
              @click="emit('pageChange', page)"
            >
              {{ page + 1 }}
            </button>
          </template>
        </div>
        <button
          class="bottleneck-alert-selector__pagination-arrow"
          type="button"
          aria-label="다음 페이지"
          :disabled="pageInfo.page >= totalPages - 1 || loading"
          @click="emit('pageChange', pageInfo.page + 1)"
        >
          다음
        </button>
      </div>
    </template>
  </aside>
</template>

<style scoped>
.bottleneck-alert-selector {
  position: sticky;
  top: calc(var(--layout-header-height) + var(--spacing-page));
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  max-height: calc(100svh - var(--layout-header-height) - var(--spacing-page) * 2);
  gap: var(--space-2);
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

.bottleneck-alert-selector__header h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.bottleneck-alert-selector__header span {
  flex-shrink: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bottleneck-alert-selector__date-filter {
  display: grid;
  gap: var(--space-2);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: var(--space-2);
}

.bottleneck-alert-selector__date-presets {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  overflow: hidden;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}

.bottleneck-alert-selector__date-presets button {
  min-height: 32px;
  border: 0;
  background: transparent;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bottleneck-alert-selector__date-presets button + button {
  border-left: var(--border-width-default) solid var(--color-border-default);
}

.bottleneck-alert-selector__date-presets button:hover,
.bottleneck-alert-selector__date-preset--active {
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
}

.bottleneck-alert-selector__date-inputs {
  display: grid;
  gap: var(--space-1);
}

.bottleneck-alert-selector__date-inputs label {
  display: grid;
  grid-template-columns: 3.75rem minmax(0, 1fr);
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.bottleneck-alert-selector__date-inputs span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bottleneck-alert-selector__date-inputs input {
  min-width: 0;
  min-height: 34px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: calc(var(--radius-md) - 2px);
  background: var(--color-bg-surface);
  padding: 0 var(--space-2);
  color: var(--color-fg);
  font-size: var(--font-size-sm);
}

.bottleneck-alert-selector__date-inputs input:focus {
  border-color: var(--color-action-primary-border);
  outline: none;
}

.bottleneck-alert-selector__state {
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  padding: var(--space-2);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.bottleneck-alert-selector__state--error {
  border-color: var(--color-status-danger);
  color: var(--color-status-danger);
}

.bottleneck-alert-selector__list {
  display: grid;
  align-content: start;
  min-height: 0;
  gap: var(--space-1);
  overflow-y: auto;
  padding-right: 2px;
}

.bottleneck-alert-selector__row {
  display: grid;
  align-content: center;
  gap: 4px;
  min-width: 0;
  min-height: 72px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-left: 3px solid var(--color-risk-high);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: 10px 12px;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.bottleneck-alert-selector__row--critical {
  border-left-color: var(--color-risk-critical);
}

.bottleneck-alert-selector__row--medium {
  border-left-color: var(--color-risk-medium);
}

.bottleneck-alert-selector__row--low {
  border-left-color: var(--color-risk-low);
}

.bottleneck-alert-selector__row:hover,
.bottleneck-alert-selector__row--selected {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
}

.bottleneck-alert-selector__row:focus-visible {
  outline: 2px solid var(--color-action-primary-border);
  outline-offset: 2px;
}

.bottleneck-alert-selector__row-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: var(--space-2);
}

.bottleneck-alert-selector__row-line--top {
  align-items: baseline;
}

.bottleneck-alert-selector__row-tg {
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-alert-selector__row-area {
  overflow: hidden;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-alert-selector__row-chip {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  border: var(--border-width-default) solid currentColor;
  border-radius: var(--radius-sm);
  padding: 1px 6px;
  color: var(--color-risk-high);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
}

.bottleneck-alert-selector__row--critical .bottleneck-alert-selector__row-chip {
  color: var(--color-risk-critical);
}

.bottleneck-alert-selector__row--medium .bottleneck-alert-selector__row-chip {
  color: var(--color-risk-medium);
}

.bottleneck-alert-selector__row--low .bottleneck-alert-selector__row-chip {
  color: var(--color-risk-low);
}

.bottleneck-alert-selector__row-time,
.bottleneck-alert-selector__row-prob {
  color: var(--color-fg-muted);
  line-height: var(--line-height-tight);
  white-space: nowrap;
}

.bottleneck-alert-selector__row-prob {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.bottleneck-alert-selector__row-time {
  font-size: var(--font-size-xs);
}

.bottleneck-alert-selector__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1);
  border-top: var(--border-width-default) solid var(--color-border-subtle);
  padding-top: var(--space-2);
}

.bottleneck-alert-selector__pagination button {
  min-width: 30px;
  min-height: 30px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bottleneck-alert-selector__pagination button:not(:disabled):hover {
  border-color: var(--color-action-primary-border);
  color: var(--color-action-primary);
}

.bottleneck-alert-selector__pagination button:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.bottleneck-alert-selector__pagination-pages {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
}

.bottleneck-alert-selector__pagination-arrow {
  flex: 0 0 auto;
  padding: 0 8px;
}

.bottleneck-alert-selector__pagination-page {
  flex: 0 0 auto;
  padding: 0 8px;
}

.bottleneck-alert-selector__pagination-page--active {
  border-color: var(--color-action-primary-border) !important;
  background: var(--color-action-primary) !important;
  color: var(--color-text-inverse) !important;
}

.bottleneck-alert-selector__pagination-ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

@media (max-width: 1120px) {
  .bottleneck-alert-selector {
    position: static;
    max-height: none;
  }
}
</style>

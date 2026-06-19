<script setup lang="ts">
import { computed } from 'vue';

import type { ActionHistoryItem } from '@/types/report';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseTable from '@/components/base/BaseTable.vue';
import type { BaseTableColumn, BaseTableRow } from '@/components/base/BaseTable.vue';

const props = defineProps<{
  items: ActionHistoryItem[];
  loading?: boolean;
  selectedCaseId?: string | null;
  compact?: boolean;
}>();

defineEmits<{
  select: [caseId: string];
}>();

const fullColumns: BaseTableColumn[] = [
  { key: 'decidedAt', label: '일시' },
  { key: 'targetTgText', label: 'Tool Group' },
  { key: 'selectedPlanTitle', label: '선택 대응안' },
  { key: 'planType', label: '카테고리' },
  { key: 'decidedBy', label: '담당자' },
  { key: 'estAvgWaitDelta', label: '대기 변화' },
  { key: 'estDeliveryComplianceDelta', label: '납기 변화' },
  { key: 'status', label: '상태' },
  { key: 'action', label: '' },
];

const columns = computed(() => fullColumns);

function toRow(item: ActionHistoryItem): BaseTableRow {
  return { ...item, id: item.caseId };
}

function getItem(row: BaseTableRow): ActionHistoryItem {
  return row as unknown as ActionHistoryItem;
}

function formatSignedDay(value: number) {
  if (value === 0) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(3)}일`;
}

function formatSignedPercent(value: number) {
  if (value === 0) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(0)}%p`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function deltaClass(value: number, inverse = false) {
  const isGood = inverse ? value < 0 : value > 0;
  return {
    'action-history-table__delta--good': value !== 0 && isGood,
    'action-history-table__delta--bad': value !== 0 && !isGood,
  };
}
</script>

<template>
  <div v-if="props.compact" class="action-history-table__compact-list">
    <p v-if="props.loading" class="action-history-table__state">리포트를 불러오는 중입니다.</p>
    <p v-else-if="props.items.length === 0" class="action-history-table__state">
      조건에 맞는 케이스 리포트가 없습니다.
    </p>
    <button
      v-for="item in props.items"
      v-else
      :key="item.caseId"
      type="button"
      class="action-history-table__compact-item"
      :class="{ 'action-history-table__compact-item--active': item.caseId === props.selectedCaseId }"
      @click="$emit('select', item.caseId)"
    >
      <span class="action-history-table__compact-date">{{ formatDateTime(item.decidedAt) }}</span>
      <strong>{{ item.targetTgText }}</strong>
      <span>{{ item.selectedPlanTitle }}</span>
      <BaseBadge :variant="item.decision === 'APPROVED' ? 'success' : 'warning'">
        {{ item.decision === 'APPROVED' ? '승인' : '반려' }}
      </BaseBadge>
    </button>
  </div>

  <BaseTable
    v-else
    :columns="columns"
    :rows="props.items.map(toRow)"
    :loading="props.loading"
    row-key="id"
    :selected-row-key="props.selectedCaseId"
    @row-click="$emit('select', getItem($event).caseId)"
  >
    <template #cell-decidedAt="{ row }">{{ formatDateTime(getItem(row).decidedAt) }}</template>
    <template #cell-targetTgText="{ row }">
      <strong class="action-history-table__tg">{{ getItem(row).targetTgText }}</strong>
    </template>
    <template #cell-selectedPlanTitle="{ row }">
      <span>{{ getItem(row).selectedPlanTitle }}</span>
    </template>
    <template #cell-planType="{ row }">
      <BaseBadge :variant="getItem(row).planType === '생산계획' ? 'info' : 'warning'">{{
        getItem(row).planType
      }}</BaseBadge>
    </template>
    <template #cell-decidedBy="{ row }">{{ getItem(row).decidedBy.userName }}</template>
    <template #cell-estAvgWaitDelta="{ row }">
      <span :class="deltaClass(getItem(row).estAvgWaitDelta, true)">{{
        formatSignedDay(getItem(row).estAvgWaitDelta)
      }}</span>
    </template>
    <template #cell-estDeliveryComplianceDelta="{ row }">
      <span :class="deltaClass(getItem(row).estDeliveryComplianceDelta)">{{
        formatSignedPercent(getItem(row).estDeliveryComplianceDelta)
      }}</span>
    </template>
    <template #cell-status="{ row }">
      <BaseBadge :variant="getItem(row).decision === 'APPROVED' ? 'success' : 'warning'">
        {{ getItem(row).decision === 'APPROVED' ? '승인' : '반려' }}
      </BaseBadge>
    </template>
    <template #empty>조건에 맞는 케이스 리포트가 없습니다.</template>
  </BaseTable>
</template>

<style scoped>
.action-history-table__compact-list {
  display: grid;
  gap: var(--space-2);
}

.action-history-table__compact-item {
  display: grid;
  gap: 4px;
  width: 100%;
  border: 1px solid transparent;
  border-bottom-color: var(--color-border-subtle);
  background: transparent;
  color: var(--color-fg);
  cursor: pointer;
  font: inherit;
  padding: var(--space-3);
  text-align: left;
}

.action-history-table__compact-item:hover,
.action-history-table__compact-item--active {
  border-color: var(--color-border-default);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-action-primary) 7%, var(--color-bg-surface));
}

.action-history-table__compact-item strong {
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-bold);
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.action-history-table__compact-item span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.action-history-table__compact-date {
  font-size: var(--font-size-xs);
}

.action-history-table__state {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.action-history-table__tg {
  display: inline-block;
  margin-right: var(--space-2);
  color: var(--color-fg-strong);
}

small {
  display: block;
  margin-top: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.action-history-table__delta--good {
  color: var(--color-status-success);
}

.action-history-table__delta--bad {
  color: var(--color-status-danger);
}
</style>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import type { MachinePeriodPreset, MachinePeriodRange } from '@/types/machine';

import {
  createCustomMachinePeriodRange,
  createMachinePeriodRange,
  formatMachinePeriodLabel,
  parseDateTimeLocal,
  toDateTimeLocalValue,
} from '@/utils/machinePeriod';

type OperationRange = Extract<MachinePeriodPreset, '6H' | '24H' | '7D' | '30D'>;

const props = defineProps<{
  measuredAt: string;
  periodPreset: MachinePeriodPreset;
  periodRange: MachinePeriodRange | null;
}>();

const emit = defineEmits<{
  'update:periodPreset': [value: MachinePeriodPreset];
  'update:periodRange': [value: MachinePeriodRange];
}>();

const rangeOptions: { value: OperationRange; label: string }[] = [
  { value: '6H', label: '최근 6시간' },
  { value: '24H', label: '최근 24시간' },
  { value: '7D', label: '최근 7일' },
  { value: '30D', label: '최근 30일' },
];

const selectedRange = ref<OperationRange | 'CUSTOM'>(normalizePreset(props.periodPreset));
const draftFrom = ref('');
const draftTo = ref('');
const appliedFrom = ref('');
const appliedTo = ref('');
const rangeErrorMessage = ref<string | null>(null);

const selectedRangeLabel = computed(() => {
  if (selectedRange.value === 'CUSTOM') return '직접 설정';
  return rangeOptions.find((option) => option.value === selectedRange.value)?.label ?? '최근 24시간';
});

const appliedRangeLabel = computed(
  () => `${formatMachinePeriodLabel(appliedFrom.value)} ~ ${formatMachinePeriodLabel(appliedTo.value)}`
);

watch(
  () => [props.measuredAt, props.periodPreset, props.periodRange] as const,
  () => {
    if (props.periodPreset === 'CUSTOM' && props.periodRange) {
      selectedRange.value = 'CUSTOM';
      setAppliedRange(props.periodRange);
    } else {
      const nextRange = normalizePreset(props.periodPreset);
      const range = props.periodRange ?? createMachinePeriodRange(props.measuredAt, nextRange);
      selectedRange.value = nextRange;
      setAppliedRange(range);
    }
    rangeErrorMessage.value = null;
  },
  { immediate: true }
);

function normalizePreset(value: MachinePeriodPreset): OperationRange {
  return value === '6H' || value === '7D' || value === '30D' ? value : '24H';
}

function setAppliedRange(range: MachinePeriodRange) {
  draftFrom.value = toDateTimeLocalValue(new Date(range.from));
  draftTo.value = toDateTimeLocalValue(new Date(range.to));
  appliedFrom.value = draftFrom.value;
  appliedTo.value = draftTo.value;
}

function applyQuickRange(range: OperationRange) {
  const nextRange = createMachinePeriodRange(props.measuredAt, range);
  selectedRange.value = range;
  setAppliedRange(nextRange);
  rangeErrorMessage.value = null;
  emit('update:periodRange', nextRange);
}

function applyCustomRange() {
  const from = parseDateTimeLocal(draftFrom.value);
  const to = parseDateTimeLocal(draftTo.value);

  if (!from || !to) {
    rangeErrorMessage.value = '시작일과 종료일을 모두 입력하세요.';
    return;
  }

  if (from.getTime() >= to.getTime()) {
    rangeErrorMessage.value = '종료일은 시작일 이후여야 합니다.';
    return;
  }

  selectedRange.value = 'CUSTOM';
  appliedFrom.value = draftFrom.value;
  appliedTo.value = draftTo.value;
  rangeErrorMessage.value = null;
  emit('update:periodRange', createCustomMachinePeriodRange(from, to));
}
</script>

<template>
  <section class="operation-range-card" aria-label="운영 현황 기준">
    <div class="operation-range-card__copy">
      <strong>운영 현황 기준</strong>
      <span>선택한 기간의 평균·최대·현재 대비 지표로 장비 부담을 봅니다.</span>
    </div>
    <div class="operation-range-card__controls">
      <div class="operation-range-card__range-options" role="group" aria-label="빠른 기간 선택">
        <button
          v-for="option in rangeOptions"
          :key="option.value"
          type="button"
          class="operation-range-card__range-btn"
          :class="{ 'operation-range-card__range-btn--active': selectedRange === option.value }"
          @click="applyQuickRange(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
      <div class="operation-range-card__custom-range" aria-label="직접 기간 선택">
        <label>
          <span>시작일</span>
          <input v-model="draftFrom" type="datetime-local" />
        </label>
        <label>
          <span>종료일</span>
          <input v-model="draftTo" type="datetime-local" />
        </label>
        <button type="button" class="operation-range-card__apply-btn" @click="applyCustomRange">조회</button>
        <button type="button" class="operation-range-card__reset-btn" @click="applyQuickRange('24H')">초기화</button>
      </div>
    </div>
    <div class="operation-range-card__status">
      <b>{{ selectedRangeLabel }}</b>
      <span>{{ appliedRangeLabel }} 적용 중</span>
      <small>1시간 단위 KPI 기준</small>
    </div>
    <p v-if="rangeErrorMessage" class="operation-range-card__error">{{ rangeErrorMessage }}</p>
  </section>
</template>

<style scoped>
.operation-range-card {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.operation-range-card__copy {
  display: grid;
  align-content: start;
  gap: 4px;
}

.operation-range-card__copy strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.operation-range-card__copy span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  line-height: 1.4;
}

.operation-range-card__controls {
  display: flex;
  align-items: end;
  gap: var(--space-2);
  justify-content: start;
  flex-wrap: wrap;
  min-width: 0;
}

.operation-range-card__range-options {
  display: inline-flex;
  gap: 2px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: 2px;
  flex-shrink: 0;
}

.operation-range-card__range-btn {
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  padding: 6px 12px;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  transition:
    background 0.1s,
    color 0.1s;
}

.operation-range-card__range-btn:hover {
  background: var(--color-state-hover);
  color: var(--color-fg);
}

.operation-range-card__range-btn--active {
  background: var(--color-action-primary);
  color: var(--color-text-inverse);
}

.operation-range-card__custom-range {
  display: flex;
  align-items: end;
  gap: var(--space-2);
  min-width: 0;
}

.operation-range-card__custom-range label {
  display: grid;
  gap: 3px;
  min-width: 180px;
}

.operation-range-card__custom-range label span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.operation-range-card__custom-range input {
  height: 34px;
  box-sizing: border-box;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: 0 var(--space-2);
  color: var(--color-fg);
  font-size: var(--font-size-base);
  outline: none;
  min-width: 0;
}

.operation-range-card__custom-range input:focus {
  border-color: var(--color-action-primary);
}

.operation-range-card__apply-btn {
  height: 34px;
  border: var(--border-width-default) solid var(--color-action-primary);
  border-radius: var(--radius-md);
  background: var(--color-action-primary);
  padding: 0 var(--space-3);
  color: var(--color-text-inverse);
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.operation-range-card__apply-btn:hover {
  filter: brightness(0.96);
}

.operation-range-card__reset-btn {
  height: 34px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: 0 var(--space-3);
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.operation-range-card__reset-btn:hover {
  border-color: var(--color-border-strong);
  color: var(--color-fg);
}

.operation-range-card__status {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border-top: var(--border-width-default) solid var(--color-border-subtle);
  padding-top: var(--space-2);
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

.operation-range-card__status b {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-pill);
  background: var(--color-bg-surface);
  padding: 2px 10px;
  color: var(--color-fg);
  font-weight: var(--font-weight-bold);
}

.operation-range-card__status small {
  margin-left: auto;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  white-space: nowrap;
}

.operation-range-card__error {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--color-status-danger);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

@media (max-width: 760px) {
  .operation-range-card__custom-range,
  .operation-range-card__range-options,
  .operation-range-card__status {
    align-items: stretch;
    flex-direction: column;
  }

  .operation-range-card__custom-range label,
  .operation-range-card__status small {
    width: 100%;
    min-width: 0;
    margin-left: 0;
  }
}
</style>

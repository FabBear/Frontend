<script setup lang="ts">
import type { MachineEquipmentItem, MachineEquipmentStatus } from '@/types/machine';

import BaseBadge from '@/components/base/BaseBadge.vue';

import { formatNumber, formatRatioPercent } from '@/utils/format';

interface Props {
  rows: MachineEquipmentItem[];
  selectedEquipmentId: string | null;
}

defineProps<Props>();

const emit = defineEmits<{
  select: [toolId: string];
}>();

function getStatusLabel(status: MachineEquipmentStatus) {
  if (status === 'RUN') return '가동';
  if (status === 'IDLE') return '대기';
  return '정비';
}

function getStatusVariant(status: MachineEquipmentStatus) {
  if (status === 'RUN') return 'success';
  if (status === 'IDLE') return 'warning';
  return 'info';
}
</script>

<template>
  <section class="machine-equipment-table">
    <div class="machine-equipment-table__head">
      <h2>3. 선택 TG 내 Tool 비교</h2>
      <p>같은 Tool Group 안의 장비를 나란히 비교합니다. 가장 이상 징후가 큰 Tool이 먼저 선택됩니다.</p>
    </div>

    <div class="machine-equipment-table__cards">
      <button
        v-for="row in rows"
        :key="row.toolId"
        class="machine-equipment-table__card"
        :class="{ 'machine-equipment-table__card--active': row.toolId === selectedEquipmentId }"
        type="button"
        @click="emit('select', row.toolId)"
      >
        <span class="machine-equipment-table__top">
          <strong>{{ row.toolCode }}</strong>
          <BaseBadge :variant="getStatusVariant(row.status)">{{ getStatusLabel(row.status) }}</BaseBadge>
        </span>
        <span class="machine-equipment-table__meta">{{ row.tgCode }} 내 #{{ row.toolNumber }}</span>
        <span class="machine-equipment-table__metrics">
          <span>
            <small>가동률</small>
            <b>{{ formatRatioPercent(row.utilizationRate) }}</b>
          </span>
          <span>
            <small>OEE</small>
            <b>{{ formatRatioPercent(row.oeeEstimate) }}</b>
          </span>
          <span>
            <small>Queue</small>
            <b>{{ formatNumber(row.queueLotCount) }}</b>
          </span>
          <span>
            <small>Down</small>
            <b>{{ formatRatioPercent(row.downRatio) }}</b>
          </span>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.machine-equipment-table {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.machine-equipment-table__head h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.machine-equipment-table__head p,
.machine-equipment-table__meta,
.machine-equipment-table small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.machine-equipment-table__cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: var(--space-2);
}

.machine-equipment-table__card {
  display: grid;
  gap: var(--space-2);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  text-align: left;
  cursor: pointer;
}

.machine-equipment-table__card:hover,
.machine-equipment-table__card--active {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
}

.machine-equipment-table__top,
.machine-equipment-table__metrics {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.machine-equipment-table__top strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-md);
}

.machine-equipment-table__metrics span {
  display: grid;
  gap: 2px;
}

.machine-equipment-table__metrics b {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

@media (max-width: 1200px) {
  .machine-equipment-table__cards {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}

@media (max-width: 720px) {
  .machine-equipment-table__cards {
    grid-template-columns: 1fr;
  }
}
</style>

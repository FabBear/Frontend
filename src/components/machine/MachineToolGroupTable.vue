<script setup lang="ts">
import { riskGradeToLevel } from '@/constants/riskLevel';

import type { MachineToolGroupItem } from '@/types/machine';

import BaseBadge from '@/components/base/BaseBadge.vue';

import { formatNumber, formatRatioPercent } from '@/utils/format';

interface Props {
  rows: MachineToolGroupItem[];
  selectedToolGroupId: string | null;
}

defineProps<Props>();

const emit = defineEmits<{
  select: [tgId: string];
}>();
</script>

<template>
  <section class="machine-tg-table" aria-label="Tool Group 비교">
    <div class="machine-tg-table__head">
      <h2>2. 같은 역할 Tool Group 비교</h2>
      <p>부하와 병목이 큰 TG가 먼저 보입니다. TG를 선택하면 아래에 같은 TG 내 Tool 비교가 열립니다.</p>
    </div>

    <div class="machine-tg-table__cards">
      <button
        v-for="row in rows"
        :key="row.tgId"
        class="machine-tg-table__card"
        :class="{ 'machine-tg-table__card--active': row.tgId === selectedToolGroupId }"
        type="button"
        @click="emit('select', row.tgId)"
      >
        <span class="machine-tg-table__card-top">
          <strong>{{ row.tgCode }}</strong>
          <BaseBadge :variant="riskGradeToLevel(row.riskGrade)">{{ row.riskGrade }}</BaseBadge>
        </span>
        <span class="machine-tg-table__meta">{{ row.areaNameKo }} · {{ row.toolCount }}대</span>
        <span class="machine-tg-table__bar" aria-hidden="true">
          <i :style="{ width: `${Math.min(row.utilizationRate * 100, 100)}%` }" />
        </span>
        <span class="machine-tg-table__metrics">
          <span>
            <small>가동률</small>
            <b>{{ formatRatioPercent(row.utilizationRate) }}</b>
          </span>
          <span>
            <small>WIP</small>
            <b>{{ formatNumber(row.queueLotCount) }}</b>
          </span>
          <span>
            <small>병목</small>
            <b>{{ formatRatioPercent(row.bottleneckProb) }}</b>
          </span>
        </span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.machine-tg-table {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.machine-tg-table__head h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.machine-tg-table__head p,
.machine-tg-table__meta,
.machine-tg-table small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.machine-tg-table__cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(180px, 1fr));
  gap: var(--space-2);
}

.machine-tg-table__card {
  display: grid;
  gap: var(--space-2);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  text-align: left;
  cursor: pointer;
}

.machine-tg-table__card:hover,
.machine-tg-table__card--active {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
}

.machine-tg-table__card-top,
.machine-tg-table__metrics {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.machine-tg-table__card-top strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-md);
}

.machine-tg-table__bar {
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--color-border-subtle);
  overflow: hidden;
}

.machine-tg-table__bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-action-primary);
}

.machine-tg-table__metrics span {
  display: grid;
  gap: 2px;
}

.machine-tg-table__metrics b {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

@media (max-width: 1200px) {
  .machine-tg-table__cards {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}

@media (max-width: 720px) {
  .machine-tg-table__cards {
    grid-template-columns: 1fr;
  }
}
</style>

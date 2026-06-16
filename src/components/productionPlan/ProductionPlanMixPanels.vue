<script setup lang="ts">
import { computed } from 'vue';

import type { ReleasePlanMixItem } from '@/types/productionPlan';

import { formatNumber } from '@/utils/format';

const props = defineProps<{
  productMix: ReleasePlanMixItem[];
  routeMix: ReleasePlanMixItem[];
  lotTypeMix: ReleasePlanMixItem[];
}>();

const panels = computed(() => [
  { title: 'Product Mix', items: props.productMix.slice(0, 5) },
  { title: 'Route Mix', items: props.routeMix.slice(0, 5) },
  { title: 'Lot Type Mix', items: props.lotTypeMix.slice(0, 5) },
]);

function formatRatio(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}
</script>

<template>
  <div class="production-plan-mix-panels">
    <article v-for="panel in panels" :key="panel.title" class="production-plan-mix-panels__panel">
      <header class="production-plan-mix-panels__header">
        <h3>{{ panel.title }}</h3>
        <span>상위 {{ panel.items.length }}개</span>
      </header>

      <div v-if="panel.items.length" class="production-plan-mix-panels__list">
        <div v-for="item in panel.items" :key="item.name" class="production-plan-mix-panels__item">
          <div class="production-plan-mix-panels__row">
            <span class="production-plan-mix-panels__name">{{ item.name }}</span>
            <strong>{{ formatNumber(item.lots) }} lots</strong>
          </div>
          <div class="production-plan-mix-panels__bar" aria-hidden="true">
            <span :style="{ width: `${Math.max(item.ratio * 100, 2)}%` }" />
          </div>
          <p>{{ formatRatio(item.ratio) }}</p>
        </div>
      </div>

      <p v-else class="production-plan-mix-panels__empty">구성 데이터가 없습니다.</p>
    </article>
  </div>
</template>

<style scoped>
.production-plan-mix-panels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  min-width: 0;
}

.production-plan-mix-panels__panel {
  display: grid;
  min-width: 0;
  gap: var(--space-2);
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.production-plan-mix-panels__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.production-plan-mix-panels__header h3 {
  min-width: 0;
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.production-plan-mix-panels__header span {
  flex-shrink: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.production-plan-mix-panels__list {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.production-plan-mix-panels__item {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.production-plan-mix-panels__row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.production-plan-mix-panels__name {
  min-width: 0;
  overflow: hidden;
  color: var(--color-fg-default);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.production-plan-mix-panels__row strong {
  flex-shrink: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.production-plan-mix-panels__bar {
  overflow: hidden;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--color-bg-subtle);
}

.production-plan-mix-panels__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-primary);
}

.production-plan-mix-panels__item p,
.production-plan-mix-panels__empty {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.production-plan-mix-panels__empty {
  padding: var(--space-3) 0;
  text-align: center;
}

@media (max-width: 1180px) {
  .production-plan-mix-panels {
    grid-template-columns: 1fr;
  }
}
</style>

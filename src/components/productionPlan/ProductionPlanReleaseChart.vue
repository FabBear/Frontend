<script setup lang="ts">
import { computed } from 'vue';

import type { ReleasePlanBucket } from '@/types/productionPlan';

import { formatNumber } from '@/utils/format';

const props = defineProps<{
  buckets: ReleasePlanBucket[];
  anchorMeasuredAt?: string | null;
}>();

const maxLots = computed(() => Math.max(1, ...props.buckets.map((bucket) => bucket.totalLots)));
const MINUTES_PER_DAY = 24 * 60;

const anchorTimeMs = computed(() => {
  if (!props.anchorMeasuredAt) return null;
  const parsed = Date.parse(props.anchorMeasuredAt);
  return Number.isNaN(parsed) ? null : parsed;
});

const scheduleColumns = computed(() => ({
  gridTemplateColumns: `132px repeat(${Math.max(props.buckets.length, 1)}, minmax(92px, 1fr))`,
}));

const productLanes = computed(() => {
  const totals = new Map<string, number>();
  for (const bucket of props.buckets) {
    for (const product of bucket.products) {
      totals.set(product.productName, (totals.get(product.productName) ?? 0) + product.lots);
    }
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([productName, totalLots]) => ({
      productName,
      totalLots,
      cells: props.buckets.map((bucket) => {
        const lots = bucket.products.find((product) => product.productName === productName)?.lots ?? 0;
        return {
          key: `${productName}-${bucket.bucketIndex}`,
          lots,
          fill: getFill(lots, maxLots.value),
        };
      }),
    }));
});

const totalCells = computed(() =>
  props.buckets.map((bucket) => ({
    key: `total-${bucket.bucketIndex}`,
    label: getBucketLabel(bucket),
    lots: bucket.totalLots,
    priorityLots: bucket.priorityLots,
    fill: getFill(bucket.totalLots, maxLots.value),
  }))
);

function getFill(lots: number, max: number): number {
  if (lots <= 0) return 0;
  return Math.round(12 + (lots / max) * 58);
}

function getCellStyle(fill: number) {
  return {
    '--release-cell-fill': `${fill}%`,
  };
}

function getBucketLabel(bucket: ReleasePlanBucket): string {
  const anchor = anchorTimeMs.value;
  if (anchor === null) return bucket.label;

  const fromMin = bucket.fromMin ?? 0;
  const toMin = bucket.toMin ?? fromMin;
  const spanMin = Math.max(0, toMin - fromMin);
  const from = new Date(anchor + fromMin * 60 * 1000);
  const to = new Date(anchor + toMin * 60 * 1000);

  if (spanMin <= 6 * 60) {
    return `${formatTime(from)}~${formatTime(to)}`;
  }
  if (spanMin <= MINUTES_PER_DAY) {
    return `${formatMonthDay(from)} ${formatHour(from)}시`;
  }
  return `${formatMonthDay(from)}~${formatMonthDay(to)}`;
}

function formatMonthDay(date: Date): string {
  return `${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatHour(date: Date): string {
  return pad(date.getHours());
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
</script>

<template>
  <div class="production-plan-release-chart">
    <div v-if="buckets.length" class="production-plan-release-chart__board">
      <div class="production-plan-release-chart__legend">
        <span>Release schedule board</span>
        <span><i /> P = Priority Lot 포함</span>
      </div>

      <div class="production-plan-release-chart__scroll">
        <div class="production-plan-release-chart__grid" :style="scheduleColumns">
          <div class="production-plan-release-chart__corner">Product / Time</div>
          <div v-for="cell in totalCells" :key="`head-${cell.key}`" class="production-plan-release-chart__time-head">
            {{ cell.label }}
          </div>

          <div class="production-plan-release-chart__lane-head">
            <strong>Total</strong>
            <span>{{ formatNumber(buckets.reduce((sum, bucket) => sum + bucket.totalLots, 0)) }} lots</span>
          </div>
          <div
            v-for="cell in totalCells"
            :key="cell.key"
            class="production-plan-release-chart__cell production-plan-release-chart__cell--total"
            :class="{ 'production-plan-release-chart__cell--priority': cell.priorityLots > 0 }"
            :style="getCellStyle(cell.fill)"
            :title="`${cell.label} · ${cell.lots} lots${cell.priorityLots ? ` · Priority ${cell.priorityLots}건` : ''}`"
          >
            <strong>{{ formatNumber(cell.lots) }}</strong>
            <span v-if="cell.priorityLots > 0">P {{ formatNumber(cell.priorityLots) }}</span>
          </div>

          <template v-for="lane in productLanes" :key="lane.productName">
            <div class="production-plan-release-chart__lane-head">
              <strong>{{ lane.productName }}</strong>
              <span>{{ formatNumber(lane.totalLots) }} lots</span>
            </div>
            <div
              v-for="cell in lane.cells"
              :key="cell.key"
              class="production-plan-release-chart__cell"
              :class="{ 'production-plan-release-chart__cell--empty': cell.lots === 0 }"
              :style="getCellStyle(cell.fill)"
            >
              <strong v-if="cell.lots > 0">{{ formatNumber(cell.lots) }}</strong>
              <span v-else>-</span>
            </div>
          </template>
        </div>
      </div>
    </div>
    <p v-else class="production-plan-release-chart__empty">투입 계획 데이터가 없습니다.</p>
  </div>
</template>

<style scoped>
.production-plan-release-chart {
  min-width: 0;
}

.production-plan-release-chart__board {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
}

.production-plan-release-chart__legend {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.production-plan-release-chart__legend span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.production-plan-release-chart__legend i {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--color-gold);
}

.production-plan-release-chart__scroll {
  min-width: 0;
  overflow-x: auto;
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.production-plan-release-chart__grid {
  display: grid;
  min-width: max-content;
  background: var(--color-border-subtle);
  gap: 1px;
}

.production-plan-release-chart__corner,
.production-plan-release-chart__time-head,
.production-plan-release-chart__lane-head,
.production-plan-release-chart__cell {
  background: var(--color-bg-card);
}

.production-plan-release-chart__corner,
.production-plan-release-chart__time-head {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: var(--space-2);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.production-plan-release-chart__corner,
.production-plan-release-chart__lane-head {
  position: sticky;
  left: 0;
  z-index: 3;
  border-right: var(--border-width-default) solid var(--color-border-subtle);
}

.production-plan-release-chart__lane-head {
  display: grid;
  align-content: center;
  gap: 2px;
  min-width: 0;
  padding: var(--space-2);
}

.production-plan-release-chart__lane-head strong {
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.production-plan-release-chart__lane-head span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.production-plan-release-chart__cell {
  display: grid;
  align-content: center;
  justify-items: center;
  min-height: 64px;
  gap: 2px;
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-primary) 24%, transparent) 0 var(--release-cell-fill),
      transparent var(--release-cell-fill)
    ),
    var(--color-bg-card);
  padding: var(--space-2);
}

.production-plan-release-chart__cell--total {
  min-height: 72px;
}

.production-plan-release-chart__cell--priority {
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-gold) 28%, transparent) 0 var(--release-cell-fill),
      transparent var(--release-cell-fill)
    ),
    var(--color-bg-card);
}

.production-plan-release-chart__cell--empty {
  background: var(--color-bg-subtle);
}

.production-plan-release-chart__cell strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-extrabold);
  font-variant-numeric: tabular-nums;
}

.production-plan-release-chart__cell span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.production-plan-release-chart__empty {
  display: grid;
  min-height: 220px;
  place-items: center;
  border: var(--border-width-default) dashed var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

@media (max-width: 760px) {
  .production-plan-release-chart__legend {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

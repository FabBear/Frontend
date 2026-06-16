<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { fetchReleasePlan, fetchReleasePlanHotLots } from '@/services/productionPlanService';

import type { ReleasePlanHotLotsResponse, ReleasePlanRange, ReleasePlanResponse } from '@/types/productionPlan';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import KpiCard from '@/components/base/KpiCard.vue';
import ProductionPlanMixPanels from '@/components/productionPlan/ProductionPlanMixPanels.vue';
import ProductionPlanReleaseChart from '@/components/productionPlan/ProductionPlanReleaseChart.vue';

import { formatKoMonthDayTime, formatNumber } from '@/utils/format';

const rangeOptions: Array<{ value: ReleasePlanRange; label: string }> = [
  { value: '24h', label: '일' },
  { value: '7d', label: '주' },
  { value: '30d', label: '월' },
  { value: 'all', label: '전체' },
];

const selectedRange = ref<ReleasePlanRange>('24h');
const releasePlan = ref<ReleasePlanResponse | null>(null);
const sevenDayReleasePlan = ref<ReleasePlanResponse | null>(null);
const hotLotsResponse = ref<ReleasePlanHotLotsResponse | null>(null);
const isLoading = ref(false);
const isHotLotsLoading = ref(false);
const errorMessage = ref<string | null>(null);
const hotLotPage = ref(1);

const HOT_LOT_PAGE_SIZE = 12;

interface SummaryCard {
  title: string;
  value: string;
  subtitle?: string;
  note?: string;
}

const selectedRangeLabel = computed(() => {
  switch (selectedRange.value) {
    case '24h':
      return '24시간';
    case '7d':
      return '7일';
    case '30d':
      return '30일';
    case 'all':
      return '전체 잔여';
    default:
      return '선택 기간';
  }
});

const selectedRangeDays = computed(() => {
  switch (selectedRange.value) {
    case '24h':
      return 1;
    case '7d':
      return 7;
    case '30d':
      return 30;
    case 'all': {
      const maxToMin = Math.max(0, ...(releasePlan.value?.releaseBuckets ?? []).map((bucket) => bucket.toMin ?? 0));
      return Math.max(1, maxToMin / 60 / 24);
    }
    default:
      return 1;
  }
});

const summaryCards = computed<SummaryCard[]>(() => {
  const summary = releasePlan.value?.summary;
  const rangeLabel = selectedRangeLabel.value;
  return [
    {
      title: `${rangeLabel} 총 투입`,
      value: summary ? `${formatNumber(summary.plannedLots)} lots` : '-',
      subtitle: summary ? `${formatNumber(summary.plannedWafers)} wafers` : undefined,
    },
    {
      title: '일평균 투입',
      value: summary ? `${formatLotsPerDay(summary.plannedLots, selectedRangeDays.value)} lots/일` : '-',
      subtitle: selectedRange.value === '24h' ? '24h 기준' : '기간 보정',
    },
    {
      title: 'Priority Lot',
      value: summary ? `${formatNumber(summary.priorityLots)}건` : '-',
      subtitle: summary ? `선택 기간 · SuperHot ${formatNumber(summary.superHotLots)}건` : undefined,
    },
    {
      title: '평균 납기 여유',
      value: summary ? formatDays(summary.avgDueSlackMin) : '-',
      subtitle: '선택 기간 기준',
    },
  ];
});

const currentReleaseBadge = computed(() => {
  const nextReleaseInMin = releasePlan.value?.summary.nextReleaseInMin;
  return nextReleaseInMin === undefined ? '-' : formatDuration(nextReleaseInMin);
});

const dueLots7dBadge = computed(() => {
  const dueLots = sevenDayReleasePlan.value?.summary.dueLots;
  return dueLots === undefined ? '-' : `${formatNumber(dueLots)}건`;
});

const releasePlanInsight = computed(() => {
  const summary = releasePlan.value?.summary;
  if (!summary) return '';
  const rangeText = selectedRange.value === 'all' ? '전체 잔여 계획' : `${selectedRangeLabel.value} 계획`;
  return `${rangeText} 총합은 ${formatNumber(summary.plannedLots)} lots / ${formatNumber(
    summary.plannedWafers
  )} wafers입니다. 하루 평균 ${formatLotsPerDay(
    summary.plannedLots,
    selectedRangeDays.value
  )} lots/일, Priority ${formatNumber(summary.priorityLots)}건, SuperHot ${formatNumber(
    summary.superHotLots
  )}건입니다. 7일 내 납기 Lot은 ${formatNumber(
    sevenDayReleasePlan.value?.summary.dueLots ?? 0
  )}건이고, 선택 기간 평균 납기 여유는 ${formatDays(summary.avgDueSlackMin)}입니다.`;
});

// 핫랏 워치리스트는 서버 페이지네이션 결과를 그대로 표시한다.
const hotLots = computed(() => hotLotsResponse.value?.lots ?? []);

const hotLotPageCount = computed(() => Math.max(1, hotLotsResponse.value?.totalPages ?? 0));

const hotLotsCountLabel = computed(() => {
  if (isHotLotsLoading.value) return '조회 중';
  const total = hotLotsResponse.value?.totalElements ?? 0;
  if (total === 0) return '대상 없음';
  return `총 ${formatNumber(total)}건 · ${formatNumber(hotLotPage.value)}/${formatNumber(hotLotPageCount.value)}페이지`;
});

function gradeLabel(lot: { lotType: string | null; superHot: boolean }): string {
  if (lot.superHot || /super/i.test(lot.lotType ?? '')) return 'SuperHot';
  return 'HotLot';
}

function gradeVariant(lot: { lotType: string | null; superHot: boolean }): 'danger' | 'warning' {
  if (lot.superHot || /super/i.test(lot.lotType ?? '')) return 'danger';
  return 'warning';
}

function formatDuration(value: number | null): string {
  if (value === null) return '-';
  const abs = Math.abs(value);
  const unitText =
    abs < 60
      ? `${abs.toFixed(0)}분`
      : abs < 60 * 24
        ? `${(abs / 60).toFixed(1)}시간`
        : `${(abs / 60 / 24).toFixed(1)}일`;
  return value < 0 ? `${unitText} 지남` : `${unitText} 후`;
}

onMounted(() => {
  void loadReleasePlan();
});

watch(selectedRange, () => {
  hotLotPage.value = 1;
  void loadReleasePlan();
});

async function loadReleasePlan() {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const selected = await fetchReleasePlan(selectedRange.value);
    releasePlan.value = selected;
    sevenDayReleasePlan.value = selectedRange.value === '7d' ? selected : await fetchReleasePlan('7d');
    await loadHotLots(1);
  } catch (error) {
    console.error('[LotReleasePlanView] load failed:', error);
    errorMessage.value = 'Lot 투입 계획을 불러오지 못했습니다.';
  } finally {
    isLoading.value = false;
  }
}

async function loadHotLots(page: number) {
  isHotLotsLoading.value = true;
  try {
    const response = await fetchReleasePlanHotLots(selectedRange.value, Math.max(page - 1, 0), HOT_LOT_PAGE_SIZE);
    hotLotsResponse.value = response;
    hotLotPage.value = response.page + 1;
  } catch (error) {
    console.error('[LotReleasePlanView] hot lots load failed:', error);
    hotLotsResponse.value = null;
  } finally {
    isHotLotsLoading.value = false;
  }
}

function formatDays(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return `${(value / 60 / 24).toFixed(1)}일`;
}

function formatLotsPerDay(lots: number, days: number): string {
  const value = lots / Math.max(days, 1);
  if (value >= 100) return formatNumber(Math.round(value));
  return value.toLocaleString('ko-KR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: value < 10 ? 1 : 0,
  });
}

async function goHotLotPage(direction: -1 | 1) {
  const nextPage = Math.min(Math.max(hotLotPage.value + direction, 1), hotLotPageCount.value);
  if (nextPage === hotLotPage.value) return;
  await loadHotLots(nextPage);
}
</script>

<template>
  <div class="lot-release-plan-view">
    <header class="lot-release-plan-view__header">
      <div>
        <p class="lot-release-plan-view__eyebrow">Fab 운영</p>
        <h1>Lot 투입 계획</h1>
        <p class="lot-release-plan-view__description">
          예정 투입 볼륨과 핫랏, 납기 여유를 한눈에 확인합니다.
          <span v-if="releasePlan"> · {{ formatKoMonthDayTime(releasePlan.anchorMeasuredAt) }} 기준</span>
        </p>
        <div v-if="releasePlan" class="lot-release-plan-view__fixed-badges" aria-label="현재 기준 고정 지표">
          <BaseBadge variant="info">다음 Release {{ currentReleaseBadge }}</BaseBadge>
          <BaseBadge variant="warning">7일 내 납기 {{ dueLots7dBadge }}</BaseBadge>
        </div>
      </div>

      <div class="lot-release-plan-view__ranges" aria-label="조회 기간">
        <BaseButton
          v-for="option in rangeOptions"
          :key="option.value"
          :variant="selectedRange === option.value ? 'primary' : 'soft'"
          size="sm"
          @click="selectedRange = option.value"
        >
          {{ option.label }}
        </BaseButton>
      </div>
    </header>

    <p v-if="errorMessage" class="lot-release-plan-view__state lot-release-plan-view__state--error">
      {{ errorMessage }}
    </p>

    <section class="lot-release-plan-view__summary" aria-label="투입 계획 요약">
      <KpiCard
        v-for="card in summaryCards"
        :key="card.title"
        :title="card.title"
        :value="card.value"
        :subtitle="isLoading ? '조회 중' : card.subtitle"
      />
    </section>

    <p v-if="releasePlanInsight" class="lot-release-plan-view__insight">
      {{ releasePlanInsight }}
    </p>

    <section class="lot-release-plan-view__panel" aria-label="투입 타임라인">
      <header class="lot-release-plan-view__panel-header">
        <div>
          <h2>Release 스케줄 보드</h2>
          <p>시간축 기준으로 전체 투입량과 주요 Product별 분포를 함께 봅니다.</p>
        </div>
      </header>
      <ProductionPlanReleaseChart
        :buckets="releasePlan?.releaseBuckets ?? []"
        :anchor-measured-at="releasePlan?.anchorMeasuredAt"
      />
    </section>

    <section class="lot-release-plan-view__panel" aria-label="핫랏 워치리스트">
      <header class="lot-release-plan-view__panel-header">
        <div>
          <h2>핫랏 워치리스트</h2>
          <p>선택 기간의 우선/긴급 Lot을 SuperHot, 납기 임박, 투입 임박 순으로 페이지 단위 표시합니다.</p>
        </div>
        <span class="lot-release-plan-view__count">{{ hotLotsCountLabel }}</span>
      </header>

      <div v-if="hotLots.length" class="lot-release-plan-view__hot-table">
        <div class="lot-release-plan-view__hot-row lot-release-plan-view__hot-row--head">
          <span>등급</span>
          <span>Lot</span>
          <span>Product</span>
          <span>Route</span>
          <span>투입까지</span>
          <span>납기까지</span>
          <span>Priority</span>
        </div>
        <div v-for="lot in hotLots" :key="lot.lotId" class="lot-release-plan-view__hot-row">
          <span
            ><BaseBadge :variant="gradeVariant(lot)">{{ gradeLabel(lot) }}</BaseBadge></span
          >
          <span class="lot-release-plan-view__hot-id">{{ lot.lotId }}</span>
          <span class="lot-release-plan-view__hot-text">{{ lot.productName ?? '-' }}</span>
          <span class="lot-release-plan-view__hot-text">{{ lot.routeName ?? '-' }}</span>
          <span class="lot-release-plan-view__hot-time">{{ formatDuration(lot.releaseInMin) }}</span>
          <span class="lot-release-plan-view__hot-time">{{ formatDuration(lot.dueInMin) }}</span>
          <span class="lot-release-plan-view__hot-time">{{ lot.priority ?? '-' }}</span>
        </div>
      </div>
      <footer v-if="hotLotPageCount > 1" class="lot-release-plan-view__hot-pagination">
        <BaseButton variant="soft" size="sm" :disabled="hotLotPage <= 1 || isHotLotsLoading" @click="goHotLotPage(-1)">
          이전
        </BaseButton>
        <span>{{ hotLotPage }} / {{ hotLotPageCount }}</span>
        <BaseButton
          variant="soft"
          size="sm"
          :disabled="hotLotPage >= hotLotPageCount || isHotLotsLoading"
          @click="goHotLotPage(1)"
        >
          다음
        </BaseButton>
      </footer>
      <p v-if="isHotLotsLoading && !hotLots.length" class="lot-release-plan-view__hot-empty">
        핫랏 목록을 조회 중입니다.
      </p>
      <p v-else-if="!hotLots.length" class="lot-release-plan-view__hot-empty">이 기간에 예정된 핫랏이 없습니다.</p>
    </section>

    <section class="lot-release-plan-view__panel" aria-label="투입 구성">
      <header class="lot-release-plan-view__panel-header">
        <div>
          <h2>투입 구성</h2>
          <p>선택 기간의 Product, Route, Lot Type 분포입니다.</p>
        </div>
      </header>
      <ProductionPlanMixPanels
        :product-mix="releasePlan?.productMix ?? []"
        :route-mix="releasePlan?.routeMix ?? []"
        :lot-type-mix="releasePlan?.lotTypeMix ?? []"
      />
    </section>
  </div>
</template>

<style scoped>
.lot-release-plan-view {
  display: grid;
  min-width: 0;
  gap: var(--space-3);
}

.lot-release-plan-view__header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
  min-width: 0;
}

.lot-release-plan-view__eyebrow {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.lot-release-plan-view__header h1 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-extrabold);
  letter-spacing: 0;
}

.lot-release-plan-view__description {
  margin-top: 2px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.lot-release-plan-view__fixed-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-2);
}

.lot-release-plan-view__ranges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-1);
}

.lot-release-plan-view__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

.lot-release-plan-view__insight {
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  padding: var(--space-2) var(--space-3);
  color: var(--color-fg-default);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.lot-release-plan-view__panel {
  display: grid;
  min-width: 0;
  gap: var(--space-3);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
}

.lot-release-plan-view__panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.lot-release-plan-view__panel-header h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.lot-release-plan-view__panel-header p {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.lot-release-plan-view__count {
  flex-shrink: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.lot-release-plan-view__hot-table {
  display: grid;
  min-width: 0;
  overflow-x: auto;
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.lot-release-plan-view__hot-row {
  display: grid;
  grid-template-columns: 104px minmax(150px, 1.2fr) minmax(120px, 1fr) minmax(120px, 1fr) 96px 96px 72px;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
  padding: var(--space-2);
  font-size: var(--font-size-sm);
}

.lot-release-plan-view__hot-row:last-child {
  border-bottom: 0;
}

.lot-release-plan-view__hot-row--head {
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.lot-release-plan-view__hot-id {
  min-width: 0;
  overflow: hidden;
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lot-release-plan-view__hot-text {
  min-width: 0;
  overflow: hidden;
  color: var(--color-fg-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lot-release-plan-view__hot-time {
  color: var(--color-fg-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.lot-release-plan-view__hot-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.lot-release-plan-view__hot-empty {
  padding: var(--space-4) 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  text-align: center;
}

.lot-release-plan-view__state {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.lot-release-plan-view__state--error {
  border-color: var(--color-status-danger);
  color: var(--color-status-danger);
}

@media (max-width: 1440px) {
  .lot-release-plan-view__summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 980px) {
  .lot-release-plan-view__summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .lot-release-plan-view__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .lot-release-plan-view__ranges {
    justify-content: flex-start;
  }

  .lot-release-plan-view__summary {
    grid-template-columns: 1fr;
  }
}
</style>

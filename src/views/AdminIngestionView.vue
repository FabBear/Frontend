<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { fetchAdminResourceItems } from '@/services/adminService';

import type { AdminResourceItem, AdminStatus } from '@/types/admin';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseInput from '@/components/base/BaseInput.vue';

import { getAdminStatusLabel, getAdminStatusVariant } from '@/utils/admin';
import { formatKoMonthDayTime } from '@/utils/format';

type Period = '1h' | '6h' | '24h' | '7d' | 'custom';

const items = ref<AdminResourceItem[]>([]);
const keyword = ref('');
const statusFilter = ref<AdminStatus | 'ALL'>('ALL');
const period = ref<Period>('24h');
const dateFrom = ref('');
const dateTo = ref('');
const isLoading = ref(false);
const loadError = ref<string | null>(null);

const PERIODS: { value: Period; label: string }[] = [
  { value: '1h', label: '1시간' },
  { value: '6h', label: '6시간' },
  { value: '24h', label: '24시간' },
  { value: '7d', label: '7일' },
  { value: 'custom', label: '직접 입력' },
];

const STATUS_FILTERS: { value: AdminStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'NORMAL', label: '정상' },
  { value: 'WARNING', label: '주의' },
  { value: 'ERROR', label: '오류' },
  { value: 'DISABLED', label: '비활성' },
];

const filteredItems = computed(() => {
  let result = items.value;
  if (statusFilter.value !== 'ALL') {
    result = result.filter((item) => item.status === statusFilter.value);
  }
  if (keyword.value.trim()) {
    const kw = keyword.value.trim().toLowerCase();
    result = result.filter(
      (item) =>
        item.primary.toLowerCase().includes(kw) ||
        item.owner.toLowerCase().includes(kw) ||
        item.category.toLowerCase().includes(kw)
    );
  }
  return result;
});

const normalCount = computed(() => items.value.filter((i) => i.status === 'NORMAL').length);
const attentionCount = computed(() => items.value.filter((i) => i.status === 'WARNING' || i.status === 'ERROR').length);
const disabledCount = computed(() => items.value.filter((i) => i.status === 'DISABLED').length);

function metric(item: AdminResourceItem, label: string): string {
  return item.metrics.find((m) => m.label === label)?.value ?? '-';
}

async function load() {
  isLoading.value = true;
  loadError.value = null;
  try {
    items.value = await fetchAdminResourceItems('ingestion');
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '데이터를 불러오는 데 실패했습니다.';
  } finally {
    isLoading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="admin-ingestion">
    <header class="admin-ingestion__header">
      <div>
        <h1>데이터 수집</h1>
        <p>tb_mes_collect_job 기준 수집 잡 상태 및 수신 현황을 조회합니다.</p>
      </div>
    </header>

    <!-- 요약 카드 -->
    <section class="admin-ingestion__summary">
      <div class="surface-card">
        <span>전체 잡</span>
        <strong>{{ items.length }}</strong>
      </div>
      <div class="surface-card">
        <span>정상</span>
        <strong class="--normal">{{ normalCount }}</strong>
      </div>
      <div class="surface-card">
        <span>주의 / 오류</span>
        <strong class="--attention">{{ attentionCount }}</strong>
      </div>
      <div class="surface-card">
        <span>비활성</span>
        <strong>{{ disabledCount }}</strong>
      </div>
    </section>

    <!-- 필터 바 -->
    <section class="admin-ingestion__filters surface-card">
      <!-- 기간 프리셋 -->
      <div class="filter-group">
        <span class="filter-group__label">기간</span>
        <div class="filter-group__pills">
          <button
            v-for="p in PERIODS"
            :key="p.value"
            class="filter-pill"
            :class="{ 'filter-pill--active': period === p.value }"
            type="button"
            @click="period = p.value"
          >
            {{ p.label }}
          </button>
        </div>
        <template v-if="period === 'custom'">
          <input v-model="dateFrom" class="date-input" type="date" aria-label="시작일" />
          <span class="date-sep">~</span>
          <input v-model="dateTo" class="date-input" type="date" aria-label="종료일" />
        </template>
      </div>

      <!-- 상태 필터 -->
      <div class="filter-group">
        <span class="filter-group__label">상태</span>
        <div class="filter-group__pills">
          <button
            v-for="f in STATUS_FILTERS"
            :key="f.value"
            class="filter-pill"
            :class="{ 'filter-pill--active': statusFilter === f.value }"
            type="button"
            @click="statusFilter = f.value"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <!-- 키워드 검색 -->
      <BaseInput v-model="keyword" class="filter-search" type="search" placeholder="잡 이름, 담당, 유형 검색" />
    </section>

    <!-- 테이블 -->
    <section class="admin-ingestion__table surface-card">
      <p v-if="isLoading" class="state-msg">데이터를 불러오는 중입니다…</p>
      <p v-else-if="loadError" class="state-msg state-msg--error">
        {{ loadError }}
        <button type="button" class="retry-btn" @click="load">다시 시도</button>
      </p>
      <table v-else class="table">
        <thead>
          <tr>
            <th>수집 잡</th>
            <th>스케줄</th>
            <th>유형</th>
            <th>상태</th>
            <th>담당</th>
            <th>최근 수신</th>
            <th>수신량</th>
            <th>성공률</th>
            <th>비고</th>
            <th>갱신</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filteredItems.length === 0">
            <td colspan="10" class="empty">조건에 맞는 수집 잡이 없습니다.</td>
          </tr>
          <tr v-for="item in filteredItems" :key="item.id">
            <td class="cell-primary">{{ item.primary }}</td>
            <td>{{ item.secondary }}</td>
            <td class="cell-muted">{{ item.category }}</td>
            <td>
              <BaseBadge :variant="getAdminStatusVariant(item.status)">
                {{ getAdminStatusLabel(item.status) }}
              </BaseBadge>
            </td>
            <td>{{ item.owner }}</td>
            <td class="cell-mono">{{ metric(item, '최근 수신') }}</td>
            <td>{{ metric(item, '수신량') }}</td>
            <td>
              <span
                class="rate"
                :class="{
                  'rate--warn': parseFloat(metric(item, '성공률')) < 99,
                  'rate--error': parseFloat(metric(item, '성공률')) < 90,
                }"
                >{{ metric(item, '성공률') }}</span
              >
            </td>
            <td class="cell-muted">{{ metric(item, '비고') }}</td>
            <td class="cell-mono cell-muted">{{ formatKoMonthDayTime(item.updatedAt) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<style scoped>
.admin-ingestion {
  display: grid;
  gap: var(--space-4);
}

/* ── 헤더 ── */
.admin-ingestion__header h1 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--text-page-title-size);
  line-height: var(--text-page-title-line-height);
}
.admin-ingestion__header p {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

/* ── 요약 카드 ── */
.admin-ingestion__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}
.admin-ingestion__summary div {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3);
}
.admin-ingestion__summary span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}
.admin-ingestion__summary strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-xl);
}
.admin-ingestion__summary strong.--normal {
  color: var(--color-status-success);
}
.admin-ingestion__summary strong.--attention {
  color: var(--color-status-danger);
}

/* ── 필터 바 ── */
.admin-ingestion__filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
}
.filter-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.filter-group__label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}
.filter-group__pills {
  display: flex;
  gap: var(--space-1);
}

.filter-pill {
  padding: 3px 10px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  color: var(--color-fg-muted);
  font: inherit;
  font-size: var(--font-size-xs);
  cursor: pointer;
  white-space: nowrap;
}
.filter-pill--active {
  border-color: var(--color-action-primary);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
  font-weight: var(--font-weight-semibold);
}
.date-input {
  height: 28px;
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  color: var(--color-fg);
  font: inherit;
  font-size: var(--font-size-xs);
}
.date-sep {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}
.filter-search {
  margin-left: auto;
  width: min(100%, 240px);
}

/* ── 테이블 ── */
.admin-ingestion__table {
  padding: var(--space-4);
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}
.table th {
  padding: var(--space-2) var(--space-3);
  border-bottom: 2px solid var(--color-border-default);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-align: left;
  white-space: nowrap;
}
.table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border-subtle);
  color: var(--color-fg);
  vertical-align: middle;
}
.table tbody tr:hover td {
  background: var(--color-state-hover);
}

.cell-primary {
  font-weight: var(--font-weight-semibold);
  color: var(--color-fg-strong);
}
.cell-muted {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}
.cell-mono {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-xs);
}

.rate {
  font-weight: var(--font-weight-semibold);
  color: var(--color-status-success);
}
.rate--warn {
  color: var(--color-status-warning);
}
.rate--error {
  color: var(--color-status-danger);
}

.empty {
  padding: var(--space-8);
  text-align: center;
  color: var(--color-fg-muted);
}
.state-msg {
  margin: 0;
  padding: var(--space-4);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}
.state-msg--error {
  color: var(--color-status-danger);
}
.retry-btn {
  margin-left: var(--space-2);
  border: 0;
  background: transparent;
  color: var(--color-action-primary);
  font: inherit;
  font-size: var(--font-size-sm);
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}

@media (max-width: 900px) {
  .admin-ingestion__summary {
    grid-template-columns: repeat(2, 1fr);
  }
  .admin-ingestion__filters {
    flex-direction: column;
    align-items: flex-start;
  }
  .filter-search {
    margin-left: 0;
    width: 100%;
  }
}
</style>

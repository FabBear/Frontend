<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { useAuthStore } from '@/stores/auth';

import {
  type AdminMesCollectJob,
  type AdminMesHealth,
  fetchMesCollectJobs,
  fetchMesHealth,
} from '@/services/adminService';
import { fetchPresentationNow } from '@/services/clockService';

import BaseBadge from '@/components/base/BaseBadge.vue';
import KpiSparklineChart from '@/components/dashboard/KpiSparklineChart.vue';

import { type MetricValueFormat, formatKoMonthDayTime } from '@/utils/format';

const authStore = useAuthStore();
const currentFabId = computed(() => authStore.user?.fabId ?? '');

const health = ref<AdminMesHealth | null>(null);
const jobs = ref<AdminMesCollectJob[]>([]);
const showHistory = ref(true);
const isLoading = ref(false);
const loadError = ref<string | null>(null);

// ── 상태 필터 ──
const statusFilter = ref<'ALL' | 'SUCCESS' | 'FAILED' | 'RUNNING'>('ALL');
const STATUS_FILTERS: { value: 'ALL' | 'SUCCESS' | 'FAILED' | 'RUNNING'; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'SUCCESS', label: '성공' },
  { value: 'FAILED', label: '실패' },
  { value: 'RUNNING', label: '진행중' },
];

// ── 날짜 필터 ──
type DatePreset = 'all' | '7d' | '30d' | 'custom';
const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: 'custom', label: '직접 입력' },
];
const presentationNow = ref<Date>(new Date());
const datePreset = ref<DatePreset>('all');
const startDate = ref('');
const endDate = ref('');
const maxSelectableDate = computed(() => toDateInputValue(presentationNow.value));

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function applyDatePreset(preset: DatePreset) {
  datePreset.value = preset;
  if (preset === 'custom') return;
  if (preset === 'all') {
    startDate.value = '';
    endDate.value = '';
  } else {
    const days = preset === '7d' ? 7 : 30;
    const now = presentationNow.value;
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    startDate.value = toDateInputValue(start);
    endDate.value = toDateInputValue(now);
  }
}

// ── 페이지네이션 ──
const PAGE_SIZE = 15;
const PAGE_GROUP_SIZE = 10;
const currentPage = ref(0);

watch([statusFilter, startDate, endDate], () => {
  currentPage.value = 0;
});

// ── 필터링 + 페이지네이션 ──
function statusLabel(status: string): string {
  const map: Record<string, string> = {
    SUCCESS: '성공',
    FAILED: '실패',
    RUNNING: '진행중',
    RETRYING: '재시도',
    PENDING: '대기',
  };
  return map[status] ?? status;
}

function statusVariant(status: string): 'success' | 'danger' | 'warning' | 'info' {
  if (status === 'SUCCESS') return 'success';
  if (status === 'FAILED') return 'danger';
  if (status === 'RETRYING') return 'warning';
  return 'info';
}

const recentSuccessPct = computed(() => (health.value ? Math.round(health.value.recentSuccessRate * 100) : 0));

const filteredJobs = computed(() => {
  let result = jobs.value;
  if (statusFilter.value !== 'ALL') {
    if (statusFilter.value === 'RUNNING') {
      result = result.filter((j) => j.status === 'RUNNING' || j.status === 'RETRYING');
    } else {
      result = result.filter((j) => j.status === statusFilter.value);
    }
  }
  if (startDate.value) {
    result = result.filter((j) => !!j.scheduledAt && j.scheduledAt.slice(0, 10) >= startDate.value);
  }
  if (endDate.value) {
    result = result.filter((j) => !!j.scheduledAt && j.scheduledAt.slice(0, 10) <= endDate.value);
  }
  return result;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredJobs.value.length / PAGE_SIZE)));

const pagedJobs = computed(() => {
  const start = currentPage.value * PAGE_SIZE;
  return filteredJobs.value.slice(start, start + PAGE_SIZE);
});

const pageGroupStart = computed(() => Math.floor(currentPage.value / PAGE_GROUP_SIZE) * PAGE_GROUP_SIZE);
const pageGroupEnd = computed(() => Math.min(pageGroupStart.value + PAGE_GROUP_SIZE, totalPages.value));
const pageButtons = computed<number[]>(() =>
  Array.from({ length: pageGroupEnd.value - pageGroupStart.value }, (_, i) => pageGroupStart.value + i)
);

function handlePageChange(page: number) {
  if (page < 0 || page >= totalPages.value || page === currentPage.value) return;
  currentPage.value = page;
}

function handlePageGroupChange(direction: 'prev' | 'next') {
  const nextPage = direction === 'prev' ? pageGroupStart.value - PAGE_GROUP_SIZE : pageGroupEnd.value;
  handlePageChange(nextPage);
}

function fmt(value: string | null): string {
  return value ? formatKoMonthDayTime(value) : '-';
}

// 최신 20개를 시간순 정렬해 차트 데이터로 사용
const chartJobs = computed(() =>
  [...jobs.value]
    .sort((a, b) => {
      const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
      const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
      return ta - tb;
    })
    .slice(-20)
);

const chartLabels = computed(() =>
  chartJobs.value.map((j) => (j.scheduledAt ? formatKoMonthDayTime(j.scheduledAt) : '-'))
);

const collectedValues = computed(() => chartJobs.value.map((j) => j.collectedCount));
const errorValues = computed(() => chartJobs.value.map((j) => j.errorCount + j.retryCount));
const integerFormat: MetricValueFormat = 'integer';

async function load() {
  if (!currentFabId.value) {
    loadError.value = '현재 Fab 정보를 확인하지 못했습니다.';
    return;
  }
  isLoading.value = true;
  loadError.value = null;
  try {
    const [h, j] = await Promise.all([
      fetchMesHealth(currentFabId.value),
      fetchMesCollectJobs(currentFabId.value, 200),
    ]);
    health.value = h;
    jobs.value = j;
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '수집 작업 현황을 불러오지 못했습니다.';
    health.value = null;
    jobs.value = [];
  } finally {
    isLoading.value = false;
  }
}

onMounted(async () => {
  try {
    presentationNow.value = new Date(await fetchPresentationNow());
  } catch {
    // 시계 조회 실패 시 로컬 시각 기본값 유지
  }
  await load();
});
</script>

<template>
  <div class="admin-ingestion">
    <header class="admin-ingestion__header">
      <div>
        <h1>데이터 수집</h1>
        <p>MES 수집 스케줄러가 주기적으로 수집한 작업 현황입니다.</p>
      </div>
    </header>

    <section v-if="health" class="admin-ingestion__summary">
      <div class="surface-card">
        <span>전체 작업</span>
        <strong>{{ health.totalJobs }}</strong>
      </div>
      <div class="surface-card">
        <span>성공</span>
        <strong class="--success">{{ health.successCount }}</strong>
      </div>
      <div class="surface-card">
        <span>실패 / 진행</span>
        <strong class="--danger">{{ health.failedCount }} / {{ health.runningCount }}</strong>
      </div>
      <div class="surface-card">
        <span>최근 성공률</span>
        <strong>{{ recentSuccessPct }}%</strong>
        <small>최근 수집 {{ fmt(health.lastCollectAt) }} · {{ statusLabel(health.lastStatus) }}</small>
      </div>
    </section>

    <p v-if="isLoading" class="state-msg">수집 작업 현황을 불러오는 중입니다…</p>
    <p v-else-if="loadError" class="state-msg state-msg--error">
      {{ loadError }}
      <button type="button" class="retry-btn" @click="load">다시 시도</button>
    </p>

    <template v-else>
      <section class="admin-ingestion__charts">
        <div class="surface-card admin-ingestion__chart-card">
          <div class="admin-ingestion__chart-meta">
            <h2>수집 건수 추이</h2>
            <span>최근 {{ chartJobs.length }}회</span>
          </div>
          <div v-if="collectedValues.length < 2" class="state-msg">데이터가 부족합니다.</div>
          <div v-else class="admin-ingestion__chart-wrap">
            <KpiSparklineChart
              :values="collectedValues"
              color-token="--color-action-primary"
              :x-labels="chartLabels"
              :value-format="integerFormat"
              :show-axes="true"
            />
          </div>
        </div>

        <div class="surface-card admin-ingestion__chart-card">
          <div class="admin-ingestion__chart-meta">
            <h2>오류 / 재시도 추이</h2>
            <span>최근 {{ chartJobs.length }}회</span>
          </div>
          <div v-if="errorValues.length < 2" class="state-msg">데이터가 부족합니다.</div>
          <div v-else class="admin-ingestion__chart-wrap">
            <KpiSparklineChart
              :values="errorValues"
              color-token="--color-status-danger"
              :x-labels="chartLabels"
              :value-format="integerFormat"
              :show-axes="true"
            />
          </div>
        </div>
      </section>

      <section class="admin-ingestion__history surface-card">
        <!-- 아코디언 토글 헤더 -->
        <button class="admin-ingestion__history-toggle" type="button" @click="showHistory = !showHistory">
          <div class="admin-ingestion__history-toggle-left">
            <span class="admin-ingestion__history-title">수집 이력</span>
            <span class="admin-ingestion__history-count">
              {{ filteredJobs.length }}건
              <template v-if="filteredJobs.length !== jobs.length"> / 전체 {{ jobs.length }}건</template>
            </span>
          </div>
          <svg
            class="admin-ingestion__chevron"
            :class="{ 'admin-ingestion__chevron--open': showHistory }"
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <!-- 필터 바 (펼쳐질 때만 노출) -->
        <div v-show="showHistory" class="admin-ingestion__filter-bar">
          <div class="admin-ingestion__control-group">
            <span class="admin-ingestion__control-label">상태</span>
            <div class="admin-ingestion__seg-group" role="group" aria-label="상태 선택">
              <button
                v-for="f in STATUS_FILTERS"
                :key="f.value"
                class="admin-ingestion__seg-btn"
                :class="{ 'admin-ingestion__seg-btn--active': statusFilter === f.value }"
                type="button"
                @click="statusFilter = f.value"
              >
                {{ f.label }}
              </button>
            </div>
          </div>

          <div class="admin-ingestion__control-group">
            <span class="admin-ingestion__control-label">기간</span>
            <div class="admin-ingestion__seg-group" role="group" aria-label="기간 선택">
              <button
                v-for="opt in DATE_PRESETS"
                :key="opt.value"
                class="admin-ingestion__seg-btn"
                :class="{ 'admin-ingestion__seg-btn--active': datePreset === opt.value }"
                type="button"
                @click="applyDatePreset(opt.value)"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <template v-if="datePreset === 'custom'">
            <div class="admin-ingestion__control-group">
              <span class="admin-ingestion__control-label">시작일</span>
              <input
                v-model="startDate"
                type="date"
                class="admin-ingestion__date-input"
                :max="maxSelectableDate"
                aria-label="시작일"
              />
            </div>
            <div class="admin-ingestion__control-group">
              <span class="admin-ingestion__control-label">종료일</span>
              <input
                v-model="endDate"
                type="date"
                class="admin-ingestion__date-input"
                :max="maxSelectableDate"
                aria-label="종료일"
              />
            </div>
          </template>
        </div>

        <!-- 테이블 -->
        <div v-show="showHistory" class="admin-ingestion__table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>예정시각</th>
                <th>시작</th>
                <th>완료</th>
                <th>상태</th>
                <th>수집건수</th>
                <th>오류</th>
                <th>재시도</th>
                <th>오류 메시지</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pagedJobs.length === 0">
                <td colspan="8" class="empty">조건에 맞는 수집 작업이 없습니다.</td>
              </tr>
              <tr v-for="job in pagedJobs" :key="job.jobId">
                <td class="cell-mono">{{ fmt(job.scheduledAt) }}</td>
                <td class="cell-mono cell-muted">{{ fmt(job.startedAt) }}</td>
                <td class="cell-mono cell-muted">{{ fmt(job.completedAt) }}</td>
                <td>
                  <BaseBadge :variant="statusVariant(job.status)">{{ statusLabel(job.status) }}</BaseBadge>
                </td>
                <td>{{ job.collectedCount.toLocaleString() }}</td>
                <td :class="{ 'cell-error': job.errorCount > 0 }">{{ job.errorCount }}</td>
                <td>{{ job.retryCount }}</td>
                <td class="cell-muted">{{ job.lastErrorMsg || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 페이지네이션 -->
        <footer v-show="showHistory && totalPages > 1" class="admin-ingestion__pager">
          <div class="admin-ingestion__pager-group">
            <button
              class="admin-ingestion__pager-arrow"
              type="button"
              aria-label="이전 페이지 그룹"
              :disabled="pageGroupStart === 0"
              @click="handlePageGroupChange('prev')"
            >
              이전
            </button>
            <div class="admin-ingestion__pager-pages">
              <button
                v-for="page in pageButtons"
                :key="page"
                class="admin-ingestion__pager-page"
                :class="{ 'admin-ingestion__pager-page--active': page === currentPage }"
                type="button"
                :aria-current="page === currentPage ? 'page' : undefined"
                @click="handlePageChange(page)"
              >
                {{ page + 1 }}
              </button>
            </div>
            <button
              class="admin-ingestion__pager-arrow"
              type="button"
              aria-label="다음 페이지 그룹"
              :disabled="pageGroupEnd >= totalPages"
              @click="handlePageGroupChange('next')"
            >
              다음
            </button>
          </div>
          <span class="admin-ingestion__pager-info">
            {{ currentPage + 1 }} / {{ totalPages }} 페이지 · {{ filteredJobs.length }}건
          </span>
        </footer>
      </section>
    </template>
  </div>
</template>

<style scoped>
.admin-ingestion {
  display: grid;
  gap: var(--space-4);
}

/* Header */
.admin-ingestion__header {
  border-bottom: var(--border-width-default) solid var(--color-border-default);
  padding-bottom: var(--space-2);
}

.admin-ingestion__header h1 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--text-page-title-size);
  line-height: var(--text-page-title-line-height);
}

.admin-ingestion__header p {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

/* Summary cards */
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

.admin-ingestion__summary span,
.admin-ingestion__summary small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.admin-ingestion__summary small {
  font-size: var(--font-size-xs);
}

.admin-ingestion__summary strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-xl);
}

.admin-ingestion__summary strong.--success {
  color: var(--color-status-success);
}

.admin-ingestion__summary strong.--danger {
  color: var(--color-status-danger);
}

/* Charts */
.admin-ingestion__charts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.admin-ingestion__chart-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
}

.admin-ingestion__chart-meta {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
}

.admin-ingestion__chart-meta h2 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

.admin-ingestion__chart-meta span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.admin-ingestion__chart-wrap {
  height: 200px;
}

/* Expandable history */
.admin-ingestion__history {
  display: grid;
  padding: 0;
  overflow: hidden;
}

.admin-ingestion__history-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  width: 100%;
}

.admin-ingestion__history-toggle:hover {
  background: var(--color-state-hover);
}

.admin-ingestion__history-toggle-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.admin-ingestion__history-title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
}

.admin-ingestion__history-count {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.admin-ingestion__chevron {
  color: var(--color-fg-muted);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.admin-ingestion__chevron--open {
  transform: rotate(180deg);
}

/* Filter bar */
.admin-ingestion__filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  border-bottom: 1px solid var(--color-border-subtle);
  background: var(--color-bg-page);
}

.admin-ingestion__control-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.admin-ingestion__control-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  padding-left: 2px;
}

.admin-ingestion__seg-group {
  display: inline-flex;
  gap: 2px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  padding: 2px;
}

.admin-ingestion__seg-btn {
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  padding: 5px 10px;
  color: var(--color-fg-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  line-height: 1.4;
  transition:
    background 0.1s,
    color 0.1s;
}

.admin-ingestion__seg-btn:hover:not(.admin-ingestion__seg-btn--active) {
  background: var(--color-state-hover);
  color: var(--color-fg);
}

.admin-ingestion__seg-btn--active {
  background: var(--color-action-primary);
  color: var(--color-text-inverse);
}

.admin-ingestion__date-input {
  height: 34px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  color: var(--color-fg);
  cursor: pointer;
  font: inherit;
  font-size: var(--font-size-sm);
  padding: 0 var(--space-2);
  min-width: 138px;
  outline: none;
  transition: border-color 0.1s;
}

.admin-ingestion__date-input:focus {
  border-color: var(--color-action-primary-border);
  box-shadow: 0 0 0 3px var(--color-action-primary-subtle);
}

/* Table */
.admin-ingestion__table-wrap {
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

.cell-muted {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.cell-mono {
  font-family: var(--font-family-mono);
  font-size: var(--font-size-xs);
}

.cell-error {
  color: var(--color-status-danger);
  font-weight: var(--font-weight-semibold);
}

.empty {
  padding: var(--space-8);
  text-align: center;
  color: var(--color-fg-muted);
}

/* Pagination */
.admin-ingestion__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}

.admin-ingestion__pager-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.admin-ingestion__pager-pages {
  display: flex;
  gap: var(--space-1);
}

.admin-ingestion__pager-arrow,
.admin-ingestion__pager-page {
  min-width: 32px;
  min-height: 32px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  color: var(--color-fg);
  cursor: pointer;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  transition:
    border-color 0.1s,
    background 0.1s;
}

.admin-ingestion__pager-arrow {
  padding: 0 var(--space-2);
}

.admin-ingestion__pager-page--active {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
}

.admin-ingestion__pager-arrow:disabled,
.admin-ingestion__pager-page:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.admin-ingestion__pager-info {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

/* State */
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

/* Responsive */
@media (max-width: 900px) {
  .admin-ingestion__summary,
  .admin-ingestion__charts {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .admin-ingestion__summary,
  .admin-ingestion__charts {
    grid-template-columns: 1fr;
  }

  .admin-ingestion__filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

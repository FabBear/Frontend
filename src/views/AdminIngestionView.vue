<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { useAuthStore } from '@/stores/auth';

import {
  type AdminMesCollectJob,
  type AdminMesHealth,
  fetchMesCollectJobs,
  fetchMesHealth,
} from '@/services/adminService';

import BaseBadge from '@/components/base/BaseBadge.vue';

import { formatKoMonthDayTime } from '@/utils/format';

const authStore = useAuthStore();
const currentFabId = computed(() => authStore.user?.fabId ?? '');

const health = ref<AdminMesHealth | null>(null);
const jobs = ref<AdminMesCollectJob[]>([]);
const statusFilter = ref<'ALL' | 'SUCCESS' | 'FAILED' | 'RUNNING'>('ALL');
const isLoading = ref(false);
const loadError = ref<string | null>(null);

const STATUS_FILTERS: { value: 'ALL' | 'SUCCESS' | 'FAILED' | 'RUNNING'; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'SUCCESS', label: '성공' },
  { value: 'FAILED', label: '실패' },
  { value: 'RUNNING', label: '진행중' },
];

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
  if (statusFilter.value === 'ALL') return jobs.value;
  if (statusFilter.value === 'RUNNING') {
    return jobs.value.filter((j) => j.status === 'RUNNING' || j.status === 'RETRYING');
  }
  return jobs.value.filter((j) => j.status === statusFilter.value);
});

function fmt(value: string | null): string {
  return value ? formatKoMonthDayTime(value) : '-';
}

async function load() {
  if (!currentFabId.value) {
    loadError.value = '현재 Fab 정보를 확인하지 못했습니다.';
    return;
  }
  isLoading.value = true;
  loadError.value = null;
  try {
    const [h, j] = await Promise.all([fetchMesHealth(currentFabId.value), fetchMesCollectJobs(currentFabId.value, 50)]);
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

onMounted(load);
</script>

<template>
  <div class="admin-ingestion">
    <header class="admin-ingestion__header">
      <div>
        <h1>데이터 수집</h1>
        <p>MES 수집 스케줄러가 주기적으로 수집한 작업 현황입니다. (수집 주기·건수·성공률·실패/재시도)</p>
      </div>
    </header>

    <!-- 수집 health 요약 -->
    <section v-if="health" class="admin-ingestion__summary">
      <div class="surface-card">
        <span>전체 작업</span>
        <strong>{{ health.totalJobs }}</strong>
      </div>
      <div class="surface-card">
        <span>성공</span>
        <strong class="--normal">{{ health.successCount }}</strong>
      </div>
      <div class="surface-card">
        <span>실패 / 진행</span>
        <strong class="--attention">{{ health.failedCount }} / {{ health.runningCount }}</strong>
      </div>
      <div class="surface-card">
        <span>최근 성공률</span>
        <strong>{{ recentSuccessPct }}%</strong>
        <small>최근 수집 {{ fmt(health.lastCollectAt) }} · {{ statusLabel(health.lastStatus) }}</small>
      </div>
    </section>

    <!-- 필터 -->
    <section class="admin-ingestion__filters surface-card">
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
    </section>

    <!-- 작업 이력 표 -->
    <section class="admin-ingestion__table surface-card">
      <p v-if="isLoading" class="state-msg">수집 작업 현황을 불러오는 중입니다…</p>
      <p v-else-if="loadError" class="state-msg state-msg--error">
        {{ loadError }}
        <button type="button" class="retry-btn" @click="load">다시 시도</button>
      </p>
      <table v-else class="table">
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
          <tr v-if="filteredJobs.length === 0">
            <td colspan="8" class="empty">조건에 맞는 수집 작업이 없습니다.</td>
          </tr>
          <tr v-for="job in filteredJobs" :key="job.jobId">
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
    </section>
  </div>
</template>

<style scoped>
.admin-ingestion {
  display: grid;
  gap: var(--space-4);
}

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
.admin-ingestion__summary strong.--normal {
  color: var(--color-status-success);
}
.admin-ingestion__summary strong.--attention {
  color: var(--color-status-danger);
}

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
}
</style>

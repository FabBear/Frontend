<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Bot, Search, Sparkles } from '@lucide/vue';

import { buildReportPeriodContext } from '@/services/agentContextBuilders';
import { type AgentRunListItem, fetchAgentTask, listPeriodReports } from '@/services/agentTaskService';
import { fetchPresentationNow } from '@/services/clockService';
import { fetchActionHistory, fetchActionHistoryDetail } from '@/services/reportService';

import { useAgentTask } from '@/composables/useAgentTask';
import { useChatDrawer } from '@/composables/useChatDrawer';

import type { AgentTaskResponse } from '@/types/agentTask';
import type {
  ActionHistoryDetail,
  ActionHistoryFilters,
  ActionHistoryItem,
  ReportPageInfo,
  ReportSortOrder,
} from '@/types/report';

import AgentRunHistoryList from '@/components/agent/AgentRunHistoryList.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseInput from '@/components/base/BaseInput.vue';
import FabBearProgressLoader from '@/components/base/FabBearProgressLoader.vue';
import ActionHistoryDetailView from '@/components/report/ActionHistoryDetail.vue';
import ActionHistoryTable from '@/components/report/ActionHistoryTable.vue';

const route = useRoute();
const { runAgentTask, isAgentTaskRunning, agentTaskError } = useAgentTask();
const { openWithAgentTask, open: openChat } = useChatDrawer();

type PageButton = number | 'ellipsis-start' | 'ellipsis-end';
type ReportAgentIntent = 'monthly' | 'summary' | 'pattern' | 'retrospective' | 'qa';

const PAGE_GROUP_SIZE = 10;

const DEFAULT_PAGE_INFO: ReportPageInfo = {
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 0,
  sort: 'detectedAt,desc',
};

const items = ref<ActionHistoryItem[]>([]);
const pageInfo = ref<ReportPageInfo>({ ...DEFAULT_PAGE_INFO });
const initialReportType = route.query.reportType === 'ACTION' ? 'ACTION' : '';
function createDefaultFilters(
  reportType: ActionHistoryFilters['reportType'] = initialReportType
): ActionHistoryFilters {
  return {
    keyword: '',
    reportType,
    riskGrade: '',
    status: '',
    decision: '',
    pdf: '',
    startDate: '',
    endDate: '',
    sortOrder: 'DECIDED_DESC',
  };
}

const filters = ref<ActionHistoryFilters>(createDefaultFilters());
const quickRiskFilters: { label: string; value: ActionHistoryFilters['riskGrade'] }[] = [
  { label: '전체', value: '' },
  { label: 'Critical', value: 'CRITICAL' },
  { label: 'High', value: 'HIGH' },
];
const statusFilterOptions: { label: string; value: ActionHistoryFilters['status'] }[] = [
  { label: '전체', value: '' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Awaiting HITL', value: 'AWAITING_HITL' },
];
const decisionFilterOptions: { label: string; value: ActionHistoryFilters['decision'] }[] = [
  { label: '전체', value: '' },
  { label: '승인', value: 'APPROVED' },
  { label: '반려', value: 'REJECTED' },
];
type DatePreset = 'all' | '7d' | '30d' | 'custom';
const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: 'custom', label: '직접 입력' },
];
const datePreset = ref<DatePreset>('all');
// presentation(데모 2026) 기준 "현재 시각". 마운트 시 백엔드 시계로 보정한다.
const presentationNow = ref<Date>(new Date());
const selectedReportMonth = ref(toMonthValue(presentationNow.value));

const sortOptions: { label: string; value: ReportSortOrder }[] = [
  { label: '최신순', value: 'DECIDED_DESC' },
  { label: '오래된순', value: 'DECIDED_ASC' },
];

const activeFilterCount = computed(
  () =>
    [
      filters.value.reportType,
      filters.value.riskGrade,
      filters.value.status,
      filters.value.decision,
      filters.value.startDate,
      filters.value.endDate,
    ].filter((value) => value !== '').length
);

function applyFilter(update: Partial<ActionHistoryFilters>) {
  Object.assign(filters.value, update);
  handleApplyFilters();
}

function applyDatePreset(preset: DatePreset) {
  datePreset.value = preset;
  if (preset === 'custom') return;
  const now = presentationNow.value;
  const end = now.toISOString().split('T')[0];
  if (preset === 'all') {
    applyFilter({ startDate: '', endDate: '' });
  } else {
    const days = preset === '7d' ? 7 : 30;
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    applyFilter({ startDate: start.toISOString().split('T')[0], endDate: end });
  }
}

function toMonthValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  return `${year}-${month}`;
}

function monthToDateRange(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return selectedDateRange.value;
  const year = Number(match[1]);
  const monthNo = Number(match[2]);
  const lastDay = new Date(year, monthNo, 0).getDate();
  return {
    from: `${month}-01`,
    to: `${month}-${`${lastDay}`.padStart(2, '0')}`,
  };
}

function resetFilters() {
  const keyword = filters.value.keyword;
  const sortOrder = filters.value.sortOrder;
  filters.value = { ...createDefaultFilters(''), keyword, sortOrder };
  datePreset.value = 'all';
  selectedCaseId.value = null;
  selectedDetail.value = null;
  void loadHistory(0);
}

const selectedCaseId = ref<string | null>(null);
const selectedDetail = ref<ActionHistoryDetail | null>(null);
const isLoading = ref(false);
const isDetailLoading = ref(false);
const errorMessage = ref<string | null>(null);
const reportAgentTask = ref<AgentTaskResponse | null>(null);

const totalPages = computed(() => Math.max(1, pageInfo.value.totalPages));
const rangeText = computed(
  () => `아카이브 ${pageInfo.value.totalElements}건 · ${pageInfo.value.page + 1}/${totalPages.value} 페이지`
);
const selectedDateRange = computed(() => {
  if (filters.value.startDate || filters.value.endDate) {
    return {
      from: filters.value.startDate || '시작일 미지정',
      to: filters.value.endDate || '종료일 미지정',
    };
  }
  if (items.value.length > 0) {
    const dates = items.value.map((item) => item.detectedAt).sort();
    return { from: dates[0]?.slice(0, 10) ?? '전체', to: dates.at(-1)?.slice(0, 10) ?? '전체' };
  }
  return { from: '전체', to: '전체' };
});
const selectedMonthlyDateRange = computed(() => monthToDateRange(selectedReportMonth.value));
const selectedMonthlyLabel = computed(() => {
  const match = /^(\d{4})-(\d{2})$/.exec(selectedReportMonth.value);
  if (!match) return '월 미지정';
  return `${match[1]}년 ${Number(match[2])}월`;
});
const pageGroupStart = computed(() => Math.floor(pageInfo.value.page / PAGE_GROUP_SIZE) * PAGE_GROUP_SIZE);
const pageGroupEnd = computed(() => Math.min(pageGroupStart.value + PAGE_GROUP_SIZE, totalPages.value));
const pageButtons = computed<PageButton[]>(() => {
  return Array.from({ length: pageGroupEnd.value - pageGroupStart.value }, (_, index) => pageGroupStart.value + index);
});

async function loadHistory(page = 0) {
  isLoading.value = true;
  errorMessage.value = null;

  try {
    const data = await fetchActionHistory({ ...filters.value, page, size: pageInfo.value.size });
    items.value = data.items;
    pageInfo.value = data.pageInfo;
    // 목록 로드 후 자동 선택 없음 — 사용자가 직접 클릭해야 상세 표시
  } catch {
    errorMessage.value = '리포트 아카이브를 불러오지 못했습니다.';
    items.value = [];
  } finally {
    isLoading.value = false;
  }
}

async function handleSelect(caseId: string) {
  selectedCaseId.value = caseId;
  isDetailLoading.value = true;

  try {
    selectedDetail.value = await fetchActionHistoryDetail(caseId);
  } finally {
    isDetailLoading.value = false;
  }
}

function handleCloseDetail() {
  selectedCaseId.value = null;
  selectedDetail.value = null;
}

function handleApplyFilters() {
  selectedCaseId.value = null;
  selectedDetail.value = null;
  void loadHistory(0);
}

function handlePageChange(nextPage: number) {
  if (nextPage < 0 || nextPage >= totalPages.value || nextPage === pageInfo.value.page) return;
  void loadHistory(nextPage);
}

function handlePageGroupChange(direction: 'prev' | 'next') {
  const nextPage = direction === 'prev' ? pageGroupStart.value - PAGE_GROUP_SIZE : pageGroupEnd.value;
  handlePageChange(nextPage);
}

async function runReportAgent(intent: ReportAgentIntent, detail: ActionHistoryDetail | null = selectedDetail.value) {
  // 선택 리포트 질의(qa)는 별도 Agent task 이력 없이 챗 전용으로 진입한다(챗봇이 케이스/리포트를 직접 그라운딩).
  if (intent === 'qa') {
    openChat();
    return;
  }

  const dateRange = intent === 'monthly' ? selectedMonthlyDateRange.value : selectedDateRange.value;
  const params: Record<string, unknown> = {
    intent,
    dateRange,
  };
  if (intent === 'monthly') {
    params.periodType = 'MONTHLY';
    params.month = selectedReportMonth.value;
    params.reportTone = 'EXECUTIVE';
    params.useLlm = true;
  }

  const task = await runAgentTask({
    taskType: 'REPORT_PERIOD_SUMMARY',
    sourcePage: 'REPORT_ARCHIVE',
    context: buildReportPeriodContext({
      filters: filters.value,
      dateRange,
      items: items.value,
      selectedDetail: detail,
    }),
    params,
  });

  if (task) {
    reportAgentTask.value = task;
    if (task.status === 'SUCCEEDED') openWithAgentTask(task);
    void loadReportHistory();
  }
}

const reportHistory = ref<AgentRunListItem[]>([]);
const reportHistoryLoading = ref(false);

async function loadReportHistory() {
  reportHistoryLoading.value = true;
  try {
    const result = await listPeriodReports(0, 20);
    reportHistory.value = result.items;
  } catch {
    reportHistory.value = [];
  } finally {
    reportHistoryLoading.value = false;
  }
}

async function openReportFromHistory(item: AgentRunListItem) {
  try {
    reportAgentTask.value = await fetchAgentTask(item.id, 'REPORT_PERIOD_SUMMARY');
  } catch {
    // 미리보기 로드 실패 시 기존 상태 유지
  }
}

onMounted(async () => {
  try {
    presentationNow.value = new Date(await fetchPresentationNow());
    selectedReportMonth.value = toMonthValue(presentationNow.value);
  } catch {
    // 시계 조회 실패 시 로컬 시각 기본값 유지
  }
  void loadReportHistory();
  await loadHistory();
  const targetId = route.query.caseId;
  if (typeof targetId === 'string' && targetId) {
    await handleSelect(targetId);
  }
});
</script>

<template>
  <div class="action-history-view">
    <header class="action-history-view__header">
      <div>
        <h1>리포트 아카이브</h1>
        <p>완료된 병목 케이스의 대응 결과, HITL 이력을 조건별로 찾아봅니다.</p>
      </div>
      <span>{{ rangeText }}</span>
    </header>

    <section class="action-history-view__filters surface-card">
      <div class="action-history-view__search-row">
        <div class="action-history-view__search-field">
          <Search :size="16" aria-hidden="true" />
          <BaseInput
            v-model="filters.keyword"
            type="search"
            placeholder="TG명, Area, 대응안, 담당자 검색..."
            @keydown.enter="handleApplyFilters"
          />
        </div>
        <BaseButton size="md" class="action-history-view__search-button" @click="handleApplyFilters">
          리포트 검색
        </BaseButton>
      </div>

      <!-- 기간·필터 컨트롤 -->
      <div class="action-history-view__filter-controls">
        <div class="action-history-view__control-group">
          <span class="action-history-view__control-label">기간</span>
          <div class="action-history-view__seg-group" role="group" aria-label="기간 선택">
            <button
              v-for="opt in DATE_PRESETS"
              :key="opt.value"
              type="button"
              class="action-history-view__seg-btn"
              :class="{ 'action-history-view__seg-btn--active': datePreset === opt.value }"
              @click="applyDatePreset(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <template v-if="datePreset === 'custom'">
          <div class="action-history-view__control-group">
            <span class="action-history-view__control-label">시작일</span>
            <input
              v-model="filters.startDate"
              type="date"
              class="action-history-view__date-input"
              aria-label="시작일"
              @change="handleApplyFilters"
            />
          </div>
          <div class="action-history-view__control-group">
            <span class="action-history-view__control-label">종료일</span>
            <input
              v-model="filters.endDate"
              type="date"
              class="action-history-view__date-input"
              aria-label="종료일"
              @change="handleApplyFilters"
            />
          </div>
        </template>

        <div class="action-history-view__control-group">
          <span class="action-history-view__control-label">위험도</span>
          <div class="action-history-view__seg-group" role="group" aria-label="위험도 선택">
            <button
              v-for="opt in quickRiskFilters"
              :key="opt.value"
              type="button"
              class="action-history-view__seg-btn"
              :class="{ 'action-history-view__seg-btn--active': filters.riskGrade === opt.value }"
              @click="applyFilter({ riskGrade: opt.value })"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="action-history-view__control-group">
          <span class="action-history-view__control-label">상태</span>
          <div class="action-history-view__seg-group" role="group" aria-label="상태 선택">
            <button
              v-for="opt in statusFilterOptions"
              :key="opt.value"
              type="button"
              class="action-history-view__seg-btn"
              :class="{ 'action-history-view__seg-btn--active': filters.status === opt.value }"
              @click="applyFilter({ status: opt.value })"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div class="action-history-view__control-group">
          <span class="action-history-view__control-label">승인결과</span>
          <div class="action-history-view__seg-group" role="group" aria-label="승인결과 선택">
            <button
              v-for="opt in decisionFilterOptions"
              :key="opt.value"
              type="button"
              class="action-history-view__seg-btn"
              :class="{ 'action-history-view__seg-btn--active': filters.decision === opt.value }"
              @click="applyFilter({ decision: opt.value })"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <button
          type="button"
          class="action-history-view__reset-button"
          :class="{ 'action-history-view__reset-button--active': activeFilterCount > 0 }"
          :disabled="activeFilterCount === 0"
          @click="resetFilters"
        >
          초기화
        </button>
      </div>

      <div class="action-history-view__agent-actions">
        <label class="action-history-view__month-picker">
          <span>월간</span>
          <input v-model="selectedReportMonth" type="month" aria-label="월간 브리핑 대상 월" />
        </label>
        <button type="button" :disabled="isAgentTaskRunning || !selectedReportMonth" @click="runReportAgent('monthly')">
          <Sparkles :size="14" aria-hidden="true" />
          월간 운영 브리핑
        </button>
        <button type="button" :disabled="isAgentTaskRunning || items.length === 0" @click="runReportAgent('summary')">
          <Sparkles :size="14" aria-hidden="true" />
          기간 요약 보고서
        </button>
        <button type="button" :disabled="isAgentTaskRunning || items.length === 0" @click="runReportAgent('pattern')">
          반복 병목 패턴
        </button>
        <button
          type="button"
          :disabled="isAgentTaskRunning || items.length === 0"
          @click="runReportAgent('retrospective')"
        >
          조치 효과 회고
        </button>
        <button type="button" :disabled="isAgentTaskRunning || !selectedDetail" @click="runReportAgent('qa')">
          <Bot :size="14" aria-hidden="true" />
          선택 리포트 질의
        </button>
        <span>{{
          isAgentTaskRunning
            ? 'AI Agent가 리포트 묶음을 분석 중입니다...'
            : `${selectedMonthlyLabel} · ${selectedDateRange.from} ~ ${selectedDateRange.to}`
        }}</span>
      </div>
    </section>

    <section v-if="reportAgentTask || agentTaskError" class="action-history-view__agent-preview surface-card">
      <div class="action-history-view__agent-preview-head">
        <div>
          <span>AI Agent Preview</span>
          <h2>{{ reportAgentTask?.result?.artifacts?.[0]?.title ?? '분석 상태' }}</h2>
        </div>
        <BaseButton
          v-if="reportAgentTask?.status === 'SUCCEEDED'"
          variant="ghost"
          size="sm"
          @click="openWithAgentTask(reportAgentTask)"
        >
          대화로 이어가기
        </BaseButton>
      </div>
      <p v-if="agentTaskError" class="action-history-view__state action-history-view__state--error">
        {{ agentTaskError }}
      </p>
      <template v-else-if="reportAgentTask?.result">
        <p>{{ reportAgentTask.result.summary }}</p>
        <div class="action-history-view__agent-grid">
          <div v-for="item in reportAgentTask.result.evidence" :key="`${item.label}-${item.value}`">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <em>{{ item.description }}</em>
          </div>
        </div>
        <div class="action-history-view__agent-directions">
          <span v-for="direction in reportAgentTask.result.responseDirections" :key="direction.title">
            <strong>{{ direction.title }}</strong>
            {{ direction.description }}
          </span>
        </div>
      </template>
    </section>

    <AgentRunHistoryList
      title="지난 리포트 실행 이력"
      :items="reportHistory"
      :loading="reportHistoryLoading"
      @select="openReportFromHistory"
    />

    <p v-if="errorMessage" class="action-history-view__state action-history-view__state--error">{{ errorMessage }}</p>

    <div class="action-history-view__body" :class="{ 'action-history-view__body--split': selectedDetail !== null }">
      <section class="action-history-view__table surface-card">
        <div class="action-history-view__section-header">
          <div>
            <h2>케이스 리포트</h2>
            <p>케이스를 선택하면 오른쪽에 상세 리포트가 표시됩니다.</p>
          </div>
          <label class="action-history-view__sort-control">
            <span>정렬</span>
            <select v-model="filters.sortOrder" class="input" aria-label="정렬 기준" @change="handleApplyFilters">
              <option v-for="option in sortOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>
        <ActionHistoryTable
          :items="items"
          :loading="isLoading"
          :selected-case-id="selectedCaseId"
          :compact="selectedDetail !== null"
          @select="handleSelect"
        />
        <footer class="action-history-view__pager">
          <div class="action-history-view__pager-group">
            <button
              class="action-history-view__pager-arrow"
              type="button"
              aria-label="이전 페이지 그룹"
              :disabled="pageGroupStart === 0 || isLoading"
              @click="handlePageGroupChange('prev')"
            >
              이전
            </button>
            <div class="action-history-view__pager-pages" aria-label="리포트 아카이브 페이지">
              <template v-for="page in pageButtons" :key="page">
                <span v-if="typeof page === 'string'" class="action-history-view__pager-ellipsis" aria-hidden="true"
                  >...</span
                >
                <button
                  v-else
                  class="action-history-view__pager-page"
                  :class="{ 'action-history-view__pager-page--active': page === pageInfo.page }"
                  type="button"
                  :aria-current="page === pageInfo.page ? 'page' : undefined"
                  :disabled="isLoading"
                  @click="handlePageChange(page)"
                >
                  {{ page + 1 }}
                </button>
              </template>
            </div>
            <button
              class="action-history-view__pager-arrow"
              type="button"
              aria-label="다음 페이지 그룹"
              :disabled="pageGroupEnd >= totalPages || isLoading"
              @click="handlePageGroupChange('next')"
            >
              다음
            </button>
          </div>
        </footer>
      </section>

      <div v-if="selectedDetail !== null" class="action-history-view__detail-panel surface-card">
        <FabBearProgressLoader v-if="isDetailLoading" tone="panel" label="상세 리포트를 불러오는 중입니다" />
        <ActionHistoryDetailView
          v-else
          :detail="selectedDetail"
          :ai-busy="isAgentTaskRunning"
          @ask-ai="runReportAgent('qa', $event)"
          @back="handleCloseDetail"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.action-history-view {
  display: grid;
  gap: var(--space-4);
}

.action-history-view__header,
.action-history-view__pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
}

.action-history-view__header h1,
.action-history-view__header p,
.action-history-view__section-header h2,
.action-history-view__section-header p,
.action-history-view__table h2,
.action-history-view__state {
  margin: 0;
}

.action-history-view__header h1 {
  color: var(--color-fg-strong);
  font-size: var(--text-page-title-size);
  line-height: var(--text-page-title-line-height);
}

.action-history-view__header p,
.action-history-view__header span,
.action-history-view__state {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

.action-history-view__state--error {
  color: var(--color-status-danger);
}

.action-history-view__filters {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
}

.action-history-view__search-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.action-history-view__search-field {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  flex: 1;
  min-height: 42px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-page);
  padding: 0 var(--space-3);
  color: var(--color-fg-muted);
}

.action-history-view__search-field :deep(.input) {
  height: 40px;
  border: 0;
  background: transparent;
  box-shadow: none;
  font-size: var(--font-size-base);
}

.action-history-view__search-button {
  flex-shrink: 0;
  min-height: 42px;
  border-radius: var(--radius-lg);
  padding-right: var(--space-4);
  padding-left: var(--space-4);
}

/* ── 필터 컨트롤 (세그먼트 버튼 패턴) ── */
.action-history-view__filter-controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-3);
}

.action-history-view__control-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.action-history-view__control-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  padding-left: 2px;
}

.action-history-view__seg-group {
  display: inline-flex;
  gap: 2px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  padding: 2px;
}

.action-history-view__seg-btn {
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

.action-history-view__seg-btn:hover:not(.action-history-view__seg-btn--active) {
  background: var(--color-state-hover);
  color: var(--color-fg);
}

.action-history-view__seg-btn--active {
  background: var(--color-action-primary);
  color: var(--color-text-inverse);
}

.action-history-view__date-input {
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

.action-history-view__date-input:focus {
  border-color: var(--color-action-primary-border);
  box-shadow: 0 0 0 3px var(--color-action-primary-subtle);
}

/* ── reset button ── */
.action-history-view__reset-button {
  height: 36px;
  align-self: flex-end;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: transparent;
  color: var(--color-fg-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  padding: 0 var(--space-3);
  transition:
    border-color 0.1s,
    color 0.1s,
    background 0.1s;
  white-space: nowrap;
}

.action-history-view__reset-button:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled, 0.45);
}

.action-history-view__reset-button--active {
  border-color: var(--color-action-primary);
  color: var(--color-action-primary);
}

.action-history-view__reset-button--active:hover {
  background: var(--color-action-primary-soft);
}

.action-history-view__agent-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  border-top: 1px solid var(--color-border-subtle);
  padding-top: var(--space-3);
}

.action-history-view__agent-actions button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 34px;
  border: 1px solid var(--color-login-panel-border);
  border-radius: var(--radius-md);
  background: var(--color-login-panel-bg);
  color: var(--color-action-primary);
  cursor: pointer;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  padding: 0 var(--space-3);
}

.action-history-view__agent-actions button:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.action-history-view__month-picker {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 34px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  padding: 0 var(--space-2);
}

.action-history-view__month-picker input {
  width: 118px;
  border: 0;
  background: transparent;
  color: var(--color-fg);
  font: inherit;
  font-size: var(--font-size-sm);
  outline: none;
}

.action-history-view__agent-actions span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.action-history-view__agent-preview {
  display: grid;
  gap: var(--space-3);
  border: var(--border-width-default) solid color-mix(in srgb, var(--color-gold) 36%, var(--color-border-default));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-gold) 6%, var(--color-bg-card));
  padding: var(--space-4);
}

.action-history-view__agent-preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.action-history-view__agent-preview-head span {
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.action-history-view__agent-preview-head h2,
.action-history-view__agent-preview p {
  margin: 0;
}

.action-history-view__agent-preview-head h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

.action-history-view__agent-preview p {
  color: var(--color-fg);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
}

.action-history-view__agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-2);
}

.action-history-view__agent-grid div,
.action-history-view__agent-directions span {
  display: grid;
  gap: 3px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  padding: var(--space-3);
}

.action-history-view__agent-grid span,
.action-history-view__agent-directions {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.action-history-view__agent-grid strong,
.action-history-view__agent-directions strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}

.action-history-view__agent-grid em,
.action-history-view__agent-directions span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-style: normal;
  line-height: 1.45;
}

.action-history-view__agent-directions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--space-2);
}

.action-history-view__table {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
}

.action-history-view__section-header h2,
.action-history-view__compare h2,
.action-history-view__table h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}

.action-history-view__section-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-3);
}

.action-history-view__section-header p {
  margin-top: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.action-history-view__sort-control {
  display: grid;
  min-width: 150px;
  gap: var(--space-1);
}

.action-history-view__sort-control span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.action-history-view__sort-control select {
  min-height: 34px;
}

.action-history-view__pager {
  display: flex;
  justify-content: center;
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border-subtle);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.action-history-view__pager-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
}

.action-history-view__pager-pages {
  display: flex;
  min-width: 0;
  justify-content: center;
  gap: var(--space-1);
}

.action-history-view__pager-arrow,
.action-history-view__pager-page {
  min-width: 32px;
  min-height: 32px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  color: var(--color-fg);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.action-history-view__pager-arrow {
  padding: 0 var(--space-2);
}

.action-history-view__pager-page--active {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
}

.action-history-view__pager-arrow:disabled,
.action-history-view__pager-page:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.action-history-view__pager-ellipsis {
  display: inline-flex;
  min-width: 24px;
  align-items: center;
  justify-content: center;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

@media (max-width: 720px) {
  .action-history-view__search-row {
    flex-wrap: wrap;
  }

  .action-history-view__search-field {
    flex: 1 1 100%;
  }
}

@media (max-width: 720px) {
  .action-history-view__section-header {
    align-items: stretch;
    flex-direction: column;
  }
}

/* ── 바디: 테이블 + 상세 패널 분할 ── */
.action-history-view__body {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  align-items: start;
  min-width: 0;
}

.action-history-view__body--split {
  grid-template-columns: 1fr 2fr;
}

.action-history-view__detail-panel {
  position: sticky;
  top: var(--space-4);
  max-height: calc(100svh - 160px);
  overflow-y: auto;
  padding: var(--space-4);
  display: grid;
  gap: var(--space-4);
}

@media (max-width: 1100px) {
  .action-history-view__body--split {
    grid-template-columns: 1fr;
  }

  .action-history-view__detail-panel {
    position: static;
    max-height: none;
  }
}
</style>

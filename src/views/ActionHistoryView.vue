<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Search, Sparkles } from '@lucide/vue';

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

import BaseButton from '@/components/base/BaseButton.vue';
import BaseInput from '@/components/base/BaseInput.vue';
import FabBearProgressLoader from '@/components/base/FabBearProgressLoader.vue';
import ActionHistoryDetailView from '@/components/report/ActionHistoryDetail.vue';
import ActionHistoryTable from '@/components/report/ActionHistoryTable.vue';
import IssueReportDetail from '@/components/report/IssueReportDetail.vue';

const route = useRoute();
const { runAgentTask, isAgentTaskRunning, agentTaskError } = useAgentTask();
const { openWithAgentTask, openWithCasePrompt } = useChatDrawer();

type PageButton = number | 'ellipsis-start' | 'ellipsis-end';
type ReportArchiveTab = 'case' | 'monthly' | 'period';
type PeriodReportIntentFilter = 'MONTHLY' | 'SUMMARY';

const PAGE_GROUP_SIZE = 10;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
const reportTabs: { key: ReportArchiveTab; label: string }[] = [
  { key: 'case', label: '케이스 리포트' },
  { key: 'monthly', label: '월간 이슈 브리핑' },
  { key: 'period', label: '기간 이슈 보고서' },
];
const activeTab = ref<ReportArchiveTab>(resolveInitialTab());
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
type PeriodIssueDatePreset = '7d' | '30d' | 'custom';
const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: 'custom', label: '직접 입력' },
];
const PERIOD_ISSUE_DATE_PRESETS: { value: PeriodIssueDatePreset; label: string }[] = [
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: 'custom', label: '직접 입력' },
];
const datePreset = ref<DatePreset>('all');
// presentation(데모 2026) 기준 "현재 시각". 마운트 시 백엔드 시계로 보정한다.
const presentationNow = ref<Date>(new Date());
const periodIssueRange = ref({ from: '', to: '' });
const periodIssueDatePreset = ref<PeriodIssueDatePreset>('30d');

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
const maxSelectableDate = computed(() => toDateInputValue(presentationNow.value));
const isPeriodIssueRangeInvalid = computed(() => {
  const { from, to } = periodIssueRange.value;
  if (!from || !to) return true;
  if (from > to) return true;
  return from > maxSelectableDate.value || to > maxSelectableDate.value;
});

function resolveInitialTab(): ReportArchiveTab {
  const tab = route.query.tab;
  if (tab === 'monthly' || tab === 'monthlyIssue') return 'monthly';
  if (tab === 'period' || tab === 'periodIssue') return 'period';
  return 'case';
}

function applyFilter(update: Partial<ActionHistoryFilters>) {
  Object.assign(filters.value, update);
  handleApplyFilters();
}

function applyDatePreset(preset: DatePreset) {
  datePreset.value = preset;
  if (preset === 'custom') return;
  const now = presentationNow.value;
  const end = toDateInputValue(now);
  if (preset === 'all') {
    applyFilter({ startDate: '', endDate: '' });
  } else {
    const days = preset === '7d' ? 7 : 30;
    const start = new Date(now);
    start.setDate(start.getDate() - days);
    applyFilter({ startDate: toDateInputValue(start), endDate: end });
  }
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rangeFromRelativeDays(days: number, now = presentationNow.value) {
  const end = toDateInputValue(now);
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  return {
    from: toDateInputValue(start),
    to: end,
  };
}

function applyPeriodIssueDatePreset(preset: PeriodIssueDatePreset) {
  periodIssueDatePreset.value = preset;
  reportListError.value = null;
  if (preset === 'custom') return;
  const days = preset === '7d' ? 7 : 30;
  periodIssueRange.value = rangeFromRelativeDays(days);
}

function initializePeriodIssueRange(now: Date) {
  periodIssueDatePreset.value = '30d';
  periodIssueRange.value = {
    ...rangeFromRelativeDays(30, now),
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
const selectedReportItem = ref<AgentRunListItem | null>(null);
const monthlyReports = ref<AgentRunListItem[]>([]);
const periodReports = ref<AgentRunListItem[]>([]);
const monthlyReportsLoading = ref(false);
const periodReportsLoading = ref(false);
const isReportDetailLoading = ref(false);
const monthlyReportTotal = ref(0);
const periodReportTotal = ref(0);
const reportListError = ref<string | null>(null);

const totalPages = computed(() => Math.max(1, pageInfo.value.totalPages));
const rangeText = computed(
  () => `아카이브 ${pageInfo.value.totalElements}건 · ${pageInfo.value.page + 1}/${totalPages.value} 페이지`
);
const archiveRangeText = computed(() => {
  if (activeTab.value === 'monthly') return `월간 ${monthlyReportTotal.value}건`;
  if (activeTab.value === 'period') return `기간 ${periodReportTotal.value}건`;
  return rangeText.value;
});
const pageGroupStart = computed(() => Math.floor(pageInfo.value.page / PAGE_GROUP_SIZE) * PAGE_GROUP_SIZE);
const pageGroupEnd = computed(() => Math.min(pageGroupStart.value + PAGE_GROUP_SIZE, totalPages.value));
const pageButtons = computed<PageButton[]>(() => {
  return Array.from({ length: pageGroupEnd.value - pageGroupStart.value }, (_, index) => pageGroupStart.value + index);
});

function switchTab(tab: ReportArchiveTab) {
  activeTab.value = tab;
  reportListError.value = null;
  reportAgentTask.value = null;
  selectedReportItem.value = null;
}

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

async function runPeriodIssueReport(detail: ActionHistoryDetail | null = selectedDetail.value) {
  reportListError.value = null;
  if (isPeriodIssueRangeInvalid.value) {
    reportListError.value = '조회 가능한 기간 안에서 시작일과 종료일을 다시 선택해주세요.';
    return;
  }

  const dateRange = {
    from: periodIssueRange.value.from,
    to: periodIssueRange.value.to,
  };
  const params: Record<string, unknown> = {
    intent: 'summary',
    dateRange,
    periodType: 'CUSTOM',
    reportTone: 'OPERATIONS',
    useLlm: true,
  };

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
    await loadPeriodReports();
    const created = periodReports.value.find((item) => item.id === task.taskId);
    selectedReportItem.value = created ?? {
      id: task.taskId,
      taskType: 'REPORT_PERIOD_SUMMARY',
      status: task.status,
      summary: task.result?.summary ?? null,
      reportIntent: 'SUMMARY',
      periodFrom: dateRange.from,
      periodTo: dateRange.to,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    };
    reportAgentTask.value = task;
  }
}

async function loadReportList(intent: PeriodReportIntentFilter) {
  if (intent === 'MONTHLY') monthlyReportsLoading.value = true;
  if (intent === 'SUMMARY') periodReportsLoading.value = true;
  reportListError.value = null;
  try {
    const result = await listPeriodReports(0, 20, intent);
    if (intent === 'MONTHLY') {
      monthlyReports.value = result.items;
      monthlyReportTotal.value = result.pageInfo.total;
    } else {
      periodReports.value = result.items;
      periodReportTotal.value = result.pageInfo.total;
    }
  } catch {
    if (intent === 'MONTHLY') {
      monthlyReports.value = [];
      monthlyReportTotal.value = 0;
    } else {
      periodReports.value = [];
      periodReportTotal.value = 0;
    }
    reportListError.value = '이슈 보고서 목록을 불러오지 못했습니다.';
  } finally {
    if (intent === 'MONTHLY') monthlyReportsLoading.value = false;
    if (intent === 'SUMMARY') periodReportsLoading.value = false;
  }
}

function loadMonthlyReports() {
  return loadReportList('MONTHLY');
}

function loadPeriodReports() {
  return loadReportList('SUMMARY');
}

async function openReportFromHistory(item: AgentRunListItem) {
  selectedReportItem.value = item;
  isReportDetailLoading.value = true;
  try {
    reportAgentTask.value = await fetchAgentTask(item.id, 'REPORT_PERIOD_SUMMARY');
  } catch {
    reportAgentTask.value = null;
  } finally {
    isReportDetailLoading.value = false;
  }
}

function handleCloseReportDetail() {
  selectedReportItem.value = null;
  reportAgentTask.value = null;
}

async function handleOpenReportReference(ref: string) {
  if (!selectedReportItem.value) return;
  const from = formatReportDateInput(selectedReportItem.value.periodFrom);
  const to = formatReportDateInput(selectedReportItem.value.periodTo);
  const normalizedRef = ref.trim();
  activeTab.value = 'case';
  datePreset.value = 'custom';
  filters.value.startDate = from;
  filters.value.endDate = to;
  filters.value.keyword = UUID_RE.test(normalizedRef) ? '' : normalizedRef;
  selectedCaseId.value = null;
  selectedDetail.value = null;
  selectedReportItem.value = null;
  reportAgentTask.value = null;
  await loadHistory(0);

  if (UUID_RE.test(normalizedRef)) {
    try {
      await handleSelect(normalizedRef);
    } catch {
      errorMessage.value = '연결된 케이스 리포트를 불러오지 못했습니다.';
    }
    return;
  }

  const compactRef = normalizedRef.toLowerCase();
  const match = items.value.find((item) =>
    [item.caseId, item.tgName, item.targetTgText, item.areaName].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(compactRef)
    )
  );
  if (match) {
    await handleSelect(match.caseId);
  } else {
    errorMessage.value = '선택한 기간에서 연결된 케이스 리포트를 찾지 못했습니다.';
  }
}

function askAiAboutDetail(detail: ActionHistoryDetail) {
  const label = detail.tgName || detail.targetTgText || detail.caseId || '선택 케이스';
  openWithCasePrompt({
    caseId: detail.caseId ?? null,
    caseLabel: label,
    sourcePage: 'REPORT_ARCHIVE',
    title: `${label} 리포트 질의`,
    prompt: `${label} 케이스 리포트를 요약하고 핵심 원인·대응안을 설명해줘.`,
  });
}

function reportIntentLabel(intent: string | null | undefined) {
  if (intent === 'MONTHLY') return '월간 이슈 브리핑';
  return '기간 이슈 보고서';
}

function reportStatusLabel(status: AgentRunListItem['status']) {
  if (status === 'SUCCEEDED') return '완료';
  if (status === 'FAILED') return '실패';
  if (status === 'RUNNING') return '생성 중';
  return '대기';
}

function reportStatusClass(status: AgentRunListItem['status']) {
  return `action-history-view__report-status--${status.toLowerCase()}`;
}

function formatReportDate(value: string | null | undefined) {
  const parts = getKstDateParts(value);
  if (!parts) return '미지정';
  return `${parts.year}.${String(parts.month).padStart(2, '0')}.${String(parts.day).padStart(2, '0')}`;
}

function formatReportDateInput(value: string | null | undefined) {
  const parts = getKstDateParts(value);
  if (!parts) return '';
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function getKstDateParts(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function formatReportPeriod(item: AgentRunListItem) {
  return `${formatReportDate(item.periodFrom)} ~ ${formatReportDate(item.periodTo)}`;
}

function formatRunDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16).replace('T', ' ');
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function reportRowTitle(item: AgentRunListItem) {
  if (item.reportIntent === 'MONTHLY') {
    const parts = getKstDateParts(item.periodFrom);
    return parts ? `${parts.year}년 ${parts.month}월 보고서` : '월간 보고서';
  }
  return `${formatReportPeriod(item)} 기간 이슈 보고서`;
}

function reportRowSummary(item: AgentRunListItem) {
  return item.summary || `${reportIntentLabel(item.reportIntent)}가 ${reportStatusLabel(item.status)} 상태입니다.`;
}

onMounted(async () => {
  try {
    presentationNow.value = new Date(await fetchPresentationNow());
  } catch {
    // 시계 조회 실패 시 로컬 시각 기본값 유지
  }
  initializePeriodIssueRange(presentationNow.value);
  void loadMonthlyReports();
  void loadPeriodReports();
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
        <p>케이스 리포트와 월간/기간 이슈 보고서를 분리해서 확인합니다.</p>
      </div>
      <span>{{ archiveRangeText }}</span>
    </header>

    <nav class="action-history-view__tabs" role="tablist" aria-label="리포트 아카이브 탭">
      <button
        v-for="tab in reportTabs"
        :key="tab.key"
        type="button"
        role="tab"
        class="action-history-view__tab"
        :class="{ 'action-history-view__tab--active': activeTab === tab.key }"
        :aria-selected="activeTab === tab.key"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <p v-if="agentTaskError" class="action-history-view__state action-history-view__state--error">
      {{ agentTaskError }}
    </p>

    <template v-if="activeTab === 'case'">
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
                :max="maxSelectableDate"
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
                :max="maxSelectableDate"
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
      </section>

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
            @ask-ai="askAiAboutDetail"
            @back="handleCloseDetail"
          />
        </div>
      </div>
    </template>

    <template v-else-if="activeTab === 'monthly'">
      <div
        class="action-history-view__body"
        :class="{ 'action-history-view__body--split': selectedReportItem !== null }"
      >
        <section class="action-history-view__report-panel surface-card">
          <div class="action-history-view__section-header">
            <div>
              <h2>월간 이슈 브리핑</h2>
              <p>매월 1일 전월 기준으로 자동 생성된 사용자 소유 보고서입니다.</p>
            </div>
            <BaseButton variant="ghost" size="sm" :loading="monthlyReportsLoading" @click="loadMonthlyReports">
              새로고침
            </BaseButton>
          </div>

          <p v-if="reportListError" class="action-history-view__state action-history-view__state--error">
            {{ reportListError }}
          </p>
          <FabBearProgressLoader
            v-if="monthlyReportsLoading"
            tone="panel"
            label="월간 이슈 브리핑을 불러오는 중입니다"
          />
          <p v-else-if="monthlyReports.length === 0" class="action-history-view__empty">
            아직 생성된 월간 이슈 브리핑이 없습니다.
          </p>
          <div v-else class="action-history-view__report-list">
            <button
              v-for="item in monthlyReports"
              :key="item.id"
              type="button"
              class="action-history-view__report-row"
              :class="{ 'action-history-view__report-row--active': selectedReportItem?.id === item.id }"
              @click="openReportFromHistory(item)"
            >
              <span class="action-history-view__report-type">{{ reportIntentLabel(item.reportIntent) }}</span>
              <strong>{{ reportRowTitle(item) }}</strong>
              <span>{{ formatReportPeriod(item) }} · 생성 {{ formatRunDate(item.createdAt) }}</span>
              <p>{{ reportRowSummary(item) }}</p>
              <em class="action-history-view__report-status" :class="reportStatusClass(item.status)">
                {{ reportStatusLabel(item.status) }}
              </em>
            </button>
          </div>
        </section>

        <div v-if="selectedReportItem !== null" class="action-history-view__detail-panel surface-card">
          <IssueReportDetail
            :task="reportAgentTask"
            :item="selectedReportItem"
            :loading="isReportDetailLoading"
            @ask-ai="openWithAgentTask"
            @back="handleCloseReportDetail"
            @open-reference="handleOpenReportReference"
          />
        </div>
      </div>
    </template>

    <template v-else>
      <div
        class="action-history-view__body"
        :class="{ 'action-history-view__body--split': selectedReportItem !== null }"
      >
        <section class="action-history-view__report-panel surface-card">
          <div class="action-history-view__section-header">
            <div>
              <h2>기간 이슈 보고서</h2>
              <p>시작일과 종료일을 선택해 기간 이슈 보고서를 생성합니다.</p>
            </div>
            <BaseButton variant="ghost" size="sm" :loading="periodReportsLoading" @click="loadPeriodReports">
              새로고침
            </BaseButton>
          </div>

          <form class="action-history-view__period-form" @submit.prevent="runPeriodIssueReport()">
            <div class="action-history-view__control-group action-history-view__period-preset">
              <span class="action-history-view__control-label">기간</span>
              <div class="action-history-view__seg-group" role="group" aria-label="기간 이슈 보고서 기간 선택">
                <button
                  v-for="opt in PERIOD_ISSUE_DATE_PRESETS"
                  :key="opt.value"
                  type="button"
                  class="action-history-view__seg-btn"
                  :class="{ 'action-history-view__seg-btn--active': periodIssueDatePreset === opt.value }"
                  @click="applyPeriodIssueDatePreset(opt.value)"
                >
                  {{ opt.label }}
                </button>
              </div>
            </div>
            <label>
              <span>시작일</span>
              <input
                v-model="periodIssueRange.from"
                type="date"
                class="action-history-view__date-input"
                :max="maxSelectableDate"
                @change="periodIssueDatePreset = 'custom'"
              />
            </label>
            <label>
              <span>종료일</span>
              <input
                v-model="periodIssueRange.to"
                type="date"
                class="action-history-view__date-input"
                :max="maxSelectableDate"
                @change="periodIssueDatePreset = 'custom'"
              />
            </label>
            <BaseButton type="submit" size="md" :loading="isAgentTaskRunning" :disabled="isPeriodIssueRangeInvalid">
              <Sparkles :size="14" aria-hidden="true" />
              기간 이슈 보고서 생성
            </BaseButton>
          </form>

          <p v-if="reportListError" class="action-history-view__state action-history-view__state--error">
            {{ reportListError }}
          </p>
          <FabBearProgressLoader
            v-if="periodReportsLoading"
            tone="panel"
            label="기간 이슈 보고서를 불러오는 중입니다"
          />
          <p v-else-if="periodReports.length === 0" class="action-history-view__empty">
            아직 생성된 기간 이슈 보고서가 없습니다.
          </p>
          <div v-else class="action-history-view__report-list">
            <button
              v-for="item in periodReports"
              :key="item.id"
              type="button"
              class="action-history-view__report-row"
              :class="{ 'action-history-view__report-row--active': selectedReportItem?.id === item.id }"
              @click="openReportFromHistory(item)"
            >
              <span class="action-history-view__report-type">{{ reportIntentLabel(item.reportIntent) }}</span>
              <strong>{{ reportRowTitle(item) }}</strong>
              <span>{{ formatReportPeriod(item) }} · 생성 {{ formatRunDate(item.createdAt) }}</span>
              <p>{{ reportRowSummary(item) }}</p>
              <em class="action-history-view__report-status" :class="reportStatusClass(item.status)">
                {{ reportStatusLabel(item.status) }}
              </em>
            </button>
          </div>
        </section>

        <div v-if="selectedReportItem !== null" class="action-history-view__detail-panel surface-card">
          <IssueReportDetail
            :task="reportAgentTask"
            :item="selectedReportItem"
            :loading="isReportDetailLoading"
            @ask-ai="openWithAgentTask"
            @back="handleCloseReportDetail"
            @open-reference="handleOpenReportReference"
          />
        </div>
      </div>
    </template>
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

.action-history-view__tabs {
  display: flex;
  gap: 0;
  overflow-x: auto;
  max-width: 100%;
  border-bottom: var(--border-width-default) solid var(--color-border-default);
}

.action-history-view__tab {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--color-fg-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  padding: var(--space-2) var(--space-4);
  white-space: nowrap;
  transition:
    border-color 0.1s,
    color 0.1s;
}

.action-history-view__tab:hover:not(.action-history-view__tab--active) {
  color: var(--color-fg);
}

.action-history-view__tab--active {
  border-bottom-color: var(--color-action-primary);
  color: var(--color-action-primary);
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

.action-history-view__report-panel {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-4);
}

.action-history-view__period-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--space-3);
  border-top: 1px solid var(--color-border-subtle);
  border-bottom: 1px solid var(--color-border-subtle);
  padding: var(--space-3) 0;
}

.action-history-view__period-form label {
  display: grid;
  gap: var(--space-1);
}

.action-history-view__period-preset {
  align-self: flex-end;
}

.action-history-view__period-form label > span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.action-history-view__empty {
  margin: 0;
  border: 1px dashed var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  padding: var(--space-5);
  text-align: center;
}

.action-history-view__report-list {
  display: grid;
  gap: var(--space-2);
}

.action-history-view__report-row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-1) var(--space-3);
  min-height: 108px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: var(--space-3) var(--space-4);
  text-align: left;
  transition:
    border-color 0.12s,
    background 0.12s,
    box-shadow 0.12s,
    transform 0.12s;
}

.action-history-view__report-row:hover {
  border-color: var(--color-action-primary-border);
  background: color-mix(in srgb, var(--color-action-primary-soft) 35%, var(--color-bg-card));
  box-shadow: var(--shadow-sm);
  transform: translateY(-1px);
}

.action-history-view__report-row--active {
  border-color: var(--color-action-primary-border);
  box-shadow: inset 3px 0 0 var(--color-action-primary);
}

.action-history-view__report-type,
.action-history-view__report-row > span:not(.action-history-view__report-type) {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.action-history-view__report-row strong {
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-history-view__report-row p {
  display: -webkit-box;
  grid-column: 1 / -1;
  margin: 2px 0 0;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.action-history-view__report-type {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.action-history-view__report-status {
  align-self: start;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-style: normal;
  font-weight: var(--font-weight-bold);
  grid-column: 2;
  grid-row: 1 / span 2;
  padding: 3px 9px;
}

.action-history-view__report-status--succeeded {
  border-color: color-mix(in srgb, var(--color-status-success) 48%, var(--color-border-default));
  background: color-mix(in srgb, var(--color-status-success) 10%, transparent);
  color: var(--color-status-success);
}

.action-history-view__report-status--running,
.action-history-view__report-status--queued {
  border-color: color-mix(in srgb, var(--color-action-primary) 48%, var(--color-border-default));
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
}

.action-history-view__report-status--failed {
  border-color: color-mix(in srgb, var(--color-status-danger) 48%, var(--color-border-default));
  background: color-mix(in srgb, var(--color-status-danger) 8%, transparent);
  color: var(--color-status-danger);
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
  .action-history-view__tabs {
    width: 100%;
  }

  .action-history-view__search-row {
    flex-wrap: wrap;
  }

  .action-history-view__search-field {
    flex: 1 1 100%;
  }

  .action-history-view__period-form {
    align-items: stretch;
    flex-direction: column;
  }

  .action-history-view__period-form label {
    width: 100%;
  }

  .action-history-view__period-preset {
    align-self: stretch;
  }

  .action-history-view__report-row {
    grid-template-columns: minmax(0, 1fr);
  }

  .action-history-view__report-status {
    grid-column: auto;
    grid-row: auto;
    justify-self: start;
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

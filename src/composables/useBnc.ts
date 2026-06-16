import { computed, ref } from 'vue';

import {
  decideBncHitl,
  fetchBncActionPlans,
  fetchBncCaseDetail,
  fetchBncCases,
  fetchBncCauseAnalysis,
  fetchBncReport,
} from '@/services/bncService';

import { BNC_STATUS_META, BNC_TAB_OPTIONS } from '@/constants/bnc';
import { MOCK_BNC_CASE_DETAILS, MOCK_BNC_CASE_LIST } from '@/constants/mockData/bnc';
import { MOCK_BNC_ACTION_PLANS, MOCK_BNC_CAUSE_ANALYSIS, MOCK_BNC_REPORTS } from '@/constants/mockData/bncArtifacts';
import { shouldUseDemoMockData } from '@/constants/mockMode';

import type {
  BncActionPlansPayload,
  BncAlertCase,
  BncCaseDetail,
  BncCaseListData,
  BncCaseStatus,
  BncCauseAnalysis,
  BncPageInfo,
  BncReportPayload,
  BncTabId,
} from '@/types/bnc';

const DEFAULT_TAB: BncTabId = 'progress';
const CASE_PAGE_SIZE = 10;
const TOTAL_BNC_STEPS = 6;
const USE_BNC_MOCK_DATA = shouldUseDemoMockData() || import.meta.env.VITE_USE_BNC_MOCK_DATA === 'true';
const DEFAULT_PAGE_INFO: BncPageInfo = {
  page: 0,
  size: CASE_PAGE_SIZE,
  totalElements: 0,
  totalPages: 0,
  sort: 'detectedAt,desc',
};
type PageButton = number | 'ellipsis-start' | 'ellipsis-end';

function cloneMock<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getMockCasesPage(nextPage: number): BncCaseListData {
  // 병목 대응 센터는 Critical로 판명된 케이스만 노출한다.
  const criticalItems = MOCK_BNC_CASE_LIST.items.filter((item) => item.riskGrade === 'CRITICAL');
  const totalElements = criticalItems.length;
  const startIndex = nextPage * CASE_PAGE_SIZE;
  const items = criticalItems.slice(startIndex, startIndex + CASE_PAGE_SIZE);

  return {
    items: cloneMock(items),
    pageInfo: {
      page: nextPage,
      size: CASE_PAGE_SIZE,
      totalElements,
      totalPages: Math.max(1, Math.ceil(totalElements / CASE_PAGE_SIZE)),
      sort: MOCK_BNC_CASE_LIST.pageInfo.sort,
    },
  };
}

function getMockCaseDetail(caseId: string): BncCaseDetail | null {
  return cloneMock(MOCK_BNC_CASE_DETAILS[caseId] ?? null);
}

function getMockCaseArtifacts(caseId: string) {
  return {
    cause: cloneMock(MOCK_BNC_CAUSE_ANALYSIS[caseId] ?? null),
    actions: cloneMock(MOCK_BNC_ACTION_PLANS[caseId] ?? null),
    report: cloneMock(MOCK_BNC_REPORTS[caseId] ?? null),
  };
}

function normalizeCaseStatus(status: string): BncCaseStatus {
  const normalized = status.toUpperCase();
  if (
    normalized === 'DETECTED' ||
    normalized === 'ANALYZING' ||
    normalized === 'AWAITING_HITL' ||
    normalized === 'RESOLVED'
  ) {
    return normalized;
  }
  return 'DETECTED';
}

function normalizeRiskGrade(riskGrade: string): BncAlertCase['riskGrade'] {
  const normalized = riskGrade.toUpperCase();
  if (normalized === 'CRITICAL' || normalized === 'HIGH' || normalized === 'MEDIUM') {
    return normalized;
  }
  return 'MEDIUM';
}

function resolveCurrentStepName(detail: BncCaseDetail): string | null {
  const activeStep = [...detail.agentProgress]
    .filter((step) => step.status === 'RUNNING' || step.status === 'IN_PROGRESS' || step.status === 'FAILED')
    .sort((a, b) => b.stepOrder - a.stepOrder)[0];
  if (activeStep) return activeStep.stepName;

  return (
    [...detail.agentProgress].filter((step) => step.status === 'DONE').sort((a, b) => b.stepOrder - a.stepOrder)[0]
      ?.stepName ?? null
  );
}

function resolveStepProgress(detail: BncCaseDetail): number {
  return Math.max(0, ...detail.agentProgress.filter((step) => step.status === 'DONE').map((step) => step.stepOrder));
}

export function useBnc(initialCaseId?: string | null, initialTab?: string | null) {
  const cases = ref<BncAlertCase[]>([]);
  const selectedCaseId = ref<string | null>(initialCaseId ?? null);
  const activeTab = ref<BncTabId>(isBncTabId(initialTab) ? initialTab : DEFAULT_TAB);
  const selectedCaseDetail = ref<BncCaseDetail | null>(null);
  const selectedCauseAnalysis = ref<BncCauseAnalysis | null>(null);
  const selectedActionPlans = ref<BncActionPlansPayload | null>(null);
  const selectedReport = ref<BncReportPayload | null>(null);
  const isLoading = ref(false);
  const isDetailLoading = ref(false);
  const isArtifactLoading = ref(false);
  const isDecisionSubmitting = ref(false);
  const errorMessage = ref<string | null>(null);
  const detailErrorMessage = ref<string | null>(null);
  const artifactErrorMessage = ref<string | null>(null);
  const page = ref(0);
  const pageInfo = ref<BncPageInfo>({ ...DEFAULT_PAGE_INFO });

  const sortedCases = computed(() =>
    [...cases.value].sort((a, b) => {
      const statusDiff = BNC_STATUS_META[a.status].priority - BNC_STATUS_META[b.status].priority;
      if (statusDiff !== 0) return statusDiff;
      if (b.bottleneckProb !== a.bottleneckProb) return b.bottleneckProb - a.bottleneckProb;
      return b.detectedAt.localeCompare(a.detectedAt);
    })
  );

  const selectedCase = computed(() => {
    if (selectedCaseId.value) {
      return sortedCases.value.find((item) => item.caseId === selectedCaseId.value) ?? null;
    }
    return sortedCases.value[0] ?? null;
  });

  const highPriorityCount = computed(
    () =>
      cases.value.filter(
        (item) => item.status !== 'RESOLVED' && (item.riskGrade === 'CRITICAL' || item.status === 'AWAITING_HITL')
      ).length
  );
  const totalPages = computed(() => Math.max(1, pageInfo.value.totalPages));
  const pageButtons = computed<PageButton[]>(() => {
    const total = totalPages.value;
    const current = page.value;
    const edgePageCount = 1;
    const siblingCount = 1;

    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index);
    }

    const startPage = Math.max(edgePageCount, current - siblingCount);
    const endPage = Math.min(total - edgePageCount - 1, current + siblingCount);
    const pages: PageButton[] = [0];

    if (startPage > edgePageCount) {
      pages.push('ellipsis-start');
    }

    for (let nextPage = startPage; nextPage <= endPage; nextPage += 1) {
      pages.push(nextPage);
    }

    if (endPage < total - edgePageCount - 1) {
      pages.push('ellipsis-end');
    }

    pages.push(total - 1);
    return pages;
  });

  async function loadCases(nextPage = page.value) {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      if (USE_BNC_MOCK_DATA) {
        const data = getMockCasesPage(nextPage);
        cases.value = data.items;
        pageInfo.value = data.pageInfo;
        page.value = data.pageInfo.page;

        if (!selectedCaseId.value) {
          selectedCaseId.value = sortedCases.value[0]?.caseId ?? null;
        }

        return;
      }

      // 병목 대응 센터는 Critical로 판명된 케이스만 노출한다.
      const data = await fetchBncCases({ page: nextPage, size: CASE_PAGE_SIZE, riskGrade: 'CRITICAL' });
      cases.value = data.items;
      pageInfo.value = data.pageInfo;
      page.value = data.pageInfo.page;

      if (!selectedCaseId.value) {
        selectedCaseId.value = sortedCases.value[0]?.caseId ?? null;
      }
    } catch {
      const data = getMockCasesPage(nextPage);
      cases.value = data.items;
      pageInfo.value = data.pageInfo;
      page.value = data.pageInfo.page;
      selectedCaseId.value ??= sortedCases.value[0]?.caseId ?? null;
      errorMessage.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  async function loadCaseDetail(caseId: string | null = selectedCaseId.value) {
    if (!caseId) {
      selectedCaseDetail.value = null;
      detailErrorMessage.value = null;
      return;
    }

    isDetailLoading.value = true;
    detailErrorMessage.value = null;

    try {
      if (USE_BNC_MOCK_DATA) {
        selectedCaseDetail.value = getMockCaseDetail(caseId);
        if (selectedCaseDetail.value) ensureCaseInList(selectedCaseDetail.value);
        detailErrorMessage.value = selectedCaseDetail.value ? null : 'Agent 진행 상세가 없습니다.';
        return;
      }

      selectedCaseDetail.value = await fetchBncCaseDetail(caseId);
      ensureCaseInList(selectedCaseDetail.value);
    } catch {
      selectedCaseDetail.value = getMockCaseDetail(caseId);
      if (selectedCaseDetail.value) ensureCaseInList(selectedCaseDetail.value);
      detailErrorMessage.value = selectedCaseDetail.value ? null : 'Agent 진행 상세를 불러오지 못했습니다.';
    } finally {
      isDetailLoading.value = false;
    }
  }

  async function loadCaseArtifacts(caseId: string | null = selectedCaseId.value, tab: BncTabId = activeTab.value) {
    if (!caseId) {
      selectedCauseAnalysis.value = null;
      selectedActionPlans.value = null;
      selectedReport.value = null;
      artifactErrorMessage.value = null;
      return;
    }

    isArtifactLoading.value = true;
    artifactErrorMessage.value = null;

    try {
      if (USE_BNC_MOCK_DATA) {
        const { cause, actions, report } = getMockCaseArtifacts(caseId);
        if (tab === 'cause') selectedCauseAnalysis.value = cause;
        if (tab === 'solutions') selectedActionPlans.value = actions;
        if (tab === 'report') selectedReport.value = report;
        artifactErrorMessage.value =
          (tab === 'cause' && cause) || (tab === 'solutions' && actions) || (tab === 'report' && report)
            ? null
            : 'Agent 산출물이 없습니다.';
        return;
      }

      if (tab === 'cause') {
        selectedCauseAnalysis.value = await fetchBncCauseAnalysis(caseId);
        return;
      }
      if (tab === 'solutions') {
        selectedActionPlans.value = await fetchBncActionPlans(caseId);
        return;
      }
      if (tab === 'report') {
        selectedReport.value = await fetchBncReport(caseId);
      }
    } catch {
      const { cause, actions, report } = getMockCaseArtifacts(caseId);
      if (tab === 'cause') selectedCauseAnalysis.value = cause;
      if (tab === 'solutions') selectedActionPlans.value = actions;
      if (tab === 'report') selectedReport.value = report;
      artifactErrorMessage.value =
        (tab === 'cause' && cause) || (tab === 'solutions' && actions) || (tab === 'report' && report)
          ? null
          : `${BNC_TAB_OPTIONS.find((item) => item.id === tab)?.label ?? 'Agent'} 산출물을 불러오지 못했습니다.`;
    } finally {
      isArtifactLoading.value = false;
    }
  }

  // HITL 결정 후 FastAPI가 보고서를 비동기 생성하므로 최대 90초 동안 5초 간격으로 polling
  async function pollReport(caseId: string, maxAttempts = 18, intervalMs = 5000) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      try {
        const report = await fetchBncReport(caseId);
        if (report && (report.reportV1 || report.reportHtml || report.finalReport)) {
          selectedReport.value = report;
          artifactErrorMessage.value = null;
          return;
        }
      } catch {
        // 아직 생성 중 — 계속 polling
      }
    }
  }

  async function submitHitlDecision(
    payload: { decision: 'APPROVED' | 'REJECTED'; selectedPlanId: string | null; comment?: string | null },
    caseId: string | null = selectedCaseId.value
  ) {
    if (!caseId) return;

    isDecisionSubmitting.value = true;
    artifactErrorMessage.value = null;

    try {
      if (USE_BNC_MOCK_DATA) {
        const currentActions = selectedActionPlans.value ?? getMockCaseArtifacts(caseId).actions;

        if (currentActions) {
          selectedActionPlans.value = {
            ...currentActions,
            hitlStatus: {
              hasDecision: true,
              latestDecision: payload.decision,
              selectedPlanId: payload.selectedPlanId,
              comment: payload.comment ?? null,
            },
          };
        }

        return;
      }

      await decideBncHitl(caseId, payload);
      await Promise.all([loadCaseDetail(caseId), loadCases(page.value)]);
      // 결정 직후 보고서 탭으로 전환하고 보고서가 생성될 때까지 polling
      selectTab('report');
      void pollReport(caseId);
    } catch {
      artifactErrorMessage.value = '승인/반려 결정을 저장하지 못했습니다.';
    } finally {
      isDecisionSubmitting.value = false;
    }
  }

  function selectCase(caseId: string) {
    selectedCaseId.value = caseId;
  }

  function selectTab(tabId: BncTabId) {
    activeTab.value = tabId;
  }

  function ensureCaseInList(detail: BncCaseDetail) {
    if (cases.value.some((item) => item.caseId === detail.caseId)) return;
    cases.value = [toAlertCase(detail), ...cases.value];
  }

  function toAlertCase(detail: BncCaseDetail): BncAlertCase {
    return {
      caseId: detail.caseId,
      tgId: detail.tgId,
      tgName: detail.tgName,
      areaName: detail.areaName,
      riskGrade: normalizeRiskGrade(detail.riskGrade),
      bottleneckProb: detail.bottleneckProb,
      riskScore: detail.riskScore,
      utilizationRate: detail.agentSummary.maxUtilizationRate ?? 0,
      wipCount: detail.agentSummary.maxWipCount ?? 0,
      detectedAt: detail.detectedAt,
      status: normalizeCaseStatus(detail.status),
      currentStepName: resolveCurrentStepName(detail),
      stepProgress: resolveStepProgress(detail),
      totalSteps: TOTAL_BNC_STEPS,
    };
  }

  async function handlePageChange(nextPage: number) {
    if (nextPage < 0 || nextPage >= totalPages.value || nextPage === page.value) return;
    await loadCases(nextPage);
    await loadCaseDetail();
  }

  return {
    isMockMode: USE_BNC_MOCK_DATA,
    tabOptions: BNC_TAB_OPTIONS,
    cases: sortedCases,
    selectedCaseId,
    selectedCase,
    selectedCaseDetail,
    selectedCauseAnalysis,
    selectedActionPlans,
    selectedReport,
    activeTab,
    highPriorityCount,
    pageInfo,
    totalPages,
    pageButtons,
    isLoading,
    isDetailLoading,
    isArtifactLoading,
    isDecisionSubmitting,
    errorMessage,
    detailErrorMessage,
    artifactErrorMessage,
    loadCases,
    loadCaseDetail,
    loadCaseArtifacts,
    handlePageChange,
    submitHitlDecision,
    selectCase,
    selectTab,
  };
}

export function isBncTabId(value: unknown): value is BncTabId {
  return value === 'progress' || value === 'cause' || value === 'solutions' || value === 'report';
}

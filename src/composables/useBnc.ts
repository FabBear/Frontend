import { computed, ref, watch } from 'vue';

import axios from 'axios';

import { latestCaseProgress } from '@/composables/useCaseProgress';

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
import { shouldUsePresentationScenario } from '@/constants/scenarioMode';

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
const USE_BNC_PRESENTATION_SCENARIO = shouldUsePresentationScenario() || import.meta.env.VITE_USE_PRESENTATION_SCENARIO === 'true';
const DEFAULT_PAGE_INFO: BncPageInfo = {
  page: 0,
  size: CASE_PAGE_SIZE,
  totalElements: 0,
  totalPages: 0,
  sort: 'detectedAt,desc',
};
type PageButton = number | 'ellipsis-start' | 'ellipsis-end';

function cloneScenario<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getScenarioCasesPage(nextPage: number): BncCaseListData {
  // 병목 대응 센터는 Critical로 판명된 케이스만 노출한다.
  const criticalItems = MOCK_BNC_CASE_LIST.items.filter((item) => item.riskGrade === 'CRITICAL');
  const totalElements = criticalItems.length;
  const startIndex = nextPage * CASE_PAGE_SIZE;
  const items = criticalItems.slice(startIndex, startIndex + CASE_PAGE_SIZE);

  return {
    items: cloneScenario(items),
    pageInfo: {
      page: nextPage,
      size: CASE_PAGE_SIZE,
      totalElements,
      totalPages: Math.max(1, Math.ceil(totalElements / CASE_PAGE_SIZE)),
      sort: MOCK_BNC_CASE_LIST.pageInfo.sort,
    },
  };
}

function getScenarioCaseDetail(caseId: string): BncCaseDetail | null {
  return cloneScenario(MOCK_BNC_CASE_DETAILS[caseId] ?? null);
}

function getScenarioCaseArtifacts(caseId: string) {
  return {
    cause: cloneScenario(MOCK_BNC_CAUSE_ANALYSIS[caseId] ?? null),
    actions: cloneScenario(MOCK_BNC_ACTION_PLANS[caseId] ?? null),
    report: cloneScenario(MOCK_BNC_REPORTS[caseId] ?? null),
  };
}

function normalizeCaseStatus(status: string): BncCaseStatus {
  const normalized = status.toUpperCase();
  if (
    normalized === 'DETECTED' ||
    normalized === 'ANALYZING' ||
    normalized === 'AWAITING_HITL' ||
    normalized === 'RESOLVED' ||
    normalized === 'EXPIRED' ||
    normalized === 'NOT_ACTIONABLE'
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
  // 완료(DONE)뿐 아니라 진행 중·실패 등 '시작된' 단계까지 카운트 — 백엔드 step_progress와 동일 기준.
  // 대기(PENDING/WAITING)만 제외해, 첫 단계(확산영향분석)가 진행 중이어도 1로 표시되게 한다.
  return Math.max(
    0,
    ...detail.agentProgress
      .filter((step) => step.status !== 'PENDING' && step.status !== 'WAITING')
      .map((step) => step.stepOrder)
  );
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
  const hitlErrorMessage = ref<string | null>(null);
  const hitlSubmitMessage = ref<string | null>(null);
  let _hitlMsgTimer: ReturnType<typeof setTimeout> | null = null;
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
        (item) =>
          item.status !== 'RESOLVED' &&
          item.status !== 'EXPIRED' &&
          item.status !== 'NOT_ACTIONABLE' &&
          (item.riskGrade === 'CRITICAL' || item.status === 'AWAITING_HITL')
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
      if (USE_BNC_PRESENTATION_SCENARIO) {
        const data = getScenarioCasesPage(nextPage);
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
      const data = getScenarioCasesPage(nextPage);
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
      if (USE_BNC_PRESENTATION_SCENARIO) {
        selectedCaseDetail.value = getScenarioCaseDetail(caseId);
        if (selectedCaseDetail.value) ensureCaseInList(selectedCaseDetail.value);
        detailErrorMessage.value = selectedCaseDetail.value ? null : 'Agent 진행 상세가 없습니다.';
        return;
      }

      selectedCaseDetail.value = await fetchBncCaseDetail(caseId);
      ensureCaseInList(selectedCaseDetail.value);
    } catch {
      selectedCaseDetail.value = getScenarioCaseDetail(caseId);
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
      if (USE_BNC_PRESENTATION_SCENARIO) {
        const { cause, actions, report } = getScenarioCaseArtifacts(caseId);
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
        try {
          selectedReport.value = await fetchBncReport(caseId);
        } catch (error) {
          // 404/E-REPORT-001 = 아직 생성 전(HITL 대기 또는 생성 진행 중). 에러가 아니라 '생성 중' 빈 상태로 두고
          // 백그라운드 폴링으로 완료되면 자동 표시한다. 그 외 오류만 바깥 catch(시나리오 폴백)로 넘긴다.
          if (isReportNotReady(error)) {
            selectedReport.value = null;
            artifactErrorMessage.value = null;
            void pollReport(caseId);
            return;
          }
          throw error;
        }
      }
    } catch {
      const { cause, actions, report } = getScenarioCaseArtifacts(caseId);
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

  // 리포트 미생성(HITL 대기/생성 진행)은 백엔드가 404(E-REPORT-001)로 응답한다 — 진짜 실패가 아님.
  function isReportNotReady(error: unknown): boolean {
    if (!axios.isAxiosError(error)) return false;
    const code = (error.response?.data as { error?: { code?: string } } | undefined)?.error?.code;
    return error.response?.status === 404 || code === 'E-REPORT-001';
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
    artifactErrorMessage.value = '보고서 생성에 시간이 걸리고 있습니다. 잠시 후 다시 확인해 주세요.';
  }

  async function submitHitlDecision(
    payload: { decision: 'APPROVED' | 'REJECTED'; selectedPlanId: string | null; comment?: string | null },
    caseId: string | null = selectedCaseId.value
  ) {
    if (!caseId) return;

    isDecisionSubmitting.value = true;
    artifactErrorMessage.value = null;
    hitlErrorMessage.value = null;

    try {
      if (USE_BNC_PRESENTATION_SCENARIO) {
        const currentActions = selectedActionPlans.value ?? getScenarioCaseArtifacts(caseId).actions;

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
      selectTab('progress');
      if (_hitlMsgTimer) clearTimeout(_hitlMsgTimer);
      hitlSubmitMessage.value = '요청됐습니다.';
      _hitlMsgTimer = setTimeout(() => { hitlSubmitMessage.value = null; }, 4000);
      void pollReport(caseId);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 409) {
        const code = e.response.data?.error?.code;
        if (code === 'E-HITL-003') {
          hitlErrorMessage.value = '이미 처리 완료된 케이스입니다.';
          await Promise.all([loadCaseDetail(caseId), loadCases(page.value)]);
        } else if (code === 'E-HITL-005') {
          hitlErrorMessage.value = '만료된 케이스입니다. 최신 병목 알림을 다시 선택해 주세요.';
          await Promise.all([loadCaseDetail(caseId), loadCases(page.value)]);
        } else {
          hitlErrorMessage.value = '동시 요청 충돌 — 잠시 후 다시 시도해 주세요.';
        }
      } else {
        hitlErrorMessage.value = '승인/반려 결정을 저장하지 못했습니다.';
      }
    } finally {
      isDecisionSubmitting.value = false;
    }
  }

  // SSE "caseProgress" 이벤트 수신 시 현재 선택 케이스의 detail을 즉시 재조회.
  // ACTION_PLAN_COMPARE DONE 시 solutions 데이터를 백그라운드 프리패치 —
  // 탭 클릭 시 이미 로드된 상태로 즉시 표시.
  watch(latestCaseProgress, (event) => {
    if (event && selectedCaseId.value && event.caseId === selectedCaseId.value) {
      void loadCaseDetail(selectedCaseId.value);
      if (event.stepName === 'ACTION_PLAN_COMPARE' && event.status === 'DONE') {
        void loadCaseArtifacts(selectedCaseId.value, 'solutions');
      }
    }
  });

  function selectCase(caseId: string) {
    selectedCaseId.value = caseId;
  }

  function selectTab(tabId: BncTabId) {
    activeTab.value = tabId;
  }

  function ensureCaseInList(detail: BncCaseDetail) {
    const nextCase = toAlertCase(detail);
    if (cases.value.some((item) => item.caseId === detail.caseId)) {
      cases.value = cases.value.map((item) => (item.caseId === detail.caseId ? nextCase : item));
      return;
    }
    cases.value = [nextCase, ...cases.value];
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
      // 상세에서 만든 카드도 요약/카드 지표(영향·후속TG·CT증가·위험Lot)를 잃지 않도록 alertMetrics를 보존한다.
      alertMetrics: detail.alertMetrics,
    };
  }

  async function handlePageChange(nextPage: number) {
    if (nextPage < 0 || nextPage >= totalPages.value || nextPage === page.value) return;
    await loadCases(nextPage);
    await loadCaseDetail();
  }

  return {
    isPresentationScenario: USE_BNC_PRESENTATION_SCENARIO,
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
    hitlErrorMessage,
    hitlSubmitMessage,
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

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useBnc } from '@/composables/useBnc';
import { useChatDrawer } from '@/composables/useChatDrawer';

import { ROUTE_NAMES } from '@/constants/routes';

import type { BncTabId } from '@/types/bnc';

import BncAlertList from '@/components/bnc/BncAlertList.vue';
import BncCaseSummary from '@/components/bnc/BncCaseSummary.vue';
import BncTabNav from '@/components/bnc/BncTabNav.vue';
import BncCauseTab from '@/components/bnc/tabs/BncCauseTab.vue';
import BncProgressTab from '@/components/bnc/tabs/BncProgressTab.vue';
import BncReportTab from '@/components/bnc/tabs/BncReportTab.vue';
import BncSolutionsTab from '@/components/bnc/tabs/BncSolutionsTab.vue';

const route = useRoute();
const router = useRouter();
const { openWithReport, openWithReportContext, open: openChat } = useChatDrawer();
const tabPanelRef = ref<HTMLElement | null>(null);

type HitlDecisionPayload = {
  decision: 'APPROVED' | 'REJECTED';
  selectedPlanId: string | null;
  comment?: string | null;
};

function routeCaseId() {
  return typeof route.query.caseId === 'string' ? route.query.caseId : null;
}

function routeTab() {
  return typeof route.query.tab === 'string' ? route.query.tab : null;
}

const {
  tabOptions,
  cases,
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
} = useBnc(routeCaseId(), routeTab());

const disabledTabs = computed<Set<BncTabId>>(() => {
  const steps = selectedCaseDetail.value?.agentProgress ?? [];
  const statusOf = (name: string) => steps.find((step) => step.stepName === name)?.status ?? null;
  const isDone = (name: string) => statusOf(name) === 'DONE';
  const isRunning = (name: string) => statusOf(name) === 'RUNNING';
  const hasHitlDecision = selectedActionPlans.value?.hitlStatus.hasDecision ?? false;
  const canOpenReport =
    isDone('REPORT_GEN') || isRunning('REPORT_GEN') || hasHitlDecision || selectedReport.value !== null;
  const disabled = new Set<BncTabId>();
  if (!isDone('CAUSE_ANALYSIS')) disabled.add('cause');
  if (!isDone('ACTION_PLAN_COMPARE')) disabled.add('solutions');
  if (!canOpenReport) disabled.add('report');
  return disabled;
});

async function updateRoute(caseId: string | null, tab: BncTabId) {
  await router.replace({
    name: ROUTE_NAMES.bottleneckCenter,
    query: {
      ...(caseId ? { caseId } : {}),
      tab,
    },
  });
}

function handleSelectCase(caseId: string) {
  selectCase(caseId);
  void updateRoute(caseId, activeTab.value);
  void loadCaseDetail(caseId);
}

function handleSelectTab(tabId: BncTabId) {
  if (disabledTabs.value.has(tabId)) return;
  selectTab(tabId);
  void updateRoute(selectedCaseId.value, tabId);
}

async function scrollToTabPanelTop() {
  await nextTick();
  tabPanelRef.value?.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

async function handleHitlDecision(payload: HitlDecisionPayload) {
  await submitHitlDecision(payload);
  if (activeTab.value !== 'report') return;
  void updateRoute(selectedCaseId.value, 'report');
  await scrollToTabPanelTop();
}

function isArtifactTab(tabId: BncTabId) {
  return tabId === 'cause' || tabId === 'solutions' || tabId === 'report';
}

// BNC AI 설명/질문은 별도 Agent task 이력 없이 챗 전용으로 진입한다.
// 선택 케이스의 리포트가 있으면 리포트 그라운딩 챗을, 없으면 일반 챗을 연다.
// (챗봇이 contextCaseId/get_case_detail 도구로 케이스를 직접 그라운딩한다.)
function openCaseChat() {
  if (!selectedCase.value) return;
  if (selectedReport.value?.reportV1) {
    const report = selectedReport.value.reportV1;
    openWithReportContext({
      caseId: selectedReport.value.caseId,
      reportId: selectedReport.value.reportId,
      processName: report.meta.process_name,
      severity: report.meta.severity,
      riskScore: report.risk.score,
      detectedAt: report.meta.detected_at,
    });
    return;
  }
  // openWithReport는 구조화된 FinalBottleneckReport를 받는다. BncReportPayload의 finalReport가 있으면
  // 그것으로 리포트 그라운딩 챗을, 없으면 일반 챗을 연다.
  if (selectedReport.value?.finalReport) openWithReport(selectedReport.value.finalReport);
  else openChat();
}

// 이 화면만 전역 1280 floor 해제 → 작은 화면에서도 가로 스크롤 없이 반응형. 떠나면 원복.
onMounted(async () => {
  document.documentElement.classList.add('bnc-fluid');
  await loadCases();
  if (selectedCaseId.value) {
    await loadCaseDetail();
  }
  if (isArtifactTab(activeTab.value)) {
    void loadCaseArtifacts();
  }
});

onBeforeUnmount(() => {
  document.documentElement.classList.remove('bnc-fluid');
});

watch(selectedCaseId, (caseId) => {
  if (caseId !== routeCaseId()) {
    void updateRoute(caseId, activeTab.value);
  }
  if (isArtifactTab(activeTab.value)) {
    void loadCaseArtifacts(caseId);
  }
});

watch(activeTab, (tab) => {
  if (isArtifactTab(tab)) {
    void loadCaseArtifacts();
  }
});

watch(selectedCaseDetail, (detail) => {
  if (!detail || !disabledTabs.value.has(activeTab.value)) return;
  selectTab('progress');
  void updateRoute(selectedCaseId.value, 'progress');
});
</script>

<template>
  <div class="bnc-view">
    <header class="bnc-view__header">
      <div>
        <div class="bnc-view__title-row">
          <h1 class="bnc-view__title">병목 대응 센터</h1>
        </div>
        <p class="bnc-view__subtitle">Agent 분석 결과를 확인하고 대응안을 검토하는 운영 의사결정 화면입니다.</p>
      </div>
    </header>

    <div class="bnc-view__workspace">
      <BncAlertList
        :cases="cases"
        :selected-case-id="selectedCaseId"
        :loading="isLoading"
        :error-message="errorMessage"
        :high-priority-count="highPriorityCount"
        :page-info="pageInfo"
        :total-pages="totalPages"
        :page-buttons="pageButtons"
        @select="handleSelectCase"
        @retry="loadCases"
        @page-change="handlePageChange"
      />

      <main class="bnc-view__main">
        <div v-if="selectedCase" class="bnc-view__content-card">
          <BncCaseSummary v-if="selectedCase" :item="selectedCase" :detail="selectedCaseDetail" />

          <div ref="tabPanelRef" class="bnc-view__tab-panel">
            <BncTabNav
              :tabs="tabOptions"
              :active-tab="activeTab"
              :disabled-tabs="disabledTabs"
              @select="handleSelectTab"
            />
            <BncProgressTab
              v-if="activeTab === 'progress'"
              :detail="selectedCaseDetail"
              :loading="isDetailLoading"
              :error-message="detailErrorMessage"
            />
            <BncCauseTab
              v-else-if="activeTab === 'cause'"
              :analysis="selectedCauseAnalysis"
              :loading="isArtifactLoading"
              :error-message="artifactErrorMessage"
              :case-id="selectedCaseId"
            />
            <BncSolutionsTab
              v-else-if="activeTab === 'solutions'"
              :payload="selectedActionPlans"
              :loading="isArtifactLoading || isDecisionSubmitting"
              :error-message="artifactErrorMessage"
              @decide="handleHitlDecision"
            />
            <BncReportTab
              v-else-if="activeTab === 'report'"
              :report="selectedReport"
              :loading="isArtifactLoading"
              :error-message="artifactErrorMessage"
              :ai-busy="false"
              @ask-ai="openCaseChat()"
            />
          </div>
        </div>
        <div v-else class="bnc-view__empty-card">
          <strong>병목 케이스를 선택하세요</strong>
          <p>왼쪽 목록에서 DE_FE_1 같은 병목 카드를 선택하면 Agent 진행 탭과 분석 결과가 열립니다.</p>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.bnc-view {
  display: grid;
  min-width: 0;
  gap: var(--space-4);
}

.bnc-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  border-bottom: var(--border-width-default) solid var(--color-border-default);
  padding-bottom: var(--space-2);
}

.bnc-view__title {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--text-page-title-size);
}

.bnc-view__title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.bnc-view__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

.bnc-view__agent-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.bnc-view__agent-actions button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 32px;
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

.bnc-view__agent-actions button:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.bnc-view__agent-actions span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.bnc-view__agent-actions .bnc-view__agent-error {
  color: var(--color-status-danger);
}

.bnc-view__workspace {
  display: grid;
  grid-template-columns: minmax(300px, 340px) minmax(0, 1fr);
  align-items: start;
  gap: var(--space-4);
}

.bnc-view__main {
  display: grid;
  min-width: 0;
  /* 오른쪽 패널(요약 카드 + 모든 탭) 글씨를 전체적으로 키운다.
     커스텀 프로퍼티는 하위로 상속되므로 자식 컴포넌트(BncCauseTab 등)에도 적용된다. */
  --font-size-xs: 14px;
  --font-size-sm: 16px;
  --font-size-base: 18px;
  --font-size-lg: 21px;
  --font-size-xl: 26px;
}

.bnc-view__content-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
}

.bnc-view__empty-card {
  display: grid;
  align-content: center;
  justify-items: center;
  min-height: 360px;
  padding: var(--space-6);
  border: 1px dashed var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  text-align: center;
}

.bnc-view__empty-card strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

.bnc-view__empty-card p {
  max-width: 440px;
  margin: var(--space-2) 0 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.bnc-view__tab-panel {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--color-border-default);
}

.bnc-view__tab-panel > :nth-child(2) {
  min-height: 0;
}

@media (max-width: 1180px) {
  .bnc-view__workspace {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Bot, MapPinned, MessageCircle, Sparkles } from '@lucide/vue';

import { useBnc } from '@/composables/useBnc';
import { useChatDrawer } from '@/composables/useChatDrawer';

import { ROUTE_NAMES } from '@/constants/routes';

import type { BncAgentStep, BncTabId } from '@/types/bnc';

import BncAlertList from '@/components/bnc/BncAlertList.vue';
import BncCaseSummary from '@/components/bnc/BncCaseSummary.vue';
import BncTabNav from '@/components/bnc/BncTabNav.vue';
import BncCauseTab from '@/components/bnc/tabs/BncCauseTab.vue';
import BncProgressTab from '@/components/bnc/tabs/BncProgressTab.vue';
import BncReportTab from '@/components/bnc/tabs/BncReportTab.vue';
import BncSolutionsTab from '@/components/bnc/tabs/BncSolutionsTab.vue';

const route = useRoute();
const router = useRouter();
const { openWithCasePrompt } = useChatDrawer();

function routeCaseId() {
  return typeof route.query.caseId === 'string' ? route.query.caseId : null;
}

function routeTab() {
  return typeof route.query.tab === 'string' ? route.query.tab : null;
}

const {
  isMockMode,
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
  const isDone = (name: string) => steps.some((step) => step.stepName === name && step.status === 'DONE');
  const disabled = new Set<BncTabId>();
  if (!isDone('CAUSE_ANALYZER')) disabled.add('cause');
  if (!isDone('COMPARE_AGENT')) disabled.add('solutions');
  if (!isDone('REPORT_AGENT')) disabled.add('report');
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

function isArtifactTab(tabId: BncTabId) {
  return tabId === 'cause' || tabId === 'solutions' || tabId === 'report';
}

type BncAskIntent = 'case' | 'step' | 'recommendation' | 'exclusion' | 'target-map' | 'report';

const BNC_ASK_PROMPT: Record<BncAskIntent, (label: string, step?: string | null) => string> = {
  case: (l) => `${l} 케이스 원인이랑 대응안을 설명해줘.`,
  step: (l, s) => `${l} 케이스의 ${s ?? '선택'} 단계 산출물을 설명해줘.`,
  recommendation: (l) => `${l} 케이스에서 어떤 대응안이 추천됐고 왜 그 안이 선택됐는지 설명해줘.`,
  exclusion: (l) => `${l} 케이스에서 제외된 대응안과 그 사유를 정리해줘.`,
  'target-map': (l) => `${l} 케이스의 확산 영향 TG를 정리해줘.`,
  report: (l) => `${l} 케이스 리포트를 요약해줘.`,
};

function runBncAgent(intent: BncAskIntent, stepName: string | null = null) {
  const current = selectedCase.value;
  if (!current) return;
  const label = current.tgName || current.caseId || '선택 케이스';
  openWithCasePrompt({
    caseId: current.caseId ?? null,
    caseLabel: label,
    sourcePage: 'RESPONSE_CENTER',
    title: `${label} 케이스 질의`,
    prompt: BNC_ASK_PROMPT[intent](label, stepName),
  });
}

function handleExplainStep(step: BncAgentStep) {
  void runBncAgent('step', step.stepName);
}

// 이 화면만 전역 1280 floor 해제 → 작은 화면에서도 가로 스크롤 없이 반응형. 떠나면 원복.
onMounted(async () => {
  document.documentElement.classList.add('bnc-fluid');
  await loadCases();
  await loadCaseDetail();
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
          <span v-if="isMockMode" class="bnc-view__mock-badge">Mock Preview · 백엔드 연동 전</span>
        </div>
        <p class="bnc-view__subtitle">Agent 분석 결과를 확인하고 대응안을 검토하는 운영 의사결정 화면입니다.</p>
        <div class="bnc-view__agent-actions">
          <button type="button" :disabled="!selectedCase" @click="runBncAgent('case')">
            <Sparkles :size="14" aria-hidden="true" />
            선택 케이스 AI 설명
          </button>
          <button
            v-if="activeTab === 'solutions'"
            type="button"
            :disabled="!selectedCase"
            @click="runBncAgent('recommendation')"
          >
            <Bot :size="14" aria-hidden="true" />
            AI 추천 근거 묻기
          </button>
          <button
            v-if="activeTab === 'solutions'"
            type="button"
            :disabled="!selectedCase"
            @click="runBncAgent('exclusion')"
          >
            비추천안 제외 이유
          </button>
          <button
            v-if="activeTab === 'solutions'"
            type="button"
            :disabled="!selectedCase"
            @click="runBncAgent('target-map')"
          >
            <MapPinned :size="14" aria-hidden="true" />
            대상 TG 위치 보기
          </button>
          <button v-if="activeTab === 'report'" type="button" :disabled="!selectedCase" @click="runBncAgent('report')">
            <MessageCircle :size="14" aria-hidden="true" />
            이 보고서에 대해 질문
          </button>
        </div>
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
        <BncCaseSummary v-if="selectedCase" :item="selectedCase" :detail="selectedCaseDetail" />

        <div class="bnc-view__tab-panel">
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
            @explain-step="handleExplainStep"
          />
          <BncCauseTab
            v-else-if="activeTab === 'cause'"
            :analysis="selectedCauseAnalysis"
            :loading="isArtifactLoading"
            :error-message="artifactErrorMessage"
          />
          <BncSolutionsTab
            v-else-if="activeTab === 'solutions'"
            :payload="selectedActionPlans"
            :loading="isArtifactLoading || isDecisionSubmitting"
            :error-message="artifactErrorMessage"
            @decide="submitHitlDecision"
          />
          <BncReportTab
            v-else-if="activeTab === 'report'"
            :report="selectedReport"
            :loading="isArtifactLoading"
            :error-message="artifactErrorMessage"
            @ask-ai="runBncAgent('report')"
          />
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

.bnc-view__mock-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 var(--space-3);
  border: 1px solid color-mix(in srgb, var(--color-gold) 32%, var(--color-border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-gold) 10%, var(--color-surface));
  color: color-mix(in srgb, var(--color-brand-brown) 80%, var(--color-gold));
  font-size: var(--font-size-sm);
  font-weight: 800;
  letter-spacing: 0;
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
  align-content: start;
  gap: var(--space-4);
}

.bnc-view__tab-panel {
  display: grid;
  min-width: 0;
}

@media (max-width: 1180px) {
  .bnc-view__workspace {
    grid-template-columns: 1fr;
  }
}
</style>

import { computed, ref } from 'vue';

import { fetchBncCases } from '@/services/bncService';

import { BNC_STATUS_META, BNC_TAB_OPTIONS } from '@/constants/bnc';

import type { BncAlertCase, BncTabId } from '@/types/bnc';

const DEFAULT_TAB: BncTabId = 'progress';

export function useBnc(initialCaseId?: string | null, initialTab?: string | null) {
  const cases = ref<BncAlertCase[]>([]);
  const selectedCaseId = ref<string | null>(initialCaseId ?? null);
  const activeTab = ref<BncTabId>(isBncTabId(initialTab) ? initialTab : DEFAULT_TAB);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  const sortedCases = computed(() =>
    [...cases.value].sort((a, b) => {
      const statusDiff = BNC_STATUS_META[a.status].priority - BNC_STATUS_META[b.status].priority;
      if (statusDiff !== 0) return statusDiff;
      if (b.bottleneckProb !== a.bottleneckProb) return b.bottleneckProb - a.bottleneckProb;
      return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
    })
  );

  const selectedCase = computed(
    () => sortedCases.value.find((item) => item.caseId === selectedCaseId.value) ?? sortedCases.value[0] ?? null
  );

  const highPriorityCount = computed(
    () =>
      cases.value.filter(
        (item) => item.status !== 'RESOLVED' && (item.riskGrade === 'CRITICAL' || item.status === 'AWAITING_HITL')
      ).length
  );

  async function loadCases() {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const data = await fetchBncCases();
      cases.value = data.items;

      if (!selectedCaseId.value || !cases.value.some((item) => item.caseId === selectedCaseId.value)) {
        selectedCaseId.value = sortedCases.value[0]?.caseId ?? null;
      }
    } catch {
      errorMessage.value = '병목 대응 케이스를 불러오지 못했습니다.';
    } finally {
      isLoading.value = false;
    }
  }

  function selectCase(caseId: string) {
    selectedCaseId.value = caseId;
  }

  function selectTab(tabId: BncTabId) {
    activeTab.value = tabId;
  }

  return {
    tabOptions: BNC_TAB_OPTIONS,
    cases: sortedCases,
    selectedCaseId,
    selectedCase,
    activeTab,
    highPriorityCount,
    isLoading,
    errorMessage,
    loadCases,
    selectCase,
    selectTab,
  };
}

export function isBncTabId(value: unknown): value is BncTabId {
  return value === 'progress' || value === 'cause' || value === 'solutions' || value === 'report';
}

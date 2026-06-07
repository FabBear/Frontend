<script setup lang="ts">
import { onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useBnc } from '@/composables/useBnc';

import { ROUTE_NAMES } from '@/constants/routes';

import type { BncTabId } from '@/types/bnc';

import BncAlertList from '@/components/bnc/BncAlertList.vue';
import BncCaseSummary from '@/components/bnc/BncCaseSummary.vue';
import BncTabNav from '@/components/bnc/BncTabNav.vue';
import BncTabPlaceholder from '@/components/bnc/BncTabPlaceholder.vue';

const route = useRoute();
const router = useRouter();

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
  activeTab,
  highPriorityCount,
  isLoading,
  errorMessage,
  loadCases,
  selectCase,
  selectTab,
} = useBnc(routeCaseId(), routeTab());

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
}

function handleSelectTab(tabId: BncTabId) {
  selectTab(tabId);
  void updateRoute(selectedCaseId.value, tabId);
}

onMounted(() => {
  void loadCases();
});

watch(selectedCaseId, (caseId) => {
  if (caseId && caseId !== routeCaseId()) {
    void updateRoute(caseId, activeTab.value);
  }
});
</script>

<template>
  <div class="bnc-view">
    <header class="bnc-view__header">
      <div>
        <h1 class="bnc-view__title">병목 대응 센터</h1>
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
        @select="handleSelectCase"
        @retry="loadCases"
      />

      <main class="bnc-view__main">
        <BncCaseSummary v-if="selectedCase" :item="selectedCase" />

        <BncTabNav :tabs="tabOptions" :active-tab="activeTab" @select="handleSelectTab" />

        <BncTabPlaceholder :active-tab="activeTab" />
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

.bnc-view__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

.bnc-view__workspace {
  display: grid;
  grid-template-columns: minmax(340px, 380px) minmax(0, 1fr);
  gap: var(--space-4);
  min-height: 0;
}

.bnc-view__main {
  display: grid;
  min-width: 0;
  align-content: start;
  gap: var(--space-4);
}

@media (max-width: 1180px) {
  .bnc-view__workspace {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';

import { exportMesCsv } from '@/services/mesService';

import { useMesMonitoring } from '@/composables/useMesMonitoring';

import MesAlertBanner from '@/components/mes/MesAlertBanner.vue';
import MesConnectionStatus from '@/components/mes/MesConnectionStatus.vue';
import MesTabNav from '@/components/mes/MesTabNav.vue';
import MesAllProcessTab from '@/components/mes/tabs/MesAllProcessTab.vue';
import MesProcessTab from '@/components/mes/tabs/MesProcessTab.vue';
import MesToolGroupTab from '@/components/mes/tabs/MesToolGroupTab.vue';

const {
  data,
  activeTab,
  tgAreaFilter,
  tgRiskFilter,
  tgToolStatusFilter,
  selectedToolGroupId,
  selectedToolGroup,
  selectedTools,
  toolViewMode,
  isLoading,
  errorMessage,
  detailErrorMessage,
  startMesMonitoring,
  disconnectMesStream,
  selectToolGroup,
  setActiveTab,
  navigateToProcess,
  navigateToToolGroup,
  navigateToDownTools,
  navigateToCriticalTgs,
  navigateToHighTgs,
} = useMesMonitoring();

onMounted(() => {
  void startMesMonitoring();
});

onUnmounted(() => {
  disconnectMesStream();
});
</script>

<template>
  <div class="mes-monitor-view">
    <header class="mes-monitor-view__header">
      <div>
        <h1 class="mes-monitor-view__title">MES 실시간 모니터링</h1>
        <p class="mes-monitor-view__subtitle">실시간 공정·Tool Group·Tool 상태를 확인합니다.</p>
      </div>
      <div class="mes-monitor-view__header-actions">
        <MesConnectionStatus :snapshot="data?.snapshot ?? null" />
        <div v-if="data" class="mes-monitor-view__export">
          <span class="mes-monitor-view__export-label">내보내기</span>
          <button type="button" @click="exportMesCsv(data, 'toolGroups')">TG KPI</button>
          <button type="button" @click="exportMesCsv(data, 'tools')">장비 KPI</button>
          <button type="button" @click="exportMesCsv(data, 'processSummaries')">공정 요약</button>
        </div>
      </div>
    </header>

    <MesAlertBanner
      v-if="data"
      :data="data"
      @navigate-to-down-tools="navigateToDownTools"
      @navigate-to-critical="navigateToCriticalTgs"
      @navigate-to-high="navigateToHighTgs"
      @navigate-to-tool-group="setActiveTab('toolGroup')"
    />

    <MesTabNav :active-tab="activeTab" @change="setActiveTab" />

    <p v-if="isLoading" class="mes-monitor-view__state">MES 데이터를 불러오는 중입니다.</p>
    <p v-else-if="errorMessage" class="mes-monitor-view__state mes-monitor-view__state--error">{{ errorMessage }}</p>

    <template v-else-if="data">
      <MesAllProcessTab v-if="activeTab === 'all'" :data="data" @select-tool-group="navigateToToolGroup" />

      <MesProcessTab v-else-if="activeTab === 'process'" :data="data" @navigate-to-process="navigateToProcess" />

      <MesToolGroupTab
        v-else-if="activeTab === 'toolGroup'"
        :data="data"
        :selected-tool-group-id="selectedToolGroupId"
        :selected-tool-group="selectedToolGroup"
        :selected-tools="selectedTools"
        :tool-view-mode="toolViewMode"
        :tg-area-filter="tgAreaFilter"
        :tg-risk-filter="tgRiskFilter"
        :tg-tool-status-filter="tgToolStatusFilter"
        :on-down-tool-click="navigateToDownTools"
        :on-critical-click="navigateToCriticalTgs"
        :on-high-click="navigateToHighTgs"
        :detail-error-message="detailErrorMessage"
        @update:tool-view-mode="toolViewMode = $event"
        @update:tg-area-filter="tgAreaFilter = $event"
        @update:tg-risk-filter="tgRiskFilter = $event"
        @clear-tool-status-filter="tgToolStatusFilter = 'ALL'"
        @set-tool-status-filter="tgToolStatusFilter = $event"
        @select-tool-group="selectToolGroup"
      />
    </template>
  </div>
</template>

<style scoped>
.mes-monitor-view {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.mes-monitor-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  border-bottom: var(--border-width-default) solid var(--color-border-default);
  padding-bottom: var(--space-2);
}

.mes-monitor-view__header-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-2);
  flex-shrink: 0;
}

.mes-monitor-view__export {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.mes-monitor-view__export-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  margin-right: var(--space-1);
}

.mes-monitor-view__export button {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: transparent;
  padding: 3px 10px;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.mes-monitor-view__export button:hover {
  border-color: var(--color-border-strong);
  color: var(--color-fg-default);
}

.mes-monitor-view__title {
  color: var(--color-fg-strong);
  font-size: var(--text-page-title-size);
  font-weight: var(--font-weight-bold);
  line-height: var(--text-page-title-line-height);
}

.mes-monitor-view__subtitle {
  margin-top: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.mes-monitor-view__state,
.mes-monitor-view__panel {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
}

.mes-monitor-view__state {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.mes-monitor-view__state--error {
  border-color: var(--color-status-danger);
  color: var(--color-status-danger);
}

.mes-monitor-view__panel {
  display: grid;
  gap: var(--space-3);
}

.mes-monitor-view__panel h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.mes-monitor-view__placeholder {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.mes-monitor-view__tool-layout {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.mes-monitor-view__tool-body {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  min-width: 0;
}

@media (max-width: 900px) {
  .mes-monitor-view__header,
  .mes-monitor-view__tool-body {
    display: grid;
  }
}
</style>

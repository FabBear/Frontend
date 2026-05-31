<script setup lang="ts">
import { onMounted } from 'vue';

import { useMesMonitoring } from '@/composables/useMesMonitoring';

import MesConnectionStatus from '@/components/mes/MesConnectionStatus.vue';
import MesKpiCardGrid from '@/components/mes/MesKpiCardGrid.vue';
import MesTabNav from '@/components/mes/MesTabNav.vue';
import ToolGroupDetailPanel from '@/components/mes/ToolGroupDetailPanel.vue';
import ToolGroupListPanel from '@/components/mes/ToolGroupListPanel.vue';

const {
  data,
  activeTab,
  toolGroupSearch,
  toolGroupRiskFilter,
  selectedToolGroupId,
  selectedToolGroup,
  selectedTools,
  toolSummaryCards,
  toolViewMode,
  isLoading,
  errorMessage,
  detailErrorMessage,
  filteredToolGroups,
  loadMesMonitoringData,
  selectToolGroup,
  setActiveTab,
} = useMesMonitoring();

onMounted(() => {
  void loadMesMonitoringData();
});
</script>

<template>
  <div class="mes-monitor-view">
    <header class="mes-monitor-view__header">
      <div>
        <h1 class="mes-monitor-view__title">MES 실시간 모니터링</h1>
        <p class="mes-monitor-view__subtitle">실시간 공정·Tool Group·Tool 상태를 확인합니다.</p>
      </div>
      <MesConnectionStatus :snapshot="data?.snapshot ?? null" />
    </header>

    <MesTabNav :active-tab="activeTab" @change="setActiveTab" />

    <p v-if="isLoading" class="mes-monitor-view__state">MES 데이터를 불러오는 중입니다.</p>
    <p v-else-if="errorMessage" class="mes-monitor-view__state mes-monitor-view__state--error">{{ errorMessage }}</p>

    <template v-else-if="data">
      <section v-if="activeTab === 'all'" class="mes-monitor-view__panel">
        <h2>공정 전체</h2>
        <MesKpiCardGrid :cards="data.kpiCards" :columns="6" />
        <p class="mes-monitor-view__placeholder">공정 전체 차트/히트맵은 Task 1-4-B에서 목업 로직을 이식합니다.</p>
      </section>

      <section v-else-if="activeTab === 'process'" class="mes-monitor-view__panel">
        <h2>공정별 KPI</h2>
        <p class="mes-monitor-view__placeholder">공정별 차트/카드/상세 테이블은 Task 1-4-C에서 구현합니다.</p>
      </section>

      <section v-else-if="activeTab === 'toolGroup'" class="mes-monitor-view__panel">
        <h2>Tool Group별 KPI</h2>
        <p class="mes-monitor-view__placeholder">TG 분포/Top N/전체 KPI 테이블은 Task 1-4-D에서 구현합니다.</p>
      </section>

      <section v-else class="mes-monitor-view__tool-layout">
        <MesKpiCardGrid :cards="toolSummaryCards" />
        <div class="mes-monitor-view__tool-body">
          <ToolGroupListPanel
            v-model:search="toolGroupSearch"
            v-model:risk-filter="toolGroupRiskFilter"
            :tool-groups="filteredToolGroups"
            :selected-tool-group-id="selectedToolGroupId"
            @select="selectToolGroup"
          />
          <ToolGroupDetailPanel
            v-model:tool-view-mode="toolViewMode"
            :tool-group="selectedToolGroup"
            :tools="selectedTools"
            :error-message="detailErrorMessage"
          />
        </div>
      </section>
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

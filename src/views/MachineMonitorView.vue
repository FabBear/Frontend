<script setup lang="ts">
import { onMounted } from 'vue';

import { useMachineMonitoring } from '@/composables/useMachineMonitoring';

import MachineAnalysisTab from '@/components/machine/MachineAnalysisTab.vue';
import MachineOverviewTab from '@/components/machine/MachineOverviewTab.vue';

import { formatKoMonthDayTime } from '@/utils/format';

const {
  data,
  isLoading,
  errorMessage,
  activeTab,
  // 현황 탭
  toolGroups,
  overviewEquipments,
  trendsByToolId,
  // 분석 탭
  analysisTargetType,
  selectedMetricKeys,
  selectedCompareToolGroupIds,
  selectedCompareToolIds,
  periodPreset,
  MAX_COMPARE,
  activeMetricDefinitions,
  toolGroupTargets,
  toolTargets,
  analysisSeries,
  trendLabels,
  analysisPresets,
  selectedAnalysisPresetKey,
  analysisInsight,
  // 액션
  loadMachineMonitoringData,
  setActiveTab,
  setAnalysisTargetType,
  toggleMetric,
  toggleCompareToolGroup,
  toggleCompareTool,
  clearCompareTargets,
  applyAnalysisPreset,
  resetAnalysisPreset,
} = useMachineMonitoring();

onMounted(() => {
  void loadMachineMonitoringData();
});
</script>

<template>
  <div class="machine-monitor-view">
    <header class="machine-monitor-view__header">
      <div>
        <h1 class="machine-monitor-view__title">장비 모니터링</h1>
        <p class="machine-monitor-view__subtitle">
          현황 탭에서 전체 장비를 필터링하고, 분석 탭에서 TG·Tool 지표를 자유롭게 비교합니다.
        </p>
      </div>
      <p v-if="data" class="machine-monitor-view__timestamp">
        Day {{ data.summary.simulationDay }} · {{ formatKoMonthDayTime(data.summary.measuredAt) }}
      </p>
    </header>

    <p v-if="isLoading" class="machine-monitor-view__state">장비 데이터를 불러오는 중입니다.</p>
    <p v-else-if="errorMessage" class="machine-monitor-view__state machine-monitor-view__state--error">
      {{ errorMessage }}
    </p>

    <template v-else-if="data">
      <nav class="machine-monitor-view__tabs" aria-label="장비 모니터링 탭">
        <button
          type="button"
          :class="{ 'machine-monitor-view__tab--active': activeTab === 'overview' }"
          @click="setActiveTab('overview')"
        >
          장비 현황
        </button>
        <button
          type="button"
          :class="{ 'machine-monitor-view__tab--active': activeTab === 'analysis' }"
          @click="setActiveTab('analysis')"
        >
          분석
        </button>
      </nav>

      <MachineOverviewTab
        v-if="activeTab === 'overview'"
        :summary="data.summary"
        :tool-groups="toolGroups"
        :overview-equipments="overviewEquipments"
        :trends-by-tool-id="trendsByToolId"
      />

      <MachineAnalysisTab
        v-else
        :target-type="analysisTargetType"
        :period-preset="periodPreset"
        :metrics="activeMetricDefinitions"
        :selected-metric-keys="selectedMetricKeys"
        :tool-group-targets="toolGroupTargets"
        :tool-targets="toolTargets"
        :selected-tool-group-ids="selectedCompareToolGroupIds"
        :selected-tool-ids="selectedCompareToolIds"
        :analysis-series="analysisSeries"
        :trend-labels="trendLabels"
        :analysis-presets="analysisPresets"
        :selected-analysis-preset-key="selectedAnalysisPresetKey"
        :analysis-insight="analysisInsight"
        :max-compare="MAX_COMPARE"
        @update:target-type="setAnalysisTargetType"
        @update:period-preset="periodPreset = $event"
        @toggle-metric="toggleMetric"
        @toggle-tool-group="toggleCompareToolGroup"
        @toggle-tool="toggleCompareTool"
        @clear-targets="clearCompareTargets"
        @apply-preset="applyAnalysisPreset"
        @reset-preset="resetAnalysisPreset"
      />
    </template>
  </div>
</template>

<style scoped>
.machine-monitor-view {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
  min-height: calc(100svh - var(--layout-header-height) - 2 * var(--spacing-page));
  align-content: start;
  font-size: var(--font-size-base);
}

.machine-monitor-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  border-bottom: var(--border-width-default) solid var(--color-border-default);
  padding-bottom: var(--space-2);
}

.machine-monitor-view__title {
  color: var(--color-fg-strong);
  font-size: var(--text-page-title-size);
  font-weight: var(--font-weight-bold);
  line-height: var(--text-page-title-line-height);
}

.machine-monitor-view__subtitle,
.machine-monitor-view__timestamp {
  margin-top: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

.machine-monitor-view__state {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

.machine-monitor-view__state--error {
  border-color: var(--color-status-danger);
  color: var(--color-status-danger);
}

.machine-monitor-view__tabs {
  display: flex;
  gap: 0;
  border-bottom: var(--border-width-default) solid var(--color-border-default);
}

.machine-monitor-view__tabs button {
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: var(--space-2) var(--space-4);
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  transition: all 0.1s;
}

.machine-monitor-view__tabs button:hover {
  color: var(--color-fg);
}

.machine-monitor-view__tabs .machine-monitor-view__tab--active {
  border-bottom-color: var(--color-action-primary);
  color: var(--color-action-primary);
}
</style>

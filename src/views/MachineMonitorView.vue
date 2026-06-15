<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useMachineMonitoring } from '@/composables/useMachineMonitoring';

import type { DashboardTrendKey } from '@/types/dashboardApi';
import type { MachineAnalysisScope } from '@/types/machine';

import FabBearProgressLoader from '@/components/base/FabBearProgressLoader.vue';
import MachineAnalysisTab from '@/components/machine/MachineAnalysisTab.vue';
import MachineOverviewTab from '@/components/machine/MachineOverviewTab.vue';

const {
  data,
  isLoading,
  errorMessage,
  activeTab,
  // 분석 탭
  analysisTargetType,
  selectedMetricKeys,
  selectedCompareToolGroupIds,
  selectedCompareToolIds,
  periodPreset,
  periodRange,
  isTrendsLoading,
  trendsErrorMessage,
  MAX_COMPARE,
  activeMetricDefinitions,
  toolGroupTargets,
  toolTargets,
  analysisSeries,
  trendLabels,
  analysisInsight,
  analysisPresets,
  selectedAnalysisPresetKey,
  // 액션
  loadMachineMonitoringData,
  setActiveTab,
  setAnalysisTargetType,
  setAnalysisPeriodPreset,
  setAnalysisPeriodRange,
  toggleMetric,
  toggleCompareToolGroup,
  toggleCompareTool,
  clearCompareTargets,
  applyAnalysisPreset,
  applyDashboardKpiDrill,
  resetAnalysisPreset,
} = useMachineMonitoring();

const route = useRoute();
const router = useRouter();
const DASHBOARD_KPI_KEYS: DashboardTrendKey[] = ['rtf', 'throughput24h', 'avgQtimeMin', 'wip'];
const activeDashboardKpiKey = ref<DashboardTrendKey | null>(null);
const activeAnalysisScope = ref<MachineAnalysisScope>('toolGroup');

const routeDashboardKpiKey = computed<DashboardTrendKey | null>(() => {
  if (route.query.focus !== 'dashboardKpi') return null;
  const key = route.query.kpi;
  return typeof key === 'string' && DASHBOARD_KPI_KEYS.includes(key as DashboardTrendKey)
    ? (key as DashboardTrendKey)
    : null;
});

function syncRouteTab() {
  const nextKpiKey = routeDashboardKpiKey.value;
  if (route.query.tab === 'analysis' || nextKpiKey) {
    setActiveTab('analysis');
  }
  if (nextKpiKey) {
    activeDashboardKpiKey.value = nextKpiKey;
    activeAnalysisScope.value = 'fab';
  } else if (route.query.focus !== 'dashboardKpi') {
    activeDashboardKpiKey.value = null;
  }
}

function applyActiveDashboardKpiDrill() {
  if (activeDashboardKpiKey.value) applyDashboardKpiDrill(activeDashboardKpiKey.value);
}

function applyFabKpiDefaultPeriod(key: DashboardTrendKey | null) {
  if (!data.value || key !== 'throughput24h' || periodPreset.value === '7D') return;
  setAnalysisPeriodPreset('7D');
}

function handleSelectDashboardKpi(key: DashboardTrendKey) {
  activeDashboardKpiKey.value = key;
  activeAnalysisScope.value = 'fab';
  applyFabKpiDefaultPeriod(key);
  applyDashboardKpiDrill(key);
  void router.replace({
    query: {
      ...route.query,
      tab: 'analysis',
      focus: 'dashboardKpi',
      kpi: key,
    },
  });
}

function handleAnalysisScopeChange(scope: MachineAnalysisScope) {
  activeAnalysisScope.value = scope;

  if (scope === 'fab') {
    if (!activeDashboardKpiKey.value) activeDashboardKpiKey.value = 'rtf';
    applyFabKpiDefaultPeriod(activeDashboardKpiKey.value);
    applyActiveDashboardKpiDrill();
    return;
  }

  setAnalysisTargetType(scope);
  if (scope === 'toolGroup') applyActiveDashboardKpiDrill();
}

onMounted(async () => {
  syncRouteTab();
  await loadMachineMonitoringData();
  applyFabKpiDefaultPeriod(activeDashboardKpiKey.value);
  // 데이터(toolGroups) 로드 후에야 기여 TG 랭킹이 가능 → 여기서 드릴 적용
  applyActiveDashboardKpiDrill();
});

watch(
  () => [route.query.tab, route.query.focus, route.query.kpi],
  () => {
    syncRouteTab();
    applyFabKpiDefaultPeriod(activeDashboardKpiKey.value);
    applyActiveDashboardKpiDrill();
  }
);
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
    </header>

    <FabBearProgressLoader v-if="isLoading" label="장비 데이터를 불러오는 중입니다" />
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

      <MachineOverviewTab v-if="activeTab === 'overview'" :summary="data.summary" />

      <MachineAnalysisTab
        v-else
        :analysis-scope="activeAnalysisScope"
        :target-type="analysisTargetType"
        :period-preset="periodPreset"
        :period-range="periodRange"
        :measured-at="data.summary.measuredAt"
        :metrics="activeMetricDefinitions"
        :selected-metric-keys="selectedMetricKeys"
        :tool-group-targets="toolGroupTargets"
        :tool-targets="toolTargets"
        :selected-tool-group-ids="selectedCompareToolGroupIds"
        :selected-tool-ids="selectedCompareToolIds"
        :analysis-series="analysisSeries"
        :trend-labels="trendLabels"
        :trends-loading="isTrendsLoading"
        :trends-error-message="trendsErrorMessage"
        :analysis-insight="analysisInsight"
        :presets="analysisPresets"
        :selected-preset-key="selectedAnalysisPresetKey"
        :max-compare="MAX_COMPARE"
        :dashboard-kpi-key="activeAnalysisScope === 'fab' ? (activeDashboardKpiKey ?? 'rtf') : activeDashboardKpiKey"
        @update:analysis-scope="handleAnalysisScopeChange"
        @update:target-type="setAnalysisTargetType"
        @update:period-preset="setAnalysisPeriodPreset"
        @update:period-range="setAnalysisPeriodRange"
        @select-dashboard-kpi="handleSelectDashboardKpi"
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

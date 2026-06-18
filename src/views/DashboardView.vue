<script setup lang="ts">
import { useRouter } from 'vue-router';

import { useDashboardData } from '@/composables/useDashboardData';

import { ROUTE_NAMES } from '@/constants/routes';

import type { DashboardTrendKey } from '@/types/dashboardApi';

import FabBearProgressLoader from '@/components/base/FabBearProgressLoader.vue';
import BottleneckAlertList from '@/components/dashboard/BottleneckAlertList.vue';
import DashboardKpiSummary from '@/components/dashboard/DashboardKpiSummary.vue';
import ProcessMapCard from '@/components/dashboard/ProcessMapCard.vue';

const router = useRouter();
const { dashboardData, isLoading, errorMessage, sectionErrors, hasLoadedAnySection } = useDashboardData();

function handleOpenBottleneckMonitoring(caseId: string) {
  router.push({ name: ROUTE_NAMES.bottleneckMonitoring, query: { caseId } });
}

function handleOpenBottleneckMonitoringList() {
  router.push({ name: ROUTE_NAMES.bottleneckMonitoring });
}

function handleOpenBottleneckCenter(caseId: string) {
  router.push({ name: ROUTE_NAMES.bottleneckCenter, query: { caseId, tab: 'progress' } });
}

function handleOpenLotReleasePlan() {
  router.push({ name: ROUTE_NAMES.lotReleasePlan });
}

function handleSelectArea(areaCode: string) {
  router.push({ name: ROUTE_NAMES.bottleneckMonitoring, query: { areaCode } });
}

function handleSelectToolGroup(tgId: string, areaCode: string) {
  router.push({ name: ROUTE_NAMES.bottleneckMonitoring, query: { areaCode, tgId } });
}

function handleSelectKpi(key: DashboardTrendKey) {
  router.push({
    name: ROUTE_NAMES.machineMonitoring,
    query: { tab: 'analysis', focus: 'dashboardKpi', kpi: key },
  });
}
</script>

<template>
  <div class="dashboard-view">
    <header class="dashboard-view__header">
      <div>
        <h1 class="dashboard-view__title">대시보드</h1>
        <p class="dashboard-view__subtitle">실시간 FAB 핵심 KPI와 병목 위험 알림을 한눈에 확인합니다.</p>
      </div>
    </header>
    <FabBearProgressLoader v-if="isLoading && !hasLoadedAnySection" label="대시보드 데이터를 불러오는 중입니다" />
    <p v-else-if="errorMessage" class="dashboard-view__state dashboard-view__state--error">{{ errorMessage }}</p>

    <template v-if="hasLoadedAnySection">
      <DashboardKpiSummary
        v-if="dashboardData.kpi"
        :kpi="dashboardData.kpi"
        :trends="dashboardData.trends"
        :release-plan="dashboardData.releasePlan"
        @open-release-plan="handleOpenLotReleasePlan"
        @select-kpi="handleSelectKpi"
      />
      <p v-else-if="sectionErrors.kpi" class="dashboard-view__state dashboard-view__state--error">
        {{ sectionErrors.kpi }}
      </p>
      <p
        v-if="sectionErrors.releasePlan && !dashboardData.releasePlan"
        class="dashboard-view__state dashboard-view__state--error"
      >
        {{ sectionErrors.releasePlan }}
      </p>

      <div
        v-if="dashboardData.alerts || dashboardData.processAreas || sectionErrors.alerts || sectionErrors.processAreas"
        class="dashboard-view__main"
      >
        <BottleneckAlertList
          v-if="dashboardData.alerts"
          class="dashboard-view__alerts"
          :alerts="dashboardData.alerts"
          @open-center="handleOpenBottleneckCenter"
          @open-monitoring="handleOpenBottleneckMonitoring"
          @open-monitoring-list="handleOpenBottleneckMonitoringList"
        />
        <p v-else-if="sectionErrors.alerts" class="dashboard-view__state dashboard-view__state--error">
          {{ sectionErrors.alerts }}
        </p>

        <ProcessMapCard
          v-if="dashboardData.processAreas"
          class="dashboard-view__process-map"
          :areas="dashboardData.processAreas"
          metric-mode="bottleneck"
          @select-area="handleSelectArea"
          @select-tool-group="handleSelectToolGroup"
        />
        <p v-else-if="sectionErrors.processAreas" class="dashboard-view__state dashboard-view__state--error">
          {{ sectionErrors.processAreas }}
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dashboard-view {
  display: grid;
  min-width: 0;
  gap: var(--space-3);
}

.dashboard-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  border-bottom: var(--border-width-default) solid var(--color-border-default);
  padding-bottom: var(--space-2);
}

.dashboard-view__title {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--text-page-title-size);
  font-weight: var(--font-weight-bold);
  line-height: var(--text-page-title-line-height);
}

.dashboard-view__subtitle {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.dashboard-view__main {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  grid-auto-rows: clamp(22rem, calc(100svh - var(--layout-header-height) - 260px), 36rem);
  align-items: stretch;
  gap: var(--space-3);
  min-width: 0;
}

.dashboard-view__alerts {
  grid-column: span 1;
  min-height: 0;
}

.dashboard-view__process-map {
  grid-column: span 4;
  min-height: 0;
}

.dashboard-view__state {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.dashboard-view__state--error {
  border-color: var(--color-status-danger);
  color: var(--color-status-danger);
}

@media (max-width: 900px) {
  .dashboard-view__main {
    grid-template-columns: 1fr;
  }

  .dashboard-view__alerts,
  .dashboard-view__process-map {
    grid-column: auto;
  }
}
</style>

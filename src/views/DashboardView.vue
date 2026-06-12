<script setup lang="ts">
import { useRouter } from 'vue-router';

import { useDashboardData } from '@/composables/useDashboardData';

import { ROUTE_NAMES } from '@/constants/routes';

import FabBearProgressLoader from '@/components/base/FabBearProgressLoader.vue';
import BottleneckAlertList from '@/components/dashboard/BottleneckAlertList.vue';
import DashboardKpiSummary from '@/components/dashboard/DashboardKpiSummary.vue';
import KpiSparklineChart from '@/components/dashboard/KpiSparklineChart.vue';
import ProcessMapCard from '@/components/dashboard/ProcessMapCard.vue';

const router = useRouter();
const { dashboardData, isLoading, errorMessage, sectionErrors, hasLoadedAnySection } = useDashboardData();

function handleOpenBottleneckMonitoring(caseId: string) {
  router.push({ name: ROUTE_NAMES.bottleneckMonitoring, query: { caseId } });
}

function handleOpenBottleneckCenter(caseId: string) {
  router.push({ name: ROUTE_NAMES.bottleneckCenter, query: { caseId } });
}

function handleSelectArea(areaCode: string) {
  router.push({ name: ROUTE_NAMES.bottleneckMonitoring, query: { areaCode } });
}
</script>

<template>
  <div class="dashboard-view">
    <FabBearProgressLoader v-if="isLoading && !hasLoadedAnySection" label="대시보드 데이터를 불러오는 중입니다" />
    <p v-else-if="errorMessage" class="dashboard-view__state dashboard-view__state--error">{{ errorMessage }}</p>

    <template v-if="hasLoadedAnySection">
      <DashboardKpiSummary v-if="dashboardData.kpi" :kpi="dashboardData.kpi" />
      <p v-else-if="sectionErrors.kpi" class="dashboard-view__state dashboard-view__state--error">
        {{ sectionErrors.kpi }}
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
        />
        <p v-else-if="sectionErrors.alerts" class="dashboard-view__state dashboard-view__state--error">
          {{ sectionErrors.alerts }}
        </p>

        <ProcessMapCard
          v-if="dashboardData.processAreas"
          class="dashboard-view__process-map"
          :areas="dashboardData.processAreas"
          @select-area="handleSelectArea"
        />
        <p v-else-if="sectionErrors.processAreas" class="dashboard-view__state dashboard-view__state--error">
          {{ sectionErrors.processAreas }}
        </p>
      </div>

      <div v-if="dashboardData.trends" class="dashboard-view__charts" aria-label="차트 추이 영역">
        <section v-for="trend in dashboardData.trends" :key="trend.key" class="dashboard-view__chart-card">
          <header class="dashboard-view__chart-header">
            <div class="dashboard-view__chart-title-row">
              <h3>{{ trend.title }}</h3>
              <span>{{ trend.subtitle }}</span>
            </div>
          </header>
          <div class="dashboard-view__chart-body">
            <KpiSparklineChart
              :values="trend.values"
              :color-token="trend.colorToken"
              :x-labels="trend.xLabels"
              :value-format="trend.valueFormat"
              :target-value="trend.targetValue"
            />
          </div>
        </section>
      </div>
      <p v-else-if="sectionErrors.trends" class="dashboard-view__state dashboard-view__state--error">
        {{ sectionErrors.trends }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.dashboard-view {
  display: grid;
  min-width: 0;
  gap: var(--space-3);
}

.dashboard-view__main {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-auto-rows: 41rem;
  align-items: stretch;
  gap: var(--space-3);
  min-width: 0;
}

.dashboard-view__alerts {
  grid-column: span 1;
  min-height: 0;
}

.dashboard-view__process-map {
  grid-column: span 3;
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

.dashboard-view__charts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
  min-width: 0;
}

.dashboard-view__chart-card {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: var(--space-3);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
}

.dashboard-view__chart-header {
  min-width: 0;
}

.dashboard-view__chart-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.dashboard-view__chart-card h3 {
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dashboard-view__chart-card span {
  flex-shrink: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
}

.dashboard-view__chart-body {
  min-width: 0;
  height: 150px;
}

@media (max-width: 1440px) {
  .dashboard-view__main {
    grid-template-columns: 1fr;
  }

  .dashboard-view__alerts,
  .dashboard-view__process-map {
    grid-column: auto;
  }
}

@media (max-width: 1180px) {
  .dashboard-view__charts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .dashboard-view__charts {
    grid-template-columns: 1fr;
  }
}
</style>

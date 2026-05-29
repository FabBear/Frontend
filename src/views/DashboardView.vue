<script setup lang="ts">
import { useRouter } from 'vue-router';

import { MOCK_BOTTLENECK_ALERTS, MOCK_FAB_KPI, MOCK_KPI_TRENDS, MOCK_PM_DATA } from '@/constants/mockData/dashboard';

import BottleneckAlertList from '@/components/dashboard/BottleneckAlertList.vue';
import DashboardKpiSummary from '@/components/dashboard/DashboardKpiSummary.vue';
import KpiSparklineChart from '@/components/dashboard/KpiSparklineChart.vue';
import ProcessMapCard from '@/components/dashboard/ProcessMapCard.vue';

const router = useRouter();

function handleShowSolutions(caseId: string) {
  router.push({ path: '/response/bottleneck-center', query: { caseId, tab: 'solutions' } });
}

function handleAnalyzeCause(caseId: string) {
  router.push({ path: '/reports/cause', query: { caseId } });
}

function handleOpenCenter() {
  router.push('/response/bottleneck-center');
}

function handleSelectArea(areaCode: string) {
  router.push({ path: '/monitoring/bottlenecks', query: { areaCode } });
}
</script>

<template>
  <div class="dashboard-view">
    <DashboardKpiSummary :kpi="MOCK_FAB_KPI" />

    <div class="dashboard-view__main">
      <BottleneckAlertList
        :alerts="MOCK_BOTTLENECK_ALERTS"
        @open-center="handleOpenCenter"
        @show-solutions="handleShowSolutions"
        @analyze-cause="handleAnalyzeCause"
      />
      <ProcessMapCard :areas="MOCK_PM_DATA" @select-area="handleSelectArea" />
    </div>

    <div class="dashboard-view__charts" aria-label="차트 추이 영역">
      <section v-for="trend in MOCK_KPI_TRENDS" :key="trend.key" class="dashboard-view__chart-card">
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
  </div>
</template>

<style scoped>
.dashboard-view {
  display: grid;
  min-width: 0;
  gap: 14px;
}

.dashboard-view__main {
  display: grid;
  grid-template-columns: minmax(0, 360px) minmax(0, 1fr);
  align-items: stretch;
  gap: 14px;
  min-width: 0;
}

.dashboard-view__charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
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
}

@media (max-width: 760px) {
  .dashboard-view__charts {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useBottleneckAlertList } from '@/composables/useBottleneckAlertList';
import { useBottleneckMonitoring } from '@/composables/useBottleneckMonitoring';

import { ROUTE_NAMES } from '@/constants/routes';

import BottleneckAlertSelector from '@/components/bottleneckMonitoring/BottleneckAlertSelector.vue';
import BottleneckSnapshotCard from '@/components/bottleneckMonitoring/BottleneckSnapshotCard.vue';
import BottleneckSummaryPanels from '@/components/bottleneckMonitoring/BottleneckSummaryPanels.vue';
import BottleneckToolGroupPanel from '@/components/bottleneckMonitoring/BottleneckToolGroupPanel.vue';
import ProcessMapCard from '@/components/dashboard/ProcessMapCard.vue';

import { formatKoMonthDayTime } from '@/utils/format';

const route = useRoute();
const router = useRouter();

const {
  snapshot,
  processMapAreas,
  selectedArea,
  selectedAreaCode,
  toolGroups,
  selectedToolGroupId,
  selectedToolGroupDetail,
  toolGroupErrorMessage,
  detailErrorMessage,
  isLoading,
  errorMessage,
  loadMonitoringData,
  selectArea,
  selectToolGroup,
} = useBottleneckMonitoring();

const {
  alerts: bottleneckAlerts,
  isLoading: isAlertListLoading,
  errorMessage: alertListErrorMessage,
  filterStartDate,
  filterEndDate,
  pageInfo: alertPageInfo,
  totalPages: alertTotalPages,
  pageButtons: alertPageButtons,
  loadAlerts,
  applyPresetRange,
  handleDateFilterChange,
  handlePageChange: handleAlertPageChange,
} = useBottleneckAlertList();

const topBottleneck = computed(
  () => [...toolGroups.value].sort((a, b) => b.bottleneckProb - a.bottleneckProb)[0] ?? null
);
const selectedAlert = computed(() => {
  const caseId = getRouteCaseId() ?? snapshot.value?.caseId;

  return bottleneckAlerts.value.find((alert) => alert.caseId === caseId) ?? null;
});
const selectedCaseId = computed(() => selectedAlert.value?.caseId ?? snapshot.value?.caseId ?? null);
const selectedBottleneckProb = computed(
  () => selectedAlert.value?.bottleneckProb ?? topBottleneck.value?.bottleneckProb ?? null
);
const selectedDelayHours = computed(() => selectedAlert.value?.estDelayHours ?? null);
const selectedAffectedLots = computed(() => selectedAlert.value?.affectedLotCount ?? null);
const selectedCauseText = computed(() => selectedAlert.value?.mainCause ?? null);
const selectedStatusText = computed(() => {
  if (!selectedAlert.value) return null;
  return selectedAlert.value.canShowSolutions ? '대응안 비교 완료' : null;
});

const snapshotTitle = computed(() => (selectedAlert.value ? selectedAlert.value.tgName : '최신 스냅샷 기준'));
const snapshotSubtitle = computed(() => {
  if (selectedAlert.value) {
    return `${selectedAlert.value.areaName} · ${formatKoMonthDayTime(selectedAlert.value.detectedAt)} 감지`;
  }
  return snapshot.value ? `${formatKoMonthDayTime(snapshot.value.capturedAt)} 기준` : '-';
});

function getRouteAreaCode() {
  const areaCode = route.query.areaCode;

  return typeof areaCode === 'string' && areaCode.length > 0 ? areaCode : null;
}

function getRouteCaseId() {
  const caseId = route.query.caseId;

  return typeof caseId === 'string' && caseId.length > 0 ? caseId : null;
}

async function handleSelectAlert(caseId: string) {
  await router.push({
    name: ROUTE_NAMES.bottleneckMonitoring,
    query: { caseId },
  });
}

async function handleSelectArea(areaCode: string | null) {
  const caseId = getRouteCaseId();

  await router.push({
    name: ROUTE_NAMES.bottleneckMonitoring,
    query: {
      ...(caseId ? { caseId } : {}),
      ...(areaCode ? { areaCode } : {}),
    },
  });
}

function handleOpenCenter(caseId: string) {
  router.push({ name: ROUTE_NAMES.bottleneckCenter, query: { caseId } });
}

function handleOpenCurrentCase() {
  if (!snapshot.value) return;
  handleOpenCenter(snapshot.value.caseId);
}

onMounted(() => {
  void loadAlerts();
  void loadMonitoringData(getRouteAreaCode(), getRouteCaseId());
});

watch([() => route.query.areaCode, () => route.query.caseId], ([, nextCaseId], [, previousCaseId]) => {
  if (nextCaseId !== previousCaseId) {
    void loadMonitoringData(getRouteAreaCode(), getRouteCaseId());
    return;
  }

  void selectArea(getRouteAreaCode());
});
</script>

<template>
  <div class="bottleneck-monitoring-view">
    <header class="bottleneck-monitoring-view__header">
      <div>
        <h1 class="bottleneck-monitoring-view__title">병목 위험 모니터링</h1>
        <p class="bottleneck-monitoring-view__subtitle">
          병목 알림이 발생한 시점의 snapshot 기준으로 공정/TG 위험도를 확인합니다.
        </p>
      </div>
    </header>

    <p v-if="isLoading && !selectedAreaCode && toolGroups.length === 0" class="bottleneck-monitoring-view__state">
      병목 모니터링 데이터를 불러오는 중입니다.
    </p>
    <p v-else-if="errorMessage" class="bottleneck-monitoring-view__state bottleneck-monitoring-view__state--error">
      {{ errorMessage }}
    </p>

    <template v-if="!errorMessage">
      <div class="bottleneck-monitoring-view__workspace">
        <BottleneckAlertSelector
          v-model:filter-start-date="filterStartDate"
          v-model:filter-end-date="filterEndDate"
          :alerts="bottleneckAlerts"
          :selected-case-id="selectedCaseId"
          :loading="isAlertListLoading"
          :error-message="alertListErrorMessage"
          :page-info="alertPageInfo"
          :total-pages="alertTotalPages"
          :page-buttons="alertPageButtons"
          @apply-preset="applyPresetRange"
          @date-filter-change="handleDateFilterChange"
          @page-change="handleAlertPageChange"
          @select-alert="handleSelectAlert"
        />

        <div class="bottleneck-monitoring-view__main-panel">
          <BottleneckSnapshotCard
            :title="snapshotTitle"
            :subtitle="snapshotSubtitle"
            :delay-hours="selectedDelayHours"
            :affected-lots="selectedAffectedLots"
            :bottleneck-prob="selectedBottleneckProb"
            :status-text="selectedStatusText"
            :cause-text="selectedCauseText"
            :disabled="!snapshot"
            @open-center="handleOpenCurrentCase"
          />

          <ProcessMapCard
            :areas="processMapAreas"
            :selected-area-code="selectedAreaCode"
            metric-mode="bottleneck"
            @select-area="handleSelectArea"
          />

          <BottleneckToolGroupPanel
            :selected-area="selectedArea"
            :tool-groups="toolGroups"
            :selected-tool-group-id="selectedToolGroupId"
            :selected-tool-group-detail="selectedToolGroupDetail"
            :loading="isLoading"
            :error-message="toolGroupErrorMessage"
            :detail-error-message="detailErrorMessage"
            @select-tool-group="selectToolGroup"
          />

          <BottleneckSummaryPanels :tool-groups="toolGroups" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.bottleneck-monitoring-view {
  display: grid;
  min-width: 0;
  gap: var(--space-3);
}

.bottleneck-monitoring-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  border-bottom: var(--border-width-default) solid var(--color-border-default);
  padding-bottom: var(--space-2);
}

.bottleneck-monitoring-view__title {
  color: var(--color-fg-strong);
  font-size: var(--text-page-title-size);
  font-weight: var(--font-weight-bold);
  line-height: var(--text-page-title-line-height);
}

.bottleneck-monitoring-view__subtitle {
  margin-top: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bottleneck-monitoring-view__workspace {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  align-items: stretch;
  gap: var(--space-3);
  min-width: 0;
}

.bottleneck-monitoring-view__main-panel {
  display: grid;
  min-width: 0;
  gap: var(--space-3);
}

.bottleneck-monitoring-view__state {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.bottleneck-monitoring-view__state--error {
  border-color: var(--color-status-danger);
  color: var(--color-status-danger);
}

@media (max-width: 1120px) {
  .bottleneck-monitoring-view__workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .bottleneck-monitoring-view__header {
    display: grid;
  }
}
</style>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { LayoutDashboard, RefreshCcw } from '@lucide/vue';

import { useBottleneckAlertList } from '@/composables/useBottleneckAlertList';
import { useBottleneckMonitoring } from '@/composables/useBottleneckMonitoring';

import { ROUTE_NAMES } from '@/constants/routes';

import BaseButton from '@/components/base/BaseButton.vue';
import FabBearProgressLoader from '@/components/base/FabBearProgressLoader.vue';
import BottleneckAlertSelector from '@/components/bottleneckMonitoring/BottleneckAlertSelector.vue';
import BottleneckSnapshotCard from '@/components/bottleneckMonitoring/BottleneckSnapshotCard.vue';
import BottleneckSummaryPanels from '@/components/bottleneckMonitoring/BottleneckSummaryPanels.vue';
import BottleneckToolGroupPanel from '@/components/bottleneckMonitoring/BottleneckToolGroupPanel.vue';
import ProcessMapCard from '@/components/dashboard/ProcessMapCard.vue';

import bearSearchUrl from '@/assets/bear-search.svg';

import { compareBottleneckRisk } from '@/utils/bottleneckRisk';
import { formatKoMonthDayTime } from '@/utils/format';

const route = useRoute();
const router = useRouter();
const hasMonitoringLoaded = ref(false);

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
  hasLoaded: hasAlertListLoaded,
  errorMessage: alertListErrorMessage,
  filterStartDate,
  filterEndDate,
  loadAlerts,
  applyPresetRange,
} = useBottleneckAlertList();

const topBottleneck = computed(() => [...toolGroups.value].sort(compareBottleneckRisk)[0] ?? null);
const selectedAlert = computed(() => {
  const caseId = getRouteCaseId() ?? snapshot.value?.caseId;

  return bottleneckAlerts.value.find((alert) => alert.caseId === caseId) ?? null;
});
const selectedCaseId = computed(
  () => getRouteCaseId() ?? selectedAlert.value?.caseId ?? snapshot.value?.caseId ?? null
);
const selectedAlertMetrics = computed(() => selectedAlert.value?.alertMetrics ?? null);
const selectedRiskScore = computed(
  () =>
    selectedAlert.value?.riskScore ??
    selectedAlertMetrics.value?.compositeScore ??
    topBottleneck.value?.riskScore ??
    null
);
const selectedCauseText = computed(() => selectedAlert.value?.mainCause ?? null);
const selectedStatusText = computed(() => {
  if (!selectedAlert.value) return null;
  if (selectedAlert.value.status === 'AWAITING_HITL') return '승인 대기';
  return selectedAlert.value.canShowSolutions ? '대응안 비교 완료' : null;
});

const snapshotTitle = computed(() => (selectedAlert.value ? selectedAlert.value.tgName : '최신 스냅샷 기준'));
const snapshotSubtitle = computed(() => {
  if (selectedAlert.value) {
    return `${selectedAlert.value.areaName} · ${formatKoMonthDayTime(selectedAlert.value.detectedAt)} 감지`;
  }
  return snapshot.value ? `${formatKoMonthDayTime(snapshot.value.capturedAt)} 기준` : '-';
});
const hasAlertFilter = computed(() => Boolean(filterStartDate.value || filterEndDate.value));
const shouldShowNoAlertState = computed(
  () =>
    hasAlertListLoaded.value &&
    !isAlertListLoading.value &&
    !alertListErrorMessage.value &&
    bottleneckAlerts.value.length === 0 &&
    !getRouteCaseId()
);
const shouldShowMonitoringErrorState = computed(() => Boolean(errorMessage.value));
const isInitialMonitoringLoading = computed(() => !errorMessage.value && !hasMonitoringLoaded.value);
const hasDisplayableMonitoringData = computed(() => processMapAreas.value.length > 0 || toolGroups.value.length > 0);
const shouldShowEmptyState = computed(
  () => hasMonitoringLoaded.value && !isLoading.value && !errorMessage.value && !hasDisplayableMonitoringData.value
);
const emptyStateTone = computed(() => (shouldShowMonitoringErrorState.value ? 'error' : 'empty'));
const emptyStateTitle = computed(() => {
  if (shouldShowMonitoringErrorState.value) {
    return '병목 모니터링 데이터를 불러오지 못했습니다.';
  }
  if (shouldShowNoAlertState.value) {
    return hasAlertFilter.value ? '조회 조건에 맞는 병목 알림이 없습니다.' : '현재 병목 알림이 없습니다.';
  }
  if (getRouteCaseId()) return '선택한 병목 케이스에 표시할 데이터가 없습니다.';
  if (getRouteAreaCode()) return '선택한 구역에 표시할 병목 데이터가 없습니다.';
  return '표시할 병목 모니터링 데이터가 없습니다.';
});
const emptyStateDescription = computed(() => {
  if (shouldShowMonitoringErrorState.value) {
    return errorMessage.value ?? '병목 모니터링 API 응답을 확인한 뒤 다시 시도해 주세요.';
  }
  if (shouldShowNoAlertState.value) {
    return hasAlertFilter.value
      ? '선택한 기간 안에서 감지된 병목 케이스가 없습니다. 기간을 초기화하거나 새로고침해 확인하세요.'
      : '감지된 병목 케이스가 없습니다. 최신 스냅샷이 생성되면 공정 상태맵과 Tool Group 랭킹이 표시됩니다.';
  }
  if (snapshot.value) {
    return '스냅샷은 생성되었지만 공정맵 또는 Tool Group 랭킹 데이터가 연결되지 않았습니다.';
  }
  return '현재 조회 조건에서 생성된 병목 스냅샷 데이터를 찾지 못했습니다.';
});

function getRouteAreaCode() {
  const areaCode = route.query.areaCode;

  return typeof areaCode === 'string' && areaCode.length > 0 ? areaCode : null;
}

function getRouteCaseId() {
  const caseId = route.query.caseId;

  return typeof caseId === 'string' && caseId.length > 0 ? caseId : null;
}

function getRouteToolGroupId() {
  const tgId = route.query.tgId;

  return typeof tgId === 'string' && tgId.length > 0 ? tgId : null;
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

async function handleSelectMapToolGroup(tgId: string, areaCode: string) {
  const caseId = getRouteCaseId();

  await router.push({
    name: ROUTE_NAMES.bottleneckMonitoring,
    query: {
      ...(caseId ? { caseId } : {}),
      areaCode,
      tgId,
    },
  });
}

async function refreshMonitoringData(blocking = false) {
  if (blocking) {
    hasMonitoringLoaded.value = false;
  }

  await loadMonitoringData(getRouteAreaCode(), getRouteCaseId());
  const tgId = getRouteToolGroupId();
  if (tgId) {
    await selectToolGroup(tgId);
  }
  hasMonitoringLoaded.value = true;
}

function handleRefresh() {
  void loadAlerts();
  void refreshMonitoringData(true);
}

function handleResetFilters() {
  applyPresetRange(null);
}

function handleOpenDashboard() {
  router.push({ name: ROUTE_NAMES.dashboard });
}

onMounted(() => {
  void loadAlerts();
  void refreshMonitoringData(true);
});

watch(
  [() => route.query.areaCode, () => route.query.caseId, () => route.query.tgId],
  ([, nextCaseId], [, previousCaseId]) => {
    if (nextCaseId !== previousCaseId) {
      void refreshMonitoringData(true);
      return;
    }

    void selectArea(getRouteAreaCode());
    const tgId = getRouteToolGroupId();
    if (tgId) {
      void selectToolGroup(tgId);
    }
  }
);
</script>

<template>
  <div class="bottleneck-monitoring-view">
    <header class="bottleneck-monitoring-view__header">
      <div>
        <h1 class="bottleneck-monitoring-view__title">병목 모니터링</h1>
        <p class="bottleneck-monitoring-view__subtitle">
          이전에 감지된 병목 알림 케이스와 해당 시점의 공정/TG 위험도를 확인합니다.
        </p>
      </div>
    </header>

    <FabBearProgressLoader v-if="isInitialMonitoringLoading" label="병목 모니터링 데이터를 불러오는 중입니다" />
    <section
      v-else-if="shouldShowMonitoringErrorState || shouldShowEmptyState"
      :class="['bottleneck-monitoring-view__empty', `bottleneck-monitoring-view__empty--${emptyStateTone}`]"
    >
      <div class="bottleneck-monitoring-view__empty-visual" aria-hidden="true">
        <img class="bottleneck-monitoring-view__empty-bear" :src="bearSearchUrl" alt="" />
      </div>
      <div class="bottleneck-monitoring-view__empty-text">
        <h2>{{ emptyStateTitle }}</h2>
        <p>{{ emptyStateDescription }}</p>
      </div>
      <div class="bottleneck-monitoring-view__empty-actions">
        <BaseButton v-if="shouldShowNoAlertState && hasAlertFilter" variant="ghost" @click="handleResetFilters">
          <RefreshCcw :size="16" aria-hidden="true" />
          필터 초기화
        </BaseButton>
        <BaseButton variant="ghost" @click="handleRefresh">
          <RefreshCcw :size="16" aria-hidden="true" />
          새로고침
        </BaseButton>
        <BaseButton @click="handleOpenDashboard">
          <LayoutDashboard :size="16" aria-hidden="true" />
          대시보드
        </BaseButton>
      </div>
    </section>

    <template v-else>
      <div class="bottleneck-monitoring-view__workspace">
        <BottleneckAlertSelector
          :alerts="bottleneckAlerts"
          :selected-case-id="selectedCaseId"
          :loading="isAlertListLoading"
          :error-message="alertListErrorMessage"
          @retry="handleRefresh"
          @select-alert="handleSelectAlert"
        />

        <div class="bottleneck-monitoring-view__main-panel">
          <BottleneckSnapshotCard
            :title="snapshotTitle"
            :subtitle="snapshotSubtitle"
            :risk-score="selectedRiskScore"
            :alert-metrics="selectedAlertMetrics"
            :status-text="selectedStatusText"
            :cause-text="selectedCauseText"
          />

          <ProcessMapCard
            :areas="processMapAreas"
            :selected-area-code="selectedAreaCode"
            metric-mode="bottleneck"
            @select-area="handleSelectArea"
            @select-tool-group="handleSelectMapToolGroup"
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
  --bottleneck-monitoring-sticky-header-height: 74px;
  --bottleneck-monitoring-selector-top: calc(var(--bottleneck-monitoring-sticky-header-height) + var(--space-3));
  --bottleneck-monitoring-selector-max-height: calc(
    100svh - var(--layout-header-height) - var(--spacing-page) - var(--bottleneck-monitoring-selector-top)
  );

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

.bottleneck-monitoring-view__empty {
  display: grid;
  grid-template-columns: minmax(150px, 230px) minmax(0, 560px);
  align-items: center;
  justify-content: center;
  min-height: 320px;
  column-gap: var(--space-6);
  row-gap: var(--space-3);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-5);
  text-align: left;
  box-shadow: var(--shadow-sm);
}

.bottleneck-monitoring-view__empty--error {
  border-color: color-mix(in srgb, var(--color-status-danger) 18%, var(--color-border-default));
}

.bottleneck-monitoring-view__empty-visual {
  position: relative;
  grid-row: span 2;
  width: min(230px, 48vw);
}

.bottleneck-monitoring-view__empty-bear {
  display: block;
  width: 100%;
  height: auto;
  opacity: 0.96;
}

.bottleneck-monitoring-view__empty-badge {
  position: absolute;
  right: 4%;
  bottom: 13%;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  border: 1px solid var(--color-login-panel-border);
  border-radius: var(--radius-pill);
  background: var(--color-login-panel-bg);
  padding: 0.42rem 0.72rem;
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: 1;
  box-shadow: var(--shadow-sm);
}

.bottleneck-monitoring-view__empty--error .bottleneck-monitoring-view__empty-badge {
  border-color: color-mix(in srgb, var(--color-status-danger) 34%, var(--color-login-panel-border));
  color: var(--color-status-danger);
}

.bottleneck-monitoring-view__empty-text {
  display: grid;
  max-width: 560px;
  gap: var(--space-2);
}

.bottleneck-monitoring-view__empty-text h2,
.bottleneck-monitoring-view__empty-text p {
  margin: 0;
}

.bottleneck-monitoring-view__empty-text h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-xl);
  line-height: var(--line-height-tight);
}

.bottleneck-monitoring-view__empty-text p {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  line-height: var(--line-height-base);
}

.bottleneck-monitoring-view__empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: var(--space-2);
}

@media (max-width: 1120px) {
  .bottleneck-monitoring-view {
    --bottleneck-monitoring-selector-top: 0px;
    --bottleneck-monitoring-selector-max-height: none;
  }

  .bottleneck-monitoring-view__workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .bottleneck-monitoring-view__header {
    display: grid;
    position: static;
    margin: 0;
    padding: 0 0 var(--space-2);
    backdrop-filter: none;
  }

  .bottleneck-monitoring-view__empty {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .bottleneck-monitoring-view__empty-visual {
    grid-row: auto;
  }

  .bottleneck-monitoring-view__empty-actions {
    justify-content: center;
  }
}
</style>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useBottleneckMonitoring } from '@/composables/useBottleneckMonitoring';

import { ROUTE_NAMES } from '@/constants/routes';

import BottleneckSummaryPanels from '@/components/bottleneckMonitoring/BottleneckSummaryPanels.vue';
import ToolGroupDetailPanel from '@/components/bottleneckMonitoring/ToolGroupDetailPanel.vue';
import ToolGroupTable from '@/components/bottleneckMonitoring/ToolGroupTable.vue';
import ProcessMapCard from '@/components/dashboard/ProcessMapCard.vue';

const route = useRoute();
const router = useRouter();

const {
  processMapAreas,
  selectedArea,
  selectedAreaCode,
  toolGroups,
  selectedToolGroupId,
  selectedToolGroupDetail,
  detailErrorMessage,
  isLoading,
  errorMessage,
  loadMonitoringData,
  selectArea,
  selectToolGroup,
} = useBottleneckMonitoring();

const panelTitle = computed(() =>
  selectedArea.value ? `${selectedArea.value.areaCode} (${selectedArea.value.areaNameKo})` : '전체 공정'
);
const panelSubtitle = computed(() => `총 ${toolGroups.value.length}개`);

function getRouteAreaCode() {
  const areaCode = route.query.areaCode;

  return typeof areaCode === 'string' && areaCode.length > 0 ? areaCode : null;
}

async function handleSelectArea(areaCode: string | null) {
  await router.push({
    name: ROUTE_NAMES.bottleneckMonitoring,
    query: areaCode ? { areaCode } : {},
  });
}

function handleOpenCenter(caseId: string) {
  router.push({ name: ROUTE_NAMES.bottleneckCenter, query: { caseId } });
}

onMounted(() => {
  void loadMonitoringData(getRouteAreaCode());
});

watch(
  () => route.query.areaCode,
  () => {
    void selectArea(getRouteAreaCode());
  }
);
</script>

<template>
  <div class="bottleneck-monitoring-view">
    <header class="bottleneck-monitoring-view__header">
      <div>
        <h1 class="bottleneck-monitoring-view__title">병목 위험 모니터링</h1>
      </div>
    </header>

    <p v-if="isLoading && !selectedAreaCode && toolGroups.length === 0" class="bottleneck-monitoring-view__state">
      병목 모니터링 데이터를 불러오는 중입니다.
    </p>
    <p v-else-if="errorMessage" class="bottleneck-monitoring-view__state bottleneck-monitoring-view__state--error">
      {{ errorMessage }}
    </p>

    <template v-if="!errorMessage">
      <ProcessMapCard :areas="processMapAreas" :selected-area-name="selectedAreaCode" @select-area="handleSelectArea" />

      <section class="bottleneck-monitoring-view__tg-panel" aria-labelledby="tg-panel-title">
        <header class="bottleneck-monitoring-view__panel-header">
          <div>
            <h2 id="tg-panel-title" class="bottleneck-monitoring-view__panel-title">{{ panelTitle }}</h2>
            <p class="bottleneck-monitoring-view__panel-subtitle">{{ panelSubtitle }}</p>
          </div>
          <button
            class="bottleneck-monitoring-view__all-button"
            :class="{ 'bottleneck-monitoring-view__all-button--active': !selectedAreaCode }"
            type="button"
            @click="handleSelectArea(null)"
          >
            전체 보기
          </button>
        </header>

        <div class="bottleneck-monitoring-view__content">
          <ToolGroupTable
            :tool-groups="toolGroups"
            :selected-tool-group-id="selectedToolGroupId"
            :loading="isLoading"
            @select-tool-group="selectToolGroup"
          />
          <ToolGroupDetailPanel
            :detail="selectedToolGroupDetail"
            :error-message="detailErrorMessage"
            @open-center="handleOpenCenter"
          />
        </div>
      </section>

      <BottleneckSummaryPanels :tool-groups="toolGroups" />
    </template>
  </div>
</template>

<style scoped>
.bottleneck-monitoring-view {
  display: grid;
  min-width: 0;
  gap: var(--space-4);
}

.bottleneck-monitoring-view__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
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
  font-size: var(--font-size-sm);
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

.bottleneck-monitoring-view__tg-panel {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
  display: grid;
  gap: var(--space-3);
}

.bottleneck-monitoring-view__panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.bottleneck-monitoring-view__panel-title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.bottleneck-monitoring-view__panel-subtitle {
  margin-top: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bottleneck-monitoring-view__all-button {
  min-height: 30px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: transparent;
  padding: 4px 12px;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.bottleneck-monitoring-view__all-button:hover,
.bottleneck-monitoring-view__all-button--active {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
}

.bottleneck-monitoring-view__content {
  display: grid;
  grid-template-columns: minmax(0, max-content) 360px;
  align-items: start;
  justify-content: start;
  gap: var(--space-3);
  min-width: 0;
}

@media (max-width: 1120px) {
  .bottleneck-monitoring-view__content {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .bottleneck-monitoring-view__header {
    display: grid;
  }
}
</style>

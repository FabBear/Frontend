<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { toMesRiskLevel } from '@/composables/useMesMonitoring';

import { MES_TOOL_STATUS_META } from '@/constants/mes';
import { RISK_LEVEL_META } from '@/constants/riskLevel';

import type { MesToolGroupMetric, MesToolMetric, MesToolStatus, MesToolViewMode } from '@/types/mes';

import MesToolCardGrid from '@/components/mes/MesToolCardGrid.vue';
import MesToolGroupKpiGrid from '@/components/mes/MesToolGroupKpiGrid.vue';
import MesToolTable from '@/components/mes/MesToolTable.vue';

import { formatRatioPercent } from '@/utils/format';

const props = defineProps<{
  toolGroup: MesToolGroupMetric | null;
  tools: MesToolMetric[];
  toolViewMode: MesToolViewMode;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  'update:toolViewMode': [value: MesToolViewMode];
}>();

const TOOL_STATUS_FILTERS: Array<{ value: MesToolStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'RUN', label: MES_TOOL_STATUS_META.RUN.label },
  { value: 'IDLE', label: MES_TOOL_STATUS_META.IDLE.label },
  { value: 'SETUP', label: MES_TOOL_STATUS_META.SETUP.label },
  { value: 'DOWN', label: MES_TOOL_STATUS_META.DOWN.label },
];

const toolStatusFilter = ref<MesToolStatus | 'ALL'>('ALL');
const riskMeta = computed(() => (props.toolGroup ? RISK_LEVEL_META[toMesRiskLevel(props.toolGroup.riskGrade)] : null));
const utilizationPercent = computed(() =>
  props.toolGroup ? `${Math.round(props.toolGroup.utilizationRate * 100)}%` : '0%'
);
const filteredTools = computed(() =>
  toolStatusFilter.value === 'ALL' ? props.tools : props.tools.filter((tool) => tool.status === toolStatusFilter.value)
);

watch(
  () => props.toolGroup?.tgId,
  () => {
    toolStatusFilter.value = 'ALL';
  }
);

function getStatusFilterStyle(status: MesToolStatus | 'ALL') {
  if (status === 'ALL' || toolStatusFilter.value === status) return {};
  return { color: MES_TOOL_STATUS_META[status].color };
}
</script>

<template>
  <section class="tool-group-detail-panel" aria-label="Tool Group 상세">
    <div v-if="errorMessage" class="tool-group-detail-panel__empty tool-group-detail-panel__empty--error">
      <strong>{{ errorMessage }}</strong>
      <span>다시 Tool Group을 선택해 주세요.</span>
    </div>

    <div v-else-if="!toolGroup" class="tool-group-detail-panel__empty">
      <strong>Tool Group을 선택하세요</strong>
      <span>좌측 목록에서 Tool Group을 클릭하면 해당 Group의 개별 Tool KPI가 표시됩니다.</span>
    </div>

    <template v-else>
      <header class="tool-group-detail-panel__header">
        <div>
          <div class="tool-group-detail-panel__title-row">
            <span
              class="tool-group-detail-panel__dot"
              :style="{ backgroundColor: riskMeta?.color }"
              aria-hidden="true"
            />
            <h2>{{ toolGroup.tgName }}</h2>
            <span class="tool-group-detail-panel__grade" :style="{ color: riskMeta?.color }">{{
              riskMeta?.label
            }}</span>
          </div>
          <p>
            공정: <b>{{ toolGroup.areaName }}</b> / {{ toolGroup.sourceAreaNameKo }} · 장비 수:
            <b>{{ toolGroup.toolCount }}대</b> · 가동률:
            <b :style="{ color: riskMeta?.color }">{{ formatRatioPercent(toolGroup.utilizationRate) }}</b>
          </p>
        </div>
        <div class="tool-group-detail-panel__gauge" aria-label="가동률 게이지">
          <span>가동률 게이지</span>
          <div>
            <i :style="{ width: utilizationPercent, backgroundColor: riskMeta?.color }" />
          </div>
          <small>{{ formatRatioPercent(toolGroup.utilizationRate) }} / 100%</small>
        </div>
      </header>

      <MesToolGroupKpiGrid :tool-group="toolGroup" :risk-color="riskMeta?.color ?? 'var(--color-fg-strong)'" />

      <section class="tool-group-detail-panel__tools">
        <header class="tool-group-detail-panel__tools-header">
          <div>
            <h3>개별 Tool KPI</h3>
            <span>{{ filteredTools.length }} / {{ tools.length }}대</span>
          </div>
          <div class="tool-group-detail-panel__tools-controls">
            <div class="tool-group-detail-panel__status-filter" role="group" aria-label="Tool 상태 필터">
              <button
                v-for="filter in TOOL_STATUS_FILTERS"
                :key="filter.value"
                type="button"
                :class="{ 'tool-group-detail-panel__status-button--active': toolStatusFilter === filter.value }"
                :style="getStatusFilterStyle(filter.value)"
                @click="toolStatusFilter = filter.value"
              >
                {{ filter.label }}
              </button>
            </div>
            <div class="tool-group-detail-panel__view-toggle" role="group" aria-label="Tool 보기 방식">
              <button
                type="button"
                :class="{ 'tool-group-detail-panel__view-button--active': toolViewMode === 'card' }"
                @click="emit('update:toolViewMode', 'card')"
              >
                카드 뷰
              </button>
              <button
                type="button"
                :class="{ 'tool-group-detail-panel__view-button--active': toolViewMode === 'table' }"
                @click="emit('update:toolViewMode', 'table')"
              >
                테이블 뷰
              </button>
            </div>
          </div>
        </header>

        <p v-if="filteredTools.length === 0" class="tool-group-detail-panel__tools-empty">
          선택한 상태의 Tool이 없습니다.
        </p>
        <MesToolCardGrid v-else-if="toolViewMode === 'card'" :tools="filteredTools" />
        <MesToolTable v-else :tools="filteredTools" />
      </section>
    </template>
  </section>
</template>

<style scoped>
.tool-group-detail-panel {
  display: grid;
  flex: 1;
  gap: var(--space-3);
  min-width: 0;
}

.tool-group-detail-panel__empty {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: 60px 20px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  text-align: center;
}

.tool-group-detail-panel__empty strong {
  display: block;
  margin-bottom: var(--space-2);
  color: var(--color-fg-strong);
}

.tool-group-detail-panel__empty--error strong {
  color: var(--color-status-danger);
}

.tool-group-detail-panel__header,
.tool-group-detail-panel__tools {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.tool-group-detail-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
}

.tool-group-detail-panel__title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.tool-group-detail-panel__title-row h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.tool-group-detail-panel__dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-pill);
}

.tool-group-detail-panel__grade {
  border-radius: var(--radius-pill);
  background: var(--color-bg-surface);
  padding: 2px 9px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.tool-group-detail-panel__header p {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.tool-group-detail-panel__header p b {
  color: var(--color-fg-strong);
}

.tool-group-detail-panel__gauge {
  display: grid;
  min-width: 160px;
  gap: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  text-align: right;
}

.tool-group-detail-panel__gauge div {
  overflow: hidden;
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--color-border-subtle);
}

.tool-group-detail-panel__gauge i {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.tool-group-detail-panel__tools-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.tool-group-detail-panel__tools-header h3 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

.tool-group-detail-panel__tools-header span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.tool-group-detail-panel__tools-empty {
  border: var(--border-width-default) dashed var(--color-border-default);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  text-align: center;
}

.tool-group-detail-panel__tools-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-2);
}

.tool-group-detail-panel__status-filter,
.tool-group-detail-panel__view-toggle {
  display: flex;
  gap: var(--space-1);
}

.tool-group-detail-panel__status-filter button,
.tool-group-detail-panel__view-toggle button {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: transparent;
  padding: 3px 10px;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-xs);
}

.tool-group-detail-panel__status-button--active,
.tool-group-detail-panel__view-button--active {
  border-color: var(--color-action-primary-border) !important;
  background: var(--color-action-primary-soft) !important;
  color: var(--color-action-primary) !important;
  font-weight: var(--font-weight-semibold);
}
</style>

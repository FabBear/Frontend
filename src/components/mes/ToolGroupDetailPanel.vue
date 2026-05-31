<script setup lang="ts">
import { computed } from 'vue';

import { toMesRiskLevel } from '@/composables/useMesMonitoring';

import { RISK_LEVEL_META } from '@/constants/riskLevel';

import type { MesToolGroupMetric, MesToolMetric, MesToolViewMode } from '@/types/mes';

import MesToolCardGrid from '@/components/mes/MesToolCardGrid.vue';
import MesToolTable from '@/components/mes/MesToolTable.vue';

import { formatNumber, formatQtimeDays, formatRatioPercent } from '@/utils/format';
import { calculateMesOeeEstimate, getMesQtimeColor, getMesQueueColor } from '@/utils/mesMetrics';

interface Props {
  toolGroup: MesToolGroupMetric | null;
  tools: MesToolMetric[];
  toolViewMode: MesToolViewMode;
  errorMessage?: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:toolViewMode': [value: MesToolViewMode];
}>();

const riskMeta = computed(() => (props.toolGroup ? RISK_LEVEL_META[toMesRiskLevel(props.toolGroup.riskGrade)] : null));
const oeeEstimate = computed(() =>
  props.toolGroup ? calculateMesOeeEstimate(props.toolGroup.utilizationRate, props.toolGroup.setupRatio) : 0
);
const utilizationPercent = computed(() =>
  props.toolGroup ? `${Math.round(props.toolGroup.utilizationRate * 100)}%` : '0%'
);
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
            공정: <b>{{ toolGroup.areaNameKo }}</b> · 장비 수: <b>{{ toolGroup.toolCount }}대</b> · 가동률:
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

      <div class="tool-group-detail-panel__kpis">
        <div class="tool-group-detail-panel__kpi">
          <span>평균 가동률</span>
          <strong :style="{ color: riskMeta?.color }">{{ formatRatioPercent(toolGroup.utilizationRate) }}</strong>
        </div>
        <div class="tool-group-detail-panel__kpi">
          <span>OEE 추정</span>
          <strong class="tool-group-detail-panel__kpi-value--info">{{ formatRatioPercent(oeeEstimate) }}</strong>
        </div>
        <div class="tool-group-detail-panel__kpi">
          <span>Q-time 추정</span>
          <strong :style="{ color: getMesQtimeColor(toolGroup.avgQtimeMin) }">{{
            formatQtimeDays(toolGroup.avgQtimeMin)
          }}</strong>
        </div>
        <div class="tool-group-detail-panel__kpi">
          <span>대기 Lot</span>
          <strong :style="{ color: getMesQueueColor(toolGroup.wipCount) }"
            >{{ formatNumber(toolGroup.wipCount) }}개</strong
          >
        </div>
      </div>

      <section class="tool-group-detail-panel__tools">
        <header class="tool-group-detail-panel__tools-header">
          <div>
            <h3>개별 Tool KPI</h3>
            <span>{{ tools.length }}대</span>
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
        </header>

        <MesToolCardGrid v-if="toolViewMode === 'card'" :tools="tools" />
        <MesToolTable v-else :tools="tools" />
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

.tool-group-detail-panel__kpis {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-2);
}

.tool-group-detail-panel__kpi {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.tool-group-detail-panel__kpi span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.tool-group-detail-panel__kpi strong {
  display: block;
  margin-top: var(--space-1);
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

.tool-group-detail-panel__kpi-value--info {
  color: var(--color-status-info) !important;
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

.tool-group-detail-panel__view-toggle {
  display: flex;
  gap: var(--space-1);
}

.tool-group-detail-panel__view-toggle button {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: transparent;
  padding: 3px 10px;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-xs);
}

.tool-group-detail-panel__view-button--active {
  border-color: var(--color-action-primary-border) !important;
  background: var(--color-action-primary-soft) !important;
  color: var(--color-action-primary) !important;
  font-weight: var(--font-weight-semibold);
}
</style>

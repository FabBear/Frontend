<script setup lang="ts">
import { computed, ref } from 'vue';

import { getProcessAreaSortOrder } from '@/constants/processArea';
import { RISK_LEVEL_META, type RiskLevel } from '@/constants/riskLevel';

import type { MesProcessSummary, MesRiskGrade, MesToolGroupMetric } from '@/types/mes';

import { formatNumber, formatQtimeDays, formatRatioPercent } from '@/utils/format';
import { getMesUtilizationColor } from '@/utils/mesMetrics';

interface Props {
  processSummaries: MesProcessSummary[];
  toolGroups: MesToolGroupMetric[];
}

const props = defineProps<Props>();
const hoveredToolGroup = ref<MesToolGroupMetric | null>(null);
const tooltipPosition = ref({ x: 0, y: 0 });

const LEGEND = [
  { label: 'Critical ≥90%', color: 'var(--color-risk-critical)' },
  { label: 'High ≥85%', color: 'var(--color-risk-high)' },
  { label: 'Medium ≥70%', color: 'var(--color-risk-medium)' },
  { label: 'Low <70%', color: 'var(--color-risk-low)' },
] as const;

const areas = computed(() => {
  const sorted = [...props.processSummaries].sort(
    (a, b) => getProcessAreaSortOrder(a.areaCode) - getProcessAreaSortOrder(b.areaCode)
  );

  return sorted.map((ps) => ({
    process: ps,
    toolGroups: props.toolGroups
      .filter((tg) => tg.areaCode === ps.areaCode)
      .sort((a, b) => b.utilizationRate - a.utilizationRate),
  }));
});

function toRiskLevel(riskGrade: MesRiskGrade): RiskLevel {
  return riskGrade.toLowerCase() as RiskLevel;
}

function updateTooltipPosition(event: MouseEvent | FocusEvent) {
  if ('clientX' in event) {
    tooltipPosition.value = { x: event.clientX + 12, y: event.clientY - 12 };
    return;
  }

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  tooltipPosition.value = { x: rect.left + rect.width / 2, y: rect.top - 8 };
}

function showTooltip(event: MouseEvent | FocusEvent, toolGroup: MesToolGroupMetric) {
  hoveredToolGroup.value = toolGroup;
  updateTooltipPosition(event);
}

function hideTooltip() {
  hoveredToolGroup.value = null;
}
</script>

<template>
  <section class="mes-fab-heatmap">
    <header class="mes-fab-heatmap__header">
      <h3>FAB Tool Group 가동률 현황</h3>
      <span>각 막대 = Tool Group · 높이 = 가동률</span>
    </header>

    <div class="mes-fab-heatmap__strip">
      <div v-for="item in areas" :key="item.process.areaId" class="mes-fab-heatmap__area">
        <div
          class="mes-fab-heatmap__bars"
          :style="{ borderBottomColor: getMesUtilizationColor(item.process.maxUtilizationRate) }"
        >
          <span
            v-for="tg in item.toolGroups"
            :key="tg.tgId"
            class="mes-fab-heatmap__bar"
            tabindex="0"
            :aria-label="`${tg.tgName} 가동률 ${formatRatioPercent(tg.utilizationRate)}`"
            :style="{
              height: `${Math.max(4, Math.round(tg.utilizationRate * 100))}%`,
              backgroundColor: getMesUtilizationColor(tg.utilizationRate),
            }"
            @mouseenter="showTooltip($event, tg)"
            @mousemove="updateTooltipPosition"
            @mouseleave="hideTooltip"
            @focus="showTooltip($event, tg)"
            @blur="hideTooltip"
          />
        </div>
        <strong :style="{ color: getMesUtilizationColor(item.process.maxUtilizationRate) }">
          {{ item.process.areaCode }}
        </strong>
        <small>{{ item.process.areaNameKo }} · {{ item.toolGroups.length }}개 TG</small>
      </div>
    </div>

    <footer class="mes-fab-heatmap__legend">
      <span v-for="leg in LEGEND" :key="leg.label" class="mes-fab-heatmap__legend-item">
        <span class="mes-fab-heatmap__legend-dot" :style="{ backgroundColor: leg.color }" />
        {{ leg.label }}
      </span>
    </footer>

    <aside
      v-if="hoveredToolGroup"
      class="mes-fab-heatmap__tooltip"
      :style="{ left: `${tooltipPosition.x}px`, top: `${tooltipPosition.y}px` }"
    >
      <strong>{{ hoveredToolGroup.tgName }}</strong>
      <span>
        {{ hoveredToolGroup.areaNameKo }} / {{ hoveredToolGroup.sourceAreaNameKo }} ·
        {{ RISK_LEVEL_META[toRiskLevel(hoveredToolGroup.riskGrade)].label }}
      </span>
      <dl>
        <div>
          <dt>가동률</dt>
          <dd>{{ formatRatioPercent(hoveredToolGroup.utilizationRate) }}</dd>
        </div>
        <div>
          <dt>WIP</dt>
          <dd>{{ formatNumber(hoveredToolGroup.wipCount) }} Lot</dd>
        </div>
        <div>
          <dt>Q-time</dt>
          <dd>{{ formatQtimeDays(hoveredToolGroup.avgQtimeMin) }}</dd>
        </div>
      </dl>
    </aside>
  </section>
</template>

<style scoped>
.mes-fab-heatmap {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.mes-fab-heatmap__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.mes-fab-heatmap__header h3 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.mes-fab-heatmap__header span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.mes-fab-heatmap__strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(112px, 1fr));
  gap: var(--space-2);
  align-items: stretch;
}

.mes-fab-heatmap__area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  min-width: 0;
}

.mes-fab-heatmap__bars {
  display: flex;
  align-items: flex-end;
  gap: 1px;
  width: 100%;
  height: 104px;
  /* overflow-x: auto — TG가 많은 공정(35~36개)은 minmax(112px) 셀보다 막대 합산 너비가 커서 스크롤 허용 */
  overflow-x: auto;
  overflow-y: hidden;
  border-bottom: 2px solid;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  background: var(--color-bg-surface);
  box-sizing: border-box;
  padding: var(--space-1) var(--space-1) 0;
}

.mes-fab-heatmap__bar {
  flex: 1 0 5px;
  min-width: 5px;
  border: 0;
  border-radius: 1px 1px 0 0;
  outline: none;
  transition: opacity 0.15s;
}

.mes-fab-heatmap__bar:hover,
.mes-fab-heatmap__bar:focus-visible {
  opacity: 0.7;
  cursor: default;
}

.mes-fab-heatmap__area strong {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.mes-fab-heatmap__area small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.mes-fab-heatmap__legend {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin-top: var(--space-3);
}

.mes-fab-heatmap__legend-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.mes-fab-heatmap__legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}

.mes-fab-heatmap__tooltip {
  position: fixed;
  z-index: var(--z-index-tooltip);
  min-width: 180px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-md);
  padding: var(--space-2);
  pointer-events: none;
  transform: translateY(-100%);
}

.mes-fab-heatmap__tooltip strong {
  display: block;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.mes-fab-heatmap__tooltip > span {
  display: block;
  margin-top: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.mes-fab-heatmap__tooltip dl {
  display: grid;
  gap: var(--space-1);
  margin: var(--space-2) 0 0;
}

.mes-fab-heatmap__tooltip dl div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.mes-fab-heatmap__tooltip dt,
.mes-fab-heatmap__tooltip dd {
  margin: 0;
  font-size: var(--font-size-sm);
}

.mes-fab-heatmap__tooltip dt {
  color: var(--color-fg-muted);
}

.mes-fab-heatmap__tooltip dd {
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-semibold);
}
</style>

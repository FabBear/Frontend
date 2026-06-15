<script setup lang="ts">
import { computed, ref } from 'vue';

import type { DashboardTrendKey } from '@/types/dashboardApi';
import type {
  MachineAnalysisPreset,
  MachineAnalysisScope,
  MachineAnalysisSeries,
  MachineAnalysisTargetType,
  MachineComparisonTarget,
  MachineMetricDefinition,
  MachineMetricKey,
  MachinePeriodPreset,
  MachinePeriodRange,
} from '@/types/machine';

import DashboardKpiAnalysisPanel from '@/components/machine/DashboardKpiAnalysisPanel.vue';
import MachineComparisonChart from '@/components/machine/MachineComparisonChart.vue';
import MachineOperationRangeCard from '@/components/machine/MachineOperationRangeCard.vue';
import MetricPalette from '@/components/machine/MetricPalette.vue';

interface Props {
  analysisScope: MachineAnalysisScope;
  targetType: MachineAnalysisTargetType;
  periodPreset: MachinePeriodPreset;
  periodRange: MachinePeriodRange | null;
  measuredAt: string;
  metrics: MachineMetricDefinition[];
  selectedMetricKeys: MachineMetricKey[];
  toolGroupTargets: MachineComparisonTarget[];
  toolTargets: MachineComparisonTarget[];
  selectedToolGroupIds: string[];
  selectedToolIds: string[];
  analysisSeries: MachineAnalysisSeries[];
  trendLabels: string[];
  trendsLoading: boolean;
  trendsErrorMessage: string | null;
  analysisInsight: string | null;
  presets: MachineAnalysisPreset[];
  selectedPresetKey: string | null;
  maxCompare: number;
  dashboardKpiKey?: DashboardTrendKey | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:analysisScope': [value: MachineAnalysisScope];
  'update:targetType': [value: MachineAnalysisTargetType];
  'update:periodPreset': [value: MachinePeriodPreset];
  'update:periodRange': [value: MachinePeriodRange];
  selectDashboardKpi: [key: DashboardTrendKey];
  toggleMetric: [metricKey: MachineMetricKey];
  toggleToolGroup: [tgId: string];
  toggleTool: [toolId: string];
  clearTargets: [];
  applyPreset: [key: string];
  resetPreset: [];
}>();

const scopeOptions: { value: MachineAnalysisScope; label: string }[] = [
  { value: 'fab', label: 'Fab' },
  { value: 'toolGroup', label: 'Tool Group' },
  { value: 'tool', label: 'Tool' },
];

// ── 목록 검색 ────────────────────────────────────────────────────────
const listSearch = ref('');

const allTargets = computed(() => (props.targetType === 'toolGroup' ? props.toolGroupTargets : props.toolTargets));

const selectedIds = computed(() =>
  props.targetType === 'toolGroup' ? props.selectedToolGroupIds : props.selectedToolIds
);

const searchPlaceholder = computed(() => (props.targetType === 'toolGroup' ? 'TG 검색...' : 'Tool 검색...'));

const visiblePresets = computed(() => props.presets.filter((preset) => preset.targetType === props.targetType));

const isAtMax = computed(() => selectedIds.value.length >= props.maxCompare);

const filteredTargets = computed(() => {
  const kw = listSearch.value.trim().toLowerCase();
  if (!kw) return allTargets.value;
  return allTargets.value.filter((t) => t.code.toLowerCase().includes(kw) || t.groupLabel.toLowerCase().includes(kw));
});

function isSelected(id: string) {
  return selectedIds.value.includes(id);
}

function toggle(id: string) {
  if (props.targetType === 'toolGroup') emit('toggleToolGroup', id);
  else emit('toggleTool', id);
}

function findTarget(id: string): MachineComparisonTarget | undefined {
  return allTargets.value.find((t) => t.id === id);
}
</script>

<template>
  <div class="analysis-tab">
    <MachineOperationRangeCard
      :measured-at="measuredAt"
      :period-preset="periodPreset"
      :period-range="periodRange"
      @update:period-preset="emit('update:periodPreset', $event)"
      @update:period-range="emit('update:periodRange', $event)"
    />

    <div class="analysis-tab__scope-head">
      <div>
        <span>기여 대상</span>
        <h2>선택 KPI 기준 비교</h2>
      </div>
      <div class="analysis-tab__segmented" role="group" aria-label="기여 대상">
        <button
          v-for="option in scopeOptions"
          :key="option.value"
          type="button"
          class="analysis-tab__seg-btn"
          :class="{ 'analysis-tab__seg-btn--active': analysisScope === option.value }"
          @click="emit('update:analysisScope', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <DashboardKpiAnalysisPanel
      v-if="analysisScope === 'fab' && dashboardKpiKey"
      :kpi-key="dashboardKpiKey"
      :period-range="periodRange"
      @select-kpi="emit('selectDashboardKpi', $event)"
    />

    <template v-else>
      <!-- 빠른 보기 프리셋 (현장 엔지니어용 자주 보는 분석 묶음) -->
      <div v-if="visiblePresets.length" class="analysis-tab__presets">
        <span class="analysis-tab__presets-label">빠른 보기</span>
        <button
          v-for="preset in visiblePresets"
          :key="preset.key"
          type="button"
          class="analysis-tab__preset"
          :class="{ 'analysis-tab__preset--active': preset.key === selectedPresetKey }"
          :title="preset.description"
          @click="emit('applyPreset', preset.key)"
        >
          {{ preset.label }}
        </button>
        <button type="button" class="analysis-tab__preset analysis-tab__preset--reset" @click="emit('resetPreset')">
          기본값
        </button>
      </div>

      <p v-if="analysisInsight" class="analysis-tab__insight">
        {{ analysisInsight }}
      </p>

      <!-- 2열 워크스페이스 -->
      <div class="analysis-tab__workspace">
        <!-- 왼쪽: 선택 목록 -->
        <aside class="analysis-tab__list-panel">
          <div class="analysis-tab__list-search-wrap">
            <input
              v-model="listSearch"
              type="search"
              class="analysis-tab__list-search"
              :placeholder="searchPlaceholder"
            />
            <span class="analysis-tab__list-count" :class="{ 'analysis-tab__list-count--max': isAtMax }">
              {{ selectedIds.length }} / {{ maxCompare }}
            </span>
            <button
              type="button"
              class="analysis-tab__list-clear"
              :disabled="selectedIds.length === 0"
              @click="emit('clearTargets')"
            >
              초기화
            </button>
          </div>

          <ul class="analysis-tab__list" role="listbox">
            <li
              v-for="item in filteredTargets"
              :key="item.id"
              class="analysis-tab__list-item"
              :class="{
                'analysis-tab__list-item--selected': isSelected(item.id),
                'analysis-tab__list-item--disabled': isAtMax && !isSelected(item.id),
              }"
              role="option"
              :aria-selected="isSelected(item.id)"
              :aria-disabled="isAtMax && !isSelected(item.id)"
              @click="toggle(item.id)"
            >
              <span class="analysis-tab__list-info">
                <b>{{ item.code }}</b>
                <small>{{ item.groupLabel }}</small>
              </span>
              <span v-if="isSelected(item.id)" class="analysis-tab__list-check">✓</span>
            </li>
            <li v-if="filteredTargets.length === 0" class="analysis-tab__list-empty">검색 결과 없음</li>
          </ul>
        </aside>

        <!-- 오른쪽: 선택 현황 + 차트 -->
        <div class="analysis-tab__canvas">
          <!-- 선택된 대상 칩 -->
          <div class="analysis-tab__selected">
            <span v-if="selectedIds.length === 0" class="analysis-tab__selected-hint">
              왼쪽에서 비교할 대상을 선택하세요
            </span>
            <div v-else class="analysis-tab__chips">
              <span v-for="id in selectedIds" :key="id" class="analysis-tab__chip">
                {{ findTarget(id)?.code ?? id }}
                <button
                  type="button"
                  class="analysis-tab__chip-remove"
                  :aria-label="`${findTarget(id)?.code} 제거`"
                  @click.stop="toggle(id)"
                >
                  ✕
                </button>
              </span>
            </div>
          </div>

          <!-- 지표 선택 -->
          <MetricPalette
            :metrics="metrics"
            :selected-metric-keys="selectedMetricKeys"
            @toggle="emit('toggleMetric', $event)"
          />

          <!-- 차트 -->
          <p v-if="trendsLoading" class="analysis-tab__chart-state">비교 차트 데이터를 불러오는 중입니다.</p>
          <p v-else-if="trendsErrorMessage" class="analysis-tab__chart-state analysis-tab__chart-state--error">
            {{ trendsErrorMessage }}
          </p>
          <p v-else-if="selectedIds.length > 0 && analysisSeries.length === 0" class="analysis-tab__chart-state">
            선택 기간에 조회된 추이 데이터가 없습니다.
          </p>
          <MachineComparisonChart
            v-else
            :series="analysisSeries"
            :metrics="metrics"
            :selected-metric-keys="selectedMetricKeys"
            :trend-labels="trendLabels"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.analysis-tab {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  font-size: var(--font-size-base);
}

.analysis-tab__segmented {
  display: inline-flex;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: 2px;
  gap: 2px;
}

.analysis-tab__seg-btn {
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
  padding: 5px 14px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  transition: all 0.1s;
}

.analysis-tab__seg-btn--active {
  background: var(--color-action-primary);
  color: var(--color-text-inverse);
}

/* 빠른 보기 프리셋 */
.analysis-tab__presets {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.analysis-tab__presets-label {
  margin-right: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.analysis-tab__preset {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-pill);
  background: var(--color-bg-surface);
  cursor: pointer;
  padding: 4px 11px;
  color: var(--color-fg);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  transition:
    border-color 0.1s,
    background 0.1s,
    color 0.1s;
}

.analysis-tab__preset:hover {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
}

.analysis-tab__preset--active {
  border-color: var(--color-action-primary);
  background: var(--color-action-primary);
  color: var(--color-text-inverse);
}

.analysis-tab__preset--reset {
  color: var(--color-fg-muted);
}

.analysis-tab__insight {
  margin: 0;
  border: var(--border-width-default) solid
    color-mix(in srgb, var(--color-action-primary) 30%, var(--color-border-default));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-action-primary) 6%, var(--color-bg-card));
  padding: var(--space-2) var(--space-3);
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.analysis-tab__scope-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.analysis-tab__scope-head span {
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.analysis-tab__scope-head h2 {
  margin: 2px 0 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

/* 2열 워크스페이스 */
.analysis-tab__workspace {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: var(--space-3);
  align-items: start;
}

/* 왼쪽 패널 */
.analysis-tab__list-panel {
  display: grid;
  grid-template-rows: auto 1fr;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  overflow: hidden;
  max-height: 600px;
}

.analysis-tab__list-search-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
}

.analysis-tab__list-count {
  flex-shrink: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.analysis-tab__list-count--max {
  color: var(--color-status-warning);
  font-weight: var(--font-weight-bold);
}

.analysis-tab__list-clear {
  flex-shrink: 0;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: 5px 8px;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  transition:
    border-color 0.1s,
    background 0.1s,
    color 0.1s,
    opacity 0.1s;
}

.analysis-tab__list-clear:hover:not(:disabled) {
  border-color: var(--color-border-strong);
  background: var(--color-state-hover);
  color: var(--color-fg);
}

.analysis-tab__list-clear:disabled {
  cursor: default;
  opacity: 0.45;
}

.analysis-tab__list-search {
  width: 100%;
  box-sizing: border-box;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: 5px var(--space-2);
  color: var(--color-fg);
  font-size: var(--font-size-base);
  outline: none;
}

.analysis-tab__list-search:focus {
  border-color: var(--color-action-primary);
}

.analysis-tab__list {
  list-style: none;
  margin: 0;
  padding: var(--space-1);
  overflow-y: auto;
}

.analysis-tab__list-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border-radius: var(--radius-md);
  cursor: pointer;
  padding: var(--space-2) var(--space-2);
  transition: background 0.1s;
  user-select: none;
}

.analysis-tab__list-item:hover:not(.analysis-tab__list-item--disabled) {
  background: var(--color-state-hover);
}

.analysis-tab__list-item--disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.analysis-tab__list-item--selected {
  background: color-mix(in srgb, var(--color-action-primary) 8%, transparent);
}

.analysis-tab__list-info {
  display: grid;
  gap: 1px;
  min-width: 0;
  flex: 1;
  overflow: hidden;
}

.analysis-tab__list-info b {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-tab__list-info small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-tab__list-check {
  color: var(--color-action-primary);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
}

.analysis-tab__list-empty {
  padding: var(--space-3);
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  text-align: center;
}

/* 오른쪽 캔버스 */
.analysis-tab__canvas {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

/* 선택 현황 */
.analysis-tab__selected {
  min-height: 44px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-surface);
  padding: var(--space-2) var(--space-3);
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.analysis-tab__selected-hint {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

.analysis-tab__chart-state {
  display: grid;
  min-height: 260px;
  place-items: center;
  margin: 0;
  border: var(--border-width-default) dashed var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  padding: var(--space-4);
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  text-align: center;
}

.analysis-tab__chart-state--error {
  border-color: var(--color-status-danger);
  color: var(--color-status-danger);
}

/* 선택 칩 */
.analysis-tab__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.analysis-tab__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: var(--border-width-default) solid var(--color-action-primary);
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-action-primary) 10%, transparent);
  padding: 3px 4px 3px 10px;
  color: var(--color-action-primary);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.analysis-tab__chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 0;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-action-primary) 20%, transparent);
  cursor: pointer;
  color: var(--color-action-primary);
  font-size: var(--font-size-sm);
  line-height: 1;
  padding: 0;
  transition: background 0.1s;
}

.analysis-tab__chip-remove:hover {
  background: color-mix(in srgb, var(--color-action-primary) 35%, transparent);
}

@media (max-width: 980px) {
  .analysis-tab__workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .analysis-tab__scope-head {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>

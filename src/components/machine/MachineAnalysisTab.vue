<script setup lang="ts">
import { computed, ref } from 'vue';

import type {
  MachineAnalysisPreset,
  MachineAnalysisSeries,
  MachineAnalysisTargetType,
  MachineComparisonTarget,
  MachineMetricDefinition,
  MachineMetricKey,
  MachinePeriodPreset,
} from '@/types/machine';

import MachineComparisonChart from '@/components/machine/MachineComparisonChart.vue';
import MetricPalette from '@/components/machine/MetricPalette.vue';

interface Props {
  targetType: MachineAnalysisTargetType;
  periodPreset: MachinePeriodPreset;
  metrics: MachineMetricDefinition[];
  selectedMetricKeys: MachineMetricKey[];
  toolGroupTargets: MachineComparisonTarget[];
  toolTargets: MachineComparisonTarget[];
  selectedToolGroupIds: string[];
  selectedToolIds: string[];
  analysisSeries: MachineAnalysisSeries[];
  trendLabels: string[];
  analysisPresets: MachineAnalysisPreset[];
  selectedAnalysisPresetKey: string | null;
  analysisInsight: string | null;
  maxCompare: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:targetType': [value: MachineAnalysisTargetType];
  'update:periodPreset': [value: MachinePeriodPreset];
  toggleMetric: [metricKey: MachineMetricKey];
  toggleToolGroup: [tgId: string];
  toggleTool: [toolId: string];
  clearTargets: [];
  applyPreset: [presetKey: string];
  resetPreset: [];
}>();

// ── 목록 검색 ────────────────────────────────────────────────────────
const listSearch = ref('');

const allTargets = computed(() => (props.targetType === 'toolGroup' ? props.toolGroupTargets : props.toolTargets));

const selectedIds = computed(() =>
  props.targetType === 'toolGroup' ? props.selectedToolGroupIds : props.selectedToolIds
);

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
    <!-- 비교 단위 토글 -->
    <div class="analysis-tab__header">
      <div class="analysis-tab__segmented" role="group" aria-label="비교 단위">
        <button
          type="button"
          class="analysis-tab__seg-btn"
          :class="{ 'analysis-tab__seg-btn--active': targetType === 'toolGroup' }"
          @click="emit('update:targetType', 'toolGroup')"
        >
          Tool Group
        </button>
        <button
          type="button"
          class="analysis-tab__seg-btn"
          :class="{ 'analysis-tab__seg-btn--active': targetType === 'tool' }"
          @click="emit('update:targetType', 'tool')"
        >
          Tool
        </button>
      </div>

      <select
        class="analysis-tab__period"
        :value="periodPreset"
        @change="emit('update:periodPreset', ($event.target as HTMLSelectElement).value as MachinePeriodPreset)"
      >
        <option value="6H">최근 6시간</option>
        <option value="24H">최근 24시간</option>
        <option value="7D">최근 7일</option>
        <option value="30D">최근 30일</option>
      </select>
    </div>

    <section v-if="analysisPresets.length" class="analysis-tab__preset-section" aria-label="추천 분석">
      <div class="analysis-tab__preset-head">
        <strong>추천 분석</strong>
        <button
          type="button"
          class="analysis-tab__preset-reset"
          :class="{ 'analysis-tab__preset-reset--active': selectedAnalysisPresetKey === null }"
          @click="emit('resetPreset')"
        >
          초기화
        </button>
      </div>
      <div class="analysis-tab__presets">
        <button
          v-for="preset in analysisPresets"
          :key="preset.key"
          type="button"
          class="analysis-tab__preset"
          :class="{ 'analysis-tab__preset--active': selectedAnalysisPresetKey === preset.key }"
          @click="emit('applyPreset', preset.key)"
        >
          <span class="analysis-tab__preset-title">
            <i>{{ preset.targetType === 'toolGroup' ? 'TG' : 'Tool' }}</i>
            <b>{{ preset.label }}</b>
          </span>
          <span class="analysis-tab__preset-desc">{{ preset.description }}</span>
        </button>
      </div>
    </section>

    <p v-if="analysisInsight" class="analysis-tab__insight">
      {{ analysisInsight }}
    </p>

    <!-- 2열 워크스페이스 -->
    <div class="analysis-tab__workspace">
      <!-- 왼쪽: 선택 목록 -->
      <aside class="analysis-tab__list-panel">
        <div class="analysis-tab__list-search-wrap">
          <input v-model="listSearch" type="search" class="analysis-tab__list-search" placeholder="검색..." />
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
            ← 왼쪽에서 비교할 대상을 선택하세요
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
        <MachineComparisonChart
          :series="analysisSeries"
          :metrics="metrics"
          :selected-metric-keys="selectedMetricKeys"
          :trend-labels="trendLabels"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.analysis-tab {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  font-size: var(--font-size-base);
}

/* 헤더 */
.analysis-tab__header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
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

.analysis-tab__period {
  margin-left: auto;
  height: 34px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: 0 var(--space-2);
  color: var(--color-fg);
  font-size: var(--font-size-base);
  cursor: pointer;
  outline: none;
}

/* 추천 분석 */
.analysis-tab__preset-section {
  display: grid;
  gap: var(--space-2);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.analysis-tab__preset-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.analysis-tab__preset-head strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.analysis-tab__preset-reset {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: 5px 12px;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  transition:
    border-color 0.1s,
    background 0.1s,
    color 0.1s;
}

.analysis-tab__preset-reset:hover {
  border-color: var(--color-border-strong);
  background: var(--color-state-hover);
  color: var(--color-fg);
}

.analysis-tab__preset-reset--active {
  border-color: var(--color-border-default);
  background: var(--color-bg-surface);
  color: var(--color-fg-muted);
  cursor: default;
}

.analysis-tab__presets {
  display: flex;
  gap: var(--space-2);
  overflow-x: auto;
  padding-bottom: 2px;
}

.analysis-tab__preset {
  display: grid;
  gap: 4px;
  flex: 0 0 236px;
  min-height: 76px;
  min-width: 0;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: var(--space-2) var(--space-3);
  color: var(--color-fg);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.1s,
    background 0.1s,
    box-shadow 0.1s,
    transform 0.1s;
}

.analysis-tab__preset:hover {
  border-color: var(--color-action-primary);
  background: var(--color-state-hover);
  transform: translateY(-1px);
}

.analysis-tab__preset--active {
  border-color: var(--color-action-primary);
  background: color-mix(in srgb, var(--color-action-primary) 9%, var(--color-bg-card));
  box-shadow: inset 0 0 0 1px var(--color-action-primary);
}

.analysis-tab__preset-title {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-1);
  min-width: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
}

.analysis-tab__preset-title i {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 22px;
  box-sizing: border-box;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-pill);
  background: var(--color-bg-surface);
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  font-style: normal;
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
  white-space: nowrap;
}

.analysis-tab__preset-title b {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-tab__preset--active .analysis-tab__preset-title i {
  border-color: var(--color-action-primary);
  background: color-mix(in srgb, var(--color-action-primary) 10%, var(--color-bg-card));
  color: var(--color-action-primary);
}

.analysis-tab__preset-desc {
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  line-height: 1.35;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
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

@media (max-width: 1280px) {
  .analysis-tab__preset {
    flex-basis: 236px;
  }
}

@media (max-width: 980px) {
  .analysis-tab__workspace {
    grid-template-columns: 1fr;
  }

  .analysis-tab__preset {
    flex-basis: 248px;
  }
}

@media (max-width: 640px) {
  .analysis-tab__header {
    align-items: stretch;
    flex-direction: column;
  }

  .analysis-tab__period {
    margin-left: 0;
  }

  .analysis-tab__preset-head {
    align-items: stretch;
    flex-direction: column;
  }

  .analysis-tab__preset-reset {
    width: 100%;
  }

  .analysis-tab__preset {
    flex-basis: 86%;
  }
}
</style>

<script setup lang="ts">
import type {
  MachineAnalysisSeries,
  MachineAnalysisTargetType,
  MachineComparisonTarget,
  MachineMetricDefinition,
  MachineMetricKey,
  MachinePeriodPreset,
} from '@/types/machine';

import MachineCompareDropdown from '@/components/machine/MachineCompareDropdown.vue';
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
}

defineProps<Props>();

const emit = defineEmits<{
  'update:targetType': [value: MachineAnalysisTargetType];
  'update:periodPreset': [value: MachinePeriodPreset];
  toggleMetric: [metricKey: MachineMetricKey];
  toggleToolGroup: [tgId: string];
  toggleTool: [toolId: string];
}>();
</script>

<template>
  <div class="analysis-tab">
    <!-- 분석 조건 툴바 -->
    <div class="analysis-tab__toolbar">
      <!-- 비교 단위 토글 -->
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

      <!-- 대상 선택 드롭다운 -->
      <MachineCompareDropdown
        v-if="targetType === 'toolGroup'"
        title="비교 Tool Group"
        :options="toolGroupTargets"
        :selected-ids="selectedToolGroupIds"
        @toggle="emit('toggleToolGroup', $event)"
      />
      <MachineCompareDropdown
        v-else
        title="비교 Tool"
        :options="toolTargets"
        :selected-ids="selectedToolIds"
        @toggle="emit('toggleTool', $event)"
      />

      <!-- 기간 -->
      <select
        class="analysis-tab__period"
        :value="periodPreset"
        @change="emit('update:periodPreset', ($event.target as HTMLSelectElement).value as MachinePeriodPreset)"
      >
        <option value="1H">최근 1시간</option>
        <option value="6H">최근 6시간</option>
        <option value="24H">최근 24시간</option>
        <option value="7D">최근 7일</option>
      </select>
    </div>

    <!-- 지표 선택 -->
    <MetricPalette
      :metrics="metrics"
      :selected-metric-keys="selectedMetricKeys"
      @toggle="emit('toggleMetric', $event)"
    />

    <!-- 비교 차트 (지표별 라인 차트) -->
    <MachineComparisonChart
      :series="analysisSeries"
      :metrics="metrics"
      :selected-metric-keys="selectedMetricKeys"
      :trend-labels="trendLabels"
    />
  </div>
</template>

<style scoped>
.analysis-tab {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.analysis-tab__toolbar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-2) var(--space-3);
  box-shadow: var(--shadow-sm);
}

.analysis-tab__segmented {
  display: inline-flex;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: 2px;
  gap: 2px;
  flex-shrink: 0;
}

.analysis-tab__seg-btn {
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  cursor: pointer;
  padding: 5px 12px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  transition: all 0.1s;
}

.analysis-tab__seg-btn--active {
  background: var(--color-action-primary);
  color: var(--color-text-inverse);
}

.analysis-tab__period {
  height: 34px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: 0 var(--space-2);
  color: var(--color-fg);
  font-size: var(--font-size-xs);
  cursor: pointer;
  outline: none;
  margin-left: auto;
}

.analysis-tab__period:focus {
  border-color: var(--color-action-primary);
}

@media (max-width: 900px) {
  .analysis-tab__toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .analysis-tab__period {
    margin-left: 0;
  }
}
</style>

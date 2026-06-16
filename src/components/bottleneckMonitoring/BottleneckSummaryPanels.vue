<script setup lang="ts">
import { computed, ref } from 'vue';

import { BOTTLENECK_RANK_LIMIT } from '@/constants/bottleneckMonitoring';

import type { BottleneckToolGroupItem } from '@/types/bottleneckMonitoring';

import BottleneckRankingChart from '@/components/bottleneckMonitoring/BottleneckRankingChart.vue';
import BottleneckRankingTable from '@/components/bottleneckMonitoring/BottleneckRankingTable.vue';

import { compareBottleneckRisk } from '@/utils/bottleneckRisk';

interface Props {
  toolGroups: BottleneckToolGroupItem[];
}

const props = defineProps<Props>();

type ViewMode = 'table' | 'chart';

const viewMode = ref<ViewMode>('table');
const viewModeOptions: { value: ViewMode; label: string }[] = [
  { value: 'table', label: '테이블' },
  { value: 'chart', label: '그래프' },
];

const rankedToolGroups = computed(() =>
  props.toolGroups
    .filter((toolGroup) => toolGroup.riskScore !== null)
    .sort(compareBottleneckRisk)
    .slice(0, BOTTLENECK_RANK_LIMIT)
);
</script>

<template>
  <section class="bn-rank-section" aria-labelledby="bn-rank-title">
    <header class="bn-rank-section__header">
      <div>
        <h2 id="bn-rank-title" class="bn-rank-section__title">병목 위험 점수 순위</h2>
        <p class="bn-rank-section__subtitle">상위 {{ BOTTLENECK_RANK_LIMIT }}개 · 감지 위험순</p>
      </div>
      <div class="bn-rank-section__toggle" role="group" aria-label="보기 방식">
        <button
          v-for="option in viewModeOptions"
          :key="option.value"
          class="bn-rank-section__toggle-btn"
          :class="{ 'bn-rank-section__toggle-btn--active': viewMode === option.value }"
          @click="viewMode = option.value"
        >
          {{ option.label }}
        </button>
      </div>
    </header>

    <BottleneckRankingTable v-if="viewMode === 'table'" :tool-groups="rankedToolGroups" />
    <BottleneckRankingChart v-else :tool-groups="rankedToolGroups" />
  </section>
</template>

<style scoped>
.bn-rank-section {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
  display: grid;
  gap: var(--space-3);
}

.bn-rank-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.bn-rank-section__title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.bn-rank-section__subtitle {
  margin-top: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bn-rank-section__toggle {
  display: flex;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.bn-rank-section__toggle-btn {
  padding: var(--space-1) var(--space-3);
  background: transparent;
  border: none;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.bn-rank-section__toggle-btn + .bn-rank-section__toggle-btn {
  margin-left: 1px;
}

.bn-rank-section__toggle-btn--active {
  background: var(--color-action-primary-soft);
  color: var(--color-fg-on-action);
}
</style>

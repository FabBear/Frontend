<script setup lang="ts">
import type { BottleneckToolGroupDetail } from '@/types/bottleneckMonitoring';

import ToolGroupDetailMetricGrid from '@/components/bottleneckMonitoring/ToolGroupDetailMetricGrid.vue';
import ToolGroupRiskProbability from '@/components/bottleneckMonitoring/ToolGroupRiskProbability.vue';

interface Props {
  detail: BottleneckToolGroupDetail | null;
  errorMessage?: string | null;
}

defineProps<Props>();
</script>

<template>
  <aside
    class="tool-group-detail-panel"
    :class="{ 'tool-group-detail-panel--open': detail }"
    aria-label="Tool Group 상세"
  >
    <div v-if="errorMessage" class="tool-group-detail-panel__empty tool-group-detail-panel__empty--error">
      <strong>{{ errorMessage }}</strong>
      <span>다시 행을 선택해 주세요.</span>
    </div>

    <div v-else-if="!detail" class="tool-group-detail-panel__empty">
      <strong>Tool Group을 선택하세요</strong>
      <span>행을 클릭하면 상세 지표가 표시됩니다.</span>
    </div>

    <template v-else>
      <header class="tool-group-detail-panel__header">
        <p class="tool-group-detail-panel__eyebrow">{{ detail.areaName }}</p>
        <h2 class="tool-group-detail-panel__title">{{ detail.tgName }}</h2>
      </header>

      <ToolGroupDetailMetricGrid :detail="detail" />
      <ToolGroupRiskProbability :score="detail.riskScore" :risk-grade="detail.riskGrade" />
    </template>
  </aside>
</template>

<style scoped>
.tool-group-detail-panel {
  display: grid;
  align-content: start;
  gap: var(--space-4);
  min-height: 100%;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.tool-group-detail-panel__empty {
  display: grid;
  min-height: 280px;
  place-content: center;
  gap: var(--space-1);
  color: var(--color-fg-muted);
  text-align: center;
}

.tool-group-detail-panel__empty strong {
  color: var(--color-fg-strong);
}

.tool-group-detail-panel__empty--error strong {
  color: var(--color-status-danger);
}

.tool-group-detail-panel__header {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.tool-group-detail-panel__eyebrow {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.tool-group-detail-panel__title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  word-break: break-word;
}

.tool-group-detail-panel__facts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.tool-group-detail-panel__fact-card {
  display: grid;
  gap: var(--space-1);
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.tool-group-detail-panel__fact-row {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.tool-group-detail-panel__facts dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.tool-group-detail-panel__facts dd {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  text-align: right;
}

.tool-group-detail-panel__button {
  width: 100%;
}
</style>

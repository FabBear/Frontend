<script setup lang="ts">
import type { BottleneckToolGroupDetail } from '@/types/bottleneckMonitoring';

import BaseButton from '@/components/base/BaseButton.vue';
import ToolGroupDetailMetricGrid from '@/components/bottleneckMonitoring/ToolGroupDetailMetricGrid.vue';
import ToolGroupRiskProbability from '@/components/bottleneckMonitoring/ToolGroupRiskProbability.vue';

interface Props {
  detail: BottleneckToolGroupDetail | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  openCenter: [caseId: string];
}>();

function handleOpenCenter() {
  if (props.detail?.relatedCaseId) {
    emit('openCenter', props.detail.relatedCaseId);
  }
}
</script>

<template>
  <aside
    class="tool-group-detail-panel"
    :class="{ 'tool-group-detail-panel--open': detail }"
    aria-label="Tool Group 상세"
  >
    <div v-if="!detail" class="tool-group-detail-panel__empty">
      <strong>Tool Group을 선택하세요</strong>
      <span>행을 클릭하면 상세 지표가 표시됩니다.</span>
    </div>

    <template v-else>
      <header class="tool-group-detail-panel__header">
        <p class="tool-group-detail-panel__eyebrow">{{ detail.areaName }}</p>
        <h2 class="tool-group-detail-panel__title">{{ detail.tgName }}</h2>
      </header>

      <ToolGroupDetailMetricGrid :detail="detail" />
      <ToolGroupRiskProbability :probability="detail.bottleneckProb" :risk-grade="detail.riskGrade" />

      <!-- Setup/Wait 비율·측정 시각: 디자인 확정 후 표시 여부 결정
      <dl class="tool-group-detail-panel__facts">
        <div class="tool-group-detail-panel__fact-card">
          <dt>Setup 비율</dt>
          <dd>{{ formatRatioPercent(detail.setupRatio) }}</dd>
        </div>
        <div class="tool-group-detail-panel__fact-card">
          <dt>Wait 비율</dt>
          <dd>{{ formatPercentPoint(detail.waitRatio) }}</dd>
        </div>
        <div class="tool-group-detail-panel__fact-row">
          <dt>측정 시각</dt>
          <dd>{{ detail.measuredAt }}</dd>
        </div>
      </dl>
      -->

      <BaseButton class="tool-group-detail-panel__button" :disabled="!detail.relatedCaseId" @click="handleOpenCenter">
        병목 대응 센터 →
      </BaseButton>
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
  background: var(--color-bg-surface);
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

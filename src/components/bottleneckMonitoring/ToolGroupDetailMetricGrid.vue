<script setup lang="ts">
import type { BottleneckToolGroupDetail } from '@/types/bottleneckMonitoring';

import { formatNumber, formatQtimeDays, formatRatioPercent, formatRiskScore } from '@/utils/format';

interface Props {
  detail: BottleneckToolGroupDetail;
}

defineProps<Props>();
</script>

<template>
  <div class="tool-group-detail-metric-grid">
    <div class="tool-group-detail-metric-grid__item">
      <span>WIP (대기 Lot)</span>
      <strong>{{ formatNumber(detail.wipCount) }}</strong>
    </div>
    <div class="tool-group-detail-metric-grid__item">
      <span>Q-time</span>
      <strong>{{ formatQtimeDays(detail.avgQtimeMin) }}</strong>
    </div>
    <div class="tool-group-detail-metric-grid__item">
      <span>가용률</span>
      <strong>{{ formatRatioPercent(detail.availableToolRatio) }}</strong>
    </div>
    <div class="tool-group-detail-metric-grid__item">
      <span>가동률</span>
      <strong>{{ formatRatioPercent(detail.utilizationRate) }}</strong>
    </div>
    <div class="tool-group-detail-metric-grid__item tool-group-detail-metric-grid__item--wide">
      <span>병목 위험 점수</span>
      <strong>{{ formatRiskScore(detail.riskScore) }}</strong>
    </div>
  </div>
</template>

<style scoped>
.tool-group-detail-metric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
}

.tool-group-detail-metric-grid__item {
  display: grid;
  align-content: center;
  min-height: 88px;
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: var(--space-3);
  text-align: center;
}

.tool-group-detail-metric-grid__item--wide {
  grid-column: 1 / -1;
  min-height: 76px;
}

.tool-group-detail-metric-grid__item span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.tool-group-detail-metric-grid__item strong {
  display: block;
  margin-top: var(--space-1);
  color: var(--color-fg-strong);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}
</style>

<script setup lang="ts">
import type { BottleneckToolGroupDetail } from '@/types/bottleneckMonitoring';

import { formatNumber, formatQtimeDays, formatRatioPercent } from '@/utils/format';

interface Props {
  detail: BottleneckToolGroupDetail;
}

defineProps<Props>();
</script>

<template>
  <div class="tool-group-detail-metric-grid">
    <div class="tool-group-detail-metric-grid__item">
      <strong>{{ formatNumber(detail.wipCount) }}</strong>
      <span>WIP (대기 Lot)</span>
    </div>
    <div class="tool-group-detail-metric-grid__item">
      <strong>{{ formatQtimeDays(detail.avgQtimeMin) }}</strong>
      <span>Q-time (일)</span>
    </div>
    <div class="tool-group-detail-metric-grid__item">
      <strong>{{ formatRatioPercent(detail.availableToolRatio) }}</strong>
      <span>가용률</span>
    </div>
    <div class="tool-group-detail-metric-grid__item">
      <strong>{{ formatRatioPercent(detail.utilizationRate) }}</strong>
      <span>가동률</span>
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

.tool-group-detail-metric-grid__item strong {
  display: block;
  color: var(--color-fg-strong);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}

.tool-group-detail-metric-grid__item span {
  margin-top: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
</style>

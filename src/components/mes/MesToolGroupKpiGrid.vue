<script setup lang="ts">
import { computed } from 'vue';

import type { MesToolGroupMetric } from '@/types/mes';

import { formatNumber, formatQtimeDays, formatRatioPercent } from '@/utils/format';
import { calculateMesOeeEstimate, getMesQtimeColor, getMesQueueColor } from '@/utils/mesMetrics';

interface Props {
  toolGroup: MesToolGroupMetric;
  riskColor: string;
}

const props = defineProps<Props>();

const oeeEstimate = computed(() =>
  calculateMesOeeEstimate(props.toolGroup.utilizationRate, props.toolGroup.setupRatio)
);
const qtimeColor = computed(() => getMesQtimeColor(props.toolGroup.avgQtimeMin));
const queueColor = computed(() => getMesQueueColor(props.toolGroup.wipCount));
</script>

<template>
  <div class="mes-tool-group-kpi-grid">
    <div class="mes-tool-group-kpi-grid__item">
      <span>OEE 추정</span>
      <strong>{{ formatRatioPercent(oeeEstimate) }}</strong>
    </div>
    <div class="mes-tool-group-kpi-grid__item">
      <span>Q-time 추정</span>
      <strong :style="{ color: qtimeColor }">{{ formatQtimeDays(toolGroup.avgQtimeMin) }}</strong>
    </div>
    <div class="mes-tool-group-kpi-grid__item">
      <span>WIP Lot</span>
      <strong :style="{ color: queueColor }">{{ formatNumber(toolGroup.wipCount) }}개</strong>
    </div>
    <div class="mes-tool-group-kpi-grid__item">
      <span>대기 Lot/Tool</span>
      <strong>{{ toolGroup.waitRatio.toFixed(1) }}<small> Lot/대</small></strong>
    </div>
    <div class="mes-tool-group-kpi-grid__item">
      <span>가용 장비율</span>
      <strong>{{ formatRatioPercent(toolGroup.availableToolRatio) }}</strong>
    </div>
    <div class="mes-tool-group-kpi-grid__item">
      <span>병목 확률</span>
      <strong :style="{ color: riskColor }">{{ formatRatioPercent(toolGroup.bottleneckProb) }}</strong>
    </div>
  </div>
</template>

<style scoped>
.mes-tool-group-kpi-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--space-2);
}

.mes-tool-group-kpi-grid__item {
  min-width: 0;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.mes-tool-group-kpi-grid__item span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.mes-tool-group-kpi-grid__item strong {
  display: block;
  margin-top: var(--space-1);
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

@media (max-width: 1280px) {
  .mes-tool-group-kpi-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .mes-tool-group-kpi-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

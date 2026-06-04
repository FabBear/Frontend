<script setup lang="ts">
import { computed } from 'vue';

import { MES_QUALITY_FACTOR } from '@/constants/mes';

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
const oeeAvailability = computed(() => Math.max(1 - props.toolGroup.setupRatio, 0.7));
const qtimeColor = computed(() => getMesQtimeColor(props.toolGroup.avgQtimeMin));
const queueColor = computed(() => getMesQueueColor(props.toolGroup.wipCount));

// waitRatio가 1을 초과하면 백엔드가 절대값(Lot 수)으로 내려주는 것
const waitRatioIsAbsolute = computed(() => props.toolGroup.waitRatio > 1);
const waitRatioDisplay = computed(() =>
  waitRatioIsAbsolute.value
    ? `${formatNumber(Math.round(props.toolGroup.waitRatio))} Lot`
    : formatRatioPercent(props.toolGroup.waitRatio)
);
</script>

<template>
  <div class="mes-tool-group-kpi-grid">
    <div class="mes-tool-group-kpi-grid__item">
      <span>OEE 추정</span>
      <strong>{{ formatRatioPercent(oeeEstimate) }}</strong>
      <p class="mes-tool-group-kpi-grid__oee-breakdown">
        {{ formatRatioPercent(oeeAvailability) }}
        <em>×</em>
        {{ formatRatioPercent(toolGroup.utilizationRate) }}
        <em>×</em>
        {{ formatRatioPercent(MES_QUALITY_FACTOR) }}
      </p>
    </div>
    <div class="mes-tool-group-kpi-grid__item">
      <span>평균 Q-time</span>
      <strong :style="{ color: qtimeColor }">{{ formatQtimeDays(toolGroup.avgQtimeMin) }}</strong>
    </div>
    <div class="mes-tool-group-kpi-grid__item">
      <span>WIP Lot</span>
      <strong :style="{ color: queueColor }">{{ formatNumber(toolGroup.wipCount) }}개</strong>
    </div>
    <div class="mes-tool-group-kpi-grid__item">
      <span>{{ waitRatioIsAbsolute ? '대기 Lot' : '대기율' }}</span>
      <strong>{{ waitRatioDisplay }}</strong>
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

.mes-tool-group-kpi-grid__oee-breakdown {
  margin-top: var(--space-1);
  color: var(--color-fg-subtle);
  font-size: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mes-tool-group-kpi-grid__oee-breakdown em {
  font-style: normal;
  color: var(--color-border-strong);
  padding: 0 2px;
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

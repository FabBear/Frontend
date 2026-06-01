<script setup lang="ts">
import { computed } from 'vue';

import { toMesRiskLevel } from '@/composables/useMesMonitoring';

import { RISK_LEVEL_META } from '@/constants/riskLevel';

import type { MesProcessSummary, MesRiskGrade, MesToolGroupMetric } from '@/types/mes';

import MesProcessRiskBar from '@/components/mes/MesProcessRiskBar.vue';

import { formatNumber, formatQtimeDays, formatRatioPercent, toRatioPercentNumber } from '@/utils/format';
import { calculateMesOeeEstimate, getMesQtimeColor, getMesUtilizationColor } from '@/utils/mesMetrics';

interface Props {
  processSummaries: MesProcessSummary[];
  toolGroups: MesToolGroupMetric[];
}

const props = defineProps<Props>();

const DEFAULT_RISK_COUNTS: Record<MesRiskGrade, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

const riskCountsByArea = computed(() => {
  const map = new Map<string, Record<MesRiskGrade, number>>();
  for (const tg of props.toolGroups) {
    if (!map.has(tg.areaCode)) {
      map.set(tg.areaCode, { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });
    }
    map.get(tg.areaCode)![tg.riskGrade]++;
  }
  return map;
});

function getRiskCounts(process: MesProcessSummary) {
  return riskCountsByArea.value.get(process.areaCode) ?? DEFAULT_RISK_COUNTS;
}

function getProgressWidth(value: number) {
  return `${Math.min(Math.max(toRatioPercentNumber(value), 0), 100)}%`;
}

function getProcessRiskMeta(process: MesProcessSummary) {
  return RISK_LEVEL_META[toMesRiskLevel(process.riskGrade)];
}

function getOee(process: MesProcessSummary) {
  return calculateMesOeeEstimate(process.avgUtilizationRate, process.setupRatio);
}
</script>

<template>
  <div class="mes-process-kpi-cards">
    <article
      v-for="process in processSummaries"
      :key="process.areaId"
      class="mes-process-kpi-cards__card"
      :style="{ borderLeftColor: getProcessRiskMeta(process).color }"
    >
      <header class="mes-process-kpi-cards__header">
        <div>
          <h3>{{ process.areaName }}</h3>
          <p>{{ process.areaNameKo }} · TG {{ formatNumber(process.toolGroupCount) }}개</p>
        </div>
        <span
          class="mes-process-kpi-cards__chip"
          :style="{ color: getProcessRiskMeta(process).color, borderColor: getProcessRiskMeta(process).color }"
        >
          {{ getProcessRiskMeta(process).label }}
        </span>
      </header>

      <section class="mes-process-kpi-cards__section mes-process-kpi-cards__bars">
        <div class="mes-process-kpi-cards__bar-row">
          <span>최대 가동률</span>
          <div class="mes-process-kpi-cards__progress-track">
            <div
              class="mes-process-kpi-cards__progress-fill"
              :style="{
                width: getProgressWidth(process.maxUtilizationRate),
                backgroundColor: getMesUtilizationColor(process.maxUtilizationRate),
              }"
            />
          </div>
          <strong :style="{ color: getMesUtilizationColor(process.maxUtilizationRate) }">
            {{ formatRatioPercent(process.maxUtilizationRate) }}
          </strong>
        </div>
        <div class="mes-process-kpi-cards__bar-row">
          <span>평균 가동률</span>
          <div class="mes-process-kpi-cards__progress-track">
            <div
              class="mes-process-kpi-cards__progress-fill"
              :style="{ width: getProgressWidth(process.avgUtilizationRate) }"
            />
          </div>
          <strong>{{ formatRatioPercent(process.avgUtilizationRate) }}</strong>
        </div>
      </section>

      <dl class="mes-process-kpi-cards__metrics">
        <div>
          <dt>OEE 추정</dt>
          <dd>{{ formatRatioPercent(getOee(process)) }}</dd>
        </div>
        <div>
          <dt>Q-time</dt>
          <dd :style="{ color: getMesQtimeColor(process.avgQtimeMin) }">{{ formatQtimeDays(process.avgQtimeMin) }}</dd>
        </div>
        <div>
          <dt>대기 Lot</dt>
          <dd>{{ formatNumber(process.wipCount) }}</dd>
        </div>
        <div>
          <dt>가용 장비율</dt>
          <dd>{{ formatRatioPercent(process.avgAvailableToolRatio) }}</dd>
        </div>
        <div>
          <dt>Setup</dt>
          <dd>{{ formatRatioPercent(process.setupRatio) }}</dd>
        </div>
        <div>
          <dt>병목 TG</dt>
          <dd :class="{ 'mes-process-kpi-cards__metric-danger': process.bottleneckToolGroupCount > 0 }">
            {{ process.bottleneckToolGroupCount > 0 ? `${formatNumber(process.bottleneckToolGroupCount)}개` : '-' }}
          </dd>
        </div>
      </dl>

      <MesProcessRiskBar :counts="getRiskCounts(process)" />
    </article>
  </div>
</template>

<style scoped>
.mes-process-kpi-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
}

.mes-process-kpi-cards__card {
  display: grid;
  gap: var(--space-2);
  border-left: 3px solid;
  border-top: var(--border-width-default) solid var(--color-border-default);
  border-right: var(--border-width-default) solid var(--color-border-default);
  border-bottom: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.mes-process-kpi-cards__header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
}

.mes-process-kpi-cards__header h3 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.mes-process-kpi-cards__header p {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.mes-process-kpi-cards__chip {
  align-self: flex-start;
  border: var(--border-width-default) solid;
  border-radius: var(--radius-pill);
  padding: 2px var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.mes-process-kpi-cards__bars {
  display: grid;
  gap: var(--space-1);
}

.mes-process-kpi-cards__section {
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: var(--space-2);
}

.mes-process-kpi-cards__bar-row {
  display: grid;
  grid-template-columns: 5.5em 1fr auto;
  align-items: center;
  gap: var(--space-2);
}

.mes-process-kpi-cards__bar-row span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.mes-process-kpi-cards__bar-row strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.mes-process-kpi-cards__progress-track {
  height: 6px;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
}

.mes-process-kpi-cards__progress-fill {
  height: 100%;
  border-radius: var(--radius-sm);
  background: var(--color-chart-blue);
  transition: width 0.3s ease;
}

.mes-process-kpi-cards__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-1);
  margin: 0;
}

.mes-process-kpi-cards__metrics div {
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: var(--space-1) var(--space-2);
}

.mes-process-kpi-cards__metrics dt,
.mes-process-kpi-cards__metrics dd {
  margin: 0;
  font-size: var(--font-size-sm);
}

.mes-process-kpi-cards__metrics dt {
  color: var(--color-fg-muted);
}

.mes-process-kpi-cards__metrics dd {
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-bold);
}

.mes-process-kpi-cards__metrics dd.mes-process-kpi-cards__metric-danger {
  color: var(--color-status-danger);
}

@media (max-width: 1280px) {
  .mes-process-kpi-cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1100px) {
  .mes-process-kpi-cards {
    grid-template-columns: 1fr;
  }
}
</style>

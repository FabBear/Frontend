<script setup lang="ts">
import { toMesRiskLevel } from '@/composables/useMesMonitoring';

import { RISK_LEVEL_META } from '@/constants/riskLevel';

import type { MesProcessSummary, MesRiskGrade } from '@/types/mes';

import MesProcessRiskBar from '@/components/mes/MesProcessRiskBar.vue';

import { formatNumber, formatQtimeDays, formatRatioPercent, toRatioPercentNumber } from '@/utils/format';
import { getMesQtimeColor, getMesUtilizationColor } from '@/utils/mesMetrics';

interface Props {
  processSummaries: MesProcessSummary[];
}

defineProps<Props>();

const emit = defineEmits<{
  selectProcess: [areaCode: string];
}>();

const DEFAULT_RISK_COUNTS: Record<MesRiskGrade, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

function getRiskCounts(process: MesProcessSummary) {
  return process.riskCounts ?? DEFAULT_RISK_COUNTS;
}

function getProgressWidth(value: number) {
  return `${Math.min(Math.max(toRatioPercentNumber(value), 0), 100)}%`;
}

function getProcessRiskMeta(process: MesProcessSummary) {
  return RISK_LEVEL_META[toMesRiskLevel(process.riskGrade)];
}

function getProcessCardStyle(process: MesProcessSummary) {
  const riskMeta = getProcessRiskMeta(process);

  // 개별 tool 카드(MesToolCardGrid)와 동일한 디자인: soft 배경 + 3px 상단 등급색 액센트 + 톤 보더.
  return {
    borderColor: `color-mix(in srgb, ${riskMeta.color} 28%, var(--color-border-default))`,
    borderTopColor: riskMeta.color,
    backgroundColor: riskMeta.background,
  };
}

function getOee(process: MesProcessSummary) {
  return process.oeeEstimate;
}
</script>

<template>
  <div class="mes-process-kpi-cards">
    <article
      v-for="process in processSummaries"
      :key="process.areaId"
      class="mes-process-kpi-cards__card"
      :style="getProcessCardStyle(process)"
      title="클릭하면 TG/Tool 탭에서 해당 공정으로 필터링합니다"
      @click="emit('selectProcess', process.areaCode)"
    >
      <header class="mes-process-kpi-cards__header">
        <div>
          <h3>{{ process.areaNameKo }}</h3>
          <p>{{ process.areaCode }}</p>
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
          <dt>TG 수</dt>
          <dd>{{ formatNumber(process.toolGroupCount) }}개</dd>
        </div>
        <div>
          <dt>장비 수</dt>
          <dd>{{ formatNumber(process.toolCount) }}대</dd>
        </div>
        <div>
          <dt>OEE</dt>
          <dd>{{ formatRatioPercent(getOee(process)) }}</dd>
        </div>
        <div>
          <dt>WIP Lot</dt>
          <dd>{{ formatNumber(process.wipCount) }}</dd>
        </div>
        <div>
          <dt>Q-time 최대</dt>
          <dd :style="{ color: getMesQtimeColor(process.maxQtimeMin) }">{{ formatQtimeDays(process.maxQtimeMin) }}</dd>
        </div>
        <div>
          <dt>Q-time 평균</dt>
          <dd :style="{ color: getMesQtimeColor(process.avgQtimeMin) }">{{ formatQtimeDays(process.avgQtimeMin) }}</dd>
        </div>
        <div>
          <dt>가용 장비율</dt>
          <dd>{{ formatRatioPercent(process.avgAvailableToolRatio) }}</dd>
        </div>
        <div v-if="process.bottleneckToolGroupCount > 0">
          <dt>고가동 TG</dt>
          <dd class="mes-process-kpi-cards__metric-danger">{{ formatNumber(process.bottleneckToolGroupCount) }}개</dd>
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
  cursor: pointer;
  border: var(--border-width-default) solid var(--color-border-default);
  border-top-width: 3px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  transition:
    transform 160ms ease,
    box-shadow 160ms ease;
}

.mes-process-kpi-cards__card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-panel);
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

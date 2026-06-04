<script setup lang="ts">
import { toMesRiskLevel } from '@/composables/useMesMonitoring';

import { RISK_LEVEL_META } from '@/constants/riskLevel';

import type { MesProcessSummary } from '@/types/mes';

import { formatNumber, formatQtimeDays, formatRatioPercent } from '@/utils/format';
import { calculateMesOeeEstimate, getMesQtimeColor } from '@/utils/mesMetrics';

interface Props {
  processSummaries: MesProcessSummary[];
}

defineProps<Props>();

const emit = defineEmits<{
  selectProcess: [areaCode: string];
}>();

function getOee(process: MesProcessSummary) {
  return calculateMesOeeEstimate(process.avgUtilizationRate, process.setupRatio);
}

function getRiskMeta(process: MesProcessSummary) {
  return RISK_LEVEL_META[toMesRiskLevel(process.riskGrade)];
}
</script>

<template>
  <section class="mes-process-kpi-table">
    <div class="mes-process-kpi-table__scroll">
      <table class="mes-process-kpi-table__table">
        <thead>
          <tr>
            <th>공정</th>
            <th>TG 수</th>
            <th>평균 가동률</th>
            <th>최대 가동률</th>
            <th>OEE 추정</th>
            <th>평균 Q-time</th>
            <th>최대 Q-time</th>
            <th>WIP Lot</th>
            <th>Setup</th>
            <th>병목 TG</th>
            <th>가용 장비율</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="process in processSummaries"
            :key="process.areaId"
            class="mes-process-kpi-table__row"
            title="클릭하면 TG/Tool 탭에서 해당 공정으로 필터링합니다"
            @click="emit('selectProcess', process.areaCode)"
          >
            <td>
              <strong>{{ process.areaNameKo }}</strong>
              <span>{{ process.areaCode }}</span>
            </td>
            <td>{{ formatNumber(process.toolGroupCount) }}</td>
            <td>{{ formatRatioPercent(process.avgUtilizationRate) }}</td>
            <td>{{ formatRatioPercent(process.maxUtilizationRate) }}</td>
            <td>{{ formatRatioPercent(getOee(process)) }}</td>
            <td>{{ formatQtimeDays(process.avgQtimeMin) }}</td>
            <td :style="{ color: getMesQtimeColor(process.maxQtimeMin) }">
              {{ formatQtimeDays(process.maxQtimeMin) }}
            </td>
            <td>{{ formatNumber(process.wipCount) }}</td>
            <td>{{ formatRatioPercent(process.setupRatio) }}</td>
            <td>
              {{ process.bottleneckToolGroupCount > 0 ? `${formatNumber(process.bottleneckToolGroupCount)}개` : '-' }}
            </td>
            <td>{{ formatRatioPercent(process.avgAvailableToolRatio) }}</td>
            <td>
              <span
                class="mes-process-kpi-table__chip"
                :style="{ color: getRiskMeta(process).color, borderColor: getRiskMeta(process).color }"
              >
                {{ getRiskMeta(process).label }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.mes-process-kpi-table {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.mes-process-kpi-table__scroll {
  max-height: 320px;
  overflow: auto;
}

.mes-process-kpi-table__table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
}

.mes-process-kpi-table__row {
  cursor: pointer;
}

.mes-process-kpi-table__row:hover td {
  background: var(--color-bg-subtle);
}

.mes-process-kpi-table__table th,
.mes-process-kpi-table__table td {
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
  padding: var(--space-2);
  color: var(--color-fg-default);
  font-size: var(--font-size-sm);
  text-align: left;
  white-space: nowrap;
}

.mes-process-kpi-table__table th {
  position: sticky;
  top: 0;
  background: var(--color-bg-card);
  color: var(--color-fg-muted);
  font-weight: var(--font-weight-semibold);
}

.mes-process-kpi-table__table th:nth-child(n + 2),
.mes-process-kpi-table__table td:nth-child(n + 2) {
  text-align: center;
}

.mes-process-kpi-table__table td:first-child span {
  margin-left: var(--space-1);
  color: var(--color-fg-muted);
}

.mes-process-kpi-table__chip {
  display: inline-flex;
  align-items: center;
  border: var(--border-width-default) solid;
  border-radius: var(--radius-sm);
  padding: 1px var(--space-1);
  font-weight: var(--font-weight-bold);
}
</style>

<script setup lang="ts">
import { toRiskLevel } from '@/composables/useBottleneckMonitoring';

import { RISK_LEVEL_META } from '@/constants/riskLevel';

import type { BottleneckToolGroupItem } from '@/types/bottleneckMonitoring';

import { formatNumber, formatRatioPercent, formatRiskScore } from '@/utils/format';

interface Props {
  toolGroups: BottleneckToolGroupItem[];
}

defineProps<Props>();
</script>

<template>
  <div class="table-wrap bottleneck-ranking-table__wrap">
    <table class="data-table bottleneck-ranking-table">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Tool Group</th>
          <th scope="col">위험 점수</th>
          <th scope="col">가동률</th>
          <th scope="col">대기 Lot</th>
          <th scope="col">위험등급</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="toolGroups.length === 0">
          <td colspan="6" class="bottleneck-ranking-table__empty">표시할 데이터가 없습니다.</td>
        </tr>
        <tr v-for="(tg, index) in toolGroups" :key="tg.tgId">
          <td class="bottleneck-ranking-table__rank">{{ index + 1 }}</td>
          <td class="bottleneck-ranking-table__name">{{ tg.tgName }}</td>
          <td>{{ formatRiskScore(tg.riskScore) }}</td>
          <td>{{ formatRatioPercent(tg.utilizationRate) }}</td>
          <td>{{ formatNumber(tg.wipCount) }}</td>
          <td>
            <span
              class="bottleneck-ranking-table__grade"
              :style="{
                color: RISK_LEVEL_META[toRiskLevel(tg.riskGrade)].color,
                borderColor: RISK_LEVEL_META[toRiskLevel(tg.riskGrade)].color,
              }"
            >
              {{ RISK_LEVEL_META[toRiskLevel(tg.riskGrade)].label }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.bottleneck-ranking-table__wrap {
  overflow-x: auto;
}

.bottleneck-ranking-table {
  width: 100%;
  min-width: 480px;
  border-collapse: collapse;
}

.bottleneck-ranking-table :deep(th),
.bottleneck-ranking-table :deep(td) {
  padding: 8px 10px;
  font-size: var(--font-size-base);
  vertical-align: middle;
}

.bottleneck-ranking-table__rank {
  color: var(--color-fg-muted);
  width: 32px;
}

.bottleneck-ranking-table__name {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-fg-strong) !important;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.bottleneck-ranking-table__grade {
  display: inline-flex;
  border: var(--border-width-default) solid;
  border-radius: var(--radius-sm);
  padding: 2px 8px;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}

.bottleneck-ranking-table__empty {
  height: 80px;
  text-align: center;
  color: var(--color-fg-muted);
}
</style>

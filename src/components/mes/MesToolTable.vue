<script setup lang="ts">
import { MES_TOOL_STATUS_META } from '@/constants/mes';

import type { MesToolMetric } from '@/types/mes';

import MesToolStatusBadge from '@/components/mes/MesToolStatusBadge.vue';

import { formatQtimeDays, formatRatioPercent } from '@/utils/format';

interface Props {
  tools: MesToolMetric[];
}

defineProps<Props>();

function getToolAccentColor(tool: MesToolMetric): string {
  return MES_TOOL_STATUS_META[tool.status].color;
}
</script>

<template>
  <div class="table-wrap mes-tool-table__wrap">
    <table class="data-table mes-tool-table">
      <thead>
        <tr>
          <th>장비 ID</th>
          <th>상태</th>
          <th>가동률</th>
          <th>OEE 추정</th>
          <th>정비 비율</th>
          <th>Q-time</th>
          <th>대기 Lot</th>
          <th>Setup 비율</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="tool in tools" :key="tool.toolId">
          <td>{{ tool.toolCode }}</td>
          <td>
            <MesToolStatusBadge :status="tool.status" />
          </td>
          <td :style="{ color: getToolAccentColor(tool), fontWeight: 'var(--font-weight-semibold)' }">
            {{ formatRatioPercent(tool.utilizationRate) }}
          </td>
          <td>{{ tool.oeeEstimate === null ? '-' : formatRatioPercent(tool.oeeEstimate) }}</td>
          <td :style="{ color: tool.status === 'DOWN' ? MES_TOOL_STATUS_META.DOWN.color : undefined }">
            {{ formatRatioPercent(tool.downRatio) }}
          </td>
          <td>{{ formatQtimeDays(tool.avgQtimeMin) }}</td>
          <td>{{ tool.queueLotCount }}</td>
          <td>{{ formatRatioPercent(tool.setupRatio) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.mes-tool-table__wrap {
  max-height: 420px;
  overflow: auto;
}

.mes-tool-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}
</style>

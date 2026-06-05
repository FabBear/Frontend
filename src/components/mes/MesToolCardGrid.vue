<script setup lang="ts">
import { MES_TOOL_STATUS_META } from '@/constants/mes';

import type { MesToolMetric } from '@/types/mes';

import MesMetricBar from '@/components/mes/MesMetricBar.vue';
import MesToolStatusBadge from '@/components/mes/MesToolStatusBadge.vue';

import { formatMesDispatchAt, formatQtimeDays, formatRatioPercent } from '@/utils/format';
import { getMesQtimeColor, getMesQueueColor } from '@/utils/mesMetrics';

interface Props {
  tools: MesToolMetric[];
}

defineProps<Props>();

function getToolAccentColor(tool: MesToolMetric): string {
  return MES_TOOL_STATUS_META[tool.status].color;
}

function getToolCardStyle(tool: MesToolMetric) {
  const meta = MES_TOOL_STATUS_META[tool.status];

  return {
    borderColor: `color-mix(in srgb, ${meta.color} 28%, var(--color-border-default))`,
    borderTopColor: meta.color,
    backgroundColor: meta.background,
  };
}
</script>

<template>
  <div class="mes-tool-card-grid">
    <article v-for="tool in tools" :key="tool.toolId" class="mes-tool-card-grid__card" :style="getToolCardStyle(tool)">
      <header>
        <strong>{{ tool.toolCode }}</strong>
        <MesToolStatusBadge :status="tool.status" />
      </header>
      <MesMetricBar
        class="mes-tool-card-grid__util"
        label="가동률"
        :value="tool.utilizationRate"
        :color="getToolAccentColor(tool)"
      >
        {{ formatRatioPercent(tool.utilizationRate) }}
      </MesMetricBar>
      <dl>
        <div>
          <dt>OEE</dt>
          <dd class="mes-tool-card-grid__value--info">
            {{ tool.oeeEstimate === null ? '-' : formatRatioPercent(tool.oeeEstimate) }}
          </dd>
        </div>
        <div>
          <dt>정비</dt>
          <dd :style="{ color: tool.status === 'DOWN' ? MES_TOOL_STATUS_META.DOWN.color : undefined }">
            {{ formatRatioPercent(tool.downRatio) }}
          </dd>
        </div>
        <div>
          <dt>Q-time</dt>
          <dd :style="{ color: getMesQtimeColor(tool.avgQtimeMin) }">{{ formatQtimeDays(tool.avgQtimeMin) }}</dd>
        </div>
        <div>
          <dt>대기 Lot</dt>
          <dd :style="{ color: getMesQueueColor(tool.queueLotCount) }">{{ tool.queueLotCount }}</dd>
        </div>
        <div>
          <dt>Setup</dt>
          <dd>{{ formatRatioPercent(tool.setupRatio) }}</dd>
        </div>
      </dl>
      <p class="mes-tool-card-grid__dispatch">마지막 Dispatch {{ formatMesDispatchAt(tool.lastDispatchAt) }}</p>
    </article>
  </div>
</template>

<style scoped>
.mes-tool-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-2);
}

.mes-tool-card-grid__card {
  border: var(--border-width-default) solid var(--color-border-default);
  border-top-width: 3px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-surface);
  padding: var(--space-3);
  min-width: 0;
}

.mes-tool-card-grid__card header {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.mes-tool-card-grid__card strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
  word-break: break-all;
}

.mes-tool-card-grid__card dd {
  font-weight: var(--font-weight-semibold);
}

.mes-tool-card-grid__util {
  margin-bottom: var(--space-2);
}

.mes-tool-card-grid__card dt,
.mes-tool-card-grid__dispatch {
  color: var(--color-fg-muted);
}

.mes-tool-card-grid__card dl,
.mes-tool-card-grid__dispatch {
  font-size: var(--font-size-xs);
}

.mes-tool-card-grid__card dl {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: var(--space-2);
  row-gap: var(--space-1);
}

.mes-tool-card-grid__card div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-1);
  min-width: 0;
}

.mes-tool-card-grid__card dt,
.mes-tool-card-grid__card dd {
  white-space: nowrap;
}

.mes-tool-card-grid__value--info {
  color: var(--color-status-info);
}

.mes-tool-card-grid__dispatch {
  margin-top: var(--space-2);
  border-top: var(--border-width-default) solid var(--color-border-default);
  padding-top: var(--space-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

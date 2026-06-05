<script setup lang="ts">
import { computed } from 'vue';

import { MES_TOOL_STATUS_META } from '@/constants/mes';

import type { MesToolStatus, MesToolStatusSummary } from '@/types/mes';

interface Props {
  summary?: MesToolStatusSummary;
  compact?: boolean;
  hideZero?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  summary: undefined,
  compact: false,
  hideZero: false,
});

const STATUS_ORDER: MesToolStatus[] = ['RUN', 'IDLE', 'DOWN'];
const visibleStatuses = computed(() =>
  props.hideZero ? STATUS_ORDER.filter((status) => getStatusCount(props.summary, status) > 0) : STATUS_ORDER
);

function getStatusCount(summary: MesToolStatusSummary | undefined, status: MesToolStatus) {
  return summary?.[status] ?? 0;
}
</script>

<template>
  <div class="mes-tool-status-summary" :class="{ 'mes-tool-status-summary--compact': compact }">
    <span
      v-for="status in visibleStatuses"
      :key="status"
      class="mes-tool-status-summary__item"
      :style="{ color: MES_TOOL_STATUS_META[status].color }"
    >
      {{ MES_TOOL_STATUS_META[status].label }}
      <b>{{ getStatusCount(summary, status) }}</b>
    </span>
  </div>
</template>

<style scoped>
.mes-tool-status-summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.mes-tool-status-summary__item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: var(--border-width-default) solid currentColor;
  border-radius: var(--radius-sm);
  padding: 2px var(--space-1);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-tight);
}

.mes-tool-status-summary--compact .mes-tool-status-summary__item {
  padding: 1px 5px;
  font-size: 10px;
}

.mes-tool-status-summary__item b {
  color: var(--color-fg-strong);
}
</style>

<script setup lang="ts">
import { MES_TOOL_STATUS_META } from '@/constants/mes';

import type { MesToolStatus } from '@/types/mes';

interface Props {
  status: MesToolStatus;
}

defineProps<Props>();
</script>

<template>
  <span
    class="mes-tool-status-badge"
    :style="{
      color: MES_TOOL_STATUS_META[status].color,
      backgroundColor: MES_TOOL_STATUS_META[status].background,
    }"
  >
    {{ MES_TOOL_STATUS_META[status].label }}
  </span>
</template>

<style scoped>
.mes-tool-status-badge {
  display: inline-flex;
  align-items: center;
  border: var(--border-width-default) solid currentColor;
  border-radius: var(--radius-pill);
  padding: 1px 7px;
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: 1.4;
}
</style>

<script setup lang="ts">
import { formatKoMonthDayTime } from '@/utils/format';

defineProps<{ asOf: string | null }>();
</script>

<template>
  <div v-if="asOf" class="data-asof" title="현재 데이터 기준 시각">
    <span class="data-asof__dot" aria-hidden="true" />
    <span>{{ formatKoMonthDayTime(asOf) }} 기준</span>
  </div>
</template>

<style scoped>
.data-asof {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  height: var(--header-control-height, 40px);
  padding: 0 10px;
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.data-asof__dot {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-pill);
  background: var(--color-status-success);
  animation: data-asof-pulse 1.5s infinite;
}

@keyframes data-asof-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.5;
    transform: scale(1.3);
  }
}
</style>

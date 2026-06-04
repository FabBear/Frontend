<script setup lang="ts">
import type { MesSnapshot } from '@/types/mes';

import { formatKoMonthDayTime } from '@/utils/format';

interface Props {
  snapshot: MesSnapshot | null;
}

defineProps<Props>();
</script>

<template>
  <div class="mes-connection-status" :class="{ 'mes-connection-status--offline': !snapshot?.isConnected }">
    <span class="mes-connection-status__dot" aria-hidden="true" />
    <span>{{ snapshot?.isConnected ? 'MES 연결됨' : 'MES 연결 대기' }}</span>
    <span v-if="snapshot?.measuredAt">· {{ formatKoMonthDayTime(snapshot.measuredAt) }} 기준</span>
  </div>
</template>

<style scoped>
.mes-connection-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-status-success);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.mes-connection-status--offline {
  color: var(--color-fg-muted);
}

.mes-connection-status__dot {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-pill);
  background: currentColor;
  animation: mes-pulse 1.5s infinite;
}

@keyframes mes-pulse {
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

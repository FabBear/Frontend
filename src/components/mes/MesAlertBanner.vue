<script setup lang="ts">
import { computed } from 'vue';

import type { MesMonitoringData } from '@/types/mes';

const props = defineProps<{
  data: MesMonitoringData;
}>();

const emit = defineEmits<{
  navigateToDownTools: [];
  navigateToCritical: [];
  navigateToHigh: [];
  navigateToToolGroup: [];
}>();

function handleAction(action: Alert['action']) {
  if (!action) return;
  if (action === 'navigateToDownTools') emit('navigateToDownTools');
  else if (action === 'navigateToCritical') emit('navigateToCritical');
  else if (action === 'navigateToHigh') emit('navigateToHigh');
  else if (action === 'navigateToToolGroup') emit('navigateToToolGroup');
}

interface Alert {
  level: 'danger' | 'warning';
  message: string;
  action?: 'navigateToDownTools' | 'navigateToCritical' | 'navigateToHigh' | 'navigateToToolGroup';
}

const alerts = computed<Alert[]>(() => {
  const result: Alert[] = [];

  const criticalTgs = props.data.toolGroups.filter((tg) => tg.riskGrade === 'CRITICAL');
  const downTools = props.data.tools.filter((t) => t.status === 'DOWN');
  const bottleneckTgs = props.data.toolGroups.filter((tg) => tg.bottleneckProb >= 0.5);
  const highTgs = props.data.toolGroups.filter((tg) => tg.riskGrade === 'HIGH');

  if (criticalTgs.length > 0) {
    const names = criticalTgs
      .slice(0, 3)
      .map((tg) => tg.tgName)
      .join(', ');
    const suffix = criticalTgs.length > 3 ? ` 외 ${criticalTgs.length - 3}개` : '';
    result.push({
      level: 'danger',
      message: `CRITICAL TG ${criticalTgs.length}개 감지 — ${names}${suffix}`,
      action: 'navigateToCritical',
    });
  }

  if (downTools.length > 0) {
    result.push({
      level: 'danger',
      message: `Down Tool ${downTools.length}대 발생`,
      action: 'navigateToDownTools',
    });
  }

  if (bottleneckTgs.length > 0) {
    const names = bottleneckTgs
      .slice(0, 3)
      .map((tg) => tg.tgName)
      .join(', ');
    const suffix = bottleneckTgs.length > 3 ? ` 외 ${bottleneckTgs.length - 3}개` : '';
    result.push({
      level: 'warning',
      message: `병목 TG ${bottleneckTgs.length}개 감지 (확률 ≥50%) — ${names}${suffix}`,
      action: 'navigateToToolGroup',
    });
  } else if (highTgs.length > 0) {
    result.push({
      level: 'warning',
      message: `High 위험도 TG ${highTgs.length}개 — 가동률 85~90% 구간`,
      action: 'navigateToHigh',
    });
  }

  return result;
});
</script>

<template>
  <div v-if="alerts.length > 0" class="mes-alert-banner" role="alert" aria-live="polite">
    <div
      v-for="(alert, index) in alerts"
      :key="index"
      class="mes-alert-banner__item"
      :class="`mes-alert-banner__item--${alert.level}`"
    >
      <span class="mes-alert-banner__icon" aria-hidden="true">▲</span>
      <span class="mes-alert-banner__message">{{ alert.message }}</span>
      <button v-if="alert.action" type="button" class="mes-alert-banner__action" @click="handleAction(alert.action)">
        확인하기 →
      </button>
    </div>
  </div>
</template>

<style scoped>
.mes-alert-banner {
  display: grid;
  gap: var(--space-2);
}

.mes-alert-banner__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.mes-alert-banner__item--danger {
  border: 1px solid var(--color-status-danger);
  background: color-mix(in srgb, var(--color-status-danger) 10%, transparent);
  color: var(--color-status-danger);
}

.mes-alert-banner__item--warning {
  border: 1px solid var(--color-status-warning);
  background: var(--color-status-warning-soft);
  color: var(--color-status-warning);
}

.mes-alert-banner__icon {
  font-size: 10px;
  flex-shrink: 0;
}

.mes-alert-banner__message {
  flex: 1;
}

.mes-alert-banner__action {
  flex-shrink: 0;
  border: 1px solid currentColor;
  border-radius: var(--radius-md);
  background: transparent;
  padding: 1px 8px;
  color: inherit;
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  opacity: 0.85;
}

.mes-alert-banner__action:hover {
  opacity: 1;
}
</style>

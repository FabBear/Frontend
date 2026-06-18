<script setup lang="ts">
import { computed } from 'vue';

import { formatAlertAreaDisplay } from '@/constants/processArea';
import { RISK_LEVEL_META } from '@/constants/riskLevel';

import type { BottleneckAlertItem } from '@/types/dashboard';

import BaseButton from '@/components/base/BaseButton.vue';

import { getBottleneckAlertMetrics, getBottleneckAlertProgress } from '@/utils/bottleneckAlertCard';
import { formatKoMonthDayTime } from '@/utils/format';

interface Props {
  alert: BottleneckAlertItem;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  openCenter: [caseId: string];
  openMonitoring: [caseId: string];
}>();

const riskMeta = computed(() => RISK_LEVEL_META[props.alert.riskLevel]);
const metrics = computed(() => getBottleneckAlertMetrics(props.alert));
const progress = computed(() => getBottleneckAlertProgress(props.alert));
const areaDisplay = computed(() => formatAlertAreaDisplay(props.alert.areaName, props.alert.tgName));
const detectedTime = computed(() => `${formatKoMonthDayTime(props.alert.detectedAt)} 감지`);
const stepCount = computed(() => {
  if (progress.value === null) return 0;
  return Math.round((progress.value * 7) / 100);
});

const cardStyle = computed(() => ({
  '--risk-color': riskMeta.value.color,
  '--risk-bg': riskMeta.value.background,
}));
</script>

<template>
  <article class="bottleneck-alert-card" :style="cardStyle">
    <div class="bottleneck-alert-card__top">
      <span class="bottleneck-alert-card__area">{{ areaDisplay }}</span>
      <span class="bottleneck-alert-card__risk-badge">{{ riskMeta.label }}</span>
    </div>

    <div class="bottleneck-alert-card__title-row">
      <strong class="bottleneck-alert-card__title">{{ alert.tgName }}</strong>
      <time class="bottleneck-alert-card__time">{{ detectedTime }}</time>
    </div>

    <dl class="bottleneck-alert-card__metrics">
      <div
        v-for="metric in metrics"
        :key="metric.label"
        class="bottleneck-alert-card__metric"
        :class="`bottleneck-alert-card__metric--${metric.tone ?? 'default'}`"
      >
        <dt>{{ metric.label }}</dt>
        <dd>
          {{ metric.value }}<span v-if="metric.unit">{{ metric.unit }}</span>
        </dd>
      </div>
    </dl>

    <div v-if="progress !== null" class="bottleneck-alert-card__progress-section">
      <div class="bottleneck-alert-card__progress-header">
        <span>에이전트 진행</span>
        <span>{{ stepCount }}/7</span>
      </div>
      <div class="bottleneck-alert-card__progress-bar">
        <span :style="{ width: `${Math.max(0, Math.min(progress, 100))}%` }" />
      </div>
    </div>

    <BaseButton variant="soft" size="sm" class="bottleneck-alert-card__cta" @click="emit('openCenter', alert.caseId)">
      병목 대응 센터에서 보기 →
    </BaseButton>
  </article>
</template>

<style scoped>
.bottleneck-alert-card {
  display: grid;
  gap: 6px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--risk-bg) 0%, transparent 38%), var(--color-bg-card);
  padding: 10px var(--space-3);
  text-align: left;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.06),
    0 12px 26px rgba(15, 23, 42, 0.04);
}

.bottleneck-alert-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.bottleneck-alert-card__area {
  overflow: hidden;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-alert-card__risk-badge {
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--risk-color) 40%, transparent);
  border-radius: var(--radius-pill);
  background: var(--risk-bg);
  padding: 2px 8px;
  color: var(--risk-color);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.bottleneck-alert-card__title-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.bottleneck-alert-card__title {
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-alert-card__time {
  flex-shrink: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.bottleneck-alert-card__metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin: 0;
  padding: 6px 0;
  border-top: var(--border-width-default) solid var(--color-border-subtle);
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
}

.bottleneck-alert-card__metric {
  display: grid;
  gap: 2px;
  padding-right: var(--space-3);
}

.bottleneck-alert-card__metric:not(:first-child) {
  padding-left: var(--space-3);
  border-left: var(--border-width-default) solid var(--color-border-subtle);
}

.bottleneck-alert-card__metric--risk {
  /* no background */
}

.bottleneck-alert-card__metric dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bottleneck-alert-card__metric dd {
  margin: 0;
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-alert-card__metric--risk dd {
  color: var(--risk-color);
}

.bottleneck-alert-card__metric dd span {
  margin-left: 1px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-normal);
}

.bottleneck-alert-card__progress-section {
  display: grid;
  gap: var(--space-1);
}

.bottleneck-alert-card__progress-header {
  display: flex;
  justify-content: space-between;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bottleneck-alert-card__progress-bar {
  height: 4px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--color-border-subtle);
}

.bottleneck-alert-card__progress-bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--risk-color);
  transition: width 0.4s ease;
}

.bottleneck-alert-card__cta {
  width: 100%;
  justify-content: center;
}

.bottleneck-alert-card__cta :deep(.base-button__content) {
  width: 100%;
  justify-content: center;
}
</style>

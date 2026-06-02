<script setup lang="ts">
import { computed } from 'vue';

import { RISK_LEVEL_META } from '@/constants/riskLevel';

import type { BottleneckAlertItem } from '@/types/dashboard';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';

import { formatKoTime, formatNumber, formatRatioPercent } from '@/utils/format';

interface Props {
  alert: BottleneckAlertItem;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  showSolutions: [caseId: string];
  analyzeCause: [caseId: string];
}>();

const riskMeta = computed(() => RISK_LEVEL_META[props.alert.riskLevel]);
const riskLabel = computed(() => (props.alert.riskLevel === 'critical' ? '위험' : '주의'));
const cardStyle = computed(() => ({ borderLeftColor: riskMeta.value.color }));
const delayStyle = computed(() => ({ color: riskMeta.value.color }));

const detectedTime = computed(() => formatKoTime(props.alert.detectedAt));

function handleShowSolutions() {
  emit('showSolutions', props.alert.caseId);
}

function handleAnalyzeCause() {
  emit('analyzeCause', props.alert.caseId);
}
</script>

<template>
  <article class="bottleneck-alert-card" :style="cardStyle">
    <header class="bottleneck-alert-card__header">
      <div class="bottleneck-alert-card__title">
        <BaseBadge :variant="alert.riskLevel">{{ riskLabel }}</BaseBadge>
        <strong>{{ alert.tgName }}</strong>
      </div>
      <time class="bottleneck-alert-card__time" :datetime="alert.detectedAt">{{ detectedTime }}</time>
    </header>

    <dl class="bottleneck-alert-card__details">
      <dt>공정</dt>
      <dd>{{ alert.areaName }}</dd>
      <dt>병목 확률</dt>
      <dd :style="delayStyle">{{ formatRatioPercent(alert.bottleneckProb) }}</dd>
      <dt>예상 지연</dt>
      <dd :style="delayStyle">{{ alert.estDelayHours.toFixed(1) }}시간</dd>
      <dt>영향 Lot</dt>
      <dd>{{ formatNumber(alert.affectedLotCount) }}개</dd>
      <dt>주요 원인</dt>
      <dd>{{ alert.mainCause }}</dd>
    </dl>

    <div class="bottleneck-alert-card__actions">
      <BaseButton class="bottleneck-alert-card__button" size="sm" @click="handleShowSolutions">대응안 보기</BaseButton>
      <BaseButton class="bottleneck-alert-card__button" variant="ghost" size="sm" @click="handleAnalyzeCause">
        원인 분석
      </BaseButton>
    </div>
  </article>
</template>

<style scoped>
.bottleneck-alert-card {
  display: grid;
  gap: var(--space-2);
  border: var(--border-width-default) solid var(--color-border-default);
  border-left: 4px solid;
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-2) 14px;
  box-shadow: var(--shadow-sm);
}

.bottleneck-alert-card__header,
.bottleneck-alert-card__title,
.bottleneck-alert-card__actions {
  display: flex;
  align-items: center;
}

.bottleneck-alert-card__header {
  justify-content: space-between;
  gap: var(--space-2);
}

.bottleneck-alert-card__title {
  min-width: 0;
  gap: var(--space-2);
}

.bottleneck-alert-card__title strong {
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-alert-card__time {
  flex-shrink: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.bottleneck-alert-card__details {
  display: grid;
  grid-template-columns: max-content 1fr max-content 1fr;
  gap: var(--space-1) var(--space-2);
  margin: 0;
  font-size: var(--font-size-sm);
}

.bottleneck-alert-card__details dt {
  color: var(--color-fg-muted);
}

.bottleneck-alert-card__details dd {
  margin: 0;
  color: var(--color-fg);
  font-weight: var(--font-weight-semibold);
}

.bottleneck-alert-card__details dd:last-child {
  grid-column: 2 / -1;
}

.bottleneck-alert-card__actions {
  flex-wrap: wrap;
  gap: var(--space-2);
}

.bottleneck-alert-card__button {
  flex: 1 1 120px;
  min-height: 28px;
  padding-right: var(--space-1);
  padding-left: var(--space-1);
}
</style>

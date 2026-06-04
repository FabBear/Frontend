<script setup lang="ts">
import { computed } from 'vue';

import { formatAlertAreaDisplay } from '@/constants/processArea';
import { RISK_LEVEL_META } from '@/constants/riskLevel';

import type { BottleneckAlertItem } from '@/types/dashboard';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';

import { formatKoTime, formatNumber, formatRatioPercent } from '@/utils/format';

interface Props {
  alert: BottleneckAlertItem;
  selected?: boolean; // 모니터링 뷰 목록에서 선택 상태
  showActions?: boolean; // false이면 액션 버튼 숨김 (목록용)
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  showActions: true,
});

const emit = defineEmits<{
  select: [];
  openCenter: [caseId: string];
  openMonitoring: [caseId: string];
}>();

const riskMeta = computed(() => RISK_LEVEL_META[props.alert.riskLevel]);
const cardStyle = computed(() => ({ borderLeftColor: riskMeta.value.color }));
const delayStyle = computed(() => ({ color: riskMeta.value.color }));
const detectedTime = computed(() => formatKoTime(props.alert.detectedAt));

const areaDisplay = computed(() => formatAlertAreaDisplay(props.alert.areaName, props.alert.tgName));

const STEP_LABELS: Record<string, string> = {
  DIFFUSION_ANALYSIS: '확산 분석 중',
  CAUSE_ANALYSIS: '원인 분석 중',
  ACTION_PLAN_GEN: '대응안 생성 중',
  ACTION_PLAN_COMPARE: '대응안 비교 중',
  HITL_WAITING: '승인 대기',
  REPORT_GEN: '리포트 생성 중',
};

const statusLine = computed(() => {
  if (props.alert.canAnalyzeCause && props.alert.mainCause) {
    return { type: 'cause' as const, text: props.alert.mainCause };
  }
  const stepLabel = STEP_LABELS[props.alert.currentStepName] ?? '에이전트 분석 준비 중';
  return { type: 'step' as const, text: stepLabel };
});

function handleCardClick() {
  if (!props.showActions) emit('select');
}
</script>

<template>
  <article
    class="bottleneck-alert-card"
    :class="{
      'bottleneck-alert-card--selected': selected,
      'bottleneck-alert-card--clickable': !showActions,
    }"
    :style="cardStyle"
    :tabindex="!showActions ? 0 : undefined"
    :role="!showActions ? 'button' : undefined"
    :aria-pressed="!showActions ? selected : undefined"
    @click="handleCardClick"
    @keydown.enter.prevent="handleCardClick"
  >
    <header class="bottleneck-alert-card__header">
      <div class="bottleneck-alert-card__title-group">
        <p class="bottleneck-alert-card__area">{{ areaDisplay }}</p>
        <strong class="bottleneck-alert-card__tg-name">{{ alert.tgName }}</strong>
      </div>
      <div class="bottleneck-alert-card__header-right">
        <BaseBadge :variant="alert.riskLevel">{{ riskMeta.label }}</BaseBadge>
        <time class="bottleneck-alert-card__time" :datetime="alert.detectedAt">{{ detectedTime }}</time>
      </div>
    </header>

    <dl class="bottleneck-alert-card__metrics">
      <div class="bottleneck-alert-card__metric bottleneck-alert-card__metric--primary">
        <dt>예상 지연</dt>
        <dd :style="delayStyle">{{ alert.estDelayHours.toFixed(1) }}<span>시간</span></dd>
      </div>
      <div class="bottleneck-alert-card__metric">
        <dt>영향 Lot</dt>
        <dd>{{ formatNumber(alert.affectedLotCount) }}<span>개</span></dd>
      </div>
      <div class="bottleneck-alert-card__metric">
        <dt>병목 확률</dt>
        <dd>{{ formatRatioPercent(alert.bottleneckProb) }}</dd>
      </div>
    </dl>

    <div
      class="bottleneck-alert-card__status-line"
      :class="{ 'bottleneck-alert-card__status-line--step': statusLine.type === 'step' }"
      :title="statusLine.text"
    >
      <span v-if="statusLine.type === 'step'" class="bottleneck-alert-card__step-dot" aria-hidden="true" />
      {{ statusLine.text }}
    </div>

    <div v-if="showActions" class="bottleneck-alert-card__actions">
      <BaseButton class="bottleneck-alert-card__button" size="sm" @click="emit('openMonitoring', alert.caseId)">
        병목 모니터링
      </BaseButton>
      <BaseButton
        class="bottleneck-alert-card__button"
        variant="ghost"
        size="sm"
        :disabled="!alert.canAnalyzeCause"
        :title="
          alert.canAnalyzeCause
            ? '원인 분석과 대응안을 병목 대응 센터에서 확인합니다.'
            : '원인 분석 완료 후 활성화됩니다.'
        "
        @click="emit('openCenter', alert.caseId)"
      >
        병목 대응 센터
      </BaseButton>
    </div>
  </article>
</template>

<style scoped>
.bottleneck-alert-card {
  display: grid;
  gap: 10px;
  min-height: 12rem;
  border: var(--border-width-default) solid var(--color-border-default);
  border-left: 3px solid;
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: 12px;
  box-shadow: var(--shadow-sm);
}

.bottleneck-alert-card--clickable {
  cursor: pointer;
  border-radius: var(--radius-md);
  box-shadow: none;
}

.bottleneck-alert-card--clickable:hover,
.bottleneck-alert-card--selected {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
}

.bottleneck-alert-card--clickable:focus-visible {
  outline: 2px solid var(--color-action-primary-border);
  outline-offset: 2px;
}

/* 헤더 */
.bottleneck-alert-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.bottleneck-alert-card__title-group {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.bottleneck-alert-card__area {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-alert-card__tg-name {
  display: block;
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-alert-card__header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  gap: var(--space-1);
}

.bottleneck-alert-card__time {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

/* 지표 3개 */
.bottleneck-alert-card__metrics {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: var(--space-1);
  margin: 0;
  padding: 8px 0;
  border-top: var(--border-width-default) solid var(--color-border-subtle);
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
}

.bottleneck-alert-card__metric {
  display: grid;
  gap: 2px;
}

.bottleneck-alert-card__metric dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bottleneck-alert-card__metric dd {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.bottleneck-alert-card__metric dd span {
  margin-left: 1px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-normal);
  color: var(--color-fg-muted);
}

.bottleneck-alert-card__metric--primary dd {
  font-size: var(--font-size-lg);
}

/* 단계 상태 한 줄 */
.bottleneck-alert-card__status-line {
  display: flex;
  align-items: flex-start;
  gap: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-normal);
  white-space: normal;
}

.bottleneck-alert-card__status-line--step {
  align-items: center;
  color: var(--color-status-info);
}

.bottleneck-alert-card__step-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-pill);
  background: currentColor;
  flex-shrink: 0;
  animation: bn-card-pulse 1.5s infinite;
}

@keyframes bn-card-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

/* 액션 버튼 */
.bottleneck-alert-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.bottleneck-alert-card__button {
  flex: 1 1 100px;
  min-height: 28px;
  padding-right: var(--space-1);
  padding-left: var(--space-1);
}
</style>

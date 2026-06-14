<script setup lang="ts">
import { computed } from 'vue';

import { RISK_LEVEL_META, type RiskLevel } from '@/constants/riskLevel';

import BaseBadge from '@/components/base/BaseBadge.vue';

type CaseCardVariant = 'dashboard' | 'compact' | 'selector';
type MetricTone = 'default' | 'risk' | 'muted';
type StatusVariant = 'success' | 'warning' | 'info' | 'danger';

interface MetricItem {
  label: string;
  value: string;
  unit?: string;
  tone?: MetricTone;
}

interface StatusBadge {
  label: string;
  variant: StatusVariant;
}

interface Props {
  variant?: CaseCardVariant;
  title: string;
  subtitle: string;
  riskLevel: RiskLevel;
  timeLabel?: string;
  timeDatetime?: string;
  metrics?: MetricItem[];
  statusText?: string | null;
  statusKind?: 'cause' | 'step';
  statusBadge?: StatusBadge | null;
  progress?: number | null;
  selected?: boolean;
  selectable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'dashboard',
  timeLabel: undefined,
  timeDatetime: undefined,
  metrics: () => [],
  statusText: null,
  statusKind: 'cause',
  statusBadge: null,
  progress: null,
  selected: false,
  selectable: false,
});

const emit = defineEmits<{
  select: [];
}>();

const riskMeta = computed(() => RISK_LEVEL_META[props.riskLevel]);
const rootTag = computed(() => (props.selectable ? 'button' : 'article'));
const rootStyle = computed(() => ({
  '--case-risk-color': riskMeta.value.color,
  '--case-risk-bg': riskMeta.value.background,
}));

function handleSelect() {
  if (props.selectable) emit('select');
}
</script>

<template>
  <component
    :is="rootTag"
    class="bottleneck-case-card"
    :class="[
      `bottleneck-case-card--${variant}`,
      {
        'bottleneck-case-card--selected': selected,
        'bottleneck-case-card--selectable': selectable,
      },
    ]"
    :style="rootStyle"
    :type="selectable ? 'button' : undefined"
    :aria-pressed="selectable ? selected : undefined"
    @click="handleSelect"
  >
    <header class="bottleneck-case-card__header">
      <div class="bottleneck-case-card__title-group">
        <span class="bottleneck-case-card__eyebrow">
          {{ subtitle }}
        </span>
        <strong class="bottleneck-case-card__title">{{ title }}</strong>
      </div>
      <div class="bottleneck-case-card__header-right">
        <BaseBadge :variant="riskLevel">
          <span class="bottleneck-case-card__risk-dot" aria-hidden="true" />
          {{ riskMeta.label }}
        </BaseBadge>
        <time v-if="timeLabel" class="bottleneck-case-card__time" :datetime="timeDatetime">{{ timeLabel }}</time>
      </div>
    </header>

    <dl v-if="metrics.length" class="bottleneck-case-card__metrics">
      <div
        v-for="metric in metrics"
        :key="`${metric.label}-${metric.value}`"
        class="bottleneck-case-card__metric"
        :class="`bottleneck-case-card__metric--${metric.tone ?? 'default'}`"
      >
        <dt>{{ metric.label }}</dt>
        <dd>
          {{ metric.value }}<span v-if="metric.unit">{{ metric.unit }}</span>
        </dd>
      </div>
    </dl>

    <div v-if="statusBadge || statusText" class="bottleneck-case-card__footer">
      <BaseBadge v-if="statusBadge" :variant="statusBadge.variant">{{ statusBadge.label }}</BaseBadge>
      <span
        v-if="statusText"
        class="bottleneck-case-card__status"
        :class="{ 'bottleneck-case-card__status--step': statusKind === 'step' }"
        :title="statusText"
      >
        <span v-if="statusKind === 'step'" class="bottleneck-case-card__pulse-dot" aria-hidden="true" />
        {{ statusText }}
      </span>
    </div>

    <div v-if="$slots.actions" class="bottleneck-case-card__actions">
      <slot name="actions" />
    </div>

    <div v-if="progress !== null" class="bottleneck-case-card__progress" aria-hidden="true">
      <span :style="{ width: `${Math.max(0, Math.min(progress, 100))}%` }" />
    </div>
  </component>
</template>

<style scoped>
.bottleneck-case-card {
  display: grid;
  width: 100%;
  min-width: 0;
  gap: var(--space-2);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: linear-gradient(135deg, var(--case-risk-bg) 0%, transparent 38%), var(--color-bg-card);
  padding: var(--space-3);
  color: var(--color-fg);
  text-align: left;
  box-shadow:
    0 1px 2px rgba(15, 23, 42, 0.06),
    0 12px 26px rgba(15, 23, 42, 0.04);
  transition:
    border-color var(--transition-fast),
    background var(--transition-fast),
    box-shadow var(--transition-fast);
}

.bottleneck-case-card--compact,
.bottleneck-case-card--selector {
  box-shadow: none;
}

.bottleneck-case-card--selector {
  min-height: 72px;
  border-radius: var(--radius-md);
  padding: 10px 12px;
}

.bottleneck-case-card--selectable {
  cursor: pointer;
}

/* 비선택 hover: 보더만 살짝 강조(채움 없음) */
.bottleneck-case-card--selectable:hover {
  border-color: var(--color-border-strong);
}

/* 선택: primary 링으로 또렷하게(배경 채움 없이 선택 여부 명확) */
.bottleneck-case-card--selected {
  border-color: var(--color-action-primary);
  box-shadow: 0 0 0 2px var(--color-action-primary);
}

.bottleneck-case-card:focus-visible {
  outline: 2px solid var(--color-action-primary-border);
  outline-offset: 2px;
}

.bottleneck-case-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  min-width: 0;
}

.bottleneck-case-card__title-group {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.bottleneck-case-card__eyebrow {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 6px;
  overflow: hidden;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-case-card__title {
  display: block;
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-case-card--compact .bottleneck-case-card__title,
.bottleneck-case-card--selector .bottleneck-case-card__title {
  font-size: var(--font-size-sm);
}

.bottleneck-case-card__header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
  gap: 6px;
}

.bottleneck-case-card__risk-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-pill);
  background: currentColor;
}

.bottleneck-case-card__time {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.bottleneck-case-card__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(74px, 1fr));
  gap: 6px;
  margin: 0;
  padding: 0;
}

.bottleneck-case-card--compact .bottleneck-case-card__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.bottleneck-case-card--selector .bottleneck-case-card__metrics {
  display: none;
}

.bottleneck-case-card__metric {
  display: grid;
  min-width: 0;
  gap: 2px;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-bg-surface) 72%, var(--case-risk-bg));
  padding: 7px 8px;
}

.bottleneck-case-card--compact .bottleneck-case-card__metric {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
  background: transparent;
  padding: 0;
}

.bottleneck-case-card__metric dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bottleneck-case-card__metric dd {
  overflow: hidden;
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-case-card__metric--risk dd {
  color: var(--case-risk-color);
  font-size: var(--font-size-lg);
}

.bottleneck-case-card__metric--risk {
  background: color-mix(in srgb, var(--case-risk-bg) 78%, var(--color-bg-card));
}

.bottleneck-case-card__metric--muted dd {
  color: var(--color-fg-muted);
}

.bottleneck-case-card__metric dd span {
  margin-left: 1px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-normal);
}

.bottleneck-case-card__footer {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: var(--space-2);
}

.bottleneck-case-card__status {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  gap: var(--space-1);
  overflow: hidden;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: var(--line-height-normal);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-case-card--dashboard .bottleneck-case-card__status {
  white-space: normal;
}

.bottleneck-case-card__status--step {
  color: var(--color-status-info);
}

.bottleneck-case-card__pulse-dot {
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: var(--radius-pill);
  background: currentColor;
  animation: bottleneck-case-pulse 1.5s infinite;
}

.bottleneck-case-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.bottleneck-case-card__actions :deep(*) {
  flex: 1 1 100px;
  min-height: 28px;
}

.bottleneck-case-card__actions :deep(svg) {
  flex: 0 0 auto;
}

.bottleneck-case-card__progress {
  height: 3px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--color-border-subtle);
}

.bottleneck-case-card__progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--case-risk-color);
}

@keyframes bottleneck-case-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}
</style>

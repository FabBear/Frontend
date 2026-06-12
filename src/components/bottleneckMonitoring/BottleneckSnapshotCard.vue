<script setup lang="ts">
import { formatNumber, formatRatioPercent } from '@/utils/format';

interface Props {
  title: string;
  subtitle: string;
  delayHours: number | null;
  affectedTgCount: number | null;
  bottleneckProb: number | null;
  statusText: string | null;
  causeText: string | null;
  disabled?: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  openCenter: [];
}>();
</script>

<template>
  <section class="bottleneck-snapshot-card" aria-labelledby="snapshot-title">
    <header class="bottleneck-snapshot-card__header">
      <div class="bottleneck-snapshot-card__title-group">
        <h2 id="snapshot-title" class="bottleneck-snapshot-card__tg">{{ title }}</h2>
        <p class="bottleneck-snapshot-card__subtitle">{{ subtitle }}</p>
      </div>
      <button
        class="bottleneck-snapshot-card__case-button"
        type="button"
        :disabled="disabled"
        @click="emit('openCenter')"
      >
        병목 대응 센터
      </button>
    </header>

    <dl class="bottleneck-snapshot-card__meta">
      <div class="bottleneck-snapshot-card__kpi bottleneck-snapshot-card__kpi--primary">
        <dt>예상 지연</dt>
        <dd>{{ delayHours === null ? '-' : `${delayHours.toFixed(1)}시간` }}</dd>
      </div>
      <div class="bottleneck-snapshot-card__kpi">
        <dt>영향 TG</dt>
        <dd>{{ affectedTgCount === null ? '-' : `${formatNumber(affectedTgCount)}개` }}</dd>
      </div>
      <div class="bottleneck-snapshot-card__kpi">
        <dt>병목 확률</dt>
        <dd>{{ formatRatioPercent(bottleneckProb) }}</dd>
      </div>
      <div class="bottleneck-snapshot-card__kpi">
        <dt>대응 상태</dt>
        <dd class="bottleneck-snapshot-card__status" :class="{ 'bottleneck-snapshot-card__status--done': statusText }">
          {{ statusText ?? '분석 진행 중' }}
        </dd>
      </div>
    </dl>

    <p v-if="causeText" class="bottleneck-snapshot-card__cause" :title="causeText">
      <span>주요 원인</span>{{ causeText }}
    </p>
  </section>
</template>

<style scoped>
.bottleneck-snapshot-card {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  min-height: 112px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-left: 4px solid var(--color-action-primary);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
}

.bottleneck-snapshot-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  min-width: 0;
}

.bottleneck-snapshot-card__title-group {
  min-width: 0;
}

.bottleneck-snapshot-card__tg {
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-snapshot-card__subtitle {
  overflow: hidden;
  margin-top: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-snapshot-card__meta {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
}

.bottleneck-snapshot-card__kpi {
  display: grid;
  align-content: center;
  min-width: 0;
  min-height: 64px;
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: var(--space-2);
}

.bottleneck-snapshot-card__kpi dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bottleneck-snapshot-card__kpi dd {
  overflow: hidden;
  margin: 4px 0 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bottleneck-snapshot-card__kpi--primary dd {
  color: var(--color-status-danger);
  font-size: var(--font-size-xl);
}

.bottleneck-snapshot-card__status {
  display: inline-flex;
  align-items: center;
  justify-self: start;
  width: fit-content;
  max-width: 100%;
  border-radius: var(--radius-pill);
  background: var(--color-bg-subtle);
  padding: 3px 10px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm) !important;
  font-weight: var(--font-weight-semibold) !important;
  line-height: var(--line-height-tight);
  white-space: nowrap;
}

.bottleneck-snapshot-card__status--done {
  background: var(--color-status-success-soft);
  color: var(--color-status-success);
}

.bottleneck-snapshot-card__cause {
  display: grid;
  gap: 4px;
  margin: 0;
  border: var(--border-width-default) solid var(--color-action-primary-border);
  border-radius: var(--radius-md);
  background: var(--color-action-primary-soft);
  padding: var(--space-2);
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-normal);
}

.bottleneck-snapshot-card__cause span {
  display: block;
  margin-right: 0;
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bottleneck-snapshot-card__case-button {
  min-height: 34px;
  border: var(--border-width-default) solid var(--color-action-primary-border);
  border-radius: var(--radius-md);
  background: var(--color-action-primary);
  padding: 0 12px;
  color: var(--color-text-inverse);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.bottleneck-snapshot-card__case-button:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

@media (max-width: 1120px) {
  .bottleneck-snapshot-card {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .bottleneck-snapshot-card__meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

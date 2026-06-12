<script setup lang="ts">
import { computed } from 'vue';

import { BNC_STATUS_META } from '@/constants/bnc';
import { RISK_LEVEL_META, riskGradeToLevel } from '@/constants/riskLevel';

import type { BncAlertCase, BncCaseDetail } from '@/types/bnc';

import BaseBadge from '@/components/base/BaseBadge.vue';

import { formatKoMonthDayTime, formatRatioPercent } from '@/utils/format';

const props = defineProps<{
  item: BncAlertCase;
  detail?: BncCaseDetail | null;
}>();

const riskLevel = computed(() => riskGradeToLevel(props.item.riskGrade));
const riskMeta = computed(() => RISK_LEVEL_META[riskLevel.value]);
const statusMeta = computed(() => BNC_STATUS_META[props.item.status]);

function formatElapsed(fromIso: string, toIso?: string | null): string {
  const start = new Date(fromIso).getTime();
  const end = toIso ? new Date(toIso).getTime() : Date.now();
  const totalMin = Math.max(0, Math.floor((end - start) / 60000));
  if (totalMin < 60) return `${totalMin}분`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h < 24) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  return `${Math.floor(h / 24)}일 ${h % 24}시간`;
}

const elapsedText = computed(() => formatElapsed(props.item.detectedAt));
const resolutionText = computed(() =>
  props.detail?.resolvedAt ? formatElapsed(props.item.detectedAt, props.detail.resolvedAt) : null
);
const summary = computed(() => props.detail?.agentSummary ?? null);
</script>

<template>
  <section class="bnc-case-summary">
    <div class="bnc-case-summary__top">
      <div class="bnc-case-summary__id">
        <span class="bnc-case-summary__eyebrow"
          >{{ item.areaName }} · {{ formatKoMonthDayTime(item.detectedAt) }} 감지</span
        >
        <strong class="bnc-case-summary__title">{{ item.tgName }}</strong>
      </div>
      <div class="bnc-case-summary__badges">
        <BaseBadge :variant="riskLevel">{{ riskMeta.label }}</BaseBadge>
        <BaseBadge :variant="statusMeta.variant">{{ statusMeta.label }}</BaseBadge>
      </div>
    </div>

    <dl class="bnc-case-summary__metrics">
      <div>
        <dt>{{ resolutionText ? '해결 소요' : '감지 경과' }}</dt>
        <dd>{{ resolutionText ?? elapsedText }}</dd>
      </div>
      <template v-if="summary">
        <div>
          <dt>영향 TG</dt>
          <dd>{{ summary.bottleneckCount }}개</dd>
        </div>
        <div>
          <dt>Critical TG</dt>
          <dd>{{ summary.criticalCount }}개</dd>
        </div>
        <div>
          <dt>최대 가동률</dt>
          <dd>{{ formatRatioPercent(summary.maxUtilizationRate) }}</dd>
        </div>
      </template>
      <template v-else>
        <div class="bnc-case-summary__metric--placeholder" />
        <div class="bnc-case-summary__metric--placeholder" />
        <div class="bnc-case-summary__metric--placeholder" />
      </template>
    </dl>
  </section>
</template>

<style scoped>
.bnc-case-summary {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
}

.bnc-case-summary__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.bnc-case-summary__id {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.bnc-case-summary__eyebrow {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-case-summary__title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.bnc-case-summary__badges {
  display: flex;
  flex-shrink: 0;
  gap: var(--space-2);
}

.bnc-case-summary__metrics {
  display: flex;
  gap: 1px;
  margin: 0;
  overflow: hidden;
  background: var(--color-border-subtle);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.bnc-case-summary__metrics div {
  flex: 1;
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-page);
}

.bnc-case-summary__metric--placeholder {
  background: var(--color-bg-page);
  opacity: 0.4;
}

.bnc-case-summary__metrics dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.bnc-case-summary__metrics dd {
  margin: 2px 0 0;
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

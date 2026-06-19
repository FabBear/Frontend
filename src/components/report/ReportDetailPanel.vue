<script setup lang="ts">
import { riskGradeToLevel } from '@/constants/riskLevel';

import type { ActionHistoryDetail } from '@/types/report';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';

import { formatKoMonthDayTime, formatNumber } from '@/utils/format';

defineProps<{
  detail: ActionHistoryDetail | null;
  loading?: boolean;
}>();

defineEmits<{
  close: [];
}>();

function formatSignedDay(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(3)}일`;
}

function formatSignedPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%p`;
}

function handlePdfDownload() {
  alert('TODO: PDF 다운로드');
}
</script>

<template>
  <aside class="report-detail-panel" :class="{ 'report-detail-panel--empty': !detail }">
    <header class="report-detail-panel__header">
      <div>
        <p>상세</p>
        <h2>{{ detail?.tgName ?? '이력을 선택하세요' }}</h2>
      </div>
      <button class="report-detail-panel__close" type="button" aria-label="닫기" @click="$emit('close')">×</button>
    </header>

    <p v-if="loading" class="report-detail-panel__state">상세 이력을 불러오는 중입니다.</p>
    <p v-else-if="!detail" class="report-detail-panel__state">목록에서 케이스를 선택하면 상세가 표시됩니다.</p>

    <template v-else>
      <dl class="report-detail-panel__summary">
        <div>
          <dt>공정</dt>
          <dd>{{ detail.areaName }}</dd>
        </div>
        <div>
          <dt>위험 등급</dt>
          <dd>
            <BaseBadge :variant="riskGradeToLevel(detail.riskGrade)">{{ detail.riskGrade }}</BaseBadge>
          </dd>
        </div>
        <div>
          <dt>감지</dt>
          <dd>{{ formatKoMonthDayTime(detail.detectedAt) }}</dd>
        </div>
      </dl>

      <section class="report-detail-panel__section">
        <h3>HITL 결정</h3>
        <p>
          <BaseBadge :variant="detail.hitlDecision.decision === 'APPROVED' ? 'success' : 'warning'">
            {{ detail.hitlDecision.decision === 'APPROVED' ? '승인' : '반려' }}
          </BaseBadge>
          {{ detail.hitlDecision.selectedPlanTitle }}
        </p>
        <p class="report-detail-panel__muted">
          {{ detail.hitlDecision.decidedBy.userName }} · {{ formatKoMonthDayTime(detail.hitlDecision.decidedAt) }}
        </p>
        <p>{{ detail.hitlDecision.comment }}</p>
      </section>

      <section class="report-detail-panel__section">
        <h3>Baseline</h3>
        <dl class="report-detail-panel__metrics">
          <div>
            <dt>처리량</dt>
            <dd>{{ formatNumber(detail.baseline.throughput) }} Lot/일</dd>
          </div>
          <div>
            <dt>평균 대기일</dt>
            <dd>{{ detail.baseline.avgWaitDay.toFixed(2) }}일</dd>
          </div>
          <div>
            <dt>납기 준수율</dt>
            <dd>{{ detail.baseline.deliveryCompliance.toFixed(1) }}%</dd>
          </div>
        </dl>
      </section>

      <section class="report-detail-panel__section">
        <h3>대응안 비교</h3>
        <ul class="report-detail-panel__plans">
          <li
            v-for="plan in detail.actionPlans"
            :key="plan.planSeq"
            :class="{ 'report-detail-panel__plan--selected': plan.isSelected }"
          >
            <b>{{ plan.planTitle }}</b>
            <span>{{ plan.planType }}</span>
            <em
              >대기 {{ formatSignedDay(plan.estAvgWaitDelta) }} · 납기
              {{ formatSignedPercent(plan.estDeliveryComplianceDelta) }}</em
            >
          </li>
        </ul>
      </section>

      <BaseButton v-if="detail.hasPdf" variant="ghost" size="sm" @click="handlePdfDownload">PDF 다운로드</BaseButton>
    </template>
  </aside>
</template>

<style scoped>
.report-detail-panel {
  position: sticky;
  top: var(--space-4);
  display: grid;
  gap: var(--space-4);
  max-height: calc(100svh - 120px);
  overflow: auto;
  padding: var(--space-5);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
}

.report-detail-panel--empty {
  min-height: 260px;
}

.report-detail-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.report-detail-panel__header p,
.report-detail-panel__header h2,
.report-detail-panel__state,
.report-detail-panel__section h3,
.report-detail-panel__section p,
.report-detail-panel__summary,
.report-detail-panel__metrics,
.report-detail-panel__plans {
  margin: 0;
}

.report-detail-panel__header p,
.report-detail-panel__state,
.report-detail-panel__muted,
.report-detail-panel__summary dt,
.report-detail-panel__metrics dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.report-detail-panel__header h2,
.report-detail-panel__section h3 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}

.report-detail-panel__close {
  border: none;
  background: none;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-xl);
}

.report-detail-panel__summary,
.report-detail-panel__metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.report-detail-panel__summary div,
.report-detail-panel__metrics div,
.report-detail-panel__plans li {
  padding: var(--space-3);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.report-detail-panel__summary dd,
.report-detail-panel__metrics dd {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-semibold);
}

.report-detail-panel__section {
  display: grid;
  gap: var(--space-2);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}

.report-detail-panel__plans {
  display: grid;
  gap: var(--space-2);
  padding: 0;
  list-style: none;
}

.report-detail-panel__plans span,
.report-detail-panel__plans em {
  display: block;
  margin-top: var(--space-1);
  color: var(--color-fg-muted);
  font-style: normal;
  font-size: var(--font-size-sm);
}

.report-detail-panel__plan--selected {
  border-color: var(--color-state-selected-border);
  background: var(--color-state-selected-bg);
}
</style>

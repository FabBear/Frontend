<script setup lang="ts">
import { computed, ref } from 'vue';

import { FileJson, FileText, MessageCircle, Printer } from '@lucide/vue';

import { downloadBncReportPdf } from '@/services/bncService';

import { riskGradeToLevel } from '@/constants/riskLevel';

import type { ActionHistoryDetail } from '@/types/report';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import type { BaseTableColumn, BaseTableRow } from '@/components/base/BaseTable.vue';
import BaseTable from '@/components/base/BaseTable.vue';
import FinalBottleneckReportView from '@/components/report/FinalBottleneckReportView.vue';

const props = defineProps<{ detail: ActionHistoryDetail; aiBusy?: boolean }>();

const emit = defineEmits<{
  back: [];
  askAi: [detail: ActionHistoryDetail];
}>();

type FinalReportInstance = InstanceType<typeof FinalBottleneckReportView>;
const finalReportRef = ref<FinalReportInstance | null>(null);
const isDownloading = ref(false);

async function handlePdfDownload() {
  if (!finalReportRef.value) return;
  isDownloading.value = true;
  try {
    await finalReportRef.value.triggerPdfDownload();
  } finally {
    isDownloading.value = false;
  }
}

async function handleStoredPdfDownload() {
  if (isDownloading.value) return;
  isDownloading.value = true;
  try {
    await downloadBncReportPdf(props.detail.caseId);
  } finally {
    isDownloading.value = false;
  }
}

function handleMarkdownDownload() {
  finalReportRef.value?.downloadMarkdown();
}

function handleJsonDownload() {
  finalReportRef.value?.downloadJson();
}

function handleAskAI() {
  emit('askAi', props.detail);
}

function formatDetectedAt(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

const comparisonColumns: BaseTableColumn[] = [
  { key: 'rank', label: '순위' },
  { key: 'planTitle', label: '대응안' },
  { key: 'planType', label: '카테고리' },
  { key: 'throughput', label: 'Throughput' },
  { key: 'avgWaitDay', label: '평균 대기일' },
  { key: 'deliveryCompliance', label: '납기준수율' },
  { key: 'waitDelta', label: '대기 개선' },
  { key: 'deliveryDelta', label: '납기 개선' },
];

const caseInfo = computed(() => [
  { label: '주요 원인', value: props.detail.bottleneckProb >= 0.9 ? '작업량 초과' : '대기시간 증가' },
  { label: '대상 TG', value: props.detail.targetTgText },
  { label: '병목 확률', value: `${(props.detail.bottleneckProb * 100).toFixed(1)}%` },
  { label: '공정 영역', value: props.detail.areaName },
]);
const comparisonRows = computed<BaseTableRow[]>(() =>
  props.detail.actionPlans.map((plan) => ({
    ...plan,
    id: plan.planSeq,
    rank: plan.planSeq === 0 ? '베이스라인' : `#${plan.planSeq}`,
    throughput: props.detail.baseline.throughput + plan.estThroughputDelta,
    avgWaitDay: props.detail.baseline.avgWaitDay + plan.estAvgWaitDelta,
    deliveryCompliance: props.detail.baseline.deliveryCompliance + plan.estDeliveryComplianceDelta,
    waitDelta: plan.estAvgWaitDelta,
    deliveryDelta: plan.estDeliveryComplianceDelta,
  }))
);

function formatSignedDay(value: number) {
  if (value === 0) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(3)}일`;
}

function formatSignedPercent(value: number) {
  if (value === 0) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(0)}%p`;
}

function getNumber(row: BaseTableRow, key: string) {
  return row[key] as number;
}
</script>

<template>
  <div class="action-history-detail">
    <div class="action-history-detail__toolbar">
      <div class="action-history-detail__title">
        <strong>{{ detail.targetTgText }}</strong>
        <div class="action-history-detail__title-meta">
          <BaseBadge :variant="riskGradeToLevel(detail.riskGrade)">{{ detail.riskGrade }}</BaseBadge>
          <span>{{ detail.areaName }}</span>
          <span class="action-history-detail__title-sep">·</span>
          <time>{{ formatDetectedAt(detail.detectedAt) }} 감지</time>
        </div>
      </div>
      <div class="action-history-detail__toolbar-actions">
        <BaseButton v-if="detail.finalReport" size="sm" :disabled="isDownloading" @click="handlePdfDownload">
          <Printer :size="14" />
          {{ isDownloading ? 'PDF 생성 중…' : '인쇄용 PDF' }}
        </BaseButton>
        <BaseButton v-else-if="detail.hasPdf" size="sm" :disabled="isDownloading" @click="handleStoredPdfDownload">
          <Printer :size="14" />
          {{ isDownloading ? 'PDF 다운로드 중…' : 'PDF 다운로드' }}
        </BaseButton>
        <BaseButton v-if="detail.finalReport" variant="ghost" size="sm" @click="handleMarkdownDownload">
          <FileText :size="14" />
          Markdown
        </BaseButton>
        <BaseButton v-if="detail.finalReport" variant="ghost" size="sm" @click="handleJsonDownload">
          <FileJson :size="14" />
          JSON
        </BaseButton>
        <BaseButton
          variant="ghost"
          size="sm"
          class="action-history-detail__ask-ai"
          :disabled="props.aiBusy"
          @click="handleAskAI"
        >
          <MessageCircle :size="14" />
          {{ props.aiBusy ? 'AI 분석 중...' : 'AI에게 질문하기' }}
        </BaseButton>
        <BaseButton variant="ghost" size="sm" @click="$emit('back')">닫기 ×</BaseButton>
      </div>
    </div>

    <section class="action-history-detail__case-summary surface-card">
      <div class="action-history-detail__section-head">
        <h2>케이스 요약</h2>
        <div class="action-history-detail__badges">
          <BaseBadge :variant="riskGradeToLevel(detail.riskGrade)">{{ detail.riskGrade }}</BaseBadge>
          <BaseBadge :variant="detail.hitlDecision.decision === 'APPROVED' ? 'success' : 'warning'">
            {{ detail.hitlDecision.decision === 'APPROVED' ? '승인' : '반려' }}
          </BaseBadge>
        </div>
      </div>
      <dl class="action-history-detail__summary">
        <div v-for="item in caseInfo" :key="item.label">
          <dt>{{ item.label }}</dt>
          <dd>{{ item.value }}</dd>
        </div>
      </dl>
    </section>

    <FinalBottleneckReportView v-if="detail.finalReport" ref="finalReportRef" :report="detail.finalReport" />

    <template v-else>
      <section class="action-history-detail__card surface-card">
        <div class="action-history-detail__report-head">
          <h2>대응 리포트</h2>
          <p>HITL 결정 이력과 선택 대응안 검증 결과를 포함합니다.</p>
        </div>
        <dl class="action-history-detail__decision-summary">
          <div>
            <dt>선택 대응안</dt>
            <dd>{{ detail.hitlDecision.selectedPlanTitle }}</dd>
          </div>
          <div>
            <dt>결정자</dt>
            <dd>{{ detail.hitlDecision.decidedBy.userName }}</dd>
          </div>
          <div>
            <dt>코멘트</dt>
            <dd>{{ detail.hitlDecision.comment }}</dd>
          </div>
        </dl>
      </section>

      <section class="action-history-detail__card surface-card">
        <h2>대응안별 KPI 비교 (검증 seed=10, 60일)</h2>
        <div class="action-history-detail__bars">
          <div v-for="row in comparisonRows.slice(1)" :key="String(row.id)">
            <span>{{ row.planTitle }}</span>
            <b :style="{ width: `${Math.min(100, Math.abs(getNumber(row, 'waitDelta')) * 80)}%` }" />
            <em>{{ formatSignedDay(getNumber(row, 'waitDelta')) }}</em>
          </div>
        </div>
      </section>

      <section class="action-history-detail__card surface-card">
        <h2>대응안 상세 결과</h2>
        <BaseTable :columns="comparisonColumns" :rows="comparisonRows" row-key="id">
          <template #cell-throughput="{ row }">{{
            Math.round(getNumber(row, 'throughput')).toLocaleString()
          }}</template>
          <template #cell-avgWaitDay="{ row }">{{ getNumber(row, 'avgWaitDay').toFixed(3) }}일</template>
          <template #cell-deliveryCompliance="{ row }">{{ getNumber(row, 'deliveryCompliance').toFixed(0) }}%</template>
          <template #cell-waitDelta="{ row }">{{ formatSignedDay(getNumber(row, 'waitDelta')) }}</template>
          <template #cell-deliveryDelta="{ row }">{{ formatSignedPercent(getNumber(row, 'deliveryDelta')) }}</template>
        </BaseTable>
      </section>
    </template>
  </div>
</template>

<style scoped>
.action-history-detail {
  display: grid;
  gap: var(--space-4);
}

.action-history-detail__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border-subtle);
}

.action-history-detail__title {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.action-history-detail__title > strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-history-detail__title-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.action-history-detail__title-sep {
  opacity: 0.4;
}

.action-history-detail__toolbar-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: var(--space-2);
}

.action-history-detail__ask-ai {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.action-history-detail__case-summary,
.action-history-detail__card {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
}

.action-history-detail__case-summary {
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
}

.action-history-detail__card h2 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}

.action-history-detail__section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.action-history-detail__badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.action-history-detail__summary,
.action-history-detail__decision-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
}

.action-history-detail__summary div,
.action-history-detail__decision-summary div {
  display: grid;
  gap: var(--space-1);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  padding: var(--space-3);
}

.action-history-detail__summary dt,
.action-history-detail__decision-summary dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.action-history-detail__summary dd,
.action-history-detail__decision-summary dd {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.action-history-detail__report-head {
  display: grid;
  gap: var(--space-1);
}

.action-history-detail__report-head h2,
.action-history-detail__report-head p {
  margin: 0;
}

.action-history-detail__report-head p {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.action-history-detail__decision-summary {
  grid-template-columns: minmax(160px, 0.8fr) minmax(120px, 0.5fr) minmax(260px, 1.7fr);
}

.action-history-detail__bars {
  display: grid;
  gap: var(--space-3);
}

.action-history-detail__bars div {
  display: grid;
  grid-template-columns: 180px minmax(160px, 1fr) 80px;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.action-history-detail__bars b {
  display: block;
  height: 12px;
  min-width: 12px;
  background: var(--color-action-primary);
  border-radius: var(--radius-pill);
}

@media (max-width: 980px) {
  .action-history-detail__summary,
  .action-history-detail__decision-summary,
  .action-history-detail__bars div {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .action-history-detail__toolbar {
    flex-wrap: wrap;
  }

  .action-history-detail__toolbar-actions {
    flex-wrap: wrap;
  }
}
</style>

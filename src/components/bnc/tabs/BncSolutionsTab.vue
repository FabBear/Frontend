<script setup lang="ts">
import { provideBncSolutions } from '@/composables/useBncSolutions';

import type { BncActionPlansPayload } from '@/types/bnc';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BncSolutionsCompareCards from '@/components/bnc/tabs/BncSolutionsCompareCards.vue';
import BncSolutionsHitl from '@/components/bnc/tabs/BncSolutionsHitl.vue';
import BncSolutionsImmediateActions from '@/components/bnc/tabs/BncSolutionsImmediateActions.vue';
import BncSolutionsKpiCharts from '@/components/bnc/tabs/BncSolutionsKpiCharts.vue';
import BncSolutionsRagEvidence from '@/components/bnc/tabs/BncSolutionsRagEvidence.vue';
import BncSolutionsSelectedDetail from '@/components/bnc/tabs/BncSolutionsSelectedDetail.vue';

const props = defineProps<{
  payload: BncActionPlansPayload | null;
  loading?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  decide: [payload: { decision: 'APPROVED' | 'REJECTED'; selectedPlanId: string; comment?: string | null }];
}>();

// 부모(탭)는 오케스트레이터 — 자식 컴포넌트에 넘길 값과 직접 쓰는 판단요약/조건값만 destructure.
// 상세(SelectedDetail) 전용 파생값은 provide된 컨텍스트를 자식이 inject해 직접 사용한다.
const {
  // 판단 요약 + 공통 조건
  decisionSummaryTitle,
  decisionSummaryDescription,
  decisionSummaryItems,
  hasConclusion,
  conclusionHeadline,
  compareContext,
  noActionForecast,
  hasSimWarning,
  recommendedPlan,
  recommendationBadgeLabel,
  formatDecisionStatus,
  // 차트/카드
  sortedPlans,
  planBadges,
  selectedOptionId,
  isCurrentOptionSelected,
  currentOptionMetrics,
  baselineTargetToolGroups,
  handleSelectCurrentOption,
  handleSelectPlan,
  // 상세 렌더 여부
  selectedPlan,
  // 즉시 조치
  showImmediateActions,
  selectedImmediateActions,
  selectedMonitoringKpis,
  selectedRollbackCondition,
  // RAG
  ragHits,
  selectedPlanEvidence,
  openInArchive,
  // HITL
  selectedPlanId,
  localDecision,
  isPendingReject,
  rejectionNote,
  approvalNote,
  isSelectionOffRecommendation,
  handleApprove,
  handleRejectStart,
  handleRejectCancel,
  handleRejectConfirm,
} = provideBncSolutions(props, emit);
</script>

<template>
  <section class="bnc-solutions">
    <p v-if="loading" class="bnc-solutions__state">대응안을 불러오는 중입니다.</p>
    <p v-else-if="errorMessage" class="bnc-solutions__state bnc-solutions__state--error">{{ errorMessage }}</p>
    <p v-else-if="!payload" class="bnc-solutions__state">
      대응안이 아직 생성되지 않았습니다. Compare Agent 완료 후 표시됩니다.
    </p>

    <template v-else>
      <section class="bnc-solutions__baseline bnc-solutions__baseline--summary">
        <div class="bnc-solutions__baseline-hd">
          <span class="bnc-solutions__card-label bnc-solutions__card-label--base">판단</span>
          <div class="bnc-solutions__baseline-title">
            <h3>{{ decisionSummaryTitle }}</h3>
            <p>{{ decisionSummaryDescription }}</p>
          </div>
        </div>

        <div v-if="hasConclusion" class="bnc-solutions__conclusion-hd">
          <BaseBadge v-if="payload.decisionInfo" variant="info">
            {{ formatDecisionStatus(payload.decisionInfo.decisionStatus) }}
          </BaseBadge>
          <p v-if="conclusionHeadline" class="bnc-solutions__conclusion-headline">{{ conclusionHeadline }}</p>
        </div>

        <div class="bnc-solutions__conclusion-meta">
          <span
            v-if="compareContext?.severity"
            class="bnc-solutions__conclusion-chip bnc-solutions__conclusion-chip--danger"
          >
            {{ compareContext.severity }} 병목
          </span>
          <span
            v-if="noActionForecast?.getsWorse"
            class="bnc-solutions__conclusion-chip bnc-solutions__conclusion-chip--warn"
          >
            무조치 악화 예상
          </span>
          <span v-if="hasSimWarning" class="bnc-solutions__conclusion-chip bnc-solutions__conclusion-chip--warn">
            시뮬 검증 경고
          </span>
          <span v-if="recommendedPlan" class="bnc-solutions__conclusion-chip bnc-solutions__conclusion-chip--rec">
            {{ recommendationBadgeLabel(recommendedPlan) }} {{ recommendedPlan.actionLabel ?? '-' }}
          </span>
        </div>

        <ul class="bnc-solutions__metrics bnc-solutions__metrics--baseline">
          <li v-for="item in decisionSummaryItems" :key="item.label" class="bnc-solutions__metric-row">
            <span class="bnc-solutions__metric-name">{{ item.label }}</span>
            <span class="bnc-solutions__metric-result">
              <span class="bnc-solutions__metric-val">{{ item.value }}</span>
              <span v-if="item.caption" class="bnc-solutions__metric-delta">{{ item.caption }}</span>
            </span>
          </li>
        </ul>

        <div class="bnc-solutions__card-warn">
          <span aria-hidden="true">!</span>
          <p>
            숫자 상세는 중복 노출하지 않습니다. 현재 유지 카드를 선택하면 현재 KPI와 무조치 예측을 확인할 수 있습니다.
          </p>
        </div>
      </section>

      <!-- KPI 영향 비교 차트 -->
      <BncSolutionsKpiCharts v-if="sortedPlans.length" :plans="sortedPlans" />

      <BncSolutionsCompareCards
        :plans="sortedPlans"
        :selected-option-id="selectedOptionId"
        :is-current-option-selected="isCurrentOptionSelected"
        :current-option-metrics="currentOptionMetrics"
        :baseline-target-tool-groups="baselineTargetToolGroups"
        :rag-evidence="payload?.ragEvidence ?? null"
        :plan-badges="planBadges"
        @select-current-option="handleSelectCurrentOption"
        @select-plan="handleSelectPlan"
      />

      <BncSolutionsSelectedDetail v-if="isCurrentOptionSelected || selectedPlan" />

      <!-- 지금 할 것들 -->
      <BncSolutionsImmediateActions
        v-if="showImmediateActions"
        :action-label="selectedPlan?.actionLabel ?? null"
        :immediate-actions="selectedImmediateActions"
        :monitoring-kpis="selectedMonitoringKpis"
        :rollback-condition="selectedRollbackCondition"
      />

      <!-- RAG 유사사례 근거 -->
      <BncSolutionsRagEvidence
        v-if="ragHits.length || selectedPlanEvidence"
        :rag-hits="ragHits"
        :plan-evidence="selectedPlanEvidence"
        @open-archive="openInArchive"
      />

      <!-- HITL 섹션 -->
      <BncSolutionsHitl
        v-if="localDecision === null"
        v-model:rejection-note="rejectionNote"
        v-model:approval-note="approvalNote"
        :selected-plan-title="selectedPlan?.title ?? null"
        :recommended-plan-label="recommendedPlan?.actionLabel ?? null"
        :is-pending-reject="isPendingReject"
        :is-current-option-selected="isCurrentOptionSelected"
        :is-selection-off-recommendation="isSelectionOffRecommendation"
        :can-submit="!!selectedPlanId && !isCurrentOptionSelected"
        @approve="handleApprove"
        @reject-start="handleRejectStart"
        @reject-cancel="handleRejectCancel"
        @reject-confirm="handleRejectConfirm"
      />
    </template>
  </section>
</template>

<style scoped>
.bnc-solutions {
  display: grid;
  grid-template-columns: minmax(0, 1fr); /* 단일 컬럼을 0~1fr로 묶어 내부 카드 그리드가 셀 폭에 맞게 수축 */
  min-width: 0;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-top: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.bnc-solutions__state {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}
.bnc-solutions__state--error {
  color: var(--color-status-danger);
}

/* ── 현재 상태 기준선 ───────────────────────────────────────── */
.bnc-solutions__baseline {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-bg-page);
}

.bnc-solutions__baseline--summary {
  border-color: color-mix(in srgb, var(--color-action-primary) 18%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-action-primary) 3%, var(--color-bg-page));
}

.bnc-solutions__baseline-hd {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  min-width: 0;
}

.bnc-solutions__baseline-title {
  min-width: 0;
}

.bnc-solutions__baseline-title h3 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  line-height: 1.35;
}

.bnc-solutions__baseline-title p {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
  word-break: keep-all;
}

.bnc-solutions__metrics--baseline {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
  padding: 0;
  border: none;
}

.bnc-solutions__metrics--baseline .bnc-solutions__metric-row {
  align-items: flex-start;
  min-width: 0;
  padding: var(--space-2);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
}

.bnc-solutions__metrics--baseline .bnc-solutions__metric-name {
  white-space: normal;
}

.bnc-solutions__metrics--baseline .bnc-solutions__metric-delta {
  font-size: var(--font-size-xs);
  font-weight: 400;
  color: var(--color-fg-muted);
}

.bnc-solutions__baseline .bnc-solutions__card-warn {
  padding: var(--space-2) var(--space-3);
  border: 1px solid color-mix(in srgb, var(--color-status-warning) 24%, transparent);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-status-warning) 8%, var(--color-bg-surface));
}

/* ── 대응안 비교 영역 ───────────────────────────────────────── */
/* ── 비교 결론 요약 ───────────────────────────────────────── */
.bnc-solutions__conclusion {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 22%, var(--color-border-default));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-action-primary) 5%, var(--color-bg-surface));
}

.bnc-solutions__conclusion-hd {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-2);
  min-width: 0;
}

.bnc-solutions__conclusion-headline {
  margin: 0;
  min-width: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.bnc-solutions__conclusion-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.bnc-solutions__conclusion-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-pill);
  background: var(--color-bg-surface);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}
.bnc-solutions__conclusion-chip--rec {
  border-color: color-mix(in srgb, var(--color-status-success) 40%, transparent);
  background: color-mix(in srgb, var(--color-status-success) 10%, var(--color-bg-surface));
  color: var(--color-status-success);
}

.bnc-solutions__conclusion-chip--warn {
  border-color: color-mix(in srgb, var(--color-status-warning) 45%, transparent);
  background: color-mix(in srgb, var(--color-status-warning) 12%, var(--color-bg-surface));
  color: var(--color-status-warning);
}

.bnc-solutions__conclusion-chip--danger {
  border-color: color-mix(in srgb, var(--color-status-danger) 38%, transparent);
  background: color-mix(in srgb, var(--color-status-danger) 9%, var(--color-bg-surface));
  color: var(--color-status-danger);
}

.bnc-solutions__card-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border-default);
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.bnc-solutions__card-label--base {
  font-size: var(--font-size-xs);
  letter-spacing: 0;
}

.bnc-solutions__card-label--sel {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

/* ── 지표 행 ───────────────────────────────────────── */
.bnc-solutions__metrics {
  list-style: none;
  margin: 0;
  padding: var(--space-1) var(--space-3) var(--space-2);
  border-top: 1px solid var(--color-border-subtle);
  border-bottom: 1px solid var(--color-border-subtle);
  display: grid;
  gap: 1px;
}

.bnc-solutions__metric-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding: var(--space-1) 0;
}

.bnc-solutions__metric-name {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  flex-shrink: 0;
}

.bnc-solutions__metric-result {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: var(--space-1);
  min-width: 0;
  flex: 1 1 140px;
  flex-wrap: wrap;
  text-align: right;
}

.bnc-solutions__metric-val {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-align: right;
  overflow-wrap: anywhere;
}

.bnc-solutions__metrics-head {
  margin-bottom: 2px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__metric-delta {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-fg-strong);
  overflow-wrap: anywhere;
}
.bnc-solutions__metric-delta--good {
  color: var(--color-status-success);
}
.bnc-solutions__metric-delta--bad {
  color: var(--color-status-danger);
}
.bnc-solutions__metric-delta--flat {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: 400;
}

/* ── 베이스라인 경고 ───────────────────────────────────────── */
.bnc-solutions__card-warn {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  color: var(--color-status-warning);
  font-size: var(--font-size-xs);
}

.bnc-solutions__card-warn p {
  margin: 0;
  line-height: 1.4;
}

/* ── 반응형 ───────────────────────────────────────── */
@media (max-width: 900px) {
  .bnc-solutions__metrics--baseline,
  .bnc-solutions__detail-grid,
  .bnc-solutions__review-grid,
  .bnc-solutions__compare-decision dl,
  .bnc-solutions__decision-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 580px) {
  .bnc-solutions__metrics--baseline,
  .bnc-solutions__selected-detail-hd,
  .bnc-solutions__detail-grid,
  .bnc-solutions__detail-bottom-grid,
  .bnc-solutions__detail-facts,
  .bnc-solutions__runbook-grid,
  .bnc-solutions__review-grid,
  .bnc-solutions__compare-decision dl,
  .bnc-solutions__decision-grid {
    grid-template-columns: 1fr;
  }

  .bnc-solutions__selected-score {
    text-align: left;
  }

  .bnc-solutions__detail-card--wide {
    grid-column: auto;
  }
}

/* ── 카드 근거 뱃지 ───────────────────────────────────── */
.bnc-solutions__card-evidence-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border-subtle);
}
</style>

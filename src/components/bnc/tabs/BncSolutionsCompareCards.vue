<script setup lang="ts">
import type { BncActionPlan, BncBaselineSnapshotItem, BncRagEvidence } from '@/types/bnc';

import BaseBadge from '@/components/base/BaseBadge.vue';
import {
  cardMainChange,
  deltaArrow,
  isFlatDelta,
  isImprovement,
  isNeutralImpact,
  kpiCardMetrics,
  planDisplayLabel,
  planLabel,
  showMetricAfter,
  targetGroupCount,
} from '@/components/bnc/bncCardMetrics';
import {
  evidenceStrengthLabel,
  evidenceStrengthVariant,
  riskLevelLabel,
  riskLevelVariant,
} from '@/components/bnc/bncRagHelpers';

interface PlanBadge {
  label: string;
  tone: 'success' | 'info' | 'warning';
}

defineProps<{
  plans: BncActionPlan[];
  selectedOptionId: string;
  isCurrentOptionSelected: boolean;
  currentOptionMetrics: BncBaselineSnapshotItem[];
  baselineTargetToolGroups: string[];
  ragEvidence: BncRagEvidence | null | undefined;
  planBadges: Record<string, PlanBadge>;
}>();

defineEmits<{
  selectCurrentOption: [];
  selectPlan: [planId: string];
}>();
</script>

<template>
  <section class="bnc-solutions__compare">
    <div class="bnc-solutions__compare-hd">
      <h3>대응안 비교</h3>
      <p>후보별 핵심 변경과 KPI 방향을 먼저 비교합니다.</p>
    </div>

    <div class="bnc-solutions__cards">
      <button
        type="button"
        class="bnc-solutions__card bnc-solutions__card--current"
        :class="{ 'bnc-solutions__card--selected': isCurrentOptionSelected }"
        @click="$emit('selectCurrentOption')"
      >
        <div class="bnc-solutions__card-hd">
          <div class="bnc-solutions__card-hd-main">
            <span
              class="bnc-solutions__card-label bnc-solutions__card-label--base"
              :class="{ 'bnc-solutions__card-label--sel': isCurrentOptionSelected }"
              >현재</span
            >
            <span class="bnc-solutions__card-title">현재 유지</span>
          </div>
          <div class="bnc-solutions__card-badges">
            <span class="bnc-solutions__neutral-badge">비교 기준</span>
          </div>
        </div>

        <ul v-if="currentOptionMetrics.length" class="bnc-solutions__metrics">
          <li class="bnc-solutions__metrics-head">현재 기준</li>
          <li v-for="m in currentOptionMetrics" :key="m.label" class="bnc-solutions__metric-row">
            <span class="bnc-solutions__metric-name">{{ m.label }}</span>
            <span class="bnc-solutions__metric-result">
              <span class="bnc-solutions__metric-val">{{ m.value }}</span>
              <span v-if="m.caption" class="bnc-solutions__metric-delta bnc-solutions__metric-delta--flat">{{
                m.caption
              }}</span>
            </span>
          </li>
        </ul>

        <div class="bnc-solutions__card-body">
          <p class="bnc-solutions__card-change">
            추가 dispatch 변경 없이 현재 운영 조건을 유지하는 기준 시나리오입니다.
          </p>
          <p v-if="baselineTargetToolGroups.length" class="bnc-solutions__card-target">
            대상 Tool Group {{ baselineTargetToolGroups.length.toLocaleString('ko-KR') }}개
          </p>
        </div>

        <div class="bnc-solutions__card-foot">
          <span v-if="isCurrentOptionSelected" class="bnc-solutions__card-selected-mark">✓ 선택됨</span>
          <span v-else class="bnc-solutions__card-hint">클릭하여 기준 확인</span>
        </div>
      </button>

      <!-- 대응안 카드 A / B / C -->
      <button
        v-for="(plan, i) in plans"
        :key="plan.planId"
        type="button"
        class="bnc-solutions__card bnc-solutions__card--plan"
        :class="[
          {
            'bnc-solutions__card--selected': plan.planId === selectedOptionId,
            'bnc-solutions__card--recommended': plan.recommended,
          },
          plan.recommended ? `bnc-solutions__card--recommended-${planBadges[plan.planId]?.tone}` : '',
        ]"
        @click="$emit('selectPlan', plan.planId)"
      >
        <div class="bnc-solutions__card-hd">
          <div class="bnc-solutions__card-hd-main">
            <span
              class="bnc-solutions__card-label"
              :class="{ 'bnc-solutions__card-label--sel': plan.planId === selectedOptionId }"
              >{{ planLabel(i) }}</span
            >
            <div class="bnc-solutions__card-title-block">
              <span class="bnc-solutions__card-title">{{ plan.actionKind ?? plan.title }}</span>
              <span v-if="planDisplayLabel(plan, i) !== planLabel(i)" class="bnc-solutions__card-variant">{{
                planDisplayLabel(plan, i)
              }}</span>
            </div>
          </div>
          <div class="bnc-solutions__card-badges">
            <span v-if="isNeutralImpact(plan)" class="bnc-solutions__neutral-badge">KPI 변화 없음</span>
          </div>
        </div>

        <ul class="bnc-solutions__metrics">
          <li class="bnc-solutions__metrics-head">기준선 대비 변화</li>
          <li v-for="m in kpiCardMetrics(plan)" :key="m.label" class="bnc-solutions__metric-row">
            <span class="bnc-solutions__metric-name">{{ m.label }}</span>
            <span class="bnc-solutions__metric-result">
              <span v-if="showMetricAfter(m)" class="bnc-solutions__metric-val">{{ m.after }}</span>
              <span v-if="isFlatDelta(m.delta)" class="bnc-solutions__metric-delta bnc-solutions__metric-delta--flat">
                변동 없음
              </span>
              <span
                v-else
                class="bnc-solutions__metric-delta"
                :class="{
                  'bnc-solutions__metric-delta--good': isImprovement(m.label, m.delta) === true,
                  'bnc-solutions__metric-delta--bad': isImprovement(m.label, m.delta) === false,
                }"
                >{{ deltaArrow(m.delta) }} {{ m.delta }}</span
              >
            </span>
          </li>
        </ul>

        <div class="bnc-solutions__card-body">
          <p class="bnc-solutions__card-change">{{ cardMainChange(plan) }}</p>
          <p v-if="targetGroupCount(plan)" class="bnc-solutions__card-target">
            대상 Tool Group {{ targetGroupCount(plan).toLocaleString('ko-KR') }}개
          </p>
        </div>

        <span
          v-if="plan.recommended"
          class="bnc-solutions__rec-flag"
          :class="`bnc-solutions__rec-flag--${planBadges[plan.planId]?.tone}`"
        >
          {{ planBadges[plan.planId]?.label }}
        </span>

        <!-- RAG 근거 뱃지 -->
        <div v-if="ragEvidence?.perPlan?.[plan.planId]" class="bnc-solutions__card-evidence-badges">
          <BaseBadge :variant="evidenceStrengthVariant(ragEvidence.perPlan[plan.planId].evidenceStrength)">
            {{ evidenceStrengthLabel(ragEvidence.perPlan[plan.planId].evidenceStrength) }}
          </BaseBadge>
          <BaseBadge :variant="riskLevelVariant(ragEvidence.perPlan[plan.planId].riskLevel)">
            {{ riskLevelLabel(ragEvidence.perPlan[plan.planId].riskLevel) }}
          </BaseBadge>
        </div>

        <div class="bnc-solutions__card-foot">
          <span v-if="plan.planId === selectedOptionId" class="bnc-solutions__card-selected-mark">✓ 선택됨</span>
          <span v-else class="bnc-solutions__card-hint">클릭하여 선택</span>
        </div>
      </button>
    </div>
  </section>
</template>

<style scoped>
.bnc-solutions__compare {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.bnc-solutions__compare-hd {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
  min-width: 0;
}

.bnc-solutions__compare-hd h3 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.bnc-solutions__compare-hd p {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
  text-align: right;
  word-break: keep-all;
}

.bnc-solutions__cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
  align-items: stretch; /* 같은 행 카드 높이 통일 */
}

.bnc-solutions__card {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 0;
  min-width: 0;
  border-radius: var(--radius-lg);
  overflow: visible;
  font: inherit;
  text-align: left;
}

.bnc-solutions__card--current {
  position: relative;
  grid-template-rows: auto auto 1fr auto;
  border: 1.5px solid color-mix(in srgb, var(--color-status-warning) 30%, var(--color-border-default));
  background: color-mix(in srgb, var(--color-status-warning) 5%, var(--color-bg-card));
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-fast);
}
.bnc-solutions__card--current:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--color-status-warning) 56%, var(--color-border-default));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-status-warning) 16%, transparent);
}

.bnc-solutions__card--plan {
  position: relative;
  grid-template-rows: auto auto 1fr auto; /* hd · KPI · 본문(가변) · foot */
  border: 1.5px solid var(--color-border-default);
  background: var(--color-bg-card);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-fast);
}
.bnc-solutions__card--plan:hover:not(:disabled) {
  border-color: var(--color-action-primary-border);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-action-primary) 12%, transparent);
}
.bnc-solutions__card--plan:disabled {
  cursor: default;
}

.bnc-solutions__card--recommended {
  border-color: color-mix(in srgb, var(--color-status-success) 45%, var(--color-border-default));
  background: color-mix(in srgb, var(--color-status-success) 4%, var(--color-bg-card));
}

.bnc-solutions__card--recommended-success {
  border-color: color-mix(in srgb, var(--color-status-success) 45%, var(--color-border-default));
  background: color-mix(in srgb, var(--color-status-success) 4%, var(--color-bg-card));
}

.bnc-solutions__card--recommended-info {
  border-color: color-mix(in srgb, #2563eb 48%, var(--color-border-default));
  border-top-color: #2563eb;
  background: color-mix(in srgb, #2563eb 5%, var(--color-bg-card));
}

.bnc-solutions__card--recommended-warning {
  border-color: color-mix(in srgb, var(--color-status-warning) 48%, var(--color-border-default));
  border-top-color: var(--color-status-warning);
  background: color-mix(in srgb, var(--color-status-warning) 6%, var(--color-bg-card));
}

.bnc-solutions__rec-flag {
  position: absolute;
  top: calc(-1 * var(--space-2));
  right: var(--space-3);
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--color-status-success);
  color: #fff;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.01em;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-status-success) 38%, transparent);
}

.bnc-solutions__rec-flag--success {
  background: var(--color-status-success);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-status-success) 38%, transparent);
}

.bnc-solutions__rec-flag--info {
  background: #2563eb;
  box-shadow: 0 2px 8px #1d4ed840;
}

.bnc-solutions__rec-flag--warning {
  background: var(--color-status-warning);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-status-warning) 36%, transparent);
}

.bnc-solutions__card--selected {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow:
    0 0 0 2px #2563eb,
    0 10px 24px #1d4ed81f;
}

.bnc-solutions__card-hd {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding: var(--space-3) var(--space-3) var(--space-2);
  min-height: auto;
  box-sizing: border-box;
}

.bnc-solutions__card-hd-main {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  flex: 1 1 150px;
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

.bnc-solutions__card-title-block {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.bnc-solutions__card-title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.3;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.bnc-solutions__card-variant {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.bnc-solutions__card-badges {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--space-1);
  flex: 0 1 120px;
  max-width: 100%;
}

.bnc-solutions__neutral-badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-pill);
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

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

.bnc-solutions__card-body {
  padding: var(--space-3);
  display: grid;
  gap: var(--space-3);
}

.bnc-solutions__card-change {
  min-height: 44px;
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.55;
  overflow-wrap: anywhere;
  word-break: keep-all;
}

.bnc-solutions__card-target {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__card-evidence-badges {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border-subtle);
}

.bnc-solutions__card-foot {
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border-subtle);
  min-height: 32px;
  display: flex;
  align-items: center;
}

.bnc-solutions__card-selected-mark {
  color: #1d4ed8;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__card-hint {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.bnc-solutions__card--plan:hover .bnc-solutions__card-hint,
.bnc-solutions__card--current:hover .bnc-solutions__card-hint {
  opacity: 1;
}

/* ── 반응형 ───────────────────────────────────────── */
@media (max-width: 900px) {
  .bnc-solutions__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .bnc-solutions__compare-hd {
    align-items: flex-start;
    flex-direction: column;
  }

  .bnc-solutions__compare-hd p {
    text-align: left;
  }
}

@media (max-width: 580px) {
  .bnc-solutions__cards {
    grid-template-columns: 1fr;
  }
}
</style>

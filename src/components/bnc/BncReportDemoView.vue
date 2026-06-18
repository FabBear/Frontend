<script setup lang="ts">
import { computed } from 'vue';

import type { BncActionPlansPayload, BncCauseAnalysis } from '@/types/bnc';
import type { ReportV1 } from '@/types/report';

import BncCauseTab from '@/components/bnc/tabs/BncCauseTab.vue';
import BncSolutionsKpiCharts from '@/components/bnc/tabs/BncSolutionsKpiCharts.vue';
import BncSolutionsRagInsightSummary from '@/components/bnc/tabs/BncSolutionsRagInsightSummary.vue';
import ReportV1ApprovedActionSection from '@/components/report/reportV1/ReportV1ApprovedActionSection.vue';
import ReportV1EffectSection from '@/components/report/reportV1/ReportV1EffectSection.vue';
import ReportV1SummaryHeader from '@/components/report/reportV1/ReportV1SummaryHeader.vue';
import '@/components/report/reportV1/reportV1.css';

import type { ReportV1TgForecastRow } from '@/utils/reportV1DisplayAdapter';
import { buildReportV1DisplayModel } from '@/utils/reportV1DisplayAdapter';

const PLAN_ORDER: Record<string, number> = { conservative: 0, standard: 1, aggressive: 2 };

const props = defineProps<{
  report: ReportV1;
  causeAnalysis: BncCauseAnalysis;
  actionPlans: BncActionPlansPayload;
  caseId?: string | null;
}>();

const display = computed(() => buildReportV1DisplayModel(props.report));
const visibleWarnings = computed(() => (props.report.data_quality.warnings ?? []).slice(0, 3));
const approvedCandidate = computed(() => display.value.approvedCandidate);
const approvedLabel = computed(
  () =>
    approvedCandidate.value?.label ?? props.report.actions.approved_label ?? props.report.approval.selected_label ?? '-'
);
const approvedForecastGroups = computed(() => {
  const groups = new Map<string, ReportV1TgForecastRow[]>();
  display.value.approvedForecastRows.forEach((row) => {
    const existing = groups.get(row.toolgroup) ?? [];
    existing.push(row);
    groups.set(row.toolgroup, existing);
  });
  return [...groups.entries()].map(([toolgroup, rows]) => ({ toolgroup, rows }));
});

const sortedPlans = computed(() =>
  [...(props.actionPlans.plans ?? [])].sort((a, b) => {
    const oa = PLAN_ORDER[a.actionLabel ?? ''] ?? 99;
    const ob = PLAN_ORDER[b.actionLabel ?? ''] ?? 99;
    return oa - ob;
  })
);

const currentOptionMetrics = computed(() =>
  props.actionPlans.currentOption?.metrics?.length
    ? props.actionPlans.currentOption.metrics
    : (sortedPlans.value[0]?.metrics?.map((m) => ({
        label: m.label,
        value: m.before,
        caption: '현재 기준',
      })) ?? [])
);
</script>

<template>
  <article class="rpt-demo report-v1__surface">
    <!-- 요약 헤더 -->
    <ReportV1SummaryHeader
      :report="report"
      :selected-kpis="display.selectedKpis"
      :approved-label="approvedLabel"
      :visible-warnings="visibleWarnings"
    />

    <!-- 원인 분석 -->
    <div class="rpt-demo__block rpt-demo__cause">
      <BncCauseTab :analysis="causeAnalysis" :case-id="caseId" />
    </div>

    <!-- 대응안 KPI 비교 -->
    <div class="rpt-demo__block rpt-demo__actions">
      <BncSolutionsKpiCharts :plans="sortedPlans" :current-option-metrics="currentOptionMetrics" />
      <BncSolutionsRagInsightSummary :plans="sortedPlans" :rag-evidence="actionPlans.ragEvidence ?? null" />
    </div>

    <!-- 승인된 대응안 (기존 유지) -->
    <ReportV1ApprovedActionSection
      :report="report"
      :approved-label="approvedLabel"
      :approved-candidate="approvedCandidate"
    />

    <!-- 미적용시/적용시 실제 효과 (기존 유지) -->
    <ReportV1EffectSection
      v-if="display.noActionMetrics.length || approvedCandidate || approvedForecastGroups.length"
      :no-action-metrics="display.noActionMetrics"
      :no-action-horizon-min="report.if_no_action.horizon_min"
      :no-action-will-get-worse="report.if_no_action.will_get_worse"
      :approved-candidate="approvedCandidate"
      :forecast-groups="approvedForecastGroups"
    />
  </article>
</template>

<style scoped>
.rpt-demo {
  gap: 0;
}

.rpt-demo__block {
  border-top: 2px solid var(--color-border-subtle);
}

/* 원인 분석: 위험 빨강 → 보고서 인디고 */
.rpt-demo__cause :deep(.bnc-cause__card-label) {
  color: #4338ca;
}
.rpt-demo__cause :deep(.bnc-cause__verdict) {
  border-color: color-mix(in srgb, #4338ca 24%, var(--color-border-subtle));
}
.rpt-demo__cause :deep(.bnc-cause__judgment) {
  border-color: color-mix(in srgb, #4338ca 24%, var(--color-border-subtle));
}
.rpt-demo__cause :deep(.bnc-cause__verdict-dot) {
  background: #4338ca;
}
.rpt-demo__cause :deep(.bnc-cause__cat-bar--top) {
  background: #4338ca;
}
.rpt-demo__cause :deep(.bnc-cause__cat-row--top) {
  border-color: color-mix(in srgb, #4338ca 30%, var(--color-border-subtle));
  background: color-mix(in srgb, #4338ca 5%, var(--color-bg-page));
}
.rpt-demo__cause :deep(.bnc-cause__chip--link) {
  color: #4338ca;
  border-color: color-mix(in srgb, #4338ca 38%, var(--color-border-subtle));
  background: color-mix(in srgb, #4338ca 6%, var(--color-bg-card));
}
.rpt-demo__cause :deep(.bnc-cause__chip--link:hover) {
  background: color-mix(in srgb, #4338ca 14%, var(--color-bg-card));
}

/* 대응안 비교 블록 래퍼 */
.rpt-demo__actions {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--color-bg-surface);
}
</style>

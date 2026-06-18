<script setup lang="ts">
import { computed } from 'vue';

import { MOCK_BNC_ACTION_PLANS } from '@/constants/mockData/bncArtifacts';
import { shouldUseDemoMockData } from '@/constants/mockMode';

import type { BncActionPlan, BncActionPlanMetric, BncActionSpecGroup, BncBaselineSnapshotItem } from '@/types/bnc';
import type { ReportV1, ReportV1ActionCandidate, ReportV1KpiImpact } from '@/types/report';

import BncSolutionsCompareCards from '@/components/bnc/tabs/BncSolutionsCompareCards.vue';
import BncSolutionsKpiCharts from '@/components/bnc/tabs/BncSolutionsKpiCharts.vue';
import BncSolutionsRagInsightSummary from '@/components/bnc/tabs/BncSolutionsRagInsightSummary.vue';

const props = defineProps<{
  report: ReportV1;
  caseId?: string | null;
}>();

// ─── KPI 표기 헬퍼 ───────────────────────────────────────────────────────────

const KPI_LABELS: Record<string, string> = {
  q_time_min: '평균 대기시간',
  wip: 'WIP',
  wait_ratio: '대기율',
  utilization_avg: '평균 가동률',
  available_tool_ratio: '가용 Tool 비율',
};

function kpiLabel(kpi: string): string {
  return KPI_LABELS[kpi] ?? kpi.replaceAll('_', ' ');
}

function formatKpiVal(kpi: string, value: number): string {
  if (kpi.includes('util') || kpi === 'available_tool_ratio') {
    return `${(value <= 1 ? value * 100 : value).toFixed(1)}%`;
  }
  if (kpi === 'wip') return `${Math.round(value).toLocaleString('ko-KR')} Lot`;
  if (kpi.includes('q_time')) return `${value.toFixed(1)}분`;
  if (kpi.includes('wait_ratio')) return value.toFixed(2);
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}

function verdictToTone(token: string): 'positive' | 'negative' | 'neutral' {
  if (token.includes('improv') || token.includes('modest') || token === 'good') return 'positive';
  if (token.includes('wors') || token.includes('degrad') || token === 'bad') return 'negative';
  return 'neutral';
}

// ─── 변환: ReportV1KpiImpact → BncActionPlanMetric ───────────────────────────

function impactToMetric(impact: ReportV1KpiImpact): BncActionPlanMetric {
  return {
    label: kpiLabel(impact.kpi),
    before: formatKpiVal(impact.kpi, impact.now),
    after: formatKpiVal(impact.kpi, impact.after),
    delta: `${impact.delta >= 0 ? '+' : ''}${impact.delta.toFixed(2)}`,
    pctDelta: impact.pct_change,
    tone: verdictToTone(impact.verdict_token ?? impact.verdict ?? ''),
  };
}

// ─── 변환: ReportV1KpiImpact → BncBaselineSnapshotItem (무대응 칸) ─────────

function impactToBaselineItem(impact: ReportV1KpiImpact): BncBaselineSnapshotItem {
  return {
    label: kpiLabel(impact.kpi),
    value: formatKpiVal(impact.kpi, impact.now),
    pctDelta: impact.pct_change,
    tone: verdictToTone(impact.verdict_token ?? impact.verdict ?? ''),
  };
}

// ─── params → lotGroups 변환 ──────────────────────────────────────────────────

function buildLotGroups(params: Record<string, unknown>): BncActionSpecGroup[] | undefined {
  const groups: BncActionSpecGroup[] = [];

  const hotLots = params.super_hot_lot_products as string[] | undefined;
  if (hotLots?.length) {
    groups.push({
      zone: '위험구간',
      action: 'SuperHotLot (priority 30)',
      lots: hotLots.map((p) => ({ id: p, product: p, t2dueMin: 0 })),
    });
  }

  const priorityLots = params.priority_products as string[] | undefined;
  if (priorityLots?.length) {
    groups.push({
      zone: '경고하단',
      action: 'priority 20',
      lots: priorityLots.map((p) => ({ id: p, product: p, t2dueMin: 0 })),
    });
  }

  return groups.length ? groups : undefined;
}

// ─── 변환: ReportV1ActionCandidate → BncActionPlan ───────────────────────────

function candidateToActionPlan(candidate: ReportV1ActionCandidate): BncActionPlan {
  const params = candidate.params ?? {};
  const intervalPct =
    typeof params.release_interval_delta_pct === 'number' ? params.release_interval_delta_pct : undefined;
  const lotGroups = buildLotGroups(params);

  return {
    planId: candidate.label.toLowerCase(),
    actionLabel: candidate.label.toLowerCase(),
    actionKind: candidate.kind,
    title: candidate.label,
    summary: candidate.description,
    expectedImpact: '',
    riskText: candidate.tradeoffs?.join(' ') ?? '',
    confidence: candidate.simulation?.confidence ?? null,
    compositeScore: candidate.composite_score,
    recommended: candidate.is_approved,
    metrics: candidate.kpi_impact.map(impactToMetric),
    targetToolGroups: candidate.target_toolgroups,
    tradeoffs: candidate.tradeoffs,
    actionMetadata: {
      effort: candidate.operational?.effort ?? null,
      scope: candidate.operational?.scope ?? null,
      reversibility: candidate.operational?.reversibility ?? null,
    },
    actionSpec: {
      intervalPct,
      lotGroups,
      noLotAdjust: intervalPct !== undefined && !lotGroups?.length,
    },
    impactTone: candidate.kpi_impact.some((k) => verdictToTone(k.verdict_token ?? '') === 'positive')
      ? 'positive'
      : candidate.kpi_impact.some((k) => verdictToTone(k.verdict_token ?? '') === 'negative')
        ? 'negative'
        : 'neutral',
  };
}

// ─── Computed ─────────────────────────────────────────────────────────────────

const PLAN_ORDER: Record<string, number> = { conservative: 0, standard: 1, aggressive: 2 };

// mock mode일 때 pre-built plans 그대로 사용
const mockPayload = computed(() => {
  if (!shouldUseDemoMockData() || !props.caseId) return null;
  return MOCK_BNC_ACTION_PLANS[props.caseId] ?? null;
});

const nonBaselineCandidates = computed(() => props.report.actions.candidates.filter((c) => !c.is_baseline));

const baselineCandidate = computed<ReportV1ActionCandidate | null>(
  () => props.report.actions.candidates.find((c) => c.is_baseline) ?? null
);

const candidatePlans = computed<BncActionPlan[]>(() => {
  if (mockPayload.value) {
    return [...mockPayload.value.plans].sort((a, b) => {
      const ka = PLAN_ORDER[a.actionLabel ?? ''] ?? 99;
      const kb = PLAN_ORDER[b.actionLabel ?? ''] ?? 99;
      return ka - kb;
    });
  }
  return [...nonBaselineCandidates.value]
    .sort((a, b) => {
      const ka = PLAN_ORDER[a.label.toLowerCase()] ?? 99;
      const kb = PLAN_ORDER[b.label.toLowerCase()] ?? 99;
      return ka - kb;
    })
    .map(candidateToActionPlan);
});

const currentOptionMetrics = computed<BncBaselineSnapshotItem[]>(() => {
  if (mockPayload.value) {
    return mockPayload.value.currentOption?.metrics ?? mockPayload.value.baselineSnapshot ?? [];
  }
  if (baselineCandidate.value) {
    return baselineCandidate.value.kpi_impact.map(impactToBaselineItem);
  }
  return props.report.if_no_action.kpi_changes.map((k) => ({
    label: kpiLabel(k.kpi),
    value: formatKpiVal(k.kpi, k.now),
    pctDelta: k.pct_change,
    tone: (k.delta > 0 ? 'negative' : k.delta < 0 ? 'positive' : 'neutral') as 'positive' | 'negative' | 'neutral',
  }));
});

const approvedCandidate = computed(() => nonBaselineCandidates.value.find((c) => c.is_approved) ?? null);

const selectedOptionId = computed(() => {
  if (mockPayload.value) {
    return mockPayload.value.plans.find((p) => p.recommended)?.planId ?? 'current-baseline';
  }
  return approvedCandidate.value?.label.toLowerCase() ?? 'current-baseline';
});

const planBadges = computed<Record<string, { label: string; tone: 'success' | 'info' | 'warning' }>>(() => {
  const badges: Record<string, { label: string; tone: 'success' | 'info' | 'warning' }> = {};
  candidatePlans.value.forEach((plan) => {
    const tone = plan.impactTone === 'positive' ? 'success' : plan.impactTone === 'negative' ? 'warning' : 'info';
    badges[plan.planId] = { label: plan.actionLabel ?? plan.title, tone };
  });
  return badges;
});

const baselineTargetToolGroups = computed(() => (props.report.meta.toolgroup ? [props.report.meta.toolgroup] : []));
</script>

<template>
  <section class="report-v1__panel">
    <div class="report-v1__panel-head">
      <h3>대응안 비교</h3>
    </div>

    <!-- 후보 카드 그리드 -->
    <BncSolutionsCompareCards
      :plans="candidatePlans"
      :selected-option-id="selectedOptionId"
      :is-current-option-selected="false"
      :current-option-metrics="currentOptionMetrics"
      :baseline-target-tool-groups="baselineTargetToolGroups"
      :rag-evidence="report.rag_evidence ? (report.rag_evidence as never) : null"
      :plan-badges="planBadges"
      @select-current-option="() => {}"
      @select-plan="() => {}"
    />

    <!-- KPI 영향 비교 차트 -->
    <BncSolutionsKpiCharts
      v-if="candidatePlans.length"
      :plans="candidatePlans"
      :current-option-metrics="currentOptionMetrics"
    />

    <!-- 사례 기반 근거 (RAG 요약) -->
    <BncSolutionsRagInsightSummary :plans="candidatePlans" :rag-evidence="null" />
  </section>
</template>

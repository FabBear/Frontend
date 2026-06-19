<script setup lang="ts">
import { computed } from 'vue';

import { MOCK_BNC_ACTION_PLANS } from '@/constants/mockData/bncArtifacts';
import { shouldUsePresentationScenario } from '@/constants/scenarioMode';

import type { BncActionPlan, BncActionPlanMetric, BncActionSpecGroup, BncBaselineSnapshotItem } from '@/types/bnc';
import type { ReportV1, ReportV1ActionCandidate, ReportV1KpiImpact } from '@/types/report';

import BncSolutionsCompareCards from '@/components/bnc/tabs/BncSolutionsCompareCards.vue';
import BncSolutionsKpiCharts from '@/components/bnc/tabs/BncSolutionsKpiCharts.vue';
import BncSolutionsRagInsightSummary from '@/components/bnc/tabs/BncSolutionsRagInsightSummary.vue';

const props = defineProps<{
  report: ReportV1;
  caseId?: string | null;
}>();

type CandidateParams = Record<string, unknown> & {
  release_interval?: {
    current?: number | null;
    target?: number | null;
    delta?: number | null;
    unit?: string | null;
  } | null;
  release_interval_delta_pct?: number;
  release_interval_delta_min?: number;
  superhotlot_enable?: boolean;
  lot_priority_rule?: string | null;
  super_hot_lot_products?: string[];
  priority_products?: string[];
  lot_adjustments?: unknown[];
};

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

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function lotZoneLabel(zone: string, actionKind: string): string {
  if (zone === 'danger' || actionKind === 'SET_SUPER_HOT') return '위험구간';
  if (zone === 'warn_upper') return '경고상단';
  if (zone === 'warn_lower') return '경고하단';
  return '우선순위 조정';
}

function lotActionLabel(actionKind: string, priority: number | undefined): string {
  if (actionKind === 'SET_SUPER_HOT') return `SuperHotLot (priority ${priority ?? 30})`;
  return `priority ${priority ?? 20}`;
}

function buildLotGroupsFromAdjustments(value: unknown): BncActionSpecGroup[] {
  if (!Array.isArray(value)) return [];

  const groups = new Map<string, BncActionSpecGroup>();
  value.forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const row = item as Record<string, unknown>;
    const actionKind = stringValue(row.action_kind ?? row.actionKind);
    const zone = stringValue(row.zone);
    const priority = finiteNumber(row.priority);
    const zoneLabel = lotZoneLabel(zone, actionKind);
    const action = lotActionLabel(actionKind, priority);
    const key = `${zoneLabel}:${action}`;
    const lotPlanId = finiteNumber(row.lot_plan_id ?? row.lotPlanId);
    const lotType = stringValue(row.lot_type ?? row.lotType);
    const product = stringValue(row.product_name ?? row.productName) || lotType || '-';
    const id = lotType || (lotPlanId !== undefined ? `LotPlan-${lotPlanId}` : `${product}-${index + 1}`);
    const group = groups.get(key) ?? { zone: zoneLabel, action, lots: [] };
    group.lots.push({
      id,
      product,
      t2dueMin: finiteNumber(row.time_to_due ?? row.timeToDue ?? row.t2dueMin) ?? 0,
    });
    groups.set(key, group);
  });

  return Array.from(groups.values());
}

function buildLotGroups(params: CandidateParams): BncActionSpecGroup[] | undefined {
  const groups: BncActionSpecGroup[] = buildLotGroupsFromAdjustments(params.lot_adjustments);
  if (groups.length) return groups;

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

  if (!groups.length && params.superhotlot_enable) {
    groups.push({
      zone: '위험 Lot',
      action: 'SuperHotLot',
      lots: [],
    });
  } else if (!groups.length && params.lot_priority_rule) {
    groups.push({
      zone: '우선순위 조정',
      action: params.lot_priority_rule,
      lots: [],
    });
  }

  return groups.length ? groups : undefined;
}

function intervalDeltaMin(params: CandidateParams): number | undefined {
  if (typeof params.release_interval_delta_min === 'number') return params.release_interval_delta_min;
  const delta = params.release_interval?.delta;
  return typeof delta === 'number' ? delta : undefined;
}

function intervalText(params: CandidateParams): string | undefined {
  if (typeof params.release_interval_delta_pct === 'number') return `+${params.release_interval_delta_pct.toFixed(1)}%`;
  const delta = intervalDeltaMin(params);
  if (delta !== undefined) return `+${delta.toFixed(1)}분`;
  return undefined;
}

// ─── 변환: ReportV1ActionCandidate → BncActionPlan ───────────────────────────

function candidateToActionPlan(candidate: ReportV1ActionCandidate): BncActionPlan {
  const params = (candidate.params ?? {}) as CandidateParams;
  const intervalPct =
    typeof params.release_interval_delta_pct === 'number' ? params.release_interval_delta_pct : undefined;
  const intervalDelta = intervalDeltaMin(params);
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
      intervalDeltaMin: intervalDelta,
      intervalText: intervalText(params),
      lotGroups,
      noLotAdjust: (intervalPct !== undefined || intervalDelta !== undefined) && !lotGroups?.length,
      noLotReason: !lotGroups?.length ? '우선순위 변경 없음' : undefined,
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

// 발표 시나리오일 때 pre-built plans 그대로 사용
const previewPayload = computed(() => {
  if (!shouldUsePresentationScenario() || !props.caseId) return null;
  return MOCK_BNC_ACTION_PLANS[props.caseId] ?? null;
});

const nonBaselineCandidates = computed(() => props.report.actions.candidates.filter((c) => !c.is_baseline));

const baselineCandidate = computed<ReportV1ActionCandidate | null>(
  () => props.report.actions.candidates.find((c) => c.is_baseline) ?? null
);

const candidatePlans = computed<BncActionPlan[]>(() => {
  if (previewPayload.value) {
    return [...previewPayload.value.plans].sort((a, b) => {
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
  if (previewPayload.value) {
    return previewPayload.value.currentOption?.metrics ?? previewPayload.value.baselineSnapshot ?? [];
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
  if (previewPayload.value) {
    return previewPayload.value.plans.find((p) => p.recommended)?.planId ?? 'current-baseline';
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

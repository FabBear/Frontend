import api from '@/services/api';
import {
  actionLabelFromIndex,
  addNullable,
  extractActionLabel,
  featureLabel,
  formatCompareParamLine,
  formatCompareV2Delta,
  formatCompareV2Value,
  formatDecisionStatus,
  formatDelta,
  formatMetricValue,
  formatNeutralDelta,
  formatNumber,
  formatReversibility,
  formatScope,
  normalizeActionLabelRecord,
  toNumber,
} from '@/services/bncFormatters';

import { MOCK_BNC_REPORTS } from '@/constants/mockData/bncArtifacts';
import { MOCK_ARCHIVE_REPORTS } from '@/constants/mockData/ragCaseReports';
import { MOCK_ACTION_HISTORY_REPORTS } from '@/constants/mockData/report';
import { shouldUseDemoMockData } from '@/constants/mockMode';

import type {
  BncActionPlanBaseline,
  BncActionPlanMetric,
  BncActionPlansPayload,
  BncCaseDetail,
  BncCaseListData,
  BncCauseAnalysis,
  BncReportPayload,
  BncReportTimelineItem,
} from '@/types/bnc';
import type { ReportV1 } from '@/types/report';

export interface FetchBncCasesParams {
  status?: string | null;
  riskGrade?: string | null;
  page?: number;
  size?: number;
}

interface BackendCauseAnalysis {
  caseId: string;
  analysisId: string;
  predictionSummary: BncCauseAnalysis['predictionSummary'];
  diffusion: BncCauseAnalysis['diffusion'];
  causeSummary: BncCauseAnalysis['causeSummary'];
  shapFeatures: Array<{
    feature: string;
    importance: number | null;
    rank: number | null;
    kpiValue: number | null;
    contributionPct: number | null;
  }>;
  ragSimilarCases: BncCauseAnalysis['ragSimilarCases'];
  modelPerformance: BncCauseAnalysis['modelPerformance'];
  // compare_json.cause 기반 확장 필드 (있을 수도, 없을 수도 있음)
  judgment: BncCauseAnalysis['judgment'] | null;
  causeCategories: BncCauseAnalysis['causeCategories'] | null;
  upstreamSuspects: string[] | null;
  simForecast: BncCauseAnalysis['simForecast'] | null;
  gStar: BncCauseAnalysis['gStar'] | null;
  createdAt: string;
}

interface BackendActionPlan {
  planId: string;
  planSeq: number;
  planTitle: string | null;
  planType: string | null;
  planDetail: string | null;
  simulationBasis: string | null;
  estThroughputDelta: number | null;
  estAvgWaitDelta: number | null;
  estDeliveryComplianceDelta: number | null;
  estDelayDelta: number | null;
}

interface BackendActionPlansPayload {
  caseId: string;
  baseline: Partial<Record<keyof BncActionPlanBaseline, number | null>> | null;
  plans: BackendActionPlan[];
  hitlStatus: {
    hasDecision: boolean;
    latestDecision: {
      decision: 'APPROVED' | 'REJECTED';
      selectedPlanId: string | null;
    } | null;
  };
}

interface BackendCompareActionEffect {
  label: string;
  action_kind: string;
  description: string;
  simulation_confidence: number;
  kpi_delta: {
    avg_queue_time_min: number;
    wip_count: number;
    throughput_delta: number;
  };
  composite_score: number;
  score_breakdown?: {
    kpi_contributions?: Record<
      string,
      {
        weight: number;
        mean_delta: number;
        verdict: string;
        contribution: number;
        confidence: number;
      }
    >;
  };
  action_metadata?: {
    effort?: number;
    scope?: string;
    reversibility?: string;
    description_ko?: string;
  };
  tradeoffs?: string[];
}

interface BackendCompareMonitoringKpi {
  kpi: string;
  target: string;
  check_after_min?: number;
}

interface BackendCompareAgentPayload {
  caseId?: string;
  process_name: string;
  severity: string;
  snapshot_time: number;
  action_effects: BackendCompareActionEffect[];
  recommendation: {
    action_label: string;
    action_kind: string;
    reason: string;
    structured?: {
      headline?: string;
      primary_reason?: string;
      tradeoffs?: string[];
      why_not_others?: Record<string, string>;
      caveats?: string[];
      confidence_level?: string;
      immediate_actions?: string[];
      monitoring_kpis?: Array<string | BackendCompareMonitoringKpi>;
      rollback_condition?: string;
    };
  };
  decision_info?: {
    decision_status: string;
    top_label: string;
    equivalent_set: string[];
    tiebreaker_used: string | null;
    decision_caveat: string;
  };
  approval_info?: {
    status: string;
    approved_by: string;
    approved_role: string;
    approved_at: string;
    comment: string;
    rejection_reason: string | null;
  };
}

interface BackendCompareV2KpiValue {
  value: number;
  unit: string;
}

interface BackendCompareV2Impact {
  now: number;
  after: number;
  delta: number;
  pct_change: number;
  verdict: string;
  confidence: number;
  ci_width: number;
}

interface BackendCompareV2Payload {
  meta: {
    schema_version: string;
    scenario_type: string;
    scenario_name: string;
    anchor_toolgroup: string;
    target_toolgroups: string[];
    severity: string;
    snapshot_time: number;
    t0: number;
    horizon_min: number;
    generated_at: string;
  };
  current_state: {
    kpi: Record<string, BackendCompareV2KpiValue>;
    natural_forecast_2h?: {
      gets_worse: boolean;
      label: string;
      kpi: Record<
        string,
        {
          now: number;
          after: number;
          delta: number;
          pct_change: number;
          reliability: string;
        }
      >;
    };
  };
  cause?: {
    summary?: string;
    upstream_suspects?: string[];
    consensus?: {
      confidence?: string;
      summary?: string;
    };
  };
  cascade?: {
    affected_toolgroups?: string[];
    ct_increase_min?: number;
    at_risk_lots?: number;
    capacity_stress_score?: number;
    impact_score?: number;
  };
  action_options: Array<{
    label: string;
    kind: string;
    description: string;
    target_toolgroups: string[];
    params: Record<string, unknown>;
    kpi_impact: Record<string, BackendCompareV2Impact>;
    operational: {
      effort?: number;
      scope?: string;
      reversibility?: string;
    };
    composite_score: number;
    simulation: {
      paired_n?: number;
      verdict?: string;
      paired_t_p?: number | null;
      simulation_confidence?: number;
    };
    is_recommended: boolean;
    recommendation_status?: string | null;
    badge?: string | null;
    is_baseline?: boolean;
    tradeoffs?: string[];
    outcome_if_kept?: string | null;
  }>;
  recommendation: {
    headline: string;
    primary_reason: string;
    why_recommended?: {
      selected_by?: string;
      tiebreaker_chain?: string[];
      explanation?: string;
    };
    tradeoffs?: string[];
    why_not_others?: Record<string, string>;
    caveats?: string[];
    confidence_level?: string;
    immediate_actions?: string[];
    monitoring_kpis?: Array<string | BackendCompareMonitoringKpi>;
    rollback_condition?: string;
    recommended_label: string;
    recommendation_status?: string;
  };
  decision_meta?: {
    decision_status: string;
    top_label: string;
    equivalent_set: string[];
    tiebreaker_used: string | null;
    tiebreaker_chain_evaluated?: Array<{
      step: string;
      values: Record<string, number | string>;
      result: string;
    }>;
    decision_caveat: string;
  };
  approval_info?: {
    status: string;
    approved_by: string;
    approved_role: string;
    approved_at: string;
    comment: string;
    rejection_reason: string | null;
  };
  data_quality?: {
    status: string;
    warnings?: Array<{
      code?: string;
      severity?: string;
      message: string;
      suspect_component?: string;
    }>;
  };
  rag_evidence?: BackendRagEvidence | null;
}

interface BackendRagHit {
  case_id?: string;
  caseId?: string;
  score?: number;
  tg_code?: string;
  tgCode?: string;
  report_title?: string;
  reportTitle?: string;
  cause_summary?: string;
  summary?: string;
  text?: string;
}

interface BackendRagClaim {
  text?: string;
}

interface BackendRagCaseSummary {
  case_id?: string;
  caseId?: string;
  summary?: string;
  relevance?: string;
  supports_effect?: boolean;
  shows_risk?: boolean;
}

interface BackendRagCandidate {
  label?: string;
  evidence?: {
    candidate_summary?: string;
    risk_level?: string;
    evidence_strength?: string;
    effect_outlook?: string;
    claims?: Array<string | BackendRagClaim>;
    case_summaries?: BackendRagCaseSummary[];
  } | null;
}

interface BackendRagEvidence {
  common_hits?: BackendRagHit[];
  candidates?: BackendRagCandidate[] | Record<string, BackendRagCandidate>;
  comparison?: {
    rag_summary?: string;
    overall_comment?: string;
  } | null;
}

interface BackendReportPayload {
  reportId: string;
  caseId: string;
  summary: string | null;
  renderedMarkdown: string | null;
  rootCauseText: string | null;
  actionComparisonText: string | null;
  timelineJson: unknown;
  reportJson?: ReportV1 | null;
  hasPdf: boolean;
  generatedAt: string;
  regeneratedCount: number | null;
  qdrantIndexed: boolean;
}

export interface BncHitlDecisionRequest {
  decision: 'APPROVED' | 'REJECTED';
  selectedPlanId: string | null;
  comment?: string | null;
}

const COMPARE_KPI_LABELS: Record<string, string> = {
  q_time_min: '평균 대기시간',
  wip: 'WIP',
  wait_ratio: 'Wait Ratio',
  utilization_avg: '평균 가동률',
  available_tool_ratio: '가용 Tool 비율',
  risk_score: 'Risk Score',
};

function buildActionMetrics(baseline: BncActionPlanBaseline, plan: BackendActionPlan): BncActionPlanMetric[] {
  return [
    {
      label: '처리량',
      before: formatMetricValue(baseline.throughput, ' lot/day'),
      after: formatMetricValue(addNullable(baseline.throughput, plan.estThroughputDelta), ' lot/day'),
      delta: formatDelta(plan.estThroughputDelta, '', 1),
    },
    {
      label: '평균 대기',
      before: formatMetricValue(baseline.avgWaitDay, '일', 2),
      after: formatMetricValue(addNullable(baseline.avgWaitDay, plan.estAvgWaitDelta), '일', 2),
      delta: formatDelta(plan.estAvgWaitDelta, '일', 2),
    },
    {
      label: '납기 준수',
      before: formatMetricValue(baseline.deliveryCompliance, '%'),
      after: formatMetricValue(addNullable(baseline.deliveryCompliance, plan.estDeliveryComplianceDelta), '%'),
      delta: formatDelta(plan.estDeliveryComplianceDelta, '%'),
    },
    {
      label: '평균 지연',
      before: formatMetricValue(baseline.avgDelayDay, '일', 2),
      after: formatMetricValue(addNullable(baseline.avgDelayDay, plan.estDelayDelta), '일', 2),
      delta: formatDelta(plan.estDelayDelta, '일', 2),
    },
  ];
}

function buildExpectedImpact(plan: BackendActionPlan): string {
  const impacts = [
    plan.estThroughputDelta !== null && plan.estThroughputDelta !== undefined
      ? `처리량 ${formatDelta(plan.estThroughputDelta)}`
      : null,
    plan.estAvgWaitDelta !== null && plan.estAvgWaitDelta !== undefined
      ? `평균 대기 ${formatDelta(plan.estAvgWaitDelta, '일', 2)}`
      : null,
    plan.estDeliveryComplianceDelta !== null && plan.estDeliveryComplianceDelta !== undefined
      ? `납기 준수 ${formatDelta(plan.estDeliveryComplianceDelta, '%')}`
      : null,
    plan.estDelayDelta !== null && plan.estDelayDelta !== undefined
      ? `평균 지연 ${formatDelta(plan.estDelayDelta, '일', 2)}`
      : null,
  ].filter(Boolean);
  return impacts.length > 0 ? impacts.join(' · ') : '-';
}

function isNoActionCompareEffect(effect: BackendCompareActionEffect): boolean {
  return effect.action_kind === 'NO_ACTION' || effect.label.includes('현재');
}

function parsePlanDescription(description: string | null | undefined) {
  const parts = (description ?? '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
  const targetPart = parts.find((part) => part.startsWith('대상 TG:'));
  const targetToolGroups = targetPart
    ? targetPart
        .replace('대상 TG:', '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return {
    operationItems: parts.filter((part) => part !== targetPart).map((part) => part.replace(/^\[플랜\s+[A-Z]\]\s*/, '')),
    targetToolGroups,
  };
}

function formatMonitoringKpis(items: Array<string | BackendCompareMonitoringKpi> | undefined): string[] {
  return (items ?? []).map((item) => {
    if (typeof item === 'string') return item;
    const label = COMPARE_KPI_LABELS[item.kpi] ?? item.kpi;
    const checkAfter = item.check_after_min ? ` · ${item.check_after_min}분 후 확인` : '';
    return `${label} ${item.target}${checkAfter}`;
  });
}

function buildCompareMetrics(effect: BackendCompareActionEffect): BncActionPlanMetric[] {
  return [
    {
      label: '종합 점수',
      before: '0.0',
      after: formatNumber(effect.composite_score, 1),
      delta: effect.composite_score === 0 ? '변화 없음' : formatDelta(effect.composite_score, '', 1),
    },
    {
      label: '평균 대기시간',
      before: '기준선',
      after: formatNeutralDelta(effect.kpi_delta.avg_queue_time_min, '분'),
      delta: formatNeutralDelta(effect.kpi_delta.avg_queue_time_min, '분'),
    },
    {
      label: 'WIP',
      before: '기준선',
      after: formatNeutralDelta(effect.kpi_delta.wip_count, '개', 0),
      delta: formatNeutralDelta(effect.kpi_delta.wip_count, '개', 0),
    },
    {
      label: '처리량',
      before: '기준선',
      after: formatNeutralDelta(effect.kpi_delta.throughput_delta, '', 0),
      delta: formatNeutralDelta(effect.kpi_delta.throughput_delta, '', 0),
    },
  ];
}

function buildCompareExpectedImpact(effect: BackendCompareActionEffect): string {
  const deltas = Object.values(effect.kpi_delta);
  if (deltas.every((value) => value === 0)) return 'KPI 변화 없음';
  return [
    `평균 대기시간 ${formatNeutralDelta(effect.kpi_delta.avg_queue_time_min, '분')}`,
    `WIP ${formatNeutralDelta(effect.kpi_delta.wip_count, '개', 0)}`,
    `처리량 ${formatNeutralDelta(effect.kpi_delta.throughput_delta, '', 0)}`,
  ].join(' · ');
}

function buildCompareScoreBreakdown(
  effect: BackendCompareActionEffect
): BncActionPlansPayload['plans'][number]['scoreBreakdown'] {
  const contributions = effect.score_breakdown?.kpi_contributions ?? {};
  return Object.entries(contributions).map(([key, value]) => ({
    key,
    label: COMPARE_KPI_LABELS[key] ?? key,
    weight: value.weight,
    meanDelta: value.mean_delta,
    verdict: value.verdict,
    contribution: value.contribution,
    confidence: value.confidence,
  }));
}

function buildCompareScoreVerdict(effect: BackendCompareActionEffect): string {
  const verdicts = Object.values(effect.score_breakdown?.kpi_contributions ?? {}).map((item) => item.verdict);
  if (verdicts.length > 0 && verdicts.every((verdict) => verdict === 'baseline')) return '현재 기준';
  if (verdicts.length > 0 && verdicts.every((verdict) => verdict === 'unchanged')) return '전 KPI 변화 없음';
  return verdicts.join(', ');
}

function extractDescriptionMetric(description: string, pattern: RegExp): string | null {
  const match = description.match(pattern);
  return match?.[1]?.replaceAll(',', '') ?? null;
}

function buildCompareCurrentMetrics(
  effect: BackendCompareActionEffect | null | undefined
): BncActionPlansPayload['baselineSnapshot'] {
  if (!effect) return undefined;

  const description = effect.description ?? '';
  const metrics = [
    {
      label: 'WIP',
      value: extractDescriptionMetric(description, /WIP\s*([\d,.]+)\s*개/i),
      caption: '현재 대기 재공',
    },
    {
      label: '평균 대기시간',
      value: extractDescriptionMetric(description, /평균\s*대기시간\s*([\d,.]+)\s*분/),
      caption: '현재 큐 기준',
      suffix: '분',
    },
    {
      label: '대기비율',
      value: extractDescriptionMetric(description, /대기비율\s*([\d,.]+)/),
      caption: 'Wait Ratio',
    },
    {
      label: '가동률',
      value: extractDescriptionMetric(description, /가동률\s*([\d,.]+)/),
      caption: 'Utilization',
    },
    {
      label: '가용 장비 비율',
      value: extractDescriptionMetric(description, /가용장비비율\s*([\d,.]+)/),
      caption: 'Available Tool Ratio',
    },
  ]
    .filter((item) => item.value !== null)
    .map((item) => ({
      label: item.label,
      value: `${item.value}${item.suffix ?? ''}`,
      caption: item.caption,
    }));

  if (metrics.length > 0) return metrics;

  return [
    { label: '현재 상태', value: effect.label, caption: effect.action_metadata?.description_ko ?? '조치 없음' },
    { label: '종합 점수', value: formatNumber(effect.composite_score, 1), caption: buildCompareScoreVerdict(effect) },
  ];
}

function buildCompareV2CurrentMetrics(
  data: BackendCompareV2Payload
): NonNullable<BncActionPlansPayload['baselineSnapshot']> {
  return Object.entries(data.current_state.kpi).map(([key, item]) => ({
    label: COMPARE_KPI_LABELS[key] ?? key.replaceAll('_', ' '),
    value: formatCompareV2Value(key, item.value),
    caption: key === 'risk_score' ? '현재 위험 점수' : '현재 기준',
  }));
}

function buildCompareV2ForecastMetrics(
  data: BackendCompareV2Payload
): NonNullable<BncActionPlansPayload['compareContext']>['naturalForecast'] {
  const forecast = data.current_state.natural_forecast_2h;
  if (!forecast) return undefined;

  return {
    label: forecast.label,
    getsWorse: forecast.gets_worse,
    metrics: Object.entries(forecast.kpi).map(([key, item]) => ({
      label: COMPARE_KPI_LABELS[key] ?? key.replaceAll('_', ' '),
      value: `${formatCompareV2Value(key, item.now)} → ${formatCompareV2Value(key, item.after)}`,
      caption: `${formatCompareV2Delta(key, item.delta)} · ${formatNumber(item.pct_change, 1)}% · 신뢰도 ${item.reliability}`,
    })),
  };
}

function buildCompareV2Metrics(option: BackendCompareV2Payload['action_options'][number]): BncActionPlanMetric[] {
  return Object.entries(option.kpi_impact).map(([key, item]) => ({
    label: COMPARE_KPI_LABELS[key] ?? key.replaceAll('_', ' '),
    before: formatCompareV2Value(key, item.now),
    after: formatCompareV2Value(key, item.after),
    delta: item.delta === 0 ? '변화 없음' : formatCompareV2Delta(key, item.delta),
  }));
}

function buildCompareV2ExpectedImpact(option: BackendCompareV2Payload['action_options'][number]): string {
  const changed = Object.entries(option.kpi_impact).filter(([, item]) => item.delta !== 0);
  if (changed.length === 0) return 'KPI 변화 없음';
  return changed
    .slice(0, 3)
    .map(([key, item]) => `${COMPARE_KPI_LABELS[key] ?? key} ${formatCompareV2Delta(key, item.delta)}`)
    .join(' · ');
}

function buildCompareV2ScoreBreakdown(
  option: BackendCompareV2Payload['action_options'][number]
): BncActionPlansPayload['plans'][number]['scoreBreakdown'] {
  return Object.entries(option.kpi_impact).map(([key, item]) => ({
    key,
    label: COMPARE_KPI_LABELS[key] ?? key.replaceAll('_', ' '),
    weight: null,
    meanDelta: item.delta,
    verdict: item.verdict,
    contribution: item.pct_change,
    confidence: item.confidence,
    ciWidth: item.ci_width,
    pctChange: item.pct_change,
  }));
}

function buildCompareV2ScoreVerdict(option: BackendCompareV2Payload['action_options'][number]): string {
  const verdicts = Object.values(option.kpi_impact).map((item) => item.verdict);
  if (verdicts.length > 0 && verdicts.every((verdict) => verdict === 'baseline')) return '현재 기준';
  if (verdicts.length > 0 && verdicts.every((verdict) => verdict === 'unchanged')) return '전 KPI 변화 없음';
  if (verdicts.some((verdict) => verdict === 'improved')) return '핵심 KPI 개선';
  return option.simulation.verdict ? option.simulation.verdict.replaceAll('_', ' ') : '-';
}

function buildCompareV2OperationItems(option: BackendCompareV2Payload['action_options'][number]): string[] {
  const paramItems = Object.entries(option.params ?? {})
    .map(([key, value]) => formatCompareParamLine(key, value))
    .filter((item): item is string => !!item);
  return [option.description, ...paramItems];
}

function resolveCompareV2ImpactTone(
  option: BackendCompareV2Payload['action_options'][number]
): 'positive' | 'neutral' | 'negative' {
  const verdicts = Object.values(option.kpi_impact).map((item) => item.verdict);
  if (verdicts.some((verdict) => verdict === 'improved')) return 'positive';
  if (verdicts.every((verdict) => verdict === 'unchanged' || verdict === 'baseline')) return 'neutral';
  return 'negative';
}

function resolveImpactTone(plan: BackendActionPlan): 'positive' | 'neutral' | 'negative' {
  const deltas = [
    plan.estThroughputDelta,
    plan.estAvgWaitDelta,
    plan.estDeliveryComplianceDelta,
    plan.estDelayDelta,
  ].filter((value): value is number => value !== null && value !== undefined);

  if (deltas.length === 0 || deltas.every((value) => value === 0)) return 'neutral';

  const hasBadDelta =
    toNumber(plan.estAvgWaitDelta) > 0 ||
    toNumber(plan.estDelayDelta) > 0 ||
    toNumber(plan.estThroughputDelta) < 0 ||
    toNumber(plan.estDeliveryComplianceDelta) < 0;

  return hasBadDelta ? 'negative' : 'positive';
}

function isCompareV2Payload(
  data: BackendActionPlansPayload | BackendCompareAgentPayload | BackendCompareV2Payload
): data is BackendCompareV2Payload {
  return 'meta' in data && data.meta?.schema_version === 'compare/2.0' && 'action_options' in data;
}

function isCompareAgentPayload(
  data: BackendActionPlansPayload | BackendCompareAgentPayload | BackendCompareV2Payload
): data is BackendCompareAgentPayload {
  return 'action_effects' in data && Array.isArray(data.action_effects);
}

function normalizeTimeline(timelineJson: unknown): BncReportTimelineItem[] {
  if (!timelineJson) return [];
  const source = Array.isArray(timelineJson)
    ? timelineJson
    : typeof timelineJson === 'object' && 'items' in timelineJson
      ? (timelineJson as { items?: unknown }).items
      : null;

  if (!Array.isArray(source)) return [];

  return source
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const time = row.time ?? row.at ?? row.timestamp ?? row.createdAt;
      const event = row.event ?? row.message ?? row.text ?? row.label;
      if (typeof time !== 'string' || typeof event !== 'string') return null;
      return { time, event };
    })
    .filter((item): item is BncReportTimelineItem => item !== null);
}

function mapCauseAnalysis(data: BackendCauseAnalysis): BncCauseAnalysis {
  const totalShapAbs = data.shapFeatures.reduce((sum, item) => sum + Math.abs(toNumber(item.importance) ?? 0), 0);

  return {
    ...data,
    shapFeatures: data.shapFeatures.map((item, index) => {
      const importance = toNumber(item.importance) ?? 0;
      const contributionPct =
        item.contributionPct != null
          ? (toNumber(item.contributionPct) ?? null)
          : totalShapAbs > 0
            ? (Math.abs(importance) / totalShapAbs) * 100
            : null;
      return {
        feature: item.feature,
        label: featureLabel(item.feature),
        importance,
        rank: item.rank ?? index + 1,
        direction: '병목 기여',
        kpiValue: toNumber(item.kpiValue) ?? undefined,
        contributionPct: contributionPct ?? undefined,
        shapValue: importance,
      };
    }),
    trendInsights: [],
    judgment: data.judgment ?? null,
    causeCategories: data.causeCategories ?? [],
    upstreamSuspects: data.upstreamSuspects ?? [],
    simForecast: data.simForecast ?? null,
    gStar: data.gStar ?? null,
    forwardForecastText:
      data.diffusion.affectedToolGroups.length > 0
        ? `${data.diffusion.affectedToolGroups.map((item) => item.tgName).join(', ')}까지 병목 영향이 확산될 수 있습니다.`
        : '확산 예측 대상 Tool Group이 없습니다.',
  };
}

function mapActionPlans(data: BackendActionPlansPayload): BncActionPlansPayload {
  const baseline: BncActionPlanBaseline = {
    throughput: toNumber(data.baseline?.throughput),
    avgWaitDay: toNumber(data.baseline?.avgWaitDay),
    deliveryCompliance: toNumber(data.baseline?.deliveryCompliance),
    avgDelayDay: toNumber(data.baseline?.avgDelayDay),
  };
  const selectedPlanId = data.hitlStatus.latestDecision?.selectedPlanId ?? null;

  return {
    caseId: data.caseId,
    baseline,
    plans: data.plans.map((plan, index) => {
      const actionLabel = actionLabelFromIndex(index);
      const parsed = parsePlanDescription(plan.planDetail ?? plan.simulationBasis);

      return {
        planId: plan.planId,
        actionLabel,
        actionKind: plan.planType ?? undefined,
        title: plan.planTitle ?? `${actionLabel}. ${plan.planType ?? '대응안'}`,
        summary: parsed.operationItems[0] ?? plan.planDetail ?? plan.simulationBasis ?? '-',
        expectedImpact: buildExpectedImpact(plan),
        riskText: plan.simulationBasis ?? '-',
        confidence: null,
        metrics: buildActionMetrics(baseline, plan),
        operationItems: parsed.operationItems,
        targetToolGroups: parsed.targetToolGroups,
        impactTone: resolveImpactTone(plan),
        recommended: selectedPlanId ? selectedPlanId === plan.planId : index === 0,
      };
    }),
    hitlStatus: {
      hasDecision: data.hitlStatus.hasDecision,
      latestDecision: data.hitlStatus.latestDecision?.decision ?? null,
      selectedPlanId,
      comment: null,
    },
  };
}

function mapCompareAgentActionPlans(data: BackendCompareAgentPayload, fallbackCaseId: string): BncActionPlansPayload {
  const currentEffect = data.action_effects.find(isNoActionCompareEffect) ?? null;
  const currentMetrics = buildCompareCurrentMetrics(currentEffect);
  const candidateEffects = data.action_effects.filter((effect) => !isNoActionCompareEffect(effect));
  const recommendedActionLabel = extractActionLabel(data.recommendation.action_label);
  const plans: BncActionPlansPayload['plans'] = candidateEffects.map((effect) => {
    const actionLabel = extractActionLabel(effect.label);
    const parsed = parsePlanDescription(effect.description);
    const hasNoKpiDelta = Object.values(effect.kpi_delta).every((value) => value === 0);

    return {
      planId: `${data.caseId ?? fallbackCaseId}-plan-${actionLabel.toLowerCase()}`,
      actionLabel,
      actionKind: effect.action_kind,
      title: `${actionLabel}. ${effect.action_kind}`,
      summary: parsed.operationItems[0] ?? effect.description,
      expectedImpact: buildCompareExpectedImpact(effect),
      riskText: hasNoKpiDelta
        ? '시뮬레이션 horizon 내 KPI 개선이 관측되지 않아 추가 후보 생성 또는 horizon 재검토가 필요합니다.'
        : '디지털 트윈 시뮬레이션에서 KPI 개선이 관측된 후보입니다.',
      confidence: effect.simulation_confidence,
      compositeScore: effect.composite_score,
      scoreVerdict: buildCompareScoreVerdict(effect),
      actionMetadata: {
        effort: effect.action_metadata?.effort ?? null,
        scope: formatScope(effect.action_metadata?.scope),
        reversibility: formatReversibility(effect.action_metadata?.reversibility),
        descriptionKo: effect.action_metadata?.description_ko ?? null,
      },
      scoreBreakdown: buildCompareScoreBreakdown(effect),
      tradeoffs: effect.tradeoffs ?? [],
      metrics: buildCompareMetrics(effect),
      operationItems: parsed.operationItems,
      targetToolGroups: parsed.targetToolGroups,
      impactTone: hasNoKpiDelta ? 'neutral' : 'positive',
      recommended: actionLabel === recommendedActionLabel,
    };
  });
  const recommendedPlan = plans.find((plan) => plan.recommended) ?? plans[0] ?? null;
  const isApproved = data.approval_info?.status === '승인';
  const isRejected = data.approval_info?.status === '반려';
  const isAutoApproved = (data.approval_info?.approved_by ?? '').toUpperCase() === 'AUTO';

  return {
    caseId: data.caseId ?? fallbackCaseId,
    baseline: {
      throughput: 0,
      avgWaitDay: 0,
      deliveryCompliance: 0,
      avgDelayDay: 0,
    },
    baselineSnapshot: [
      ...(currentMetrics ?? []),
      { label: '심각도', value: data.severity, caption: data.process_name },
      { label: '후보 대응안', value: `${candidateEffects.length.toLocaleString('ko-KR')}개`, caption: '후보 비교' },
      {
        label: '판정',
        value: data.decision_info ? formatDecisionStatus(data.decision_info.decision_status) : '-',
        caption: data.decision_info ? `Top ${extractActionLabel(data.decision_info.top_label)}` : undefined,
      },
    ],
    currentOption: currentEffect
      ? {
          label: currentEffect.label,
          actionKind: currentEffect.action_kind,
          title: currentEffect.action_metadata?.description_ko ?? currentEffect.label,
          summary: currentEffect.description,
          confidence: currentEffect.simulation_confidence,
          compositeScore: currentEffect.composite_score,
          scoreVerdict: buildCompareScoreVerdict(currentEffect),
          metrics: currentMetrics ?? [],
          scoreBreakdown: buildCompareScoreBreakdown(currentEffect),
          tradeoffs: currentEffect.tradeoffs ?? [],
        }
      : undefined,
    plans,
    recommendation: {
      actionLabel: recommendedActionLabel,
      actionKind: data.recommendation.action_kind,
      reason: data.recommendation.reason,
      structured: data.recommendation.structured
        ? {
            headline: data.recommendation.structured.headline,
            primaryReason: data.recommendation.structured.primary_reason,
            tradeoffs: data.recommendation.structured.tradeoffs,
            whyNotOthers: normalizeActionLabelRecord(data.recommendation.structured.why_not_others),
            caveats: data.recommendation.structured.caveats,
            confidenceLevel: data.recommendation.structured.confidence_level,
            immediateActions: data.recommendation.structured.immediate_actions,
            monitoringKpis: formatMonitoringKpis(data.recommendation.structured.monitoring_kpis),
            rollbackCondition: data.recommendation.structured.rollback_condition,
          }
        : undefined,
    },
    decisionInfo: data.decision_info
      ? {
          decisionStatus: data.decision_info.decision_status,
          topLabel: extractActionLabel(data.decision_info.top_label),
          equivalentSet: data.decision_info.equivalent_set.map(extractActionLabel),
          tiebreakerUsed: data.decision_info.tiebreaker_used,
          decisionCaveat: data.decision_info.decision_caveat,
        }
      : undefined,
    approvalInfo: data.approval_info
      ? {
          status: data.approval_info.status,
          approvedBy: data.approval_info.approved_by,
          approvedRole: data.approval_info.approved_role,
          approvedAt: data.approval_info.approved_at,
          comment: data.approval_info.comment,
          rejectionReason: data.approval_info.rejection_reason,
        }
      : undefined,
    hitlStatus: {
      hasDecision: !isAutoApproved && (isApproved || isRejected),
      latestDecision: !isAutoApproved && isApproved ? 'APPROVED' : !isAutoApproved && isRejected ? 'REJECTED' : null,
      selectedPlanId: recommendedPlan?.planId ?? null,
      comment: !isAutoApproved ? (data.approval_info?.comment ?? null) : null,
    },
  };
}

function mapCompareV2ActionPlans(data: BackendCompareV2Payload, fallbackCaseId: string): BncActionPlansPayload {
  const baselineOption =
    data.action_options.find(
      (option) => option.is_baseline || option.kind === 'NO_ACTION' || option.label.includes('현재')
    ) ?? null;
  const candidateOptions = data.action_options.filter((option) => option !== baselineOption);
  const currentMetrics = buildCompareV2CurrentMetrics(data);
  const recommendedActionLabel = extractActionLabel(data.recommendation.recommended_label);
  const recommendedOption =
    candidateOptions.find((option) => option.is_recommended) ??
    candidateOptions.find((option) => extractActionLabel(option.label) === recommendedActionLabel) ??
    candidateOptions[0] ??
    null;
  const isApproved = data.approval_info?.status === '승인';
  const isRejected = data.approval_info?.status === '반려';
  const isAutoApproved = (data.approval_info?.approved_by ?? '').toUpperCase() === 'AUTO';
  const decisionMeta = data.decision_meta;

  const plans: BncActionPlansPayload['plans'] = candidateOptions.map((option) => {
    const metrics = buildCompareV2Metrics(option);
    const actionLabel = extractActionLabel(option.label);

    return {
      planId: `${fallbackCaseId}-plan-${actionLabel}`,
      actionLabel,
      actionKind: option.kind,
      title: `${actionLabel}. ${option.kind}`,
      summary: option.description,
      expectedImpact: buildCompareV2ExpectedImpact(option),
      riskText:
        option.simulation.verdict === 'unchanged'
          ? '시뮬레이션상 유의미한 KPI 개선이 관측되지 않았습니다. 현장 검증이 필요합니다.'
          : '시뮬레이션에서 KPI 개선이 관측된 후보입니다.',
      confidence: option.simulation.simulation_confidence ?? null,
      compositeScore: option.composite_score,
      scoreVerdict: buildCompareV2ScoreVerdict(option),
      actionMetadata: {
        effort: option.operational.effort ?? null,
        scope: formatScope(option.operational.scope),
        reversibility: formatReversibility(option.operational.reversibility),
        descriptionKo: option.kind,
      },
      scoreBreakdown: buildCompareV2ScoreBreakdown(option),
      tradeoffs: option.tradeoffs ?? [],
      metrics,
      operationItems: buildCompareV2OperationItems(option),
      targetToolGroups: option.target_toolgroups,
      impactTone: resolveCompareV2ImpactTone(option),
      recommended: option.is_recommended || actionLabel === recommendedActionLabel,
    };
  });
  const ragEvidence = mapCompareV2RagEvidence(data.rag_evidence, fallbackCaseId, plans);

  return {
    caseId: fallbackCaseId,
    baseline: {
      throughput: 0,
      avgWaitDay: 0,
      deliveryCompliance: 0,
      avgDelayDay: 0,
    },
    baselineSnapshot: [
      ...currentMetrics,
      { label: '심각도', value: data.meta.severity, caption: data.meta.anchor_toolgroup },
      { label: '예측 구간', value: `${data.meta.horizon_min}분`, caption: data.meta.scenario_name },
      {
        label: '판정',
        value: decisionMeta
          ? formatDecisionStatus(decisionMeta.decision_status)
          : (data.recommendation.recommendation_status ?? '-'),
        caption: decisionMeta ? `Top ${extractActionLabel(decisionMeta.top_label)}` : `추천 ${recommendedActionLabel}`,
      },
    ],
    currentOption: baselineOption
      ? {
          label: baselineOption.label,
          actionKind: baselineOption.kind,
          title: baselineOption.description,
          summary: baselineOption.outcome_if_kept ?? baselineOption.description,
          confidence: baselineOption.simulation.simulation_confidence ?? null,
          compositeScore: baselineOption.composite_score,
          scoreVerdict: buildCompareV2ScoreVerdict(baselineOption),
          metrics: currentMetrics,
          scoreBreakdown: buildCompareV2ScoreBreakdown(baselineOption),
          tradeoffs: baselineOption.tradeoffs ?? [],
        }
      : undefined,
    compareContext: {
      schemaVersion: data.meta.schema_version,
      scenarioName: data.meta.scenario_name,
      anchorToolgroup: data.meta.anchor_toolgroup,
      targetToolgroups: data.meta.target_toolgroups,
      severity: data.meta.severity,
      horizonMin: data.meta.horizon_min,
      generatedAt: data.meta.generated_at,
      naturalForecast: buildCompareV2ForecastMetrics(data),
      causeSummary: data.cause?.summary ?? data.cause?.consensus?.summary,
      upstreamSuspects: data.cause?.upstream_suspects ?? [],
      cascade: data.cascade
        ? {
            affectedToolgroups: data.cascade.affected_toolgroups ?? [],
            ctIncreaseMin: data.cascade.ct_increase_min ?? null,
            atRiskLots: data.cascade.at_risk_lots ?? null,
            capacityStressScore: data.cascade.capacity_stress_score ?? null,
            impactScore: data.cascade.impact_score ?? null,
          }
        : undefined,
      dataQuality: data.data_quality
        ? {
            status: data.data_quality.status,
            warnings: (data.data_quality.warnings ?? []).map((warning) => ({
              code: warning.code,
              severity: warning.severity,
              message: warning.message,
              suspectComponent: warning.suspect_component,
            })),
          }
        : undefined,
    },
    plans,
    recommendation: {
      actionLabel: recommendedActionLabel,
      actionKind: recommendedOption?.kind ?? '',
      reason: [data.recommendation.primary_reason, data.recommendation.why_recommended?.explanation]
        .filter(Boolean)
        .join('\n'),
      structured: {
        headline: data.recommendation.headline,
        primaryReason: data.recommendation.primary_reason,
        tradeoffs: data.recommendation.tradeoffs,
        whyNotOthers: normalizeActionLabelRecord(data.recommendation.why_not_others),
        caveats: data.recommendation.caveats,
        confidenceLevel: data.recommendation.confidence_level,
        immediateActions: data.recommendation.immediate_actions,
        monitoringKpis: formatMonitoringKpis(data.recommendation.monitoring_kpis),
        rollbackCondition: data.recommendation.rollback_condition,
        whyRecommended: data.recommendation.why_recommended
          ? {
              selectedBy: data.recommendation.why_recommended.selected_by,
              tiebreakerChain: data.recommendation.why_recommended.tiebreaker_chain,
              explanation: data.recommendation.why_recommended.explanation,
            }
          : undefined,
        recommendationStatus: data.recommendation.recommendation_status,
      },
    },
    decisionInfo: decisionMeta
      ? {
          decisionStatus: decisionMeta.decision_status,
          topLabel: extractActionLabel(decisionMeta.top_label),
          equivalentSet: decisionMeta.equivalent_set.map(extractActionLabel),
          tiebreakerUsed: decisionMeta.tiebreaker_used,
          decisionCaveat:
            decisionMeta.decision_caveat ||
            data.recommendation.why_recommended?.explanation ||
            data.recommendation.primary_reason,
        }
      : undefined,
    approvalInfo: data.approval_info
      ? {
          status: data.approval_info.status,
          approvedBy: data.approval_info.approved_by,
          approvedRole: data.approval_info.approved_role,
          approvedAt: data.approval_info.approved_at,
          comment: data.approval_info.comment,
          rejectionReason: data.approval_info.rejection_reason,
        }
      : undefined,
    hitlStatus: {
      hasDecision: !isAutoApproved && (isApproved || isRejected),
      latestDecision: !isAutoApproved && isApproved ? 'APPROVED' : !isAutoApproved && isRejected ? 'REJECTED' : null,
      selectedPlanId: recommendedOption ? `${fallbackCaseId}-plan-${recommendedOption.label.toLowerCase()}` : null,
      comment: !isAutoApproved ? (data.approval_info?.comment ?? null) : null,
    },
    ragEvidence,
  };
}

function normalizeRagRiskLevel(value: string | undefined): 'high' | 'medium' | 'low' {
  const normalized = (value ?? '').toLowerCase();
  if (normalized === 'high') return 'high';
  if (normalized === 'medium') return 'medium';
  return 'low';
}

function normalizeRagEvidenceStrength(value: string | undefined): 'strong' | 'moderate' | 'weak' {
  const normalized = (value ?? '').toLowerCase();
  if (normalized === 'strong') return 'strong';
  if (normalized === 'moderate') return 'moderate';
  return 'weak';
}

function normalizeBackendRagCandidates(
  candidates: BackendRagEvidence['candidates'] | undefined
): BackendRagCandidate[] {
  if (!candidates) return [];
  if (Array.isArray(candidates)) return candidates;
  return Object.entries(candidates).map(([label, candidate]) => ({ label, ...candidate }));
}

function mapRagHit(hit: BackendRagHit): NonNullable<BncActionPlansPayload['ragEvidence']>['commonHits'][number] {
  const caseId = hit.case_id ?? hit.caseId ?? hit.report_title ?? hit.reportTitle ?? 'rag-case';
  return {
    caseId,
    score: typeof hit.score === 'number' ? hit.score : undefined,
    tgCode: hit.tg_code ?? hit.tgCode,
    reportTitle: hit.report_title ?? hit.reportTitle ?? caseId,
    summary: hit.cause_summary ?? hit.summary ?? hit.text ?? '',
  };
}

function mapCompareV2RagEvidence(
  ragEvidence: BackendRagEvidence | null | undefined,
  caseId: string,
  plans: BncActionPlansPayload['plans']
): BncActionPlansPayload['ragEvidence'] | undefined {
  if (!ragEvidence) return undefined;

  const commonHits = (ragEvidence.common_hits ?? []).map(mapRagHit).filter((hit) => hit.summary || hit.reportTitle);
  const perPlanEntries = normalizeBackendRagCandidates(ragEvidence.candidates).flatMap((candidate) => {
    const label = extractActionLabel(candidate.label ?? '');
    const plan = plans.find((item) => item.actionLabel === label);
    const evidence = candidate.evidence;
    if (!plan || !evidence?.candidate_summary) return [];

    return [
      [
        plan.planId,
        {
          candidateSummary: evidence.candidate_summary,
          riskLevel: normalizeRagRiskLevel(evidence.risk_level),
          evidenceStrength: normalizeRagEvidenceStrength(evidence.evidence_strength),
          effectOutlook: evidence.effect_outlook,
          claims: (evidence.claims ?? [])
            .map((claim) => (typeof claim === 'string' ? claim : (claim.text ?? '')))
            .filter(Boolean),
          caseSummaries: (evidence.case_summaries ?? [])
            .map((item) => ({
              caseId: item.case_id ?? item.caseId ?? `${caseId}-${label}-rag`,
              summary: item.summary ?? '',
              relevance: item.relevance,
              supportsEffect: item.supports_effect,
              showsRisk: item.shows_risk,
            }))
            .filter((item) => item.summary),
        },
      ] as const,
    ];
  });

  const perPlan = Object.fromEntries(perPlanEntries);
  const comparison = ragEvidence.comparison
    ? {
        ragSummary: ragEvidence.comparison.rag_summary,
        overallComment: ragEvidence.comparison.overall_comment,
      }
    : undefined;

  if (!commonHits.length && !Object.keys(perPlan).length && !comparison?.ragSummary && !comparison?.overallComment) {
    return undefined;
  }

  return { commonHits, perPlan, comparison };
}

function mapReport(data: BackendReportPayload): BncReportPayload {
  return {
    reportId: data.reportId,
    caseId: data.caseId,
    summary: data.summary ?? '',
    reportHtml: data.renderedMarkdown,
    rootCauseText: data.rootCauseText ?? '',
    actionComparisonText: data.actionComparisonText ?? '',
    timeline: normalizeTimeline(data.timelineJson),
    reportV1: data.reportJson ?? undefined,
    hasPdf: data.hasPdf,
    generatedAt: data.generatedAt,
    regeneratedCount: data.regeneratedCount ?? 0,
    qdrantIndexed: data.qdrantIndexed,
  };
}

export async function fetchBncCases(params: FetchBncCasesParams = {}): Promise<BncCaseListData> {
  // 병목 대응 센터는 CRITICAL 케이스만(HIGH는 cascade-only라 원인/대응/보고서 없음). 명시 param이 있으면 우선.
  const merged = { riskGrade: 'CRITICAL', ...params };
  const { data } = await api.get<BncCaseListData>('/v1/response-center/cases', { params: merged });
  return data;
}

export async function fetchBncCaseDetail(caseId: string): Promise<BncCaseDetail> {
  const { data } = await api.get<BncCaseDetail>(`/v1/response-center/cases/${caseId}`);
  return data;
}

export async function fetchBncCauseAnalysis(caseId: string): Promise<BncCauseAnalysis> {
  const { data } = await api.get<BackendCauseAnalysis>(`/v1/response-center/cases/${caseId}/cause-analysis`);
  return mapCauseAnalysis(data);
}

export async function fetchBncActionPlans(caseId: string): Promise<BncActionPlansPayload> {
  const { data } = await api.get<BackendActionPlansPayload | BackendCompareAgentPayload | BackendCompareV2Payload>(
    `/v1/response-center/cases/${caseId}/action-plans`
  );
  if (isCompareV2Payload(data)) return mapCompareV2ActionPlans(data, caseId);
  if (isCompareAgentPayload(data)) return mapCompareAgentActionPlans(data, caseId);
  return mapActionPlans(data);
}

export async function decideBncHitl(caseId: string, payload: BncHitlDecisionRequest): Promise<void> {
  await api.post(`/v1/response-center/cases/${caseId}/hitl`, payload);
}

export async function fetchBncReport(caseId: string): Promise<BncReportPayload> {
  if (shouldUseDemoMockData()) {
    const mock = MOCK_BNC_REPORTS[caseId] ?? MOCK_ARCHIVE_REPORTS[caseId] ?? MOCK_ACTION_HISTORY_REPORTS[caseId];
    if (mock) return mock;
  }
  const { data } = await api.get<BackendReportPayload>(`/v1/response-center/cases/${caseId}/report`);
  return mapReport(data);
}

export async function downloadBncReportPdf(caseId: string): Promise<void> {
  if (shouldUseDemoMockData()) return;

  const response = await api.get<Blob>(`/v1/response-center/cases/${caseId}/report/pdf`, {
    responseType: 'blob',
  });
  const blob = response.data;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `report_${caseId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

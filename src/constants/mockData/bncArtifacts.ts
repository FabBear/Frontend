import { MOCK_FINAL_BOTTLENECK_REPORT } from '@/constants/mockData/finalBottleneckReport';
import reportWeFe8Raw from '@/constants/mockData/reportWeFe8.fixture.json?raw';

import type {
  BncActionPlan,
  BncActionPlanMetric,
  BncActionPlansPayload,
  BncCauseAnalysis,
  BncReportPayload,
} from '@/types/bnc';
import type { FinalBottleneckReport, ReportV1 } from '@/types/report';

const WE_FE_8_CASE_ID = '00000000-0000-0000-0000-000000000008';
const WE_FE_8_REPORT_ID = '00000000-0000-0000-0000-000000000108';
const COMPARE_CASE_ID = 'case-defmet-fe-118-clear-20260610-2118';
const COMPARE_EQUIVALENT_CASE_ID = 'case-defmet-fe-118-equivalent-20260610-2118';
const COMPARE_NO_EFFECT_CASE_ID = 'case-defmet-fe-118-no-effect-20260610-2117';
const REPORT_CASE_ID = 'case-defmet-fe-43-20260609-1721';
const DEFAULT_CASE_IDS = [
  WE_FE_8_CASE_ID,
  COMPARE_CASE_ID,
  COMPARE_EQUIVALENT_CASE_ID,
  COMPARE_NO_EFFECT_CASE_ID,
  REPORT_CASE_ID,
  'case-de-fe-72-20260607-0115',
  'case-litho-be-110-20260607-0035',
  'case-de-be-67-20260606-2350',
  'case-litho-reg-be-63-20260606-2310',
];

const REPORT_TG_NAMES = [
  'WE_FE_8',
  'DefMEt_FE_118',
  'DefMEt_FE_118',
  'DefMEt_FE_118',
  'DefMet_FE_43',
  'DE_FE_72',
  'Litho_BE_110',
  'DE_BE_67',
  'Litho_REG_BE_63',
];
const REPORT_BOTTLENECK_PROBS = [0.9969, 0.997, 0.997, 0.997, 0.981, 0.999, 0.974, 0.951, 0.823];
const REPORT_MAX_WIP = [15, 820, 820, 820, 10, 474, 411, 388, 295];
const REPORT_UTILIZATION = [0.9896, 0.91, 0.91, 0.91, 0.689, 0.897, 0.912, 0.884, 0.861];
const REPORT_WAITING_LOTS = [15, 820, 820, 820, 292, 261, 312, 244, 198];
const WE_FE_8_REPORT_V1 = JSON.parse(reportWeFe8Raw) as ReportV1;

const WE_FE_8_FULL_MARKDOWN = `# FAB 병목 대응 보고서

| 항목 | 내용 |
|------|------|
| 공정명 | \`WE_FE_8\` |
| 심각도 | **CRITICAL** |
| 탐지시각 | 2026-06-13 16:52 |
| 보고서 생성일시 | 2026-06-13 16:52 |

## 검토 결과

| 항목 | 내용 |
|------|------|
| 상태 | **승인** |
| 승인자 | DJKEE (팀장) |
| 승인일시 | 2026-06-13 16:43 |
| 의견 | AI 추천 반영 |

## 1. 요약

WE_FE_8에서 risk_score 81.8로 CRITICAL 병목이 확인됨. 현재 WIP 15.0 lots와 wait_ratio 6.5 ratio로 대기와 적체가 심화된 상태이며, utilization_avg 0.9896 ratio와 max_util 0.9916 ratio로 설비 포화가 임계 수준임.

| 지표 | 값 |
|------|----|
| 심각도 | Critical |
| risk_score | 81.8 |
| 현재 평균 대기시간 | 63.9분 |
| load_ratio (wait_ratio) | 6.5 |
| 가동률 | 99.0% |
| WIP | 15개 |
| 가용 호기 비율 | 1 |
| 최대 가동률 | 99.2% |

## 2. 확산 영향 분석

병목 확산 경로는 WE_FE_8에서 LithoMet_FE_19, WE_FE_83, DE_FE_1 순으로 연결됨. high_impact_count 8로 영향 범위가 크며, Q-time 63.9분과 wait_ratio 6.5 ratio가 높은 수준으로 유지되어 확산 압력이 지속되는 상태임.

### feature 트렌드

| 시각 | q_time_min | wait_ratio | wip | max_util |
|------|------------|------------|-----|----------|
| T-300분 | 58.0 | 3.5 | 9 | 0.9706 |
| T-240분 | 59.5 | 3.5 | 9 | 0.9835 |
| T-180분 | 60.1 | 3.5 | 9 | 0.9532 |
| T-120분 | 62.4 | 5.0 | 12 | 0.9717 |
| T-60분 | 63.3 | 5.0 | 12 | 0.9684 |
| T-0분 | 63.9 | 6.5 | 15 | 0.9916 |

## 3. 원인 분석 TOP

주원인은 설비_포화임. max_util_delta_120, max_util, utilization_avg가 모두 병목 방향으로 작용했고, 설비_포화의 total score 0.830과 SHAP 기여율 83.0%가 이를 지지함. 보조 원인은 WIP_누적임.

### ML 모델 SHAP 분석

| 피처명 | 현재값 | 기여도(%) | 방향 |
|--------|--------|----------|------|
| max_util_delta_120 | 0.0122 | 35.1 | 병목 쪽으로 기여(+) |
| max_util | 0.9916 | 33.3 | 병목 쪽으로 기여(+) |
| wip | 15 | 17.0 | 병목 쪽으로 기여(+) |
| utilization_avg | 0.9896 | 14.6 | 병목 쪽으로 기여(+) |

## 4. 승인된 대응안

승인된 대응안은 CONSERVATIVE이며, Release Interval Δ15.0%를 보수적으로 적용한다. 다만 시뮬레이션에서는 conservative/standard/aggressive 모두 KPI 변화가 0으로 관측되어 현장 점검과 함께 잠정 적용해야 함.

### 대응안 비교

| 대응안 | 종류 | 설명 | 대기시간 변화 | WIP 변화 | 시뮬 신뢰도 | 운영 부담 |
|--------|------|------|-------------|---------|-----------|----------|
| 현재상태 | NO_ACTION | 조치 없음 — 병목 유지 | 0분 | 0 | - | 0/4 |
| conservative | RELEASE_INTERVAL | Release Interval Δ15.0% | 0분 | 0 | 50% | 99/4 |
| standard | RELEASE_INTERVAL | Release Interval Δ22.0% | 0분 | 0 | 50% | 99/4 |
| aggressive | RELEASE_INTERVAL | Release Interval Δ28.0% | 0분 | 0 | 50% | 99/4 |
`;

const WE_FE_8_FINAL_REPORT: FinalBottleneckReport = {
  meta: {
    process_name: 'WE_FE_8',
    severity: 'CRITICAL',
    detected_at: '2026-06-13 16:52',
    generated_at: '2026-06-13 16:52:22',
  },
  bottleneck_info: {
    tool_group: 'WE_FE_8',
    risk_score: 81.8,
    delayed_orders: 0,
    avg_queue_time_min: 63.9,
    peak_q_time_min: 63.9,
    utilization_pct: 99.0,
    load_ratio: 6.5,
    wip_count: 15,
    available_tool_ratio: 1,
  },
  fab_kpi: {
    wip_total: 15,
    utilization_avg_pct: 99.0,
    q_time_min: 63.9,
    wait_ratio: 6.5,
  },
  diffusion_analysis: {
    is_bottleneck: true,
    bottleneck_location: 'WE_FE_8',
    diffusion_path: ['WE_FE_8', 'LithoMet_FE_19', 'WE_FE_83', 'DE_FE_1'],
    affected_processes: [
      { process: 'LithoMet_FE_19', status: '영향', utilization_pct: 69.2, wait_ratio: 1, wip: 34 },
      { process: 'WE_FE_83', status: '영향', utilization_pct: 97.5, wait_ratio: 0.43, wip: 10 },
      { process: 'DE_FE_1', status: '영향', utilization_pct: 60.2, wait_ratio: 1.14, wip: 12 },
      { process: 'Dielectric_FE_30', status: '영향', utilization_pct: 92.2, wait_ratio: 0.5, wip: 2 },
      { process: 'Diffusion_FE_125', status: '영향', utilization_pct: 80.1, wait_ratio: 0.33, wip: 5 },
      { process: 'Diffusion_FE_127', status: '영향', utilization_pct: 85.9, wait_ratio: 0, wip: 8 },
      { process: 'Diffusion_FE_120', status: '영향', utilization_pct: 81.0, wait_ratio: 0, wip: 9 },
      { process: 'DE_FE_86', status: '영향', utilization_pct: 35.8, wait_ratio: 0, wip: 56 },
    ],
    forward_simulation: {
      horizon_min: 120,
      results: [{ toolgroup: 'WE_FE_8', q_time_future: null, wait_ratio_future: 2, wip_future: 6, y_bottleneck: 0 }],
    },
    line_stop_expected_min: 2064.9,
    risk_level: 'CRITICAL',
  },
  cause_analysis: [
    {
      rank: 1,
      cause: 'max_util_delta_120',
      contribution_pct: 35.1,
      recommended_action: 'Release Interval을 보수적으로 조정하고 업스트림 WIP를 동시 점검',
      similar_case: 'WE_FE_8-20260613',
    },
    {
      rank: 2,
      cause: 'max_util',
      contribution_pct: 33.3,
      recommended_action: '가용 Tool 상태와 dispatch rule override 필요 여부 확인',
      similar_case: 'WE_FE_8-20260613',
    },
    {
      rank: 3,
      cause: 'wip',
      contribution_pct: 17,
      recommended_action: 'LithoMet_FE_19 등 업스트림 WIP 누적 여부 점검',
      similar_case: 'WE_FE_8-20260613',
    },
    {
      summary:
        '주요 원인은 설비_포화이며, max_util_delta_120, max_util, utilization_avg가 모두 병목 방향으로 작용함. 보조 원인은 WIP_누적임.',
      consensus: {
        confidence_level: 'HIGH',
        summary: 'SHAP, 트렌드, 업스트림, G* 분석이 병목 방향 신호를 함께 제시함.',
        g_star_confirmed: true,
        g_star_proba: 0.7627,
        agreed_features: ['wip', 'wait_ratio', 'max_util_delta_120', 'max_util'],
        conflicted_features: ['available_tool_ratio'],
      },
    },
  ],
  action_effects: [
    {
      label: 'A. conservative',
      action_kind: 'UNKNOWN',
      description: '[플랜 A] Release Interval Δ15.0% 보수 적용 | 대상 TG: WE_FE_8',
      simulation_confidence: 0.5,
      kpi_delta: { avg_queue_time_min: 0, wip_count: 0, throughput_delta: 0 },
    },
    {
      label: 'B. standard',
      action_kind: 'UNKNOWN',
      description: '[플랜 B] Release Interval Δ22.0% 표준 적용 | 대상 TG: WE_FE_8',
      simulation_confidence: 0.5,
      kpi_delta: { avg_queue_time_min: 0, wip_count: 0, throughput_delta: 0 },
    },
    {
      label: 'C. aggressive',
      action_kind: 'UNKNOWN',
      description: '[플랜 C] Release Interval Δ28.0% 적극 적용 | 대상 TG: WE_FE_8',
      simulation_confidence: 0.5,
      kpi_delta: { avg_queue_time_min: 0, wip_count: 0, throughput_delta: 0 },
    },
  ],
  recommendation: {
    action_label: 'A',
    action_kind: 'UNKNOWN',
    reason:
      '시뮬레이션상 후보 간 KPI 개선 차이가 없어 운영 부담이 가장 낮은 conservative를 잠정 선택함. 적용 후 30분 단위로 WIP와 평균 대기시간을 확인해야 함.',
  },
  approval_info: {
    status: '승인',
    approved_by: 'DJKEE',
    approved_role: '팀장',
    approved_at: '2026-06-13 16:43',
    comment: 'AI 추천 반영',
    rejection_reason: null,
  },
  full_markdown: WE_FE_8_FULL_MARKDOWN,
};

interface CompareMonitoringKpi {
  kpi: string;
  target: string;
  check_after_min?: number;
}

interface CompareKpiValue {
  value: number;
  unit: string;
}

interface CompareKpiImpact {
  now: number;
  after: number;
  delta: number;
  pct_change: number;
  verdict: string;
  confidence: number;
  ci_width: number;
}

interface CompareActionOption {
  label: string;
  kind: string;
  description: string;
  target_toolgroups: string[];
  params: Record<string, unknown>;
  kpi_impact: Record<string, CompareKpiImpact>;
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
}

interface CompareV2Output {
  meta: {
    schema_version: string;
    scenario_name: string;
    anchor_toolgroup: string;
    target_toolgroups: string[];
    severity: string;
    snapshot_time: number;
    horizon_min: number;
    generated_at: string;
  };
  current_state: {
    kpi: Record<string, CompareKpiValue>;
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
  action_options: CompareActionOption[];
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
    monitoring_kpis?: Array<string | CompareMonitoringKpi>;
    rollback_condition?: string;
    recommended_label: string;
    recommendation_status?: string;
  };
  decision_meta?: {
    decision_status: string;
    top_label: string;
    equivalent_set: string[];
    tiebreaker_used: string | null;
    decision_caveat: string;
  };
  approval_info: {
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
}

const MOCK_COMPARE_AGENT_OUTPUTS: Partial<Record<string, CompareV2Output>> = {};

const KPI_LABELS: Record<string, string> = {
  q_time_min: '평균 대기시간',
  wip: 'WIP',
  wait_ratio: 'Wait Ratio',
  utilization_avg: '평균 가동률',
  available_tool_ratio: '가용 Tool 비율',
  risk_score: 'Risk Score',
};

function formatNumber(value: number, digits = 1) {
  return value.toLocaleString('ko-KR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function formatSigned(value: number, suffix = '', digits = 1) {
  if (value === 0) return `0${suffix}`;
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value, digits)}${suffix}`;
}

function extractActionLabel(label: string) {
  return label.match(/[A-Z]/)?.[0] ?? label;
}

function isNoActionCompareEffect(effect: CompareActionOption) {
  return !!effect.is_baseline || effect.kind === 'NO_ACTION' || effect.label.includes('현재');
}

function parseActionDescription(description: string) {
  const parts = description
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

function formatDecisionStatus(status: string) {
  const labels: Record<string, string> = {
    clear_winner: '명확한 추천안',
    equivalent_candidates: '동등 후보',
    no_meaningful_effect: '유의미한 개선 없음',
    approved: '승인',
    rejected: '반려',
  };
  return labels[status] ?? status.replaceAll('_', ' ');
}

function formatScope(scope: string | null | undefined) {
  const labels: Record<string, string> = {
    fab_wide: 'FAB 전체',
    tool_group: 'Tool Group',
  };
  return scope ? (labels[scope] ?? scope) : '-';
}

function formatReversibility(reversibility: string | null | undefined) {
  const labels: Record<string, string> = {
    low: '낮음',
    medium: '보통',
    high: '높음',
  };
  return reversibility ? (labels[reversibility] ?? reversibility) : '-';
}

function isPercentRatioKpi(key: string) {
  return key === 'utilization_avg' || key === 'available_tool_ratio';
}

function formatCompareValue(key: string, value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (key === 'q_time_min') return `${formatNumber(value, 1)}분`;
  if (key === 'wip') return `${formatNumber(value, 0)} Lot`;
  if (isPercentRatioKpi(key)) return `${formatNumber(value * 100, 1)}%`;
  return formatNumber(value, key === 'wait_ratio' || key === 'risk_score' ? 2 : 1);
}

function formatCompareDelta(key: string, value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (key === 'q_time_min') return formatSigned(value, '분', 1);
  if (key === 'wip') return formatSigned(value, ' Lot', 0);
  if (isPercentRatioKpi(key)) return formatSigned(value * 100, '%p', 1);
  return formatSigned(value, '', key === 'wait_ratio' || key === 'risk_score' ? 2 : 1);
}

function formatMonitoringKpis(items: Array<string | CompareMonitoringKpi> | undefined) {
  return (items ?? []).map((item) => {
    if (typeof item === 'string') return item;
    const label = KPI_LABELS[item.kpi] ?? item.kpi;
    const checkAfter = item.check_after_min ? ` · ${item.check_after_min}분 후 확인` : '';
    return `${label} ${item.target}${checkAfter}`;
  });
}

function formatParamLine(key: string, value: unknown) {
  if (value === null || value === undefined || value === false) return null;
  const labels: Record<string, string> = {
    release_interval_minutes: 'Release Interval',
    current_interval_minutes: '현재 Release Interval',
    release_interval_delta_min: 'Release Interval 변경폭',
    lot_priority_rule: '투입 우선순위',
    superhotlot_enable: 'SUPERHOTLOT',
  };
  const label = labels[key] ?? key.replaceAll('_', ' ');
  if (typeof value === 'number') return `${label} ${formatNumber(value, 1)}분`;
  if (typeof value === 'boolean') return `${label} ${value ? '활성화' : '비활성화'}`;
  return `${label} ${String(value)}`;
}

function buildCompareMetrics(effect: CompareActionOption): BncActionPlanMetric[] {
  return Object.entries(effect.kpi_impact).map(([key, item]) => ({
    label: KPI_LABELS[key] ?? key.replaceAll('_', ' '),
    before: formatCompareValue(key, item.now),
    after: formatCompareValue(key, item.after),
    delta: item.delta === 0 ? '변화 없음' : formatCompareDelta(key, item.delta),
  }));
}

function buildCompareExpectedImpact(effect: CompareActionOption) {
  const changed = Object.entries(effect.kpi_impact).filter(([, item]) => item.delta !== 0);
  if (changed.length === 0) return 'KPI 변화 없음';
  return changed
    .slice(0, 3)
    .map(([key, item]) => `${KPI_LABELS[key] ?? key} ${formatCompareDelta(key, item.delta)}`)
    .join(' · ');
}

function buildScoreBreakdown(effect: CompareActionOption): BncActionPlan['scoreBreakdown'] {
  return Object.entries(effect.kpi_impact).map(([key, value]) => ({
    key,
    label: KPI_LABELS[key] ?? key,
    weight: null,
    meanDelta: value.delta,
    verdict: value.verdict,
    contribution: value.pct_change,
    confidence: value.confidence,
    ciWidth: value.ci_width,
    pctChange: value.pct_change,
  }));
}

function buildScoreVerdict(effect: CompareActionOption) {
  const verdicts = Object.values(effect.kpi_impact).map((item) => item.verdict);
  if (verdicts.length > 0 && verdicts.every((verdict) => verdict === 'baseline')) return '현재 기준';
  if (verdicts.length > 0 && verdicts.every((verdict) => verdict === 'unchanged')) return '전 KPI 변화 없음';
  if (verdicts.some((verdict) => verdict === 'improved')) return '핵심 KPI 개선';
  return effect.simulation.verdict ? effect.simulation.verdict.replaceAll('_', ' ') : '-';
}

function buildCompareCurrentMetrics(compare: CompareV2Output) {
  return Object.entries(compare.current_state.kpi).map(([key, item]) => ({
    label: KPI_LABELS[key] ?? key.replaceAll('_', ' '),
    value: formatCompareValue(key, item.value),
    caption: key === 'risk_score' ? '현재 위험 점수' : '현재 기준',
  }));
}

function buildForecastMetrics(compare: CompareV2Output) {
  const forecast = compare.current_state.natural_forecast_2h;
  if (!forecast) return undefined;

  return {
    label: forecast.label,
    getsWorse: forecast.gets_worse,
    metrics: Object.entries(forecast.kpi).map(([key, item]) => ({
      label: KPI_LABELS[key] ?? key.replaceAll('_', ' '),
      value: `${formatCompareValue(key, item.now)} → ${formatCompareValue(key, item.after)}`,
      caption: `${formatCompareDelta(key, item.delta)} · ${formatNumber(item.pct_change, 1)}% · 신뢰도 ${item.reliability}`,
    })),
  };
}

function buildOperationItems(effect: CompareActionOption) {
  const paramItems = Object.entries(effect.params ?? {})
    .map(([key, value]) => formatParamLine(key, value))
    .filter((item): item is string => !!item);
  return [effect.description, ...paramItems];
}

function buildReportMetrics(effectIndex: number): BncActionPlanMetric[] {
  const effect = MOCK_FINAL_BOTTLENECK_REPORT.action_effects[effectIndex];
  const baseline = MOCK_FINAL_BOTTLENECK_REPORT.bottleneck_info;
  const avgQueueDelta = effect.kpi_delta.avg_queue_time_min;
  const wipDelta = effect.kpi_delta.wip_count;
  const throughputDelta = effect.kpi_delta.throughput_delta;

  return [
    {
      label: '평균 대기시간',
      before: `${formatNumber(baseline.avg_queue_time_min)}분`,
      after: `${formatNumber(baseline.avg_queue_time_min + avgQueueDelta)}분`,
      delta: formatSigned(avgQueueDelta, '분'),
    },
    {
      label: 'WIP',
      before: `${baseline.wip_count.toLocaleString('ko-KR')}개`,
      after: `${(baseline.wip_count + wipDelta).toLocaleString('ko-KR')}개`,
      delta: formatSigned(wipDelta, '개', 0),
    },
    {
      label: '처리량',
      before: '현재 기준',
      after: throughputDelta === 0 ? '변화 없음' : formatSigned(throughputDelta, '', 0),
      delta: formatSigned(throughputDelta, '', 0),
    },
  ];
}

function buildFinalReportMetrics(finalReport: FinalBottleneckReport, effectIndex: number): BncActionPlanMetric[] {
  const effect = finalReport.action_effects[effectIndex];
  const baseline = finalReport.bottleneck_info;
  const avgQueueDelta = effect.kpi_delta.avg_queue_time_min;
  const wipDelta = effect.kpi_delta.wip_count;
  const throughputDelta = effect.kpi_delta.throughput_delta;

  return [
    {
      label: '평균 대기시간',
      before: `${formatNumber(baseline.avg_queue_time_min)}분`,
      after: `${formatNumber(baseline.avg_queue_time_min + avgQueueDelta)}분`,
      delta: avgQueueDelta === 0 ? '변화 없음' : formatSigned(avgQueueDelta, '분'),
    },
    {
      label: 'WIP',
      before: `${baseline.wip_count.toLocaleString('ko-KR')}개`,
      after: `${(baseline.wip_count + wipDelta).toLocaleString('ko-KR')}개`,
      delta: wipDelta === 0 ? '변화 없음' : formatSigned(wipDelta, '개', 0),
    },
    {
      label: '처리량',
      before: '현재 기준',
      after: throughputDelta === 0 ? '변화 없음' : formatSigned(throughputDelta, '', 0),
      delta: throughputDelta === 0 ? '변화 없음' : formatSigned(throughputDelta, '', 0),
    },
  ];
}

function buildExpectedImpact(metrics: BncActionPlanMetric[]) {
  return metrics.map((metric) => `${metric.label} ${metric.delta}`).join(' · ');
}

function isRecommendedAction(label: string) {
  return extractActionLabel(label) === MOCK_FINAL_BOTTLENECK_REPORT.recommendation.action_label;
}

function buildCompareActionPlans(caseId: string): BncActionPlansPayload {
  const compare = MOCK_COMPARE_AGENT_OUTPUTS[caseId] ?? MOCK_COMPARE_AGENT_OUTPUTS[COMPARE_CASE_ID];
  if (!compare) {
    return buildGenericActionPlans(caseId);
  }
  const currentEffect = compare.action_options.find(isNoActionCompareEffect) ?? null;
  const currentMetrics = buildCompareCurrentMetrics(compare);
  const candidateEffects = compare.action_options.filter((effect) => effect !== currentEffect);
  const plans: BncActionPlan[] = candidateEffects.map((effect) => {
    const actionLabel = extractActionLabel(effect.label);
    const metrics = buildCompareMetrics(effect);
    const hasNoKpiDelta = Object.values(effect.kpi_impact).every((value) => value.delta === 0);

    return {
      planId: `${caseId}-plan-${actionLabel.toLowerCase()}`,
      actionLabel,
      actionKind: effect.kind,
      title: `${actionLabel}. ${effect.kind}`,
      summary: effect.description,
      expectedImpact: buildCompareExpectedImpact(effect),
      riskText: hasNoKpiDelta
        ? '시뮬레이션 horizon 내 KPI 개선이 관측되지 않아 추가 후보 생성 또는 horizon 재검토가 필요합니다.'
        : '디지털 트윈 시뮬레이션에서 KPI 개선이 관측된 후보입니다.',
      confidence: effect.simulation.simulation_confidence ?? null,
      compositeScore: effect.composite_score,
      scoreVerdict: buildScoreVerdict(effect),
      actionMetadata: {
        effort: effect.operational.effort ?? null,
        scope: formatScope(effect.operational.scope),
        reversibility: formatReversibility(effect.operational.reversibility),
        descriptionKo: effect.kind,
      },
      scoreBreakdown: buildScoreBreakdown(effect),
      tradeoffs: effect.tradeoffs ?? [],
      metrics,
      operationItems: buildOperationItems(effect),
      targetToolGroups: effect.target_toolgroups,
      impactTone: hasNoKpiDelta ? 'neutral' : 'positive',
      recommended: effect.is_recommended || actionLabel === compare.recommendation.recommended_label,
    };
  });
  const recommendedPlan = plans.find((plan) => plan.recommended) ?? plans[0] ?? null;
  const isApproved = compare.approval_info?.status === '승인';
  const isRejected = compare.approval_info?.status === '반려';
  const isAutoApproved = (compare.approval_info?.approved_by ?? '').toUpperCase() === 'AUTO';
  const decisionMeta = compare.decision_meta;

  return {
    caseId,
    baseline: {
      throughput: 0,
      avgWaitDay: 0,
      deliveryCompliance: 0,
      avgDelayDay: 0,
    },
    baselineSnapshot: [
      ...currentMetrics,
      { label: '심각도', value: compare.meta.severity, caption: compare.meta.anchor_toolgroup },
      { label: '예측 구간', value: `${compare.meta.horizon_min}분`, caption: compare.meta.scenario_name },
      { label: '후보 대응안', value: `${candidateEffects.length.toLocaleString('ko-KR')}개`, caption: 'A/B 비교' },
      {
        label: '판정',
        value: decisionMeta
          ? formatDecisionStatus(decisionMeta.decision_status)
          : (compare.recommendation.recommendation_status ?? '-'),
        caption: decisionMeta ? `Top ${decisionMeta.top_label}` : `추천 ${compare.recommendation.recommended_label}`,
      },
    ],
    currentOption: currentEffect
      ? {
          label: currentEffect.label,
          actionKind: currentEffect.kind,
          title: currentEffect.description,
          summary: currentEffect.outcome_if_kept ?? currentEffect.description,
          confidence: currentEffect.simulation.simulation_confidence ?? null,
          compositeScore: currentEffect.composite_score,
          scoreVerdict: buildScoreVerdict(currentEffect),
          metrics: currentMetrics,
          scoreBreakdown: buildScoreBreakdown(currentEffect),
          tradeoffs: currentEffect.tradeoffs ?? [],
        }
      : undefined,
    compareContext: {
      schemaVersion: compare.meta.schema_version,
      scenarioName: compare.meta.scenario_name,
      anchorToolgroup: compare.meta.anchor_toolgroup,
      targetToolgroups: compare.meta.target_toolgroups,
      severity: compare.meta.severity,
      horizonMin: compare.meta.horizon_min,
      generatedAt: compare.meta.generated_at,
      naturalForecast: buildForecastMetrics(compare),
      causeSummary: compare.cause?.summary ?? compare.cause?.consensus?.summary,
      upstreamSuspects: compare.cause?.upstream_suspects ?? [],
      cascade: compare.cascade
        ? {
            affectedToolgroups: compare.cascade.affected_toolgroups ?? [],
            ctIncreaseMin: compare.cascade.ct_increase_min ?? null,
            atRiskLots: compare.cascade.at_risk_lots ?? null,
            capacityStressScore: compare.cascade.capacity_stress_score ?? null,
            impactScore: compare.cascade.impact_score ?? null,
          }
        : undefined,
      dataQuality: compare.data_quality
        ? {
            status: compare.data_quality.status,
            warnings: (compare.data_quality.warnings ?? []).map((warning) => ({
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
      actionLabel: compare.recommendation.recommended_label,
      actionKind: recommendedPlan?.actionKind ?? '',
      reason: [compare.recommendation.primary_reason, compare.recommendation.why_recommended?.explanation]
        .filter(Boolean)
        .join('\n'),
      structured: {
        headline: compare.recommendation.headline,
        primaryReason: compare.recommendation.primary_reason,
        tradeoffs: compare.recommendation.tradeoffs,
        whyNotOthers: compare.recommendation.why_not_others,
        caveats: compare.recommendation.caveats,
        confidenceLevel: compare.recommendation.confidence_level,
        immediateActions: compare.recommendation.immediate_actions,
        monitoringKpis: formatMonitoringKpis(compare.recommendation.monitoring_kpis),
        rollbackCondition: compare.recommendation.rollback_condition,
        whyRecommended: compare.recommendation.why_recommended
          ? {
              selectedBy: compare.recommendation.why_recommended.selected_by,
              tiebreakerChain: compare.recommendation.why_recommended.tiebreaker_chain,
              explanation: compare.recommendation.why_recommended.explanation,
            }
          : undefined,
        recommendationStatus: compare.recommendation.recommendation_status,
      },
    },
    decisionInfo: decisionMeta
      ? {
          decisionStatus: decisionMeta.decision_status,
          topLabel: decisionMeta.top_label,
          equivalentSet: decisionMeta.equivalent_set,
          tiebreakerUsed: decisionMeta.tiebreaker_used,
          decisionCaveat:
            decisionMeta.decision_caveat ||
            compare.recommendation.why_recommended?.explanation ||
            compare.recommendation.primary_reason,
        }
      : undefined,
    approvalInfo: compare.approval_info
      ? {
          status: compare.approval_info.status,
          approvedBy: compare.approval_info.approved_by,
          approvedRole: compare.approval_info.approved_role,
          approvedAt: compare.approval_info.approved_at,
          comment: compare.approval_info.comment,
          rejectionReason: compare.approval_info.rejection_reason,
        }
      : undefined,
    hitlStatus: {
      hasDecision: !isAutoApproved && (isApproved || isRejected),
      latestDecision: !isAutoApproved && isApproved ? 'APPROVED' : !isAutoApproved && isRejected ? 'REJECTED' : null,
      selectedPlanId: recommendedPlan?.planId ?? null,
      comment: !isAutoApproved ? (compare.approval_info?.comment ?? null) : null,
    },
  };
}

function buildReportActionPlans(caseId: string): BncActionPlansPayload {
  const finalReport = caseId === WE_FE_8_CASE_ID ? WE_FE_8_FINAL_REPORT : MOCK_FINAL_BOTTLENECK_REPORT;
  const baseline = finalReport.bottleneck_info;
  const plans: BncActionPlan[] = finalReport.action_effects.map((effect, index) => {
    const actionLabel = extractActionLabel(effect.label);
    const parsed = parseActionDescription(effect.description);
    const metrics =
      caseId === WE_FE_8_CASE_ID ? buildFinalReportMetrics(finalReport, index) : buildReportMetrics(index);
    const hasNoKpiDelta = Object.values(effect.kpi_delta).every((value) => value === 0);

    return {
      planId: `${caseId}-plan-${actionLabel.toLowerCase()}`,
      actionLabel,
      actionKind: effect.action_kind,
      title: `${actionLabel}. ${effect.action_kind}`,
      summary: parsed.operationItems[0] ?? effect.description,
      expectedImpact: buildExpectedImpact(metrics),
      riskText: hasNoKpiDelta
        ? '시뮬레이션상 KPI 개선 폭이 없어 운영 적용 필요성과 현장 리스크 확인이 필요합니다.'
        : '시뮬레이션 결과 기준으로 병목 KPI 개선이 예상됩니다.',
      confidence: effect.simulation_confidence,
      metrics,
      operationItems: parsed.operationItems,
      targetToolGroups: parsed.targetToolGroups,
      impactTone: hasNoKpiDelta ? 'neutral' : 'positive',
      recommended:
        caseId === WE_FE_8_CASE_ID
          ? extractActionLabel(effect.label) === finalReport.recommendation.action_label
          : isRecommendedAction(effect.label),
    };
  });

  const recommendedPlan = plans.find((plan) => plan.recommended) ?? plans[0] ?? null;

  return {
    caseId,
    baseline: {
      throughput: 0,
      avgWaitDay: baseline.avg_queue_time_min / 1440,
      deliveryCompliance: 0,
      avgDelayDay: 0,
    },
    baselineSnapshot: [
      { label: 'Risk Score', value: `${formatNumber(baseline.risk_score)}점`, caption: 'Critical 기준' },
      { label: '지연 주문', value: `${baseline.delayed_orders.toLocaleString('ko-KR')}건`, caption: '영향 주문' },
      {
        label: '평균 대기',
        value: `${formatNumber(baseline.avg_queue_time_min)}분`,
        caption: `최대 ${formatNumber(baseline.peak_q_time_min)}분`,
      },
      { label: 'Wait Ratio', value: formatNumber(baseline.load_ratio, 4), caption: `WIP ${baseline.wip_count}개` },
    ],
    plans,
    recommendation: {
      actionLabel: finalReport.recommendation.action_label,
      actionKind: finalReport.recommendation.action_kind,
      reason: finalReport.recommendation.reason,
      structured:
        caseId === WE_FE_8_CASE_ID
          ? {
              headline: '효과 우위는 미검증, 운영 부담 최저안으로 잠정 승인',
              primaryReason: finalReport.recommendation.reason,
              tradeoffs: [
                '시뮬레이션에서 후보 간 KPI 차이가 관측되지 않음',
                '현장 적용 후 WIP와 평균 대기시간을 짧은 주기로 확인해야 함',
              ],
              whyNotOthers: {
                B: 'standard도 KPI 개선 효과가 conservative와 동일하나 변경폭이 더 큼.',
                C: 'aggressive도 KPI 개선 효과가 확인되지 않았고 운영 변경폭이 가장 큼.',
              },
              caveats: ['SIM_KPI_IDENTICAL 경고가 있어 시뮬레이션 엔진이 what-if 액션을 무시했을 가능성이 있음.'],
              confidenceLevel: 'low',
              immediateActions: [
                '글로벌 플랜 A/B 대상 TG 8개에 Release Interval Δ15.0%를 conservative 기준으로 우선 적용',
                'LithoMet_FE_19, Litho_REG_FE_64, Litho_FE_92의 WIP 누적과 max_util 상승을 동시 점검',
                '시행 후 30분 동안 연쇄 영향 TG의 대기열 증가와 REQUEUE_TOOL 발생 여부 확인',
              ],
              monitoringKpis: ['T+30분 WIP 15개 이하', 'T+30분 평균 대기시간 63.9분 이하', 'T+60분 wait_ratio 완화'],
              rollbackCondition: '조치 후 30분 시점에 WIP가 15개를 초과하거나 평균 대기시간이 63.9분 이상이면 원복',
              recommendationStatus: 'tentative_no_effect',
            }
          : undefined,
    },
    decisionInfo:
      caseId === WE_FE_8_CASE_ID
        ? {
            decisionStatus: 'no_meaningful_effect',
            topLabel: 'A',
            equivalentSet: ['A', 'B', 'C'],
            tiebreakerUsed: 'operational_effort',
            decisionCaveat:
              '모든 후보의 KPI mean_delta가 0으로 관측되어 효과 우위가 아니라 운영 부담 기준으로 conservative를 선택함.',
          }
        : undefined,
    approvalInfo: {
      status: finalReport.approval_info.status,
      approvedBy: finalReport.approval_info.approved_by,
      approvedRole: finalReport.approval_info.approved_role,
      approvedAt: finalReport.approval_info.approved_at,
      comment: finalReport.approval_info.comment,
      rejectionReason: finalReport.approval_info.rejection_reason,
    },
    hitlStatus: {
      hasDecision: caseId === WE_FE_8_CASE_ID,
      latestDecision: caseId === WE_FE_8_CASE_ID ? 'APPROVED' : null,
      selectedPlanId: recommendedPlan?.planId ?? null,
      comment: caseId === WE_FE_8_CASE_ID ? finalReport.approval_info.comment : null,
    },
  };
}

function buildGenericActionPlans(caseId: string): BncActionPlansPayload {
  return {
    caseId,
    baseline: {
      throughput: 3468,
      avgWaitDay: 10.551,
      deliveryCompliance: 95,
      avgDelayDay: 0.078,
    },
    plans: [
      {
        planId: `${caseId}-plan-a`,
        title: 'A. REQUEUE_TOOL',
        summary: '대기 Lot 일부를 가용 Tool로 재배정해 병목 TG의 queue를 낮춤.',
        expectedImpact: 'avg queue time 45분 감소, WIP 3 Lot 감소',
        riskText: '대체 Tool recipe/qualification 확인 필요',
        confidence: 0.91,
        recommended: true,
        metrics: [
          { label: 'Avg Queue', before: '187분', after: '142분', delta: '-45분' },
          { label: 'WIP', before: '18', after: '15', delta: '-3' },
          { label: 'Throughput', before: '8', after: '10', delta: '+2' },
        ],
      },
      {
        planId: `${caseId}-plan-b`,
        title: 'B. LOT_HOLD',
        summary: '급하지 않은 Lot을 일시 보류해 병목 구간 유입을 제한.',
        expectedImpact: 'queue time 10분 감소',
        riskText: 'Q-time 조건 미달 Lot 발생 가능',
        confidence: 0.85,
        recommended: false,
        metrics: [
          { label: 'Avg Queue', before: '187분', after: '177분', delta: '-10분' },
          { label: 'WIP', before: '18', after: '17', delta: '-1' },
          { label: 'Throughput', before: '8', after: '7', delta: '-1' },
        ],
      },
      {
        planId: `${caseId}-plan-c`,
        title: 'C. DISPATCH_RULE_OVERRIDE',
        summary: 'SuperHotLot과 setup avoidance 규칙을 일시 적용.',
        expectedImpact: 'queue time 22분 감소, CQT violation 1건 감소',
        riskText: '규칙 적용 범위를 좁게 유지해야 함',
        confidence: 0.78,
        recommended: false,
        metrics: [
          { label: 'Avg Queue', before: '187분', after: '165분', delta: '-22분' },
          { label: 'WIP', before: '18', after: '16', delta: '-2' },
          { label: 'Throughput', before: '8', after: '9', delta: '+1' },
        ],
      },
    ],
    hitlStatus: {
      hasDecision: false,
      latestDecision: null,
      selectedPlanId: null,
      comment: null,
    },
  };
}

export const MOCK_BNC_CAUSE_ANALYSIS: Record<string, BncCauseAnalysis> = Object.fromEntries(
  DEFAULT_CASE_IDS.map((caseId, index) => {
    const tgName = REPORT_TG_NAMES[index];

    if (caseId === WE_FE_8_CASE_ID) {
      return [
        caseId,
        {
          caseId,
          analysisId: `analysis-${caseId}`,
          predictionSummary: {
            bottleneckProb: 0.9969,
            riskGrade: 'CRITICAL',
            maxWipCount: 15,
            maxUtilizationRate: 0.9896,
          },
          diffusion: {
            affectedToolGroups: [
              { tgId: 'tg-lithomet-fe-19', tgName: 'LithoMet_FE_19', areaName: 'Lithography Metrology' },
              { tgId: 'tg-we-fe-83', tgName: 'WE_FE_83', areaName: 'Wet Etch' },
              { tgId: 'tg-de-fe-1', tgName: 'DE_FE_1', areaName: 'Dry Etch' },
              { tgId: 'tg-dielectric-fe-30', tgName: 'Dielectric_FE_30', areaName: 'Dielectric' },
              { tgId: 'tg-diffusion-fe-125', tgName: 'Diffusion_FE_125', areaName: 'Diffusion' },
            ],
          },
          causeSummary: [
            {
              tgId: 'tg-we-fe-8',
              tgName: 'WE_FE_8',
              bottleneckCauseType: '설비_포화',
              utilRate: 0.9896,
              waitingLots: 15,
              setupRatio: 0,
              slope: 1.2,
            },
            {
              tgId: 'tg-lithomet-fe-19',
              tgName: 'LithoMet_FE_19',
              bottleneckCauseType: '업스트림_WIP_누적',
              utilRate: 0.692,
              waitingLots: 34,
              setupRatio: 0,
              slope: 0.6,
            },
          ],
          shapFeatures: [
            {
              feature: 'max_util_delta_120',
              label: '최대 가동률 120분 변화',
              importance: 0.351,
              rank: 1,
              direction: '병목 쪽으로 기여(+)',
            },
            {
              feature: 'max_util',
              label: '최대 가동률',
              importance: 0.333,
              rank: 2,
              direction: '병목 쪽으로 기여(+)',
            },
            { feature: 'wip', label: 'WIP', importance: 0.17, rank: 3, direction: '병목 쪽으로 기여(+)' },
            {
              feature: 'utilization_avg',
              label: '평균 가동률',
              importance: 0.146,
              rank: 4,
              direction: '병목 쪽으로 기여(+)',
            },
          ],
          trendInsights: [
            { feature: 'wip', label: 'WIP', slopePerHour: 1.2, values: [9, 9, 9, 12, 12, 15] },
            { feature: 'wait_ratio', label: 'Wait Ratio', slopePerHour: 0.6, values: [3.5, 3.5, 3.5, 5, 5, 6.5] },
            {
              feature: 'utilization',
              label: '평균 가동률',
              slopePerHour: 0.0019,
              values: [0.9706, 0.9835, 0.9532, 0.9717, 0.9684, 0.9896],
            },
          ],
          ragSimilarCases: [
            {
              caseId: 'hist-we-fe-8-20260613',
              summary: 'WE_FE_8 설비 포화 패턴 — 가동률 임계 구간에서 Release Interval 보수 조정 검토',
            },
            {
              caseId: 'hist-lithomet-fe-19-upstream',
              summary: 'LithoMet_FE_19 업스트림 WIP 누적 — 후속 Wet Etch 병목 확산 감시',
            },
          ],
          modelPerformance: {
            accuracy: 0.923,
            f1Score: 0.891,
            featureCount: 19,
          },
          forwardForecastText:
            '설비_포화가 total score 0.830으로 가장 높고 SHAP 기여율도 83.0%로 압도적입니다. max_util_delta_120, max_util, utilization_avg가 모두 병목 방향으로 작용해 설비 포화가 주원인으로 판단됩니다.',
          createdAt: '2026-06-13T07:52:22Z',
        },
      ];
    }

    return [
      caseId,
      {
        caseId,
        analysisId: `analysis-${caseId}`,
        predictionSummary: {
          bottleneckProb: REPORT_BOTTLENECK_PROBS[index],
          riskGrade: index === DEFAULT_CASE_IDS.length - 1 ? 'HIGH' : 'CRITICAL',
          maxWipCount: REPORT_MAX_WIP[index],
          maxUtilizationRate: REPORT_UTILIZATION[index],
        },
        diffusion: {
          affectedToolGroups: [
            { tgId: 'tg-litho-be-110', tgName: 'Litho_BE_110', areaName: 'Lithography' },
            { tgId: 'tg-de-be-67', tgName: 'DE_BE_67', areaName: 'Dry Etch' },
            { tgId: 'tg-cmp-be-12', tgName: 'CMP_BE_12', areaName: 'CMP' },
          ],
        },
        causeSummary: [
          {
            tgId: `tg-${tgName.toLowerCase()}`,
            tgName,
            bottleneckCauseType: '작업량 초과',
            utilRate: REPORT_UTILIZATION[index],
            waitingLots: REPORT_WAITING_LOTS[index],
            setupRatio: index === 2 ? 0.06 : 0,
            slope: index === 0 ? 0.5 : index === 1 ? 0.9 : index === DEFAULT_CASE_IDS.length - 1 ? 0.4 : 0.6,
          },
        ],
        shapFeatures: [
          {
            feature: 'max_util',
            label: '설비 최대 가동률',
            importance: index === 0 ? 0.43 : 0.421,
            rank: 1,
            direction: '병목 쪽 기여',
          },
          { feature: 'wip', label: 'WIP', importance: index === 0 ? 0.389 : 0.318, rank: 2, direction: '병목 쪽 기여' },
          {
            feature: 'utilization_avg',
            label: '평균 가동률',
            importance: index === 0 ? 0.121 : 0.174,
            rank: 3,
            direction: index === 0 ? '병목 완화' : '혼잡 증가',
          },
          {
            feature: 'q_time_min_delta_120',
            label: 'Q-time 2h 변화',
            importance: index === 0 ? 0.06 : 0.087,
            rank: 4,
            direction: '병목 쪽 기여',
          },
        ],
        trendInsights: [
          { feature: 'wip', label: 'WIP', slopePerHour: 8.2, values: [196, 214, 228, 244, 261] },
          { feature: 'utilization', label: '가동률', slopePerHour: 0.018, values: [0.82, 0.84, 0.86, 0.88, 0.897] },
          { feature: 'q_time', label: 'Q-time', slopePerHour: 13.4, values: [7029, 7089, 7149, 7209, 7269] },
        ],
        ragSimilarCases: [
          {
            caseId: 'hist-de-fe-72-20260522',
            summary: 'Day 25 DE_FE_72 WIP 급증 — WIP 유입 속도 조절로 해결 (대기일 -0.14일 개선)',
          },
          {
            caseId: 'hist-litho-be-110-20260521',
            summary: 'Day 22 Lithography 후속 TG 확산 — 대기 Lot 우선순위 조정으로 해결',
          },
        ],
        modelPerformance: {
          accuracy: 0.923,
          f1Score: 0.891,
          featureCount: 19,
        },
        forwardForecastText: 'Forward Sim 2시간 예측 기준 WIP와 wait ratio가 추가 악화될 가능성이 높음.',
        createdAt: '2026-06-07T01:16:00Z',
      },
    ];
  })
);

export const MOCK_BNC_ACTION_PLANS: Record<string, BncActionPlansPayload> = Object.fromEntries(
  DEFAULT_CASE_IDS.map((caseId) => {
    if (MOCK_COMPARE_AGENT_OUTPUTS[caseId]) {
      return [caseId, buildCompareActionPlans(caseId)];
    }

    if (caseId === WE_FE_8_CASE_ID || caseId === REPORT_CASE_ID) {
      return [caseId, buildReportActionPlans(caseId)];
    }

    return [caseId, buildGenericActionPlans(caseId)];
  })
);

export const MOCK_BNC_REPORTS: Record<string, BncReportPayload> = Object.fromEntries(
  DEFAULT_CASE_IDS.map((caseId, index) => {
    const tgName = REPORT_TG_NAMES[index];

    if (caseId === WE_FE_8_CASE_ID) {
      return [
        caseId,
        {
          reportId: WE_FE_8_REPORT_ID,
          caseId,
          summary:
            'WE_FE_8에서 risk_score 81.8의 CRITICAL 병목이 확인되었고, WIP 15개와 wait_ratio 6.5로 설비 포화가 임계 수준입니다.',
          rootCauseText:
            '주요 원인은 설비_포화(max_util_delta_120, max_util, utilization_avg)이며, 보조 원인으로 WIP_누적이 확인되었습니다.',
          actionComparisonText: WE_FE_8_FINAL_REPORT.recommendation.reason,
          timeline: [
            { time: '2026-06-13T07:52:22Z', event: 'WE_FE_8 병목 감지' },
            { time: '2026-06-13T07:53:00Z', event: 'SHAP/트렌드/업스트림/G* 원인 분석 완료' },
            { time: '2026-06-13T07:55:00Z', event: 'conservative/standard/aggressive 대응안 비교' },
            { time: '2026-06-13T07:43:00Z', event: 'DJKEE 팀장 승인' },
          ],
          hasPdf: true,
          generatedAt: '2026-06-13T07:52:22Z',
          regeneratedCount: 0,
          qdrantIndexed: true,
          reportV1: WE_FE_8_REPORT_V1,
          finalReport: WE_FE_8_FINAL_REPORT,
        },
      ];
    }

    return [
      caseId,
      {
        reportId: `report-${caseId}`,
        caseId,
        summary:
          caseId === REPORT_CASE_ID
            ? `${MOCK_FINAL_BOTTLENECK_REPORT.meta.process_name} 공정에서 Critical 병목이 감지되었고, 지연 주문 ${MOCK_FINAL_BOTTLENECK_REPORT.bottleneck_info.delayed_orders.toLocaleString('ko-KR')}건과 평균 대기 ${formatNumber(MOCK_FINAL_BOTTLENECK_REPORT.bottleneck_info.avg_queue_time_min)}분이 확인됨.`
            : `${tgName}에서 병목 위험이 감지되었고, WIP 증가와 가동률 상승이 동시에 확인됨.`,
        rootCauseText:
          caseId === REPORT_CASE_ID
            ? 'max_util, WIP, utilization_avg가 주요 기여 요인으로 산출되었고 업스트림 WIP 과공급 가능성이 확인됨.'
            : '주요 원인은 높은 설비 가동률과 대기 Lot 누적이며, 상류 WIP 유입이 후속 TG로 확산될 가능성이 있음.',
        actionComparisonText:
          caseId === REPORT_CASE_ID
            ? MOCK_FINAL_BOTTLENECK_REPORT.recommendation.reason
            : '대응안 비교 결과 REQUEUE_TOOL이 queue time 감소와 throughput 개선 측면에서 가장 효과적임.',
        timeline: [
          { time: '2026-06-07T01:15:00Z', event: '병목 감지' },
          { time: '2026-06-07T01:16:00Z', event: '원인 분석 완료' },
          { time: '2026-06-07T01:18:00Z', event: '대응안 생성/비교 완료' },
        ],
        hasPdf: true,
        generatedAt: '2026-06-07T01:22:00Z',
        regeneratedCount: index === 1 ? 1 : 0,
        qdrantIndexed: true,
        finalReport: MOCK_FINAL_BOTTLENECK_REPORT,
      },
    ];
  })
);

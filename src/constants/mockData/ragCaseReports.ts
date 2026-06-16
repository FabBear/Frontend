import { DE_FE_1_REPORT_V1 } from '@/constants/mockData/bncArtifacts';

import type { BncReportPayload } from '@/types/bnc';
import type { ReportV1 } from '@/types/report';

export const RAG_CASE_IDS = [
  'demo-de-fe-1-c-20250219',
  'demo-de-fe-1-s-20250318',
  'demo-de-fe-1-s-20250424',
  'demo-de-fe-1-a-20250703',
  'demo-de-fe-1-a-20250814',
  'demo-de-fe-1-s-20250902',
] as const;

type CaseLabel = 'conservative' | 'standard' | 'aggressive';

const DECISION_CAVEATS: Record<CaseLabel, string> = {
  conservative:
    'conservative 적용이 승인되었습니다. 적용 직후 30분간 DE_FE_1과 Diffusion_FE_125의 WIP와 queue를 모니터링하세요.',
  standard: 'standard 적용이 승인되었습니다. 적용 직후 30분 동안 신규 Lot dispatch 패턴과 queue 적체를 확인하세요.',
  aggressive:
    'aggressive 적용이 조건부 승인되었습니다. 납기 긴급 조건 전제이며 Diffusion_FE_125 WIP 집중을 집중 모니터링하세요.',
};

interface TgKpi {
  q_time_min: number;
  wip: number;
  wait_ratio: number;
  utilization_avg: number;
  available_tool_ratio: number;
}

interface PlaybookItem {
  order: number;
  text: string;
}
interface MonitoringItem {
  kpi: string;
  target: string;
  unit: string;
  check_after_min: number;
}
interface WhyNotOther {
  label: string;
  reason: string;
}
interface RagHit {
  caseId: string;
  score: number;
  title: string;
  summary: string;
}
interface CandidateImpactDeltas {
  conservative: number;
  standard: number;
  aggressive: number;
}
interface TopFeature {
  feature: string;
  value: number;
  shap: number;
  contributionPct: number;
}
interface CauseCategoryPatch {
  name: string;
  features: string[];
  shapSharePct: number;
  totalScore: number;
  confidence: string;
  upstreamMatch: boolean;
  gStarConfirmed: boolean;
}

interface CasePatch {
  // meta / approval
  detectedAt: string;
  generatedAt: string;
  selectedLabel: CaseLabel;
  approvedAt: string;
  approvalComment: string;

  // sections text
  sectionsSummary: string;
  sectionAction: string;

  // risk indicators
  riskScore: number; // displayed score (e.g. 72.1)
  probability: number; // bottleneck probability
  gStarProbability: number;

  // T+120 no-action projection
  noActionQtime: number;
  noActionWip: number;
  noActionWaitRatio: number;

  // trend series: 6 points [T-300, T-240, T-180, T-120, T-60, T-0]
  trendQtime: number[];
  trendWip: number[];
  trendUtil: number[];

  // cause
  causeSummary: string;
  primaryFeature: string;
  topFeatures: TopFeature[];
  causeCategories: CauseCategoryPatch[];

  // diffusion
  diffusionCurrentWip: number;
  diffusionUtilPct: number;
  diffusionImpactScore: number;
  diffusionLineStopMin: number;
  diffusionQtimeFuture: number;
  diffusionWipFuture: number;

  // approved candidate
  approvedCandidateDescription: string;
  approvedCandidateReleaseIntervalPct: number;

  // TG forecasts for approved candidate (from MD KPI 표)
  approvedTgForecasts: Record<string, { current: TgKpi; action: TgKpi }>;

  // per-candidate kpi_impact values from each MD 대응안 비교 table
  kpiAfterQtime: { conservative: number; standard: number; aggressive: number };
  kpiWipDelta: CandidateImpactDeltas;

  // decision reasoning (from MD)
  tradeoffs: string[];
  caveats: string[];
  whyNotOthers: WhyNotOther[];

  // playbook (from MD)
  playbookImmediateActions: PlaybookItem[];
  playbookMonitoring: MonitoringItem[];

  // RAG evidence
  ragHits: RagHit[];
}

const TREND_OFFSETS_MIN = [-300, -240, -180, -120, -60, 0];

function round(value: number, digits = 2): number {
  return +value.toFixed(digits);
}

function linearSlopePerHour(values: number[]): number {
  const n = Math.min(values.length, TREND_OFFSETS_MIN.length);
  if (n < 2) return 0;

  const xs = TREND_OFFSETS_MIN.slice(TREND_OFFSETS_MIN.length - n).map((offset) => offset / 60);
  const ys = values.slice(values.length - n);
  const xAvg = xs.reduce((sum, value) => sum + value, 0) / n;
  const yAvg = ys.reduce((sum, value) => sum + value, 0) / n;
  const numerator = xs.reduce((sum, value, index) => sum + (value - xAvg) * (ys[index] - yAvg), 0);
  const denominator = xs.reduce((sum, value) => sum + (value - xAvg) ** 2, 0);

  return denominator === 0 ? 0 : round(numerator / denominator, 4);
}

function currentDeFe(p: CasePatch): TgKpi {
  return p.approvedTgForecasts.DE_FE_1.current;
}

function currentDiffusion(p: CasePatch): TgKpi {
  return p.approvedTgForecasts.Diffusion_FE_125.current;
}

function toForecastValues(kpi: TgKpi): Record<string, number> {
  return { ...kpi };
}

function standardReleasePct(p: CasePatch): number {
  return p.selectedLabel === 'standard' ? p.approvedCandidateReleaseIntervalPct : 22;
}

function candidateDescription(label: CaseLabel, p: CasePatch): string {
  if (label === 'conservative') return 'Release Interval Δ16.0% / 효과 제한적';
  if (label === 'standard') {
    const pct = standardReleasePct(p);
    return `Release Interval Δ${pct}.0% / ${pct === 23 ? '반복 검증·균형 최적' : '균형 우수'}`;
  }
  return 'Release Interval Δ28.0% + SHL / 효과 큼·리스크 큼';
}

function candidateScore(label: CaseLabel, p: CasePatch): number {
  const scoreTable: Record<CaseLabel, Record<CaseLabel, number>> = {
    conservative: { conservative: 0.68, standard: 0.6, aggressive: 0.42 },
    standard: {
      conservative: 0.34,
      standard: p.approvedCandidateReleaseIntervalPct === 23 ? 0.78 : 0.74,
      aggressive: 0.58,
    },
    aggressive: { conservative: 0.28, standard: 0.57, aggressive: 0.77 },
  };

  return scoreTable[p.selectedLabel][label];
}

function candidateActionKpi(label: CaseLabel, p: CasePatch): TgKpi {
  const current = currentDeFe(p);
  const selectedForecast = p.approvedTgForecasts.DE_FE_1.action;

  if (label === p.selectedLabel) return selectedForecast;

  const qTime = p.kpiAfterQtime[label];
  const wip = current.wip + p.kpiWipDelta[label];
  if (label === 'conservative') {
    return { q_time_min: qTime, wip, wait_ratio: 0.39, utilization_avg: 0.98, available_tool_ratio: 1 };
  }
  if (label === 'standard') {
    const isRepeat23 = standardReleasePct(p) === 23;
    return {
      q_time_min: qTime,
      wip,
      wait_ratio: isRepeat23 ? 0.15 : 0.17,
      utilization_avg: isRepeat23 ? 0.86 : 0.87,
      available_tool_ratio: 1,
    };
  }
  return {
    q_time_min: qTime,
    wip,
    wait_ratio: 0.08,
    utilization_avg: 0.77,
    available_tool_ratio: p.selectedLabel === 'aggressive' ? selectedForecast.available_tool_ratio : 0.89,
  };
}

function impactVerdict(
  kpi: string,
  delta: number
): Pick<ReportV1['actions']['candidates'][number]['kpi_impact'][number], 'verdict' | 'verdict_token'> {
  if (Math.abs(delta) < 0.0001) return { verdict: 'no_change', verdict_token: 'no_change' };
  const lowerIsBetter = kpi !== 'available_tool_ratio';
  const improved = lowerIsBetter ? delta < 0 : delta > 0;
  return improved
    ? { verdict: 'improved', verdict_token: 'improved' }
    : { verdict: 'degraded', verdict_token: 'degraded' };
}

function applyImpact(
  impact: ReportV1['actions']['candidates'][number]['kpi_impact'][number],
  now: number,
  after: number
) {
  impact.now = round(now, 4);
  impact.after = round(after, 4);
  impact.delta = round(after - now, 4);
  impact.pct_change = now === 0 ? 0 : round((impact.delta / now) * 100, 1);
  Object.assign(impact, impactVerdict(impact.kpi, impact.delta));
  impact.significant = Math.abs(impact.delta) > 0.0001;
}

function applyCandidateImpacts(candidate: ReportV1['actions']['candidates'][number], p: CasePatch) {
  const current = currentDeFe(p);
  const action =
    candidate.label === '현재상태'
      ? {
          q_time_min: p.noActionQtime,
          wip: p.noActionWip,
          wait_ratio: p.noActionWaitRatio,
          utilization_avg: 1,
          available_tool_ratio: 1,
        }
      : candidateActionKpi(candidate.label as CaseLabel, p);

  for (const impact of candidate.kpi_impact) {
    const now = current[impact.kpi as keyof TgKpi];
    const after = action[impact.kpi as keyof TgKpi];
    if (typeof now === 'number' && typeof after === 'number') {
      applyImpact(impact, now, after);
    }
  }
}

function applyCandidateParams(candidate: ReportV1['actions']['candidates'][number], p: CasePatch) {
  if (candidate.label === '현재상태') return;

  const label = candidate.label as CaseLabel;
  candidate.description = candidateDescription(label, p);
  candidate.composite_score = candidateScore(label, p);
  candidate.comparison_basis = 'MD 대응안 비교표 기준(현재 대비)';

  if (!candidate.params || !('release_interval_delta_pct' in candidate.params)) return;
  const pct = label === 'conservative' ? 16 : label === 'standard' ? standardReleasePct(p) : 28;
  (candidate.params as Record<string, unknown>).release_interval_delta_pct = pct;
}

function applyCauseEvidence(r: ReportV1, p: CasePatch) {
  r.cause.primary.feature = p.primaryFeature;
  r.cause.primary.reasoning = p.causeSummary;
  r.cause.shap_top = p.topFeatures.map((item, index) => ({
    rank: index + 1,
    feature: item.feature,
    value: item.value,
    shap: item.shap,
    contribution_pct: item.contributionPct,
    direction_token: 'bottleneck_positive',
  }));
  r.cause.categories = p.causeCategories.map((category) => ({
    name: category.name,
    features: category.features,
    shap_share_pct: category.shapSharePct,
    n_trend_significant: 3,
    upstream_match: category.upstreamMatch,
    g_star_confirmed: category.gStarConfirmed,
    total_score: category.totalScore,
    confidence: category.confidence,
    confidence_token: category.confidence.toLowerCase(),
  }));
  r.cause.secondary_categories = p.causeCategories.slice(1, 3).map((category) => category.name);
}

function buildRecommendationHeadline(p: CasePatch): string {
  if (p.selectedLabel === 'conservative') return 'INTERVAL 승인 - 낮은 실행 리스크 우선';
  if (p.selectedLabel === 'aggressive') return 'DISPATCH_RULE_OVERRIDE + SHL 승인 - 긴급 lot 우선';
  return `DISPATCH_RULE_OVERRIDE 승인 - Release Interval +${p.approvedCandidateReleaseIntervalPct}% 기준안`;
}

function buildRecommendationReason(p: CasePatch): string {
  const current = currentDeFe(p);
  const action = p.approvedTgForecasts.DE_FE_1.action;
  const diffusionAction = p.approvedTgForecasts.Diffusion_FE_125.action;

  return `${p.sectionsSummary} 승인안 적용 시 DE_FE_1 q_time은 ${current.q_time_min.toFixed(2)}분에서 ${action.q_time_min.toFixed(2)}분, WIP는 ${current.wip}개에서 ${action.wip}개로 이동합니다. Diffusion_FE_125는 q_time ${diffusionAction.q_time_min.toFixed(2)}분, WIP ${diffusionAction.wip}개 전망입니다.`;
}

function buildRagCandidateEvidence(p: CasePatch): NonNullable<ReportV1['rag_evidence']>['candidates'] {
  return [
    {
      label: 'conservative',
      evidence: {
        candidate_summary:
          p.selectedLabel === 'conservative'
            ? '이번 MD에서 채택된 보수안입니다. Release Interval +16% 단독으로 실행 리스크는 낮지만 회복 폭은 제한됩니다.'
            : '보수안은 Release Interval +16% 단독이라 운영 충격은 낮지만 복합 병목을 빠르게 꺾기에는 약합니다.',
        risk_level: 'low',
        evidence_strength: p.selectedLabel === 'conservative' ? 'strong' : 'moderate',
        effect_outlook: '안전성 우선, 회복 제한',
        claims: [
          'MD 비교표 기준 보수안은 q_time +17.0분, WIP +1로 개선 폭이 제한적입니다.',
          'Diffusion_FE_125 WIP 집중은 완전히 해소되지 않아 회복 지연 시 표준안 전환이 필요합니다.',
        ],
      },
    },
    {
      label: 'standard',
      evidence: {
        candidate_summary:
          p.selectedLabel === 'standard'
            ? `이번 MD에서 채택된 표준안입니다. Release Interval +${p.approvedCandidateReleaseIntervalPct}%와 Product_3/Product_4 priority 20 조합으로 균형 안정화를 목표로 합니다.`
            : '표준안은 WIP와 대기 개선 균형이 좋지만 긴급 lot 우선 처리 속도는 aggressive보다 낮습니다.',
        risk_level: 'low',
        evidence_strength: p.selectedLabel === 'standard' ? 'strong' : 'moderate',
        effect_outlook: '균형 개선',
        claims: [
          `MD 비교표 기준 표준안 q_time 변화는 ${round(p.kpiAfterQtime.standard - currentDeFe(p).q_time_min, 2)}분, WIP 변화는 ${p.kpiWipDelta.standard}입니다.`,
          '가용성 저하 없이 Diffusion_FE_125 WIP를 유지하는 반복 사례가 있습니다.',
        ],
      },
    },
    {
      label: 'aggressive',
      evidence: {
        candidate_summary:
          p.selectedLabel === 'aggressive'
            ? '이번 MD에서 조건부 채택된 강화안입니다. 긴급 lot 처리 속도는 가장 빠르지만 Diffusion_FE_125 WIP 집중과 가용성 저하를 동반합니다.'
            : '강화안은 대기 개선 폭은 가장 크지만 Diffusion_FE_125 WIP 집중과 가용성 저하 리스크가 큽니다.',
        risk_level: 'medium',
        evidence_strength: p.selectedLabel === 'aggressive' ? 'strong' : 'moderate',
        effect_outlook: '빠른 개선, 운영 리스크 동반',
        claims: [
          `MD 비교표 기준 강화안 q_time 변화는 ${round(p.kpiAfterQtime.aggressive - currentDeFe(p).q_time_min, 2)}분, WIP 변화는 ${p.kpiWipDelta.aggressive}입니다.`,
          'SHL 포함 시 Diffusion_FE_125 WIP 편중과 available_tool_ratio 하락이 반복 관측됩니다.',
        ],
      },
    },
  ];
}

function patchReportV1(p: CasePatch): ReportV1 {
  const r = JSON.parse(JSON.stringify(DE_FE_1_REPORT_V1)) as ReportV1;
  const current = currentDeFe(p);
  const currentDiff = currentDiffusion(p);
  const currentQtime = current.q_time_min;
  const currentWip = current.wip;
  const prevQtime = p.trendQtime[4]; // T-60
  const prevWip = p.trendWip[4];

  // ── meta ──────────────────────────────────────────────────────────────────
  r.meta.detected_at = p.detectedAt;
  r.meta.generated_at = p.generatedAt;

  // ── approval ──────────────────────────────────────────────────────────────
  r.approval.selected_label = p.selectedLabel;
  r.approval.approved_at = p.approvedAt;
  r.approval.approver_name = '담당자';
  r.approval.approver_role = '팀원';
  r.approval.comment = p.approvalComment;

  // ── risk ──────────────────────────────────────────────────────────────────
  r.risk.score = p.riskScore;
  r.risk.composite_score = +(p.riskScore / 100).toFixed(4);
  r.risk.probability = p.probability;

  // ── confidence ────────────────────────────────────────────────────────────
  r.confidence.g_star_probability = p.gStarProbability;

  // ── if_no_action ──────────────────────────────────────────────────────────
  for (const kc of r.if_no_action.kpi_changes) {
    if (kc.kpi === 'q_time_min') {
      kc.now = currentQtime;
      kc.after = p.noActionQtime;
      kc.delta = +(p.noActionQtime - currentQtime).toFixed(2);
      kc.pct_change = +((kc.delta / currentQtime) * 100).toFixed(1);
    } else if (kc.kpi === 'wip') {
      kc.now = currentWip;
      kc.after = p.noActionWip;
      kc.delta = p.noActionWip - currentWip;
      kc.pct_change = +((kc.delta / currentWip) * 100).toFixed(1);
    } else if (kc.kpi === 'wait_ratio') {
      kc.now = current.wait_ratio;
      kc.after = p.noActionWaitRatio;
      kc.delta = +(p.noActionWaitRatio - kc.now).toFixed(2);
      kc.pct_change = +((kc.delta / kc.now) * 100).toFixed(1);
    } else if (kc.kpi === 'utilization_avg') {
      kc.now = current.utilization_avg;
      kc.after = 1;
      kc.delta = +(kc.after - kc.now).toFixed(4);
      kc.pct_change = +((kc.delta / kc.now) * 100).toFixed(1);
    }
  }

  // ── bottleneck_kpis ───────────────────────────────────────────────────────
  for (const bk of r.bottleneck_kpis) {
    if (bk.key === 'risk_score') {
      bk.value = p.riskScore;
    } else if (bk.key === 'q_time_min') {
      bk.value = currentQtime;
      bk.prev_value = prevQtime;
      bk.delta = +(currentQtime - prevQtime).toFixed(2);
      bk.pct_change = +((bk.delta / prevQtime) * 100).toFixed(1);
    } else if (bk.key === 'wip') {
      bk.value = currentWip;
      bk.prev_value = prevWip;
      bk.delta = currentWip - prevWip;
      bk.pct_change = +((bk.delta / prevWip) * 100).toFixed(1);
    } else if (bk.key === 'wait_ratio') {
      bk.value = current.wait_ratio;
      bk.prev_value =
        p.trendWip[4] === 0 ? current.wait_ratio : round(current.wait_ratio + (prevWip - currentWip) * 0.02, 2);
      bk.delta = round(bk.value - (bk.prev_value ?? bk.value), 2);
      bk.pct_change = bk.prev_value ? round((bk.delta / bk.prev_value) * 100, 1) : 0;
    } else if (bk.key === 'utilization_avg') {
      const prevUtil = p.trendUtil[4];
      bk.value = p.trendUtil[5];
      bk.prev_value = prevUtil;
      bk.delta = +(p.trendUtil[5] - prevUtil).toFixed(4);
      bk.pct_change = +((bk.delta / prevUtil) * 100).toFixed(2);
    } else if (bk.key === 'available_tool_ratio') {
      bk.value = current.available_tool_ratio;
      bk.prev_value = 1;
      bk.delta = round(current.available_tool_ratio - 1, 4);
      bk.pct_change = round(bk.delta * 100, 1);
    }
  }

  // ── cause ─────────────────────────────────────────────────────────────────
  r.cause.summary = p.causeSummary;
  applyCauseEvidence(r, p);
  r.sections.cause = p.causeSummary.split('[업스트림]')[0].trim();
  r.cause.trend_series.features.q_time_min.values = p.trendQtime;
  r.cause.trend_series.features.wip.values = p.trendWip;
  r.cause.trend_series.features.utilization_avg.values = p.trendUtil;

  r.cause.trend_series.features.q_time_min.slope_per_hour = linearSlopePerHour(p.trendQtime);
  r.cause.trend_series.features.wip.slope_per_hour = linearSlopePerHour(p.trendWip);
  r.cause.trend_series.features.utilization_avg.slope_per_hour = linearSlopePerHour(p.trendUtil);

  // ── diffusion ─────────────────────────────────────────────────────────────
  if (r.diffusion.high_impact_processes[0]) {
    r.diffusion.high_impact_processes[0].wip = p.diffusionCurrentWip;
    r.diffusion.high_impact_processes[0].utilization_pct = p.diffusionUtilPct;
    r.diffusion.high_impact_processes[0].impact_score = p.diffusionImpactScore;
    r.diffusion.high_impact_processes[0].wait_ratio = currentDiff.wait_ratio;
  }
  r.diffusion.line_stop_expected_min = p.diffusionLineStopMin;
  if (r.diffusion.forward_simulation.results[0]) {
    r.diffusion.forward_simulation.results[0].toolgroup = 'Diffusion_FE_125';
    r.diffusion.forward_simulation.results[0].q_time_min_future = p.diffusionQtimeFuture;
    r.diffusion.forward_simulation.results[0].wip_future = p.diffusionWipFuture;
    r.diffusion.forward_simulation.results[0].wait_ratio_future = round(
      p.diffusionWipFuture / Math.max(1, currentDiff.wip),
      2
    );
  }

  // ── actions: candidates ───────────────────────────────────────────────────
  r.actions.approved_label = p.selectedLabel;
  r.actions.decision_caveat = DECISION_CAVEATS[p.selectedLabel];
  r.actions.decision_status =
    p.selectedLabel === 'aggressive'
      ? '조건부 승인'
      : p.selectedLabel === 'conservative'
        ? '리스크 우선 승인'
        : '명확한 1위';

  for (const c of r.actions.candidates) {
    c.is_approved = c.label === p.selectedLabel;
    applyCandidateImpacts(c, p);

    if (c.label === '현재상태') {
      c.per_tg_forecasts = {
        DE_FE_1: {
          current: toForecastValues(current),
          no_action: {
            q_time_min: p.noActionQtime,
            wip: p.noActionWip,
            wait_ratio: p.noActionWaitRatio,
            utilization_avg: 1,
            available_tool_ratio: 1,
          },
          action: {
            q_time_min: p.noActionQtime,
            wip: p.noActionWip,
            wait_ratio: p.noActionWaitRatio,
            utilization_avg: 1,
            available_tool_ratio: 1,
          },
        },
        Diffusion_FE_125: {
          current: toForecastValues(currentDiff),
          no_action: {
            q_time_min: p.diffusionQtimeFuture,
            wip: p.diffusionWipFuture,
            wait_ratio: round(p.diffusionWipFuture / Math.max(1, currentDiff.wip), 2),
            utilization_avg: 1,
            available_tool_ratio: 1,
          },
          action: {
            q_time_min: p.diffusionQtimeFuture,
            wip: p.diffusionWipFuture,
            wait_ratio: round(p.diffusionWipFuture / Math.max(1, currentDiff.wip), 2),
            utilization_avg: 1,
            available_tool_ratio: 1,
          },
        },
      };
      continue;
    }

    applyCandidateParams(c, p);

    if (c.label === p.selectedLabel) {
      c.description = p.approvedCandidateDescription;
      c.per_tg_forecasts = p.approvedTgForecasts as unknown as typeof c.per_tg_forecasts;
      c.tradeoffs = p.tradeoffs;
    }
  }

  // ── recommendation ────────────────────────────────────────────────────────
  r.actions.recommendation.headline = buildRecommendationHeadline(p);
  r.actions.recommendation.primary_reason = buildRecommendationReason(p);
  r.actions.recommendation.tradeoffs = p.tradeoffs;
  r.actions.recommendation.why_not_others = p.whyNotOthers;
  r.actions.recommendation.caveats = p.caveats;
  r.actions.recommendation.selected_by = 'HITL 승인';

  // ── playbook ──────────────────────────────────────────────────────────────
  r.actions.playbook.immediate_actions = p.playbookImmediateActions;
  r.actions.playbook.monitoring = p.playbookMonitoring;

  // ── sections / rendered ───────────────────────────────────────────────────
  r.sections.summary = p.sectionsSummary;
  r.sections.action = p.sectionAction;
  r.rendered.markdown = `# DE_FE_1 병목 대응 보고서\n\n병목 위험 점수 ${p.riskScore}. ${p.selectedLabel} 승인.`;

  // ── rag_evidence ──────────────────────────────────────────────────────────
  const ragEvidence = r.rag_evidence ?? (r.rag_evidence = {});
  ragEvidence.common_hits = p.ragHits.map((h) => ({
    case_id: h.caseId,
    score: h.score,
    tg_code: 'DE_FE_1 + Diffusion_FE_125',
    cause_summary: h.summary,
    report_title: h.title,
  }));
  ragEvidence.candidates = buildRagCandidateEvidence(p);
  ragEvidence.comparison = {
    ranking_status: p.selectedLabel === 'aggressive' ? 'conditional_winner' : 'approved_winner',
    ranking: [],
    rag_summary: `${p.selectedLabel} 승인안은 해당 MD의 검토 결과와 KPI 표를 기준으로 구성했습니다.`,
    overall_comment: p.tradeoffs[0] ?? p.sectionsSummary,
  };

  return r;
}

// ─── Shared current-state KPIs ────────────────────────────────────────────────
const BASE_CURRENT: TgKpi = {
  q_time_min: 62.96,
  wip: 10,
  wait_ratio: 0.25,
  utilization_avg: 0.9943,
  available_tool_ratio: 1.0,
};
const DIFF_CURRENT: TgKpi = {
  q_time_min: 35.98,
  wip: 5,
  wait_ratio: 0.25,
  utilization_avg: 0.8153,
  available_tool_ratio: 1.0,
};

// ─── CASE_PATCHES ─────────────────────────────────────────────────────────────
const CASE_PATCHES: CasePatch[] = [
  // ── 01: conservative 2025-02-19 ─────────────────────────────────────────
  {
    detectedAt: '2025-02-19 00:00',
    generatedAt: '2025-02-19 02:30',
    selectedLabel: 'conservative',
    approvedAt: '2025-02-19 01:00',
    approvalComment: 'conservative 대응안 채택 — 낮은 실행 리스크 우선',

    riskScore: 72.1,
    probability: 0.978,
    gStarProbability: 0.612,

    noActionQtime: 88.2,
    noActionWip: 11,
    noActionWaitRatio: 0.42,

    trendQtime: [3.0, 9.0, 20.1, 38.4, 51.5, 62.96],
    trendWip: [3, 4, 6, 8, 9, 10],
    trendUtil: [0.31, 0.45, 0.72, 0.89, 0.96, 0.9943],

    causeSummary:
      '[주요 원인] 설비_포화(max_util 중심) 경향이 주요 원인이나 WIP 누적이 상대적으로 낮아 보수 조치로 안정화 가능했습니다. [악화 추세] utilization_avg +0.122/h로 상승 중입니다. [업스트림] DE_FE_86에서 경미한 WIP 공급 부담이 감지됩니다.',
    primaryFeature: 'max_util',
    topFeatures: [
      { feature: 'max_util', value: 1.0, shap: 0.33, contributionPct: 34.0 },
      { feature: 'utilization_avg', value: 0.9943, shap: 0.23, contributionPct: 24.0 },
      { feature: 'q_time_slope_h', value: 16.7, shap: 0.16, contributionPct: 17.0 },
      { feature: 'diffusion_wip_projection', value: 14, shap: 0.14, contributionPct: 14.0 },
      { feature: 'upstream_wip_light', value: 1, shap: 0.11, contributionPct: 11.0 },
    ],
    causeCategories: [
      {
        name: '설비_포화',
        features: ['max_util', 'utilization_avg'],
        shapSharePct: 58,
        totalScore: 0.82,
        confidence: 'HIGH',
        upstreamMatch: false,
        gStarConfirmed: false,
      },
      {
        name: 'WIP_누적',
        features: ['q_time_slope_h', 'diffusion_wip_projection'],
        shapSharePct: 25,
        totalScore: 0.49,
        confidence: 'MEDIUM',
        upstreamMatch: false,
        gStarConfirmed: false,
      },
      {
        name: '업스트림_공급부담',
        features: ['upstream_wip_light'],
        shapSharePct: 17,
        totalScore: 0.31,
        confidence: 'LOW',
        upstreamMatch: true,
        gStarConfirmed: false,
      },
    ],

    diffusionCurrentWip: 4,
    diffusionUtilPct: 78.0,
    diffusionImpactScore: 0.612,
    diffusionLineStopMin: 2050,
    diffusionQtimeFuture: 46.0,
    diffusionWipFuture: 16,

    approvedCandidateDescription: 'Release Interval Δ16.0%',
    approvedCandidateReleaseIntervalPct: 16,
    approvedTgForecasts: {
      DE_FE_1: {
        current: BASE_CURRENT,
        action: { q_time_min: 80.0, wip: 11, wait_ratio: 0.39, utilization_avg: 0.98, available_tool_ratio: 1.0 },
      },
      Diffusion_FE_125: {
        current: DIFF_CURRENT,
        action: { q_time_min: 41.5, wip: 14, wait_ratio: 2.55, utilization_avg: 0.96, available_tool_ratio: 1.0 },
      },
    },

    kpiAfterQtime: { conservative: 80.0, standard: 58.0, aggressive: 48.0 },
    kpiWipDelta: { conservative: 1, standard: -2, aggressive: -4 },

    tradeoffs: ['인터벌 단독 적용으로 무대응 대비 추가 악화는 막았으나 WIP 완전 해소는 실패했다.'],
    caveats: ['인터벌 단독 조치는 복합 병목 완전 해소에 역부족 — 회복 지연 시 표준안 전환 필요.'],
    whyNotOthers: [
      {
        label: 'standard',
        reason:
          '보수안보다 WIP·대기 개선 폭이 크고 두 TG를 더 빠르게 안정화하지만, 납기 긴급 조건이 없어 최소 충격 원칙을 우선했다.',
      },
      {
        label: 'aggressive',
        reason: '효과는 더 크지만 Diffusion_FE_125 WIP 집중과 가용성 저하 리스크가 커서 일반 상황에서는 과하다.',
      },
    ],

    playbookImmediateActions: [
      { order: 1, text: 'Release Interval을 fab-wide로 +16% 조정합니다.' },
      { order: 2, text: '적용 직후 30분간 DE_FE_1과 Diffusion_FE_125의 WIP와 queue 적체를 모니터링합니다.' },
    ],
    playbookMonitoring: [
      { kpi: 'wip', target: 'DE_FE_1 11개, Diffusion_FE_125 14개 수준 유지 여부 확인', unit: '', check_after_min: 30 },
      {
        kpi: 'wait_ratio',
        target: 'DE_FE_1 0.39, Diffusion_FE_125 2.55 이하 수준 확인',
        unit: '',
        check_after_min: 60,
      },
    ],

    sectionsSummary:
      'DE_FE_1과 Diffusion_FE_125에서 설비_포화가 동시에 진행됐고 Release Interval +16% 단독 적용이 승인되었다. 낮은 실행 리스크는 확인됐지만 복합 병목을 꺾는 힘은 약했고 회복 속도도 가장 느렸다.',
    sectionAction: 'conservative: INTERVAL / Release Interval Δ16.0% → DE_FE_1 WIP 10→11, q_time 62.96→80.0분.',

    ragHits: [
      {
        caseId: 'demo-3780-conservative',
        score: 0.92,
        title: 'DE_FE_1 conservative 복합 대응 합성 사례',
        summary: 'Release Interval +15%는 운영 리스크가 낮지만 복합 병목 회복 폭이 제한적인 것으로 기록됐습니다.',
      },
      {
        caseId: 'demo-3780-standard',
        score: 0.87,
        title: 'DE_FE_1 standard 복합 대응 합성 사례',
        summary:
          'Release Interval +22%, Product_3/Product_4 우선순위 상향으로 두 TG의 WIP와 대기를 균형 있게 낮춘 사례입니다.',
      },
      {
        caseId: 'demo-3780-aggressive',
        score: 0.79,
        title: 'DE_FE_1 aggressive 복합 대응 합성 사례',
        summary:
          'Release Interval +28%와 SuperHotLot 적용은 대기 개선이 빠르지만 Diffusion_FE_125 WIP 편중과 가용성 저하가 동반됐습니다.',
      },
    ],
  },

  // ── 02: standard 2025-03-18 ───────────────────────────────────────────────
  {
    detectedAt: '2025-03-18 00:00',
    generatedAt: '2025-03-18 02:30',
    selectedLabel: 'standard',
    approvedAt: '2025-03-18 01:00',
    approvalComment: 'standard 대응안 채택 — 인터벌 + 제한적 우선순위 조합',

    riskScore: 76.4,
    probability: 0.9874,
    gStarProbability: 0.6867,

    noActionQtime: 92.1,
    noActionWip: 12,
    noActionWaitRatio: 0.48,

    trendQtime: [0, 0, 22.24, 43.5, 55.8, 62.96],
    trendWip: [4, 4, 6, 8, 9, 10],
    trendUtil: [0.3389, 0.5, 0.8875, 0.95, 0.9761, 0.9943],

    causeSummary:
      '[주요 원인] 설비_포화(max_util 중심)로 인한 병목이 핵심입니다. [악화 추세] utilization_avg가 +0.138/h로, WIP가 +1.714/h로 증가 중입니다. [업스트림] DE_FE_86에서 WIP 과공급 부담이 동반됩니다.',
    primaryFeature: 'max_util',
    topFeatures: [
      { feature: 'max_util', value: 1.0, shap: 0.29, contributionPct: 30.0 },
      { feature: 'wip_slope_h', value: 1.714, shap: 0.23, contributionPct: 24.0 },
      { feature: 'utilization_avg', value: 0.9943, shap: 0.22, contributionPct: 23.0 },
      { feature: 'upstream_wip_DE_FE_86', value: 1, shap: 0.13, contributionPct: 13.0 },
      { feature: 'diffusion_wait_ratio_forecast', value: 0.52, shap: 0.1, contributionPct: 10.0 },
    ],
    causeCategories: [
      {
        name: '설비_포화',
        features: ['max_util', 'utilization_avg'],
        shapSharePct: 52,
        totalScore: 0.86,
        confidence: 'HIGH',
        upstreamMatch: false,
        gStarConfirmed: false,
      },
      {
        name: 'WIP_누적',
        features: ['wip_slope_h', 'diffusion_wait_ratio_forecast'],
        shapSharePct: 33,
        totalScore: 0.65,
        confidence: 'HIGH',
        upstreamMatch: false,
        gStarConfirmed: false,
      },
      {
        name: '업스트림_공급부담',
        features: ['upstream_wip_DE_FE_86'],
        shapSharePct: 15,
        totalScore: 0.42,
        confidence: 'MEDIUM',
        upstreamMatch: true,
        gStarConfirmed: false,
      },
    ],

    diffusionCurrentWip: 5,
    diffusionUtilPct: 81.5,
    diffusionImpactScore: 0.6867,
    diffusionLineStopMin: 1670,
    diffusionQtimeFuture: 46.26,
    diffusionWipFuture: 18,

    approvedCandidateDescription: 'Release Interval Δ22.0%',
    approvedCandidateReleaseIntervalPct: 22,
    approvedTgForecasts: {
      DE_FE_1: {
        current: BASE_CURRENT,
        action: { q_time_min: 52.0, wip: 7, wait_ratio: 0.17, utilization_avg: 0.87, available_tool_ratio: 1.0 },
      },
      Diffusion_FE_125: {
        current: DIFF_CURRENT,
        action: { q_time_min: 26.0, wip: 5, wait_ratio: 0.52, utilization_avg: 0.82, available_tool_ratio: 1.0 },
      },
    },

    kpiAfterQtime: { conservative: 79.96, standard: 52.0, aggressive: 48.0 },
    kpiWipDelta: { conservative: 1, standard: -3, aggressive: -5 },

    tradeoffs: ['Diffusion_FE_125의 wait_ratio가 0.25에서 0.52로 소폭 올라가지만 WIP는 5.0으로 유지됐다.'],
    caveats: [
      '시뮬레이션 기간 120분 이후 연쇄 영향은 반영되지 않음.',
      '복합 TG 기준 비교는 무대응 2시간 후를 기준으로 해석해야 함.',
    ],
    whyNotOthers: [
      {
        label: 'conservative',
        reason: '효과는 있지만 회복 속도가 제한적이고 두 TG를 현재 수준 이하로 낮추기엔 약하다.',
      },
      {
        label: 'aggressive',
        reason: '효과는 더 크지만 Diffusion_FE_125 WIP가 5→21로 집중되고 가용성이 1.0→0.84로 저하돼 과하다.',
      },
    ],

    playbookImmediateActions: [
      { order: 1, text: 'DISPATCH_RULE_OVERRIDE를 fab-wide로 적용하고 Release Interval을 22% 조정합니다.' },
      { order: 2, text: 'DE_FE_1 먼저 적용 후 Diffusion_FE_125에 동일한 디스패치 룰을 전파합니다.' },
      { order: 3, text: 'Product_3과 Product_4를 priority 20으로 상향합니다.' },
    ],
    playbookMonitoring: [
      { kpi: 'wip', target: 'DE_FE_1 7개, Diffusion_FE_125 5개 수준 유지 여부 확인', unit: '', check_after_min: 30 },
      {
        kpi: 'wait_ratio',
        target: 'DE_FE_1 0.17, Diffusion_FE_125 0.52 이하 수준 확인',
        unit: '',
        check_after_min: 60,
      },
    ],

    sectionsSummary:
      'DE_FE_1과 Diffusion_FE_125에서 설비_포화가 동시에 진행됐고 Release Interval +22%와 제한적 우선순위 조합이 승인되었다. 인터벌 단독 대비 WIP·대기 개선 폭이 크고 가용성 저하 없이 두 TG를 균형 있게 안정화했다.',
    sectionAction:
      'standard: DISPATCH_RULE_OVERRIDE / Release Interval Δ22.0% → DE_FE_1 WIP 10→7, q_time 62.96→52.0분.',

    ragHits: [
      {
        caseId: 'demo-3780-standard',
        score: 0.94,
        title: 'DE_FE_1 standard 복합 대응 합성 사례',
        summary:
          'Release Interval +22%, Product_3/Product_4 우선순위 상향으로 두 TG의 WIP와 대기를 균형 있게 낮춘 사례입니다.',
      },
      {
        caseId: 'demo-de-fe-1-c-20250219',
        score: 0.88,
        title: 'DE_FE_1 conservative 2025-02-19 사례',
        summary: 'Release Interval +16% 단독 적용 — 리스크 낮지만 복합 병목 해소에는 한계가 있었습니다.',
      },
      {
        caseId: 'demo-3780-conservative',
        score: 0.82,
        title: 'DE_FE_1 conservative 합성 사례',
        summary: 'Release Interval +15%는 운영 리스크가 낮지만 복합 병목 회복 폭이 제한적인 것으로 기록됐습니다.',
      },
    ],
  },

  // ── 03: standard 2025-04-24 (+23%) ────────────────────────────────────────
  {
    detectedAt: '2025-04-24 00:00',
    generatedAt: '2025-04-24 02:30',
    selectedLabel: 'standard',
    approvedAt: '2025-04-24 01:00',
    approvalComment: 'standard 대응안 채택 — 반복 사례에서 검증된 조합',

    riskScore: 78.8,
    probability: 0.9843,
    gStarProbability: 0.7012,

    noActionQtime: 93.4,
    noActionWip: 13,
    noActionWaitRatio: 0.5,

    trendQtime: [0, 5.2, 24.1, 46.3, 58.0, 62.96],
    trendWip: [4, 5, 7, 9, 10, 10],
    trendUtil: [0.34, 0.48, 0.88, 0.935, 0.972, 0.9943],

    causeSummary:
      '[주요 원인] 설비_포화와 WIP 누적이 동반 상승하며 복합 병목이 심화됐습니다. [악화 추세] utilization_avg +0.142/h, WIP +1.812/h로 반복 패턴 재현. [업스트림] DE_FE_86 공급 부담 지속.',
    primaryFeature: 'wip_slope_h',
    topFeatures: [
      { feature: 'wip_slope_h', value: 1.812, shap: 0.27, contributionPct: 28.0 },
      { feature: 'max_util_delta_120', value: 1.0, shap: 0.23, contributionPct: 24.0 },
      { feature: 'utilization_avg', value: 0.9943, shap: 0.21, contributionPct: 22.0 },
      { feature: 'q_time_slope_h', value: 16.7, shap: 0.14, contributionPct: 15.0 },
      { feature: 'standard_case_recurrence', value: 2, shap: 0.11, contributionPct: 11.0 },
    ],
    causeCategories: [
      {
        name: '설비_포화',
        features: ['max_util_delta_120', 'utilization_avg'],
        shapSharePct: 50,
        totalScore: 0.88,
        confidence: 'HIGH',
        upstreamMatch: false,
        gStarConfirmed: false,
      },
      {
        name: 'WIP_누적',
        features: ['wip_slope_h', 'q_time_slope_h'],
        shapSharePct: 34,
        totalScore: 0.71,
        confidence: 'HIGH',
        upstreamMatch: true,
        gStarConfirmed: false,
      },
      {
        name: '반복_사례_재현',
        features: ['standard_case_recurrence'],
        shapSharePct: 16,
        totalScore: 0.46,
        confidence: 'MEDIUM',
        upstreamMatch: false,
        gStarConfirmed: false,
      },
    ],

    diffusionCurrentWip: 5,
    diffusionUtilPct: 82.0,
    diffusionImpactScore: 0.7012,
    diffusionLineStopMin: 1620,
    diffusionQtimeFuture: 47.1,
    diffusionWipFuture: 18,

    approvedCandidateDescription: 'Release Interval Δ23.0%',
    approvedCandidateReleaseIntervalPct: 23,
    approvedTgForecasts: {
      DE_FE_1: {
        current: BASE_CURRENT,
        action: { q_time_min: 50.0, wip: 6, wait_ratio: 0.15, utilization_avg: 0.86, available_tool_ratio: 1.0 },
      },
      Diffusion_FE_125: {
        current: DIFF_CURRENT,
        action: { q_time_min: 24.0, wip: 5, wait_ratio: 0.49, utilization_avg: 0.8, available_tool_ratio: 1.0 },
      },
    },

    kpiAfterQtime: { conservative: 79.96, standard: 50.0, aggressive: 48.0 },
    kpiWipDelta: { conservative: 1, standard: -4, aggressive: -5 },

    tradeoffs: ['Diffusion_FE_125의 wait_ratio가 0.25에서 0.49로 소폭 올라가지만 WIP는 5.0으로 유지됐다.'],
    caveats: [
      '시뮬레이션 기간 120분 이후 연쇄 영향은 반영되지 않음.',
      '복합 TG 기준 비교는 무대응 2시간 후를 기준으로 해석해야 함.',
    ],
    whyNotOthers: [
      { label: 'conservative', reason: '회복은 되지만 속도가 느려 복합 병목을 충분히 꺾지 못한다.' },
      {
        label: 'aggressive',
        reason: '효과는 더 크지만 Diffusion_FE_125 WIP 집중과 가용성 저하 리스크가 커서 기준안으로는 과하다.',
      },
    ],

    playbookImmediateActions: [
      { order: 1, text: 'DISPATCH_RULE_OVERRIDE를 fab-wide로 적용하고 Release Interval을 23% 조정합니다.' },
      { order: 2, text: 'DE_FE_1 먼저 적용 후 Diffusion_FE_125에 동일한 디스패치 룰을 전파합니다.' },
      { order: 3, text: 'Product_3과 Product_4를 priority 20으로 상향합니다.' },
    ],
    playbookMonitoring: [
      { kpi: 'wip', target: 'DE_FE_1 6개, Diffusion_FE_125 5개 수준 유지 여부 확인', unit: '', check_after_min: 30 },
      {
        kpi: 'wait_ratio',
        target: 'DE_FE_1 0.15, Diffusion_FE_125 0.49 이하 수준 확인',
        unit: '',
        check_after_min: 60,
      },
    ],

    sectionsSummary:
      'DE_FE_1과 Diffusion_FE_125에서 설비_포화가 동시에 진행됐고 Release Interval +23%와 제한적 우선순위 조합이 재확인되어 승인되었다. 반복 사례에서 같은 조합이 재현되어 표준안이 효과와 리스크 균형이 가장 좋은 기준안으로 확인됐다.',
    sectionAction:
      'standard: DISPATCH_RULE_OVERRIDE / Release Interval Δ23.0% → DE_FE_1 WIP 10→6, q_time 62.96→50.0분.',

    ragHits: [
      {
        caseId: 'demo-3780-standard',
        score: 0.95,
        title: 'DE_FE_1 standard 복합 대응 합성 사례',
        summary:
          'Release Interval +22%, Product_3/Product_4 우선순위 상향으로 두 TG의 WIP와 대기를 균형 있게 낮춘 사례입니다.',
      },
      {
        caseId: 'demo-de-fe-1-s-20250318',
        score: 0.91,
        title: 'DE_FE_1 standard 2025-03-18 사례',
        summary: 'Release Interval +22% 조합이 WIP와 대기를 균형 있게 낮춘 반복 근거를 제공합니다.',
      },
      {
        caseId: 'demo-de-fe-1-c-20250219',
        score: 0.84,
        title: 'DE_FE_1 conservative 2025-02-19 사례',
        summary: 'Release Interval +16% 단독 적용 — 리스크 낮지만 복합 병목 해소에는 한계가 있었습니다.',
      },
    ],
  },

  // ── 04: aggressive 2025-07-03 ─────────────────────────────────────────────
  {
    detectedAt: '2025-07-03 00:00',
    generatedAt: '2025-07-03 02:30',
    selectedLabel: 'aggressive',
    approvedAt: '2025-07-03 01:00',
    approvalComment: 'aggressive 대응안 채택 — 납기 긴급 조건 동반 상황',

    riskScore: 85.2,
    probability: 0.9921,
    gStarProbability: 0.7415,

    noActionQtime: 98.8,
    noActionWip: 14,
    noActionWaitRatio: 0.56,

    trendQtime: [0, 10.0, 28.1, 49.4, 59.5, 62.96],
    trendWip: [4, 5, 7, 8, 9, 10],
    trendUtil: [0.3389, 0.52, 0.91, 0.962, 0.9831, 0.9943],

    causeSummary:
      '[주요 원인] 설비_포화와 WIP 누적이 납기 긴급 lot 처리와 겹쳐 강화 조치가 필요했습니다. [악화 추세] utilization_avg +0.156/h, WIP +1.943/h로 급증. [업스트림] DE_FE_86 공급 부담 + 긴급 lot 투입 압박.',
    primaryFeature: 'urgent_lot_pressure',
    topFeatures: [
      { feature: 'urgent_lot_pressure', value: 2, shap: 0.28, contributionPct: 28.0 },
      { feature: 'max_util', value: 1.0, shap: 0.23, contributionPct: 23.0 },
      { feature: 'wip_slope_h', value: 1.943, shap: 0.2, contributionPct: 20.0 },
      { feature: 'diffusion_wip_projection', value: 21, shap: 0.18, contributionPct: 18.0 },
      { feature: 'shl_priority_load', value: 30, shap: 0.11, contributionPct: 11.0 },
    ],
    causeCategories: [
      {
        name: '설비_포화',
        features: ['max_util', 'wip_slope_h'],
        shapSharePct: 43,
        totalScore: 0.9,
        confidence: 'HIGH',
        upstreamMatch: true,
        gStarConfirmed: false,
      },
      {
        name: '납기_긴급_압박',
        features: ['urgent_lot_pressure', 'shl_priority_load'],
        shapSharePct: 31,
        totalScore: 0.79,
        confidence: 'HIGH',
        upstreamMatch: false,
        gStarConfirmed: false,
      },
      {
        name: '확산_WIP_집중',
        features: ['diffusion_wip_projection'],
        shapSharePct: 26,
        totalScore: 0.68,
        confidence: 'HIGH',
        upstreamMatch: false,
        gStarConfirmed: false,
      },
    ],

    diffusionCurrentWip: 6,
    diffusionUtilPct: 86.0,
    diffusionImpactScore: 0.7415,
    diffusionLineStopMin: 1450,
    diffusionQtimeFuture: 50.4,
    diffusionWipFuture: 21,

    approvedCandidateDescription: 'Release Interval Δ28.0% + Product_4 SuperHotLot',
    approvedCandidateReleaseIntervalPct: 28,
    approvedTgForecasts: {
      DE_FE_1: {
        current: BASE_CURRENT,
        action: { q_time_min: 45.5, wip: 5, wait_ratio: 0.08, utilization_avg: 0.77, available_tool_ratio: 0.89 },
      },
      Diffusion_FE_125: {
        current: DIFF_CURRENT,
        action: { q_time_min: 23.5, wip: 21, wait_ratio: 0.43, utilization_avg: 0.72, available_tool_ratio: 0.84 },
      },
    },

    kpiAfterQtime: { conservative: 79.96, standard: 52.0, aggressive: 45.5 },
    kpiWipDelta: { conservative: 1, standard: -3, aggressive: -5 },

    tradeoffs: ['Diffusion_FE_125의 WIP 집중(5→21)과 가용성 저하(1.0→0.84)를 감수하고 납기 긴급 lot를 우선 처리했다.'],
    caveats: [
      'SHL 미포함 일반 상황에서는 Diffusion WIP 집중 리스크로 aggressive 조치 비추천.',
      'Diffusion_FE_125 가용성 저하가 지속되면 추가 모니터링 또는 조치 완화 필요.',
    ],
    whyNotOthers: [
      { label: 'conservative', reason: '효과가 약해 DE_FE_1을 충분히 빠르게 끌어내리지 못한다.' },
      { label: 'standard', reason: '효과와 리스크의 균형은 좋지만 납기 긴급 lot 우선 처리에는 부족하다.' },
    ],

    playbookImmediateActions: [
      { order: 1, text: 'DISPATCH_RULE_OVERRIDE를 fab-wide로 적용하고 Release Interval을 28% 조정합니다.' },
      { order: 2, text: 'Product_3을 priority 20, Product_4 긴급 lot 2건을 SuperHotLot priority 30으로 설정합니다.' },
      { order: 3, text: '적용 직후 30분간 Diffusion_FE_125 WIP 집중 여부를 집중 모니터링합니다.' },
    ],
    playbookMonitoring: [
      {
        kpi: 'wip',
        target: 'Diffusion_FE_125 WIP 21개, 가용장비비율 0.84 이상 유지 여부 확인',
        unit: '',
        check_after_min: 30,
      },
      { kpi: 'q_time_min', target: 'DE_FE_1 WIP 5개, q_time_min 46분 이하 수준 확인', unit: '', check_after_min: 60 },
    ],

    sectionsSummary:
      'DE_FE_1과 Diffusion_FE_125에서 설비_포화가 동시에 진행됐고 납기 긴급 조건 하에 Release Interval +28%와 SHL이 승인되었다. DE_FE_1은 가장 빠르게 개선됐으나 Diffusion_FE_125의 WIP 집중과 가용성 저하가 함께 발현됐다.',
    sectionAction:
      'aggressive: DISPATCH_RULE_OVERRIDE / Release Interval Δ28.0% + SHL → DE_FE_1 WIP 10→5, q_time 62.96→45.5분.',

    ragHits: [
      {
        caseId: 'demo-3780-aggressive',
        score: 0.93,
        title: 'DE_FE_1 aggressive 복합 대응 합성 사례',
        summary:
          'Release Interval +28%와 SuperHotLot 적용은 대기 개선이 빠르지만 Diffusion_FE_125 WIP 편중과 가용성 저하가 동반됐습니다.',
      },
      {
        caseId: 'demo-de-fe-1-s-20250318',
        score: 0.86,
        title: 'DE_FE_1 standard 2025-03-18 사례',
        summary: 'Release Interval +22% 조합이 WIP와 대기를 균형 있게 낮춘 사례 — 긴급 조건 없는 상황에서의 대조군.',
      },
      {
        caseId: 'demo-de-fe-1-s-20250424',
        score: 0.85,
        title: 'DE_FE_1 standard 2025-04-24 사례',
        summary: 'Release Interval +23% 반복 검증 — aggressive 채택 전 표준안 적절성을 비교한 근거.',
      },
    ],
  },

  // ── 05: aggressive 2025-08-14 ─────────────────────────────────────────────
  {
    detectedAt: '2025-08-14 00:00',
    generatedAt: '2025-08-14 02:30',
    selectedLabel: 'aggressive',
    approvedAt: '2025-08-14 01:00',
    approvalComment: 'aggressive 대응안 채택 — 납기 긴급 lot와 복합 병목 동시 발생',

    riskScore: 84.1,
    probability: 0.9908,
    gStarProbability: 0.7281,

    noActionQtime: 97.3,
    noActionWip: 14,
    noActionWaitRatio: 0.55,

    // Case 05 has slightly different current state per MD
    trendQtime: [2.1, 8.4, 29.2, 48.0, 57.2, 63.1],
    trendWip: [4, 5, 7, 8, 9, 10],
    trendUtil: [0.35, 0.53, 0.91, 0.965, 0.9881, 0.9938],

    causeSummary:
      '[주요 원인] 설비_포화와 WIP 누적이 긴급 lot 투입과 겹쳐 빠른 개입이 필요한 상황이었습니다. [악화 추세] utilization_avg +0.152/h, WIP +1.886/h. [업스트림] DE_FE_86 공급 부담 + 긴급 lot 투입 재현.',
    primaryFeature: 'urgent_lot_pressure',
    topFeatures: [
      { feature: 'urgent_lot_pressure', value: 2, shap: 0.3, contributionPct: 30.0 },
      { feature: 'diffusion_available_tool_risk', value: 0.83, shap: 0.22, contributionPct: 22.0 },
      { feature: 'max_util', value: 1.0, shap: 0.2, contributionPct: 21.0 },
      { feature: 'wip_slope_h', value: 1.886, shap: 0.16, contributionPct: 17.0 },
      { feature: 'shl_priority_load', value: 30, shap: 0.1, contributionPct: 10.0 },
    ],
    causeCategories: [
      {
        name: '납기_긴급_압박',
        features: ['urgent_lot_pressure', 'shl_priority_load'],
        shapSharePct: 40,
        totalScore: 0.88,
        confidence: 'HIGH',
        upstreamMatch: false,
        gStarConfirmed: false,
      },
      {
        name: '설비_포화',
        features: ['max_util', 'wip_slope_h'],
        shapSharePct: 35,
        totalScore: 0.84,
        confidence: 'HIGH',
        upstreamMatch: true,
        gStarConfirmed: false,
      },
      {
        name: '확산_가용성_저하',
        features: ['diffusion_available_tool_risk'],
        shapSharePct: 25,
        totalScore: 0.73,
        confidence: 'HIGH',
        upstreamMatch: false,
        gStarConfirmed: false,
      },
    ],

    diffusionCurrentWip: 6,
    diffusionUtilPct: 85.0,
    diffusionImpactScore: 0.7281,
    diffusionLineStopMin: 1490,
    diffusionQtimeFuture: 51.0,
    diffusionWipFuture: 22,

    approvedCandidateDescription: 'Release Interval Δ28.0% + Product_4 SuperHotLot',
    approvedCandidateReleaseIntervalPct: 28,
    approvedTgForecasts: {
      DE_FE_1: {
        current: { q_time_min: 63.1, wip: 10, wait_ratio: 0.26, utilization_avg: 0.9938, available_tool_ratio: 1.0 },
        action: { q_time_min: 45.0, wip: 5, wait_ratio: 0.08, utilization_avg: 0.77, available_tool_ratio: 0.89 },
      },
      Diffusion_FE_125: {
        current: { q_time_min: 36.2, wip: 5, wait_ratio: 0.26, utilization_avg: 0.8211, available_tool_ratio: 1.0 },
        action: { q_time_min: 23.0, wip: 22, wait_ratio: 0.42, utilization_avg: 0.71, available_tool_ratio: 0.83 },
      },
    },

    kpiAfterQtime: { conservative: 80.1, standard: 52.14, aggressive: 45.0 },
    kpiWipDelta: { conservative: 1, standard: -3, aggressive: -5 },

    tradeoffs: ['Diffusion_FE_125 WIP 집중과 가용성 저하를 감수하고 긴급 lot를 우선 처리했다.'],
    caveats: [
      '긴급 lot가 사라진 뒤에도 같은 구성을 그대로 유지하면 Diffusion_FE_125 쪽 리스크가 커진다.',
      '일반 상황에서는 standard 조합이 더 적절하다.',
    ],
    whyNotOthers: [
      { label: 'conservative', reason: '속도가 부족해 긴급 lot를 제때 못 끊는다.' },
      { label: 'standard', reason: '균형은 좋지만 긴급 lot 우선 처리에는 충분히 빠르지 않다.' },
    ],

    playbookImmediateActions: [
      { order: 1, text: 'DISPATCH_RULE_OVERRIDE를 fab-wide로 적용하고 Release Interval을 28% 조정합니다.' },
      { order: 2, text: 'Product_3을 priority 20, Product_4 긴급 lot 2건을 SuperHotLot priority 30으로 설정합니다.' },
      { order: 3, text: '적용 직후 Diffusion_FE_125 WIP 집중 여부를 우선 확인합니다.' },
    ],
    playbookMonitoring: [
      {
        kpi: 'wip',
        target: 'Diffusion_FE_125 WIP 22개, 가용장비비율 0.83 이상 유지 여부 확인',
        unit: '',
        check_after_min: 30,
      },
      { kpi: 'q_time_min', target: 'DE_FE_1 WIP 5개, q_time_min 45분 이하 수준 확인', unit: '', check_after_min: 60 },
    ],

    sectionsSummary:
      'DE_FE_1과 Diffusion_FE_125에서 설비_포화가 동시에 진행됐고 납기 긴급 lot 처리를 위해 Release Interval +28%와 SHL이 재차 승인되었다. DE_FE_1은 빠르게 개선됐지만 Diffusion_FE_125의 WIP 집중과 가용성 저하가 다시 나타났다.',
    sectionAction:
      'aggressive: DISPATCH_RULE_OVERRIDE / Release Interval Δ28.0% + SHL → DE_FE_1 WIP 10→5, q_time 63.10→45.0분.',

    ragHits: [
      {
        caseId: 'demo-de-fe-1-a-20250703',
        score: 0.96,
        title: 'DE_FE_1 aggressive 2025-07-03 사례',
        summary:
          'Release Interval +28% + SHL 조합 — 납기 긴급 조건에서 DE_FE_1 빠른 개선 확인, Diffusion_FE_125 WIP 집중 재현.',
      },
      {
        caseId: 'demo-3780-aggressive',
        score: 0.91,
        title: 'DE_FE_1 aggressive 복합 대응 합성 사례',
        summary:
          'Release Interval +28%와 SuperHotLot 적용은 대기 개선이 빠르지만 Diffusion_FE_125 WIP 편중과 가용성 저하가 동반됐습니다.',
      },
      {
        caseId: 'demo-de-fe-1-s-20250318',
        score: 0.84,
        title: 'DE_FE_1 standard 2025-03-18 사례',
        summary: 'Release Interval +22% 조합 — 긴급 조건 없는 상황에서의 표준 대조군.',
      },
    ],
  },

  // ── 06: standard 2025-09-02 ───────────────────────────────────────────────
  {
    detectedAt: '2025-09-02 00:00',
    generatedAt: '2025-09-02 02:30',
    selectedLabel: 'standard',
    approvedAt: '2025-09-02 01:00',
    approvalComment: 'standard 대응안 채택 — 재현성 확인된 기준안',

    riskScore: 74.6,
    probability: 0.9851,
    gStarProbability: 0.6604,

    noActionQtime: 90.8,
    noActionWip: 12,
    noActionWaitRatio: 0.47,

    // Case 06: slightly different current state per MD (q_time 62.80)
    trendQtime: [0, 2.1, 21.4, 42.2, 55.1, 62.8],
    trendWip: [3, 4, 6, 8, 9, 10],
    trendUtil: [0.32, 0.47, 0.87, 0.935, 0.9748, 0.9941],

    causeSummary:
      '[주요 원인] 설비_포화(max_util 중심)가 주요 원인이며 표준 조치로 안정화 가능한 수준이었습니다. [악화 추세] utilization_avg +0.131/h, WIP +1.621/h. [업스트림] DE_FE_86 공급 부담 지속.',
    primaryFeature: 'max_util',
    topFeatures: [
      { feature: 'max_util', value: 1.0, shap: 0.3, contributionPct: 31.0 },
      { feature: 'utilization_avg', value: 0.9941, shap: 0.23, contributionPct: 24.0 },
      { feature: 'q_time_slope_h', value: 16.5, shap: 0.17, contributionPct: 18.0 },
      { feature: 'standard_case_recurrence', value: 3, shap: 0.14, contributionPct: 15.0 },
      { feature: 'upstream_wip_DE_FE_86', value: 1, shap: 0.11, contributionPct: 12.0 },
    ],
    causeCategories: [
      {
        name: '설비_포화',
        features: ['max_util', 'utilization_avg'],
        shapSharePct: 54,
        totalScore: 0.85,
        confidence: 'HIGH',
        upstreamMatch: false,
        gStarConfirmed: false,
      },
      {
        name: 'WIP_누적',
        features: ['q_time_slope_h', 'upstream_wip_DE_FE_86'],
        shapSharePct: 29,
        totalScore: 0.61,
        confidence: 'HIGH',
        upstreamMatch: true,
        gStarConfirmed: false,
      },
      {
        name: '반복_사례_재현',
        features: ['standard_case_recurrence'],
        shapSharePct: 17,
        totalScore: 0.5,
        confidence: 'MEDIUM',
        upstreamMatch: false,
        gStarConfirmed: false,
      },
    ],

    diffusionCurrentWip: 5,
    diffusionUtilPct: 80.0,
    diffusionImpactScore: 0.6604,
    diffusionLineStopMin: 1700,
    diffusionQtimeFuture: 45.8,
    diffusionWipFuture: 17,

    approvedCandidateDescription: 'Release Interval Δ22.0%',
    approvedCandidateReleaseIntervalPct: 22,
    approvedTgForecasts: {
      DE_FE_1: {
        current: { q_time_min: 62.8, wip: 10, wait_ratio: 0.25, utilization_avg: 0.9941, available_tool_ratio: 1.0 },
        action: { q_time_min: 52.2, wip: 7, wait_ratio: 0.17, utilization_avg: 0.871, available_tool_ratio: 1.0 },
      },
      Diffusion_FE_125: {
        current: { q_time_min: 36.1, wip: 5, wait_ratio: 0.25, utilization_avg: 0.817, available_tool_ratio: 1.0 },
        action: { q_time_min: 26.1, wip: 5, wait_ratio: 0.5, utilization_avg: 0.821, available_tool_ratio: 1.0 },
      },
    },

    kpiAfterQtime: { conservative: 79.8, standard: 52.2, aggressive: 48.3 },
    kpiWipDelta: { conservative: 1, standard: -3, aggressive: -5 },

    tradeoffs: ['Diffusion_FE_125 wait_ratio가 소폭 상승하지만 WIP는 유지되고 가용성 저하는 없었다.'],
    caveats: [
      '시뮬레이션 기간 120분 이후 연쇄 영향은 반영되지 않음.',
      '복합 TG 기준 비교는 무대응 2시간 후를 기준으로 해석해야 함.',
    ],
    whyNotOthers: [
      { label: 'conservative', reason: '효과는 있지만 회복 속도가 느려 복합 병목을 빠르게 되돌리기엔 약하다.' },
      {
        label: 'aggressive',
        reason: '효과는 더 크지만 Diffusion_FE_125 WIP 집중과 가용성 저하 리스크가 커서 기준안으로는 과하다.',
      },
    ],

    playbookImmediateActions: [
      { order: 1, text: 'DISPATCH_RULE_OVERRIDE를 fab-wide로 적용하고 Release Interval을 22% 조정합니다.' },
      { order: 2, text: 'Product_3과 Product_4를 priority 20으로 상향합니다.' },
      { order: 3, text: '적용 후 30분 동안 두 TG의 WIP와 대기를 확인합니다.' },
    ],
    playbookMonitoring: [
      { kpi: 'wip', target: 'DE_FE_1 7개, Diffusion_FE_125 5개 수준 유지 여부 확인', unit: '', check_after_min: 30 },
      {
        kpi: 'wait_ratio',
        target: 'DE_FE_1 0.17, Diffusion_FE_125 0.50 이하 수준 확인',
        unit: '',
        check_after_min: 60,
      },
    ],

    sectionsSummary:
      'DE_FE_1과 Diffusion_FE_125에서 설비_포화가 동시에 진행됐고 Release Interval +22%와 제한적 우선순위 조합이 재확인되어 승인되었다. 보수안보다 빠르고 강화안보다 안전하게 두 TG를 균형 있게 안정화했다.',
    sectionAction:
      'standard: DISPATCH_RULE_OVERRIDE / Release Interval Δ22.0% → DE_FE_1 WIP 10→7, q_time 62.80→52.2분.',

    ragHits: [
      {
        caseId: 'demo-de-fe-1-s-20250318',
        score: 0.94,
        title: 'DE_FE_1 standard 2025-03-18 사례',
        summary: 'Release Interval +22% 조합이 WIP와 대기를 균형 있게 낮춘 반복 근거를 제공합니다.',
      },
      {
        caseId: 'demo-de-fe-1-s-20250424',
        score: 0.91,
        title: 'DE_FE_1 standard 2025-04-24 사례',
        summary: 'Release Interval +23% 반복 검증 — 표준안의 일관된 효과를 재확인.',
      },
      {
        caseId: 'demo-3780-standard',
        score: 0.87,
        title: 'DE_FE_1 standard 합성 사례',
        summary:
          'Release Interval +22%, Product_3/Product_4 우선순위 상향으로 두 TG의 WIP와 대기를 균형 있게 낮춘 사례입니다.',
      },
    ],
  },
];

function isoDate(dateStr: string): string {
  return `${dateStr.replace(' ', 'T')}:00Z`;
}

export const MOCK_ARCHIVE_REPORTS: Record<string, BncReportPayload> = Object.fromEntries(
  RAG_CASE_IDS.map((caseId, i) => {
    const p = CASE_PATCHES[i];
    return [
      caseId,
      {
        reportId: `report-${caseId}`,
        caseId,
        summary: `DE_FE_1에서 Critical 병목 감지 (위험점수 ${p.riskScore}, 확률 ${(p.probability * 100).toFixed(1)}%). ${p.selectedLabel} 대응안 승인.`,
        rootCauseText:
          '주요 원인은 설비_포화(max_util, max_util_delta_120, utilization_avg)이며 WIP_누적이 보조 원인입니다.',
        actionComparisonText: p.sectionAction,
        timeline: [
          {
            time: isoDate(p.detectedAt),
            event: `DE_FE_1 병목 감지 (Critical, risk score ${p.riskScore}, probability ${(p.probability * 100).toFixed(1)}%)`,
          },
          { time: isoDate(p.approvedAt), event: `담당자(팀원) ${p.selectedLabel} 안 승인` },
          { time: isoDate(p.generatedAt), event: '최종 리포트 생성 완료' },
        ],
        hasPdf: false,
        generatedAt: isoDate(p.generatedAt),
        regeneratedCount: 0,
        qdrantIndexed: true,
        reportV1: patchReportV1(p),
      } as BncReportPayload,
    ];
  })
);

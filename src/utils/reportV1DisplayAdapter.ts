import type {
  ReportV1,
  ReportV1KpiImpact,
  ReportV1PerTgForecast,
  ReportV1RagCandidate,
  ReportV1RagCaseSummary,
  ReportV1RagClaim,
  ReportV1RagHit,
} from '@/types/report';

const TREND_KEYS = ['q_time_min', 'wip', 'utilization_avg'];
const KPI_ORDER = [
  'risk_score',
  'q_time_min',
  'wip',
  'wait_ratio',
  'utilization_avg',
  'available_tool_ratio',
  'max_util',
];
const FORECAST_ORDER = ['q_time_min', 'wip', 'wait_ratio', 'utilization_avg', 'available_tool_ratio'];

const KPI_LABELS: Record<string, string> = {
  risk_score: 'Risk Score',
  q_time_min: 'Q-time',
  wip: 'WIP',
  wait_ratio: 'Wait Ratio',
  utilization_avg: '평균 가동률',
  available_tool_ratio: '가용 Tool 비율',
  max_util: '최대 가동률',
};

export interface ReportV1ForecastMetric {
  key: string;
  label: string;
  unit: string;
  now: number;
  after: number;
  delta: number;
  pctChange: number;
  reliabilityToken: string;
  maxValue: number;
}

export interface ReportV1TrendSeries {
  key: string;
  label: string;
  values: number[];
  timeLabels: string[];
  slopePerHour: number;
  r2: number;
  significant: boolean;
}

export interface ReportV1CandidateEvidence {
  candidateSummary: string;
  riskLevel: string;
  evidenceStrength: string;
  effectOutlook?: string;
  claims: string[];
}

export interface ReportV1CandidateDisplay {
  label: string;
  kind: string;
  isBaseline: boolean;
  isApproved: boolean;
  description: string;
  targetToolgroups: string[];
  compositeScore: number;
  scorePct: number;
  kpiImpacts: ReportV1KpiImpact[];
  tradeoffs: string[];
  comparisonBasis?: string;
  perTgForecasts?: Record<string, ReportV1PerTgForecast>;
  evidence?: ReportV1CandidateEvidence;
}

export interface ReportV1TgForecastRow {
  toolgroup: string;
  kpi: string;
  label: string;
  unit: string;
  current: number | null;
  noAction: number | null;
  action: number | null;
}

export interface ReportV1RagCaseDisplay {
  caseId: string;
  title: string;
  tgCode?: string;
  score?: number;
  summary: string;
}

export interface ReportV1DisplayModel {
  selectedKpis: ReportV1['bottleneck_kpis'];
  noActionMetrics: ReportV1ForecastMetric[];
  trendSeries: ReportV1TrendSeries[];
  actionCandidates: ReportV1CandidateDisplay[];
  approvedCandidate: ReportV1CandidateDisplay | null;
  approvedForecastRows: ReportV1TgForecastRow[];
  ragComparison: {
    summary?: string;
    comment?: string;
    candidates: Array<ReportV1CandidateDisplay & { evidence: ReportV1CandidateEvidence }>;
    cases: ReportV1RagCaseDisplay[];
  } | null;
}

function labelForKpi(key: string): string {
  return KPI_LABELS[key] ?? key.replaceAll('_', ' ');
}

function orderByKnownKpi<T extends { key?: string; kpi?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ak = a.key ?? a.kpi ?? '';
    const bk = b.key ?? b.kpi ?? '';
    const ai = KPI_ORDER.indexOf(ak);
    const bi = KPI_ORDER.indexOf(bk);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
}

function scorePct(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return score <= 1 ? score * 100 : score;
}

function normalizeRagCandidates(report: ReportV1): ReportV1RagCandidate[] {
  const raw = report.rag_evidence?.candidates;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  return Object.entries(raw).map(([label, value]) => ({
    label,
    ...(typeof value === 'object' && value ? value : {}),
  }));
}

function normalizeClaims(claims: Array<string | ReportV1RagClaim> | undefined): string[] {
  return (claims ?? [])
    .map((claim) => {
      if (typeof claim === 'string') return claim;
      return claim.text ?? '';
    })
    .filter(Boolean)
    .slice(0, 3);
}

function normalizeCandidateEvidence(candidate: ReportV1RagCandidate): ReportV1CandidateEvidence | undefined {
  const evidence = candidate.evidence;
  if (!evidence?.candidate_summary) return undefined;

  return {
    candidateSummary: evidence.candidate_summary,
    riskLevel: (evidence.risk_level ?? 'low').toLowerCase(),
    evidenceStrength: (evidence.evidence_strength ?? 'weak').toLowerCase(),
    effectOutlook: evidence.effect_outlook,
    claims: normalizeClaims(evidence.claims),
  };
}

function addHitToCases(map: Map<string, ReportV1RagCaseDisplay>, hit: ReportV1RagHit | undefined) {
  if (!hit?.case_id || map.has(hit.case_id)) return;
  const summary = hit.cause_summary ?? '';
  if (!summary) return;

  map.set(hit.case_id, {
    caseId: hit.case_id,
    title: hit.report_title ?? hit.case_id,
    tgCode: hit.tg_code,
    score: hit.score,
    summary,
  });
}

function addCaseSummaryToCases(map: Map<string, ReportV1RagCaseDisplay>, item: ReportV1RagCaseSummary | undefined) {
  if (!item?.case_id || map.has(item.case_id)) return;
  if (!item.summary) return;

  map.set(item.case_id, {
    caseId: item.case_id,
    title: item.case_id,
    summary: item.summary,
  });
}

function buildRagCaseMap(report: ReportV1, ragCandidates: ReportV1RagCandidate[]): Map<string, ReportV1RagCaseDisplay> {
  const map = new Map<string, ReportV1RagCaseDisplay>();
  (report.rag_evidence?.common_hits ?? []).forEach((hit) => addHitToCases(map, hit));
  ragCandidates.forEach((candidate) => {
    (candidate.hits ?? []).forEach((hit) => addHitToCases(map, hit));
    (candidate.evidence?.case_summaries ?? []).forEach((item) => addCaseSummaryToCases(map, item));
  });
  return map;
}

function buildNoActionMetrics(report: ReportV1): ReportV1ForecastMetric[] {
  if (!report.if_no_action?.available) return [];

  return orderByKnownKpi(
    report.if_no_action.kpi_changes.map((item) => ({
      key: item.kpi,
      label: labelForKpi(item.kpi),
      unit: item.unit,
      now: item.now,
      after: item.after,
      delta: item.delta,
      pctChange: item.pct_change,
      reliabilityToken: item.reliability_token,
      maxValue: Math.max(Math.abs(item.now), Math.abs(item.after), 1),
    }))
  );
}

function buildTrendSeries(report: ReportV1): ReportV1TrendSeries[] {
  const trend = report.cause?.trend_series;
  const features = trend?.features ?? {};
  const labels = trend?.time_labels ?? [];

  return TREND_KEYS.flatMap((key) => {
    const item = features[key];
    if (!item?.values?.length) return [];
    return [
      {
        key,
        label: labelForKpi(key),
        values: item.values,
        timeLabels: labels.length === item.values.length ? labels : item.values.map((_, i) => `T-${i}`),
        slopePerHour: item.slope_per_hour,
        r2: item.r2,
        significant: item.significant,
      },
    ];
  });
}

function buildActionCandidates(report: ReportV1, ragCandidates: ReportV1RagCandidate[]): ReportV1CandidateDisplay[] {
  const evidenceByLabel = new Map(
    ragCandidates
      .map((candidate) => [candidate.label.toLowerCase(), normalizeCandidateEvidence(candidate)] as const)
      .filter(([, evidence]) => !!evidence)
  );

  return report.actions.candidates.map((candidate) => ({
    label: candidate.label,
    kind: candidate.kind,
    isBaseline: candidate.is_baseline,
    isApproved:
      candidate.is_approved ||
      candidate.label.toLowerCase() ===
        (report.actions.approved_label ?? report.approval?.selected_label ?? '').toLowerCase(),
    description: candidate.description,
    targetToolgroups: candidate.target_toolgroups,
    compositeScore: candidate.composite_score,
    scorePct: scorePct(candidate.composite_score),
    kpiImpacts: orderByKnownKpi(candidate.kpi_impact),
    tradeoffs: candidate.tradeoffs ?? [],
    comparisonBasis: candidate.comparison_basis,
    perTgForecasts: candidate.per_tg_forecasts,
    evidence: evidenceByLabel.get(candidate.label.toLowerCase()),
  }));
}

function buildApprovedForecastRows(candidate: ReportV1CandidateDisplay | null): ReportV1TgForecastRow[] {
  if (!candidate?.perTgForecasts) return [];

  return Object.entries(candidate.perTgForecasts).flatMap(([toolgroup, forecast]) =>
    FORECAST_ORDER.map((kpi) => {
      const current = forecast.current?.[kpi] ?? null;
      const noAction = forecast.no_action?.[kpi] ?? null;
      const action = forecast.action?.[kpi] ?? null;
      if (current === null && noAction === null && action === null) return null;
      return {
        toolgroup,
        kpi,
        label: labelForKpi(kpi),
        unit: kpi.includes('time') ? 'min' : kpi === 'wip' ? 'lots' : 'ratio',
        current,
        noAction,
        action,
      };
    }).filter((row): row is ReportV1TgForecastRow => row !== null)
  );
}

export function buildReportV1DisplayModel(report: ReportV1): ReportV1DisplayModel {
  const ragCandidates = normalizeRagCandidates(report);
  const actionCandidates = buildActionCandidates(report, ragCandidates);
  const approvedCandidate =
    actionCandidates.find((candidate) => candidate.isApproved) ??
    actionCandidates.find((candidate) => !candidate.isBaseline) ??
    null;
  const ragCases = [...buildRagCaseMap(report, ragCandidates).values()];
  const candidatesWithEvidence = actionCandidates.filter(
    (candidate): candidate is ReportV1CandidateDisplay & { evidence: ReportV1CandidateEvidence } => !!candidate.evidence
  );
  const hasRag =
    !!report.rag_evidence &&
    (candidatesWithEvidence.length > 0 ||
      ragCases.length > 0 ||
      !!report.rag_evidence.comparison?.rag_summary ||
      !!report.rag_evidence.comparison?.overall_comment);

  return {
    selectedKpis: orderByKnownKpi(report.bottleneck_kpis),
    noActionMetrics: buildNoActionMetrics(report),
    trendSeries: buildTrendSeries(report),
    actionCandidates,
    approvedCandidate,
    approvedForecastRows: buildApprovedForecastRows(approvedCandidate),
    ragComparison: hasRag
      ? {
          summary: report.rag_evidence?.comparison?.rag_summary,
          comment: report.rag_evidence?.comparison?.overall_comment,
          candidates: candidatesWithEvidence,
          cases: ragCases,
        }
      : null,
  };
}

import type { BncCaseStatus } from '@/types/bnc';
import type { BottleneckRiskGrade } from '@/types/bottleneckMonitoring';

export type ReportDecision = 'APPROVED' | 'REJECTED';
export type ReportArchiveType = 'ACTION';
export type ReportSortOrder = 'DECIDED_DESC' | 'DECIDED_ASC';

export interface ReportPageInfo {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sort: string;
}

export interface ReportDecisionUser {
  userId: string;
  userName: string;
}

export interface ActionHistoryItem {
  caseId: string;
  displayDay: string;
  targetTgText: string;
  tgName: string;
  areaName: string;
  detectedAt: string;
  riskGrade: Extract<BottleneckRiskGrade, 'CRITICAL' | 'HIGH'>;
  selectedPlanTitle: string;
  planType: string;
  decidedBy: ReportDecisionUser;
  decision: ReportDecision;
  decidedAt: string;
  estAvgWaitDelta: number;
  estDeliveryComplianceDelta: number;
  status: Exclude<BncCaseStatus, null>;
  hasReport: boolean;
  reportTypes: ReportArchiveType[];
}

export interface ActionHistoryListData {
  items: ActionHistoryItem[];
  pageInfo: ReportPageInfo;
}

export interface ActionHistoryFilters {
  keyword: string;
  reportType: '' | ReportArchiveType;
  riskGrade: '' | 'CRITICAL' | 'HIGH';
  status: '' | Exclude<BncCaseStatus, null>;
  decision: '' | ReportDecision;
  pdf: '' | 'AVAILABLE' | 'NONE';
  startDate: string;
  endDate: string;
  sortOrder: ReportSortOrder;
}

export interface ActionHistoryPlan {
  planSeq: number;
  planTitle: string;
  planType: string;
  estThroughputDelta: number;
  estAvgWaitDelta: number;
  estDeliveryComplianceDelta: number;
  estDelayDelta: number;
  isSelected: boolean;
}

export interface ActionHistoryDetail {
  caseId: string;
  displayDay: string;
  targetTgText: string;
  tgName: string;
  areaName: string;
  riskGrade: ActionHistoryItem['riskGrade'];
  bottleneckProb: number;
  detectedAt: string;
  resolvedAt: string | null;
  hitlDecision: {
    decisionId: string;
    decision: ReportDecision;
    selectedPlanTitle: string;
    comment: string;
    decidedBy: ReportDecisionUser;
    decidedAt: string;
  };
  baseline: {
    throughput: number;
    avgWaitDay: number;
    deliveryCompliance: number;
  };
  actionPlans: ActionHistoryPlan[];
  reportId: string;
  hasPdf: boolean;
  finalReport?: FinalBottleneckReport;
}

export interface FinalReportMeta {
  process_name: string;
  severity: string;
  detected_at: string;
  generated_at: string;
}

export interface FinalReportAffectedProcess {
  process: string;
  status: string;
  utilization_pct: number;
  wait_ratio: number;
  wip: number;
}

export interface FinalReportCauseItem {
  rank?: number;
  cause?: string;
  contribution_pct?: number;
  recommended_action?: string;
  similar_case?: string;
  summary?: string;
  consensus?: {
    confidence_level: string;
    summary: string;
    g_star_confirmed?: boolean;
    g_star_proba?: number;
    agreed_features?: string[];
    conflicted_features?: string[];
  };
}

export interface FinalReportActionEffect {
  label: string;
  action_kind: string;
  description: string;
  simulation_confidence: number;
  kpi_delta: {
    avg_queue_time_min: number;
    wip_count: number;
    throughput_delta: number;
  };
}

export interface FinalReportForwardSimulationResult {
  toolgroup: string;
  q_time_future: number | null;
  wait_ratio_future: number;
  wip_future: number;
  y_bottleneck: number;
}

export interface FinalBottleneckReport {
  meta: FinalReportMeta;
  bottleneck_info: {
    tool_group: string;
    risk_score: number;
    delayed_orders: number;
    avg_queue_time_min: number;
    peak_q_time_min: number;
    utilization_pct: number;
    load_ratio: number;
    wip_count: number;
    available_tool_ratio: number;
  };
  fab_kpi: {
    wip_total: number;
    utilization_avg_pct: number;
    q_time_min: number;
    wait_ratio: number;
  };
  diffusion_analysis: {
    is_bottleneck: boolean;
    bottleneck_location: string;
    diffusion_path: string[];
    affected_processes: FinalReportAffectedProcess[];
    forward_simulation?: {
      horizon_min: number;
      results: FinalReportForwardSimulationResult[];
    };
    line_stop_expected_min?: number;
    risk_level?: string;
  };
  cause_analysis: FinalReportCauseItem[];
  action_effects: FinalReportActionEffect[];
  recommendation: {
    action_label: string;
    action_kind: string;
    reason: string;
  };
  approval_info: {
    status: string;
    approved_by: string;
    approved_role: string;
    approved_at: string;
    comment: string;
    rejection_reason: string | null;
  };
  full_markdown: string;
}

export interface ReportV1Kpi {
  key: string;
  label: string;
  value: number;
  unit: string;
  threshold_state: string | null;
  prev_value: number | null;
  delta: number | null;
  pct_change: number | null;
}

export interface ReportV1KpiImpact {
  kpi: string;
  unit: string;
  now: number;
  after: number;
  delta: number;
  pct_change: number;
  verdict: string;
  verdict_token: string;
  confidence: number;
  ci_low: number;
  ci_high: number;
  ci_width: number;
  paired_t_p: number | null;
  significant: boolean | null;
}

export type ReportV1ForecastKpiKey =
  | 'q_time_min'
  | 'wip'
  | 'wait_ratio'
  | 'utilization_avg'
  | 'available_tool_ratio'
  | string;

export type ReportV1ForecastKpiValues = Partial<Record<ReportV1ForecastKpiKey, number | null>>;

export interface ReportV1PerTgForecast {
  current?: ReportV1ForecastKpiValues;
  no_action?: ReportV1ForecastKpiValues;
  action?: ReportV1ForecastKpiValues;
}

export interface ReportV1ActionCandidate {
  label: string;
  kind: string;
  is_baseline: boolean;
  is_approved: boolean;
  description: string;
  target_toolgroups: string[];
  params: Record<string, unknown> | null;
  kpi_impact: ReportV1KpiImpact[];
  operational: {
    effort: number;
    effort_max: number;
    scope: string;
    reversibility: string;
  };
  simulation: {
    paired_n: number;
    confidence: number | null;
    verdict: string;
  };
  composite_score: number;
  tradeoffs: string[];
  comparison_basis?: string;
  per_tg_forecasts?: Record<string, ReportV1PerTgForecast>;
}

export interface ReportV1RagHit {
  case_id: string;
  score?: number;
  tg_code?: string;
  area_name?: string;
  bottleneck_cause_type?: string;
  risk_grade?: string;
  cause_summary?: string;
  report_title?: string;
  report_url?: string;
  text?: string;
  source_path?: string;
}

export interface ReportV1RagCaseSummary {
  case_id?: string;
  summary: string;
  relevance?: string;
  supports_effect?: boolean;
  shows_risk?: boolean;
}

export interface ReportV1RagClaim {
  text?: string;
  case_ids?: string[];
}

export interface ReportV1RagCandidateEvidence {
  effect_outlook?: string;
  risk_level?: string;
  evidence_strength?: string;
  candidate_summary?: string;
  case_summaries?: ReportV1RagCaseSummary[];
  claims?: Array<string | ReportV1RagClaim>;
}

export interface ReportV1RagCandidate {
  label: string;
  profile?: string;
  plan_description?: string;
  hits?: ReportV1RagHit[];
  evidence?: ReportV1RagCandidateEvidence;
}

export interface ReportV1RagComparison {
  ranking_status?: string;
  ranking?: unknown[];
  rag_summary?: string;
  overall_comment?: string;
}

export interface ReportV1 {
  schema_version: 'report/1.0';
  meta: {
    toolgroup: string;
    process_name: string;
    severity: string;
    severity_token: string;
    severity_priority: number;
    detected_at: string;
    generated_at: string;
    snapshot_time: number;
    horizon_min: number;
    schema_version: string;
  };
  approval: {
    status: string;
    status_token: string;
    approver_name: string;
    approver_role: string;
    approved_at: string;
    comment: string;
    rejection_reason: string | null;
    selected_label: string | null;
  };
  risk: {
    score: number;
    score_unit: string;
    score_threshold_state: string;
    composite_score: number;
    probability: number;
  };
  confidence: {
    level: string;
    level_token: string;
    needs_more_data: boolean;
    g_star_probability: number | null;
  };
  if_no_action: {
    available: boolean;
    will_get_worse: boolean;
    horizon_min: number;
    kpi_changes: Array<{
      kpi: string;
      unit: string;
      now: number;
      after: number;
      delta: number;
      pct_change: number;
      reliability_token: string;
    }>;
  };
  bottleneck_kpis: ReportV1Kpi[];
  data_quality: {
    status: string;
    warnings: Array<{
      code?: string;
      toolgroup?: string | null;
      field?: string | null;
      value?: string | number | null;
      message: string;
    }>;
  };
  cause: {
    summary: string;
    primary: {
      category: string;
      feature: string;
      confidence: string;
      confidence_token: string;
      reasoning: string;
    };
    secondary_categories: string[];
    categories: Array<{
      name: string;
      features: string[];
      shap_share_pct: number;
      n_trend_significant: number;
      upstream_match: boolean;
      g_star_confirmed: boolean;
      total_score: number;
      confidence: string;
      confidence_token: string;
    }>;
    shap_top: Array<{
      rank: number;
      feature: string;
      value: number;
      shap: number;
      contribution_pct: number;
      direction_token: string;
    }>;
    trend_series: {
      time_labels: string[];
      time_offsets_min: number[];
      features: Record<
        string,
        {
          values: number[];
          slope_per_hour: number;
          r2: number;
          significant: boolean;
        }
      >;
    };
    upstream_suspects: string[];
    consensus_axes: {
      shap_supports: boolean;
      trend_supports: boolean;
      upstream_supports: boolean;
      g_star_supports: boolean;
      axes_agreed_count: number;
    };
    g_star: {
      confirmed: boolean;
      probability: number;
      monte_carlo: {
        n_total: number;
        n_alarm: number;
        alarm_ratio_pct: number;
      };
      upstream_confirmed_toolgroups: string[];
      significant_kpis: string[];
    };
  };
  diffusion: {
    bottleneck_location: string;
    diffusion_path: string[];
    high_impact_processes: Array<{
      toolgroup: string;
      utilization_pct: number;
      wait_ratio: number;
      wip: number;
      impact_score: number;
      data_quality_flags: string[];
    }>;
    low_impact_processes: unknown[];
    forward_simulation: {
      available: boolean;
      horizon_min: number;
      results: Array<{
        toolgroup: string;
        q_time_min_future: number | null;
        wait_ratio_future: number;
        wip_future: number;
        is_bottleneck_predicted: boolean;
      }>;
    };
    line_stop_expected_min: number;
    risk_level: string;
    risk_level_token: string;
  };
  actions: {
    available: boolean;
    candidates: ReportV1ActionCandidate[];
    approved_label: string | null;
    decision_status: string;
    decision_status_token: string;
    equivalent_set: string[];
    tiebreaker_used: string | null;
    decision_caveat: string;
    recommendation: {
      headline: string;
      primary_reason: string;
      confidence_level: string;
      confidence_token: string;
      tradeoffs: string[];
      why_not_others: Array<{ label: string; reason: string }>;
      caveats: string[];
      tiebreaker_chain: string[];
      selected_by: string;
    };
    playbook: {
      available: boolean;
      immediate_actions: Array<{ order: number; text: string }>;
      monitoring: Array<{ kpi: string; target: number | string | null; unit: string; check_after_min: number }>;
      rollback_condition: string;
    };
  };
  sections: Record<string, string>;
  rendered: {
    markdown: string;
  };
  rag_evidence?: {
    toolgroup?: string;
    common_hits?: ReportV1RagHit[];
    candidates?:
      | ReportV1RagCandidate[]
      | Record<string, ReportV1RagCandidate | { evidence?: ReportV1RagCandidateEvidence }>;
    comparison?: ReportV1RagComparison;
  };
}

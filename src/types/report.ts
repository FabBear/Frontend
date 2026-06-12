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

import type { BottleneckRiskGrade } from '@/types/bottleneckMonitoring';
import type { FinalBottleneckReport } from '@/types/report';

export type BncCaseStatus = 'DETECTED' | 'ANALYZING' | 'AWAITING_HITL' | 'RESOLVED';
export type BncTabId = 'progress' | 'cause' | 'solutions' | 'report';
export type BncAgentStepStatus = 'WAITING' | 'RUNNING' | 'DONE' | 'FAILED';

export interface BncPageInfo {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sort: string;
}

export interface BncAlertCase {
  caseId: string;
  tgId: string;
  tgName: string;
  areaName: string;
  riskGrade: Extract<BottleneckRiskGrade, 'CRITICAL' | 'HIGH' | 'MEDIUM'>;
  bottleneckProb: number;
  utilizationRate: number;
  wipCount: number;
  detectedAt: string;
  status: BncCaseStatus;
  currentStepName: string | null;
  stepProgress: number;
  totalSteps: number;
}

export interface BncCaseListData {
  items: BncAlertCase[];
  pageInfo: BncPageInfo;
}

export interface BncAgentSummary {
  bottleneckCount: number;
  criticalCount: number;
  maxWipCount: number;
  maxUtilizationRate: number;
}

export interface BncAgentStep {
  stepOrder: number;
  stepName: string;
  status: BncAgentStepStatus;
  startedAt: string | null;
  completedAt: string | null;
  outputSummary: string | null;
  attemptNo: number;
}

export interface BncCaseDetail extends Omit<
  BncAlertCase,
  'utilizationRate' | 'wipCount' | 'currentStepName' | 'stepProgress' | 'totalSteps'
> {
  resolvedAt: string | null;
  agentProgress: BncAgentStep[];
  agentSummary: BncAgentSummary;
}

export interface BncActionPlanMetric {
  label: string;
  before: string;
  after: string;
  delta: string;
}

export interface BncBaselineSnapshotItem {
  label: string;
  value: string;
  caption?: string;
}

export interface BncRecommendationSummary {
  actionLabel: string;
  actionKind: string;
  reason: string;
  structured?: {
    headline?: string;
    primaryReason?: string;
    tradeoffs?: string[];
    whyNotOthers?: Record<string, string>;
    caveats?: string[];
    confidenceLevel?: string;
    immediateActions?: string[];
    monitoringKpis?: string[];
    rollbackCondition?: string;
    whyRecommended?: {
      selectedBy?: string;
      tiebreakerChain?: string[];
      explanation?: string;
    };
    recommendationStatus?: string;
  };
}

export interface BncApprovalInfo {
  status: string;
  approvedBy: string;
  approvedRole: string;
  approvedAt: string;
  comment: string;
  rejectionReason: string | null;
}

export interface BncActionPlan {
  planId: string;
  actionLabel?: string;
  actionKind?: string;
  title: string;
  summary: string;
  expectedImpact: string;
  riskText: string;
  confidence: number | null;
  compositeScore?: number;
  scoreVerdict?: string;
  actionMetadata?: {
    effort?: number | null;
    scope?: string | null;
    reversibility?: string | null;
    descriptionKo?: string | null;
  };
  scoreBreakdown?: Array<{
    key: string;
    label: string;
    weight?: number | null;
    meanDelta: number;
    verdict: string;
    contribution: number;
    confidence: number;
    ciWidth?: number | null;
    pctChange?: number | null;
  }>;
  tradeoffs?: string[];
  metrics: BncActionPlanMetric[];
  operationItems?: string[];
  targetToolGroups?: string[];
  impactTone?: 'positive' | 'neutral' | 'negative';
  recommended: boolean;
}

export interface BncCurrentActionBaseline {
  label: string;
  actionKind: string;
  title: string;
  summary: string;
  confidence: number | null;
  compositeScore?: number;
  scoreVerdict?: string;
  metrics: BncBaselineSnapshotItem[];
  scoreBreakdown?: BncActionPlan['scoreBreakdown'];
  tradeoffs?: string[];
}

export interface BncCompareContext {
  schemaVersion?: string;
  scenarioName?: string;
  anchorToolgroup?: string;
  targetToolgroups?: string[];
  severity?: string;
  horizonMin?: number;
  generatedAt?: string;
  naturalForecast?: {
    label: string;
    getsWorse: boolean;
    metrics: BncBaselineSnapshotItem[];
  };
  causeSummary?: string;
  upstreamSuspects?: string[];
  cascade?: {
    affectedToolgroups: string[];
    ctIncreaseMin: number | null;
    atRiskLots: number | null;
    capacityStressScore: number | null;
    impactScore: number | null;
  };
  dataQuality?: {
    status: string;
    warnings: Array<{
      code?: string;
      severity?: string;
      message: string;
      suspectComponent?: string;
    }>;
  };
}

export interface BncCausePredictionSummary {
  bottleneckProb: number;
  riskGrade: BncAlertCase['riskGrade'];
  maxWipCount: number;
  maxUtilizationRate: number;
}

export interface BncAffectedToolGroup {
  tgId: string;
  tgName: string;
  areaName: string;
}

export interface BncCauseSummaryItem {
  tgId: string;
  tgName: string;
  bottleneckCauseType: string;
  utilRate: number;
  waitingLots: number;
  setupRatio: number;
  slope: number | null;
}

export interface BncShapFeature {
  feature: string;
  label: string;
  importance: number;
  rank: number;
  direction: string;
}

export interface BncTrendInsight {
  feature: string;
  label: string;
  slopePerHour: number;
  values: number[];
}

export interface BncRagSimilarCase {
  caseId: string;
  summary: string;
}

export interface BncModelPerformance {
  accuracy: number;
  f1Score: number;
  featureCount: number;
}

export interface BncCauseAnalysis {
  caseId: string;
  analysisId: string;
  predictionSummary: BncCausePredictionSummary;
  diffusion: {
    affectedToolGroups: BncAffectedToolGroup[];
  };
  causeSummary: BncCauseSummaryItem[];
  shapFeatures: BncShapFeature[];
  trendInsights: BncTrendInsight[];
  ragSimilarCases: BncRagSimilarCase[];
  modelPerformance: BncModelPerformance;
  forwardForecastText: string;
  createdAt: string;
}

export interface BncActionPlanBaseline {
  throughput: number;
  avgWaitDay: number;
  deliveryCompliance: number;
  avgDelayDay: number;
}

export interface BncHitlStatus {
  hasDecision: boolean;
  latestDecision: 'APPROVED' | 'REJECTED' | null;
  selectedPlanId: string | null;
  comment: string | null;
}

export interface BncActionPlansPayload {
  caseId: string;
  baseline: BncActionPlanBaseline;
  baselineSnapshot?: BncBaselineSnapshotItem[];
  currentOption?: BncCurrentActionBaseline;
  compareContext?: BncCompareContext;
  plans: BncActionPlan[];
  recommendation?: BncRecommendationSummary;
  decisionInfo?: {
    decisionStatus: string;
    topLabel: string;
    equivalentSet: string[];
    tiebreakerUsed: string | null;
    decisionCaveat: string;
  };
  approvalInfo?: BncApprovalInfo;
  hitlStatus: BncHitlStatus;
}

export interface BncReportTimelineItem {
  time: string;
  event: string;
}

export interface BncReportPayload {
  reportId: string;
  caseId: string;
  summary: string;
  reportHtml?: string | null;
  rootCauseText: string;
  actionComparisonText: string;
  timeline: BncReportTimelineItem[];
  hasPdf: boolean;
  generatedAt: string;
  regeneratedCount: number;
  qdrantIndexed: boolean;
  finalReport?: FinalBottleneckReport;
}

export interface BncTabOption {
  id: BncTabId;
  label: string;
  description: string;
}

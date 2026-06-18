import type { BottleneckRiskGrade } from '@/types/bottleneckMonitoring';
import type { FinalBottleneckReport, ReportV1 } from '@/types/report';

export type BncCaseStatus = 'DETECTED' | 'ANALYZING' | 'AWAITING_HITL' | 'RESOLVED';
export type BncTabId = 'progress' | 'cause' | 'solutions' | 'report';
export type BncAgentStepStatus = 'PENDING' | 'IN_PROGRESS' | 'WAITING' | 'RUNNING' | 'DONE' | 'FAILED';

export interface BncPageInfo {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sort: string;
}

/** stage1 병목 알림(bottleneck_detected)의 종합·영향 지표. Critical 케이스 요약 카드에 사용. */
export interface BncAlertMetrics {
  /** composite_score (0~1) — 종합 */
  compositeScore: number | null;
  /** probability (0~1) — 병목 확률 */
  probability: number | null;
  /** impact_score (0~1) — 영향 */
  impactScore: number | null;
  /** affected_count — 후속(연쇄 영향) TG 수 */
  affectedCount: number | null;
  /** ct_increase_min — CT 증가(분) */
  ctIncreaseMin: number | null;
  /** at_risk_lots — 위험 Lot 수 */
  atRiskLots: number | null;
}

export interface BncAlertCase {
  caseId: string;
  tgId: string;
  tgName: string;
  areaName: string;
  riskGrade: Extract<BottleneckRiskGrade, 'CRITICAL' | 'HIGH' | 'MEDIUM'>;
  bottleneckProb: number;
  riskScore: number | null;
  utilizationRate: number;
  wipCount: number;
  detectedAt: string;
  status: BncCaseStatus;
  currentStepName: string | null;
  stepProgress: number;
  totalSteps: number;
  /** stage1 알림 종합·영향 지표(요약 카드용). 없으면 카드에서 '-'. */
  alertMetrics?: BncAlertMetrics;
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
  pctDelta?: number;
  tone?: 'positive' | 'negative' | 'neutral';
}

export interface BncBaselineSnapshotItem {
  label: string;
  value: string;
  caption?: string;
  pctDelta?: number;
  tone?: 'positive' | 'negative' | 'neutral';
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

export interface BncActionSpecLot {
  id: string;
  product: string;
  t2dueMin: number;
}

export interface BncActionSpecGroup {
  zone: string;
  action: string;
  lots: BncActionSpecLot[];
}

export interface BncActionSpec {
  intervalPct?: number;
  noLotAdjust?: boolean;
  noLotReason?: string;
  lotGroups?: BncActionSpecGroup[];
}

export interface BncActionPlan {
  planId: string;
  actionLabel?: string;
  actionKind?: string;
  title: string;
  actionSpec?: BncActionSpec;
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
  /** 원시 SHAP 기여값(+면 병목 방향). 막대 길이는 contributionPct를 우선 사용. */
  shapValue?: number;
  /** 해당 시점 피처 KPI 값(정규화/원본). */
  kpiValue?: number;
  /** 양수 SHAP 총합 중 이 피처 비율(%) — 막대 길이 기준. */
  contributionPct?: number;
}

export interface BncTrendInsight {
  feature: string;
  label: string;
  slopePerHour: number;
  values: number[];
  /** 선형 추세 적합도(0~1). */
  r2?: number;
  /** 통계적으로 유의한 추세인지(기울기 p<0.05 등). */
  significant?: boolean;
}

export type BncCauseConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface BncLlmVerdict {
  mainCategory: string;
  mainFeature: string;
  confidence: BncCauseConfidence;
  summary: string;
  reasoning: string;
  evidence: {
    shapContribPct: number;
    gStarSignificant: boolean;
    gStarKpi?: string;
    gStarPValue?: number;
    worseningFeatures: string[];
  };
  forecast: string;
  rejected: Array<{ category: string; reason: string }>;
}

/** LLM 판정 에이전트의 최종 원인 판정 (CauseJudgment). */
export interface BncCauseJudgment {
  primaryCategory: string;
  primaryCause: string;
  primaryConfidence: BncCauseConfidence;
  primaryReasoning: string;
  secondaryCauses: string[];
  dismissed: string[];
  dismissedReason?: string;
  causeSummary?: string;
}

/** 여러 피처를 묶은 원인 카테고리 집계 (CauseCategory). */
export interface BncCauseCategory {
  name: string;
  features: string[];
  shapSharePct: number;
  nTrendSignificant: number;
  upstreamMatch: boolean;
  gStarConfirmed: boolean;
  totalScore: number;
  confidence: BncCauseConfidence;
}

/** G* KPI 검정 단일 결과 (GStarKpiResult). p = FDR 보정 p-value. */
export interface BncGStarKpi {
  kpi: string;
  deltaMean: number;
  pAdjusted: number;
  significant: boolean;
}

/** G* 통계 검정 묶음 (ConsensusResult의 G* 서브셋). */
export interface BncGStarResult {
  confirmed: boolean;
  proba: number;
  nTotal: number;
  nAlarm: number;
  /** 통계적으로 확인된(알람) TG 목록. */
  toolgroups: string[];
  sigKpis: BncGStarKpi[];
  upstreamConfirmed: string[];
}

/** 시뮬레이션 예측 KPI 변화 (KpiComparison). */
export interface BncSimKpiDelta {
  kpi: string;
  now: number;
  future: number;
  delta: number;
  pctChange: number;
  reliability: string;
}

/** Forward 시뮬레이션 예측 (SimForecast). */
export interface BncSimForecast {
  t0: number;
  tFuture: number;
  getsWorse: boolean;
  kpiDeltas: BncSimKpiDelta[];
}

export interface BncRagSimilarCase {
  caseId: string;
  summary: string;
  score?: number;
  tgCode?: string;
  reportTitle?: string;
}

export interface BncRagCandidateEvidence {
  candidateSummary: string;
  riskLevel: 'high' | 'medium' | 'low';
  evidenceStrength: 'strong' | 'moderate' | 'weak';
  effectOutlook?: string;
  claims?: string[];
  caseSummaries?: Array<{
    caseId: string;
    summary: string;
    relevance?: string;
    supportsEffect?: boolean;
    showsRisk?: boolean;
  }>;
}

export interface BncRagEvidence {
  commonHits: BncRagSimilarCase[];
  perPlan?: Record<string, BncRagCandidateEvidence>;
  comparison?: {
    ragSummary?: string;
    overallComment?: string;
  };
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
  /** LLM 판정(주원인/보조/기각). 신 파이프라인 산출물. */
  judgment?: BncCauseJudgment | null;
  /** 구조화된 LLM 판정 결과 (verdict card 표시용). */
  llmVerdict?: BncLlmVerdict | null;
  /** 원인 카테고리 랭킹(설비_포화/WIP_누적 등). */
  causeCategories?: BncCauseCategory[];
  /** 업스트림 의심 공정 TG. */
  upstreamSuspects?: string[];
  /** G* 통계 검정 결과(없으면 미수행). */
  gStar?: BncGStarResult | null;
  /** Forward Sim 예측(없으면 미수행). */
  simForecast?: BncSimForecast | null;
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
  ragEvidence?: BncRagEvidence;
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
  reportV1?: ReportV1;
  finalReport?: FinalBottleneckReport;
}

export interface BncTabOption {
  id: BncTabId;
  label: string;
  description: string;
}

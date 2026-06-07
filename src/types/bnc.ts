import type { BottleneckRiskGrade } from '@/types/bottleneckMonitoring';

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

export interface BncAgentStep {
  stepOrder: number;
  stepName: string;
  status: BncAgentStepStatus;
  startedAt: string | null;
  completedAt: string | null;
  outputSummary: string | null;
  attemptNo: number;
}

export interface BncActionPlanMetric {
  label: string;
  before: string;
  after: string;
  delta: string;
}

export interface BncActionPlan {
  planId: string;
  title: string;
  summary: string;
  expectedImpact: string;
  riskText: string;
  confidence: number;
  metrics: BncActionPlanMetric[];
  recommended: boolean;
}

export interface BncTabOption {
  id: BncTabId;
  label: string;
  description: string;
}

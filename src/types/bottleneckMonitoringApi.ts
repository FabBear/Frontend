import type { BncAlertMetrics } from '@/types/bnc';
import type { BottleneckRiskGrade } from '@/types/bottleneckMonitoring';

export interface BottleneckSnapshotResponse {
  snapshotId: string;
  caseId: string;
  capturedAt: string;
  simulationTick: number;
  fabId: string;
}

export interface BottleneckAlertsResponse {
  items: BottleneckAlertResponseItem[];
  pageInfo: BottleneckPageInfoResponse;
}

export interface BottleneckAlertResponseItem {
  caseId: string;
  tgId: string;
  tgName: string;
  areaName: string;
  riskGrade: BottleneckRiskGrade;
  riskLevel: string | null;
  bottleneckProb: number | null;
  riskScore: number | null;
  detectedAt: string;
  estDelayHours: number | null;
  affectedTgCount: number | null;
  alertMetrics?: BncAlertMetrics | null;
  mainCause: string | null;
  status: string | null;
  currentStepName: string | null;
}

export interface BottleneckProcessMapResponse {
  snapshotId: string | null;
  capturedAt: string;
  areas: BottleneckAreaSummaryResponse[];
}

export interface BottleneckAreaSummaryResponse {
  areaId: string;
  areaName: string;
  totalTgCount: number;
  bottleneckTgCount: number;
  tgSummary: Partial<Record<BottleneckRiskGrade, number>>;
}

export interface BottleneckToolGroupDetailResponse {
  tgId: string;
  tgCode: string;
  tgName: string;
  areaName: string;
  measuredAt: string;
  utilizationRate: number | null;
  availableToolRatio: number | null;
  wipCount: number | null;
  avgQtimeMin: number | null;
  setupRatio: number | null;
  waitRatio: number | null;
  bottleneckProb: number | null;
  riskScore: number | null;
  riskGrade: BottleneckRiskGrade | null;
  relatedCaseId: string | null;
}

export interface BottleneckRankingsResponse {
  items: BottleneckRankingItemResponse[];
  pageInfo: BottleneckPageInfoResponse;
}

export interface BottleneckRankingItemResponse {
  rank: number;
  tgId: string;
  tgCode: string;
  tgName: string;
  areaName: string;
  bottleneckProb: number | null;
  riskScore: number | null;
  utilizationRate: number | null;
  wipCount: number | null;
  riskGrade: BottleneckRiskGrade | null;
  measuredAt: string;
}

export interface BottleneckPageInfoResponse {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sort: string;
}

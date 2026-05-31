import type { RiskLevel } from '@/constants/riskLevel';

export type BottleneckRiskGrade = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type BottleneckCaseStatus = 'DETECTED' | 'ANALYZING' | 'AWAITING_HITL' | 'RESOLVED' | null;

export interface BottleneckPageInfo {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sort: string;
}

export interface BottleneckSnapshot {
  snapshotId: string;
  caseId: string;
  capturedAt: string;
  simulationTick: number;
  fabId: string;
}

export interface BottleneckAreaSummary {
  areaId: string;
  areaCode: string;
  areaName: string;
  totalTgCount: number;
  bottleneckTgCount: number;
  tgSummary: Record<BottleneckRiskGrade, number>;
}

export interface BottleneckProcessMapData {
  snapshotId: string;
  capturedAt: string;
  areas: BottleneckAreaSummary[];
}

export interface BottleneckToolGroupItem {
  tgId: string;
  tgCode: string;
  tgName: string;
  status: BottleneckCaseStatus;
  riskGrade: BottleneckRiskGrade;
  utilizationRate: number;
  wipCount: number;
  avgQtimeMin: number | null;
  setupRatio: number;
  waitRatio: number;
  availableToolRatio: number;
  bottleneckProb: number;
  measuredAt: string;
  areaId: string;
  areaCode: string;
  areaName: string;
}

export interface BottleneckToolGroupListData {
  areaId: string;
  areaName: string;
  items: BottleneckToolGroupItem[];
  pageInfo: BottleneckPageInfo;
}

export interface BottleneckToolGroupDetail {
  tgId: string;
  tgCode: string;
  tgName: string;
  areaName: string;
  measuredAt: string;
  utilizationRate: number;
  availableToolRatio: number;
  wipCount: number;
  avgQtimeMin: number | null;
  setupRatio: number;
  waitRatio: number;
  bottleneckProb: number;
  riskGrade: BottleneckRiskGrade;
  relatedCaseId: string | null;
}

export interface AreaFilterOption {
  areaCode: string;
  areaName: string;
  areaNameKo: string;
  totalTgCount: number;
  bottleneckTgCount: number;
  maxRiskLevel: RiskLevel;
  riskSummary: Record<BottleneckRiskGrade, number>;
}

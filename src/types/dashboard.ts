import type { RiskLevel } from '@/constants/riskLevel';

export interface FabKpiSnapshot {
  rtf: number;
  rtfDelta: number;
  throughput24h: number;
  throughputDelta: number;
  avgQtimeDays: number;
  qtimeDelta: number;
  wipCount: number;
  wipDelta: number;
  updatedAt: string;
}

export interface BottleneckAlertItem {
  caseId: string;
  tgCode: string;
  riskLevel: RiskLevel;
  estDelayHours: number;
  affectedLotCount: number;
  mainCause: string;
  detectedAt: string;
}

export interface ProcessAreaStatus {
  areaCode: string;
  areaName: string;
  riskLevel: RiskLevel;
  bottleneckProb: number;
  wipCount: number;
  totalToolGroupCount: number;
  bottleneckToolGroupCount: number;
  toolGroups: ProcessToolGroupStatus[];
}

export interface ProcessToolGroupStatus {
  tgCode: string;
  riskLevel: RiskLevel;
  utilizationRate: number;
  wipCount: number;
}

export interface ProcessToolGroup {
  name: string;
  util: number;
  wipCount: number;
}

export interface ProcessAreaData {
  name: string;
  gFE: ProcessToolGroup[];
  gBE: ProcessToolGroup[];
}

export interface KpiTrendSeries {
  key: string;
  title: string;
  subtitle: string;
  values: number[];
  colorToken: string;
  xLabels: string[];
  valueFormat: 'percent' | 'integer' | 'decimal';
  targetValue?: number;
}

export interface DashboardData {
  kpi: FabKpiSnapshot;
  alerts: BottleneckAlertItem[];
  processAreas: ProcessAreaData[];
  trends: KpiTrendSeries[];
}

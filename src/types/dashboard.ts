import type { RiskLevel } from '@/constants/riskLevel';

export interface FabKpiSnapshot {
  rtf: number | null;
  rtfDelta: number | null;
  throughput24h: number | null;
  throughputDelta: number | null;
  throughputUnit: string;
  avgQtimeMin: number | null;
  qtimeDelta: number | null;
  qtimeUnit: string;
  wipCount: number | null;
  wipDelta: number | null;
  wipTarget: number | null;
  wipUnit: string;
  updatedAt: string;
}

export interface BottleneckAlertItem {
  caseId: string;
  tgId: string;
  tgName: string;
  areaName: string;
  riskGrade: string;
  riskLevel: RiskLevel;
  bottleneckProb: number;
  estDelayHours: number;
  affectedLotCount: number;
  mainCause: string;
  status: string;
  currentStepName: string;
  canAnalyzeCause: boolean;
  canShowSolutions: boolean;
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

export interface DashboardProcessAreaData {
  areaId: string;
  areaCode: string;
  areaName: string;
  totalTgCount: number;
  bottleneckTgCount: number;
  tgSummary: Record<string, number>;
  toolGroups: DashboardProcessToolGroupData[];
}

export interface DashboardProcessToolGroupData {
  tgId: string;
  tgCode: string;
  tgName: string;
  riskGrade: string;
  riskLevel: RiskLevel;
  utilizationRate: number;
  bottleneckProb: number;
  wipCount: number;
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
  processAreas: DashboardProcessAreaData[];
  trends: KpiTrendSeries[];
}

export interface DashboardSectionData {
  kpi: FabKpiSnapshot | null;
  alerts: BottleneckAlertItem[] | null;
  processAreas: DashboardProcessAreaData[] | null;
  trends: KpiTrendSeries[] | null;
}

export type DashboardSectionKey = keyof DashboardSectionData;

export type DashboardSectionErrors = Partial<Record<DashboardSectionKey, string>>;

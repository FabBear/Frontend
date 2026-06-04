import type { RiskLevel } from '@/constants/riskLevel';

export type MesViewMode = 'all' | 'process' | 'toolGroup';
export type MesRiskGrade = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type MesToolStatus = 'RUN' | 'IDLE' | 'SETUP' | 'DOWN';
export type MesToolViewMode = 'card' | 'table';
export type MesToolStatusSummary = Record<MesToolStatus, number>;

export interface MesSnapshot {
  measuredAt: string;
  simulationDay: number;
  isConnected: boolean;
}

export interface MesTrendSeries {
  name: string;
  colorToken: string;
  values: number[];
}

export interface MesProcessSummary {
  areaId: string;
  areaCode: string;
  areaName: string;
  areaNameKo: string;
  sourceAreaCodes: string[];
  toolGroupCount: number;
  toolCount: number;
  avgUtilizationRate: number;
  maxUtilizationRate: number;
  wipCount: number;
  avgQtimeMin: number | null;
  maxQtimeMin: number | null;
  setupRatio: number;
  bottleneckToolGroupCount: number;
  avgAvailableToolRatio: number;
  riskGrade: MesRiskGrade;
}

export interface MesToolGroupMetric {
  tgId: string;
  tgCode: string;
  tgName: string;
  areaId: string;
  areaCode: string;
  areaName: string;
  areaNameKo: string;
  sourceAreaCode: string;
  sourceAreaNameKo: string;
  toolCount: number;
  utilizationRate: number;
  availableToolRatio: number;
  wipCount: number;
  avgQtimeMin: number | null;
  setupRatio: number;
  waitRatio: number;
  bottleneckProb: number;
  riskGrade: MesRiskGrade;
  measuredAt: string;
}

export interface MesToolMetric {
  toolId: string;
  toolCode: string;
  toolName: string;
  tgId: string;
  tgCode: string;
  utilizationRate: number;
  oeeEstimate: number | null;
  avgQtimeMin: number | null;
  queueLotCount: number;
  setupRatio: number;
  downRatio: number;
  status: MesToolStatus;
  lastDispatchAt?: string | null;
  measuredAt: string;
}

export interface MesKpiCard {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  delta?: number;
  deltaUnit?: string;
  isPositiveGood?: boolean;
  note?: string;
  tone?: RiskLevel | 'info' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
}

export interface MesMonitoringData {
  snapshot: MesSnapshot;
  days: string[];
  kpiCards: MesKpiCard[];
  utilizationSeries: MesTrendSeries[];
  wipTrend: number[];
  setupSeries: MesTrendSeries[];
  processSummaries: MesProcessSummary[];
  toolGroups: MesToolGroupMetric[];
  tools: MesToolMetric[];
}

export interface MesTabOption {
  value: MesViewMode;
  label: string;
}

export interface MesRealtimePayload {
  simulationTime: string;
  fab: MesRealtimeFab | null;
  summary: MesRealtimeSummary | null;
  areas: MesRealtimeArea[];
  toolGroups: MesRealtimeToolGroup[];
  tools: MesRealtimeTool[];
  trends: MesRealtimeTrends | null;
}

export interface MesRealtimeFab {
  fabId: string;
  fabCode: string;
  fabName: string;
  measuredAt: string;
  utilizationRate: number | null;
  wipCount: number | null;
  avgQtimeMin: number | null;
  rtf: number | null;
  tatMin: number | null;
  throughput24h: number | null;
  deliveryCompliance: number | null;
}

export interface MesRealtimeSummary {
  totalWipCount: number | null;
  avgUtilizationRate: number | null;
  tatMin: number | null;
  bottleneckTgCount: number | null;
  throughput24h: number | null;
  deliveryCompliance: number | null;
}

export interface MesRealtimeArea {
  areaId: string;
  areaCode: string;
  areaName: string;
  toolGroupCount: number;
  bottleneckTgCount: number;
  avgUtilizationRate: number | null;
  wipCount: number | null;
}

export interface MesRealtimeToolGroup {
  tgId: string;
  tgCode: string;
  tgName: string;
  areaId: string;
  areaCode: string;
  areaName: string;
  measuredAt: string;
  utilizationRate: number | null;
  wipCount: number | null;
  availableToolRatio: number | null;
  avgQtimeMin: number | null;
  setupRatio: number | null;
  waitRatio: number | null;
  bottleneckProb: number | null;
  riskGrade: MesRiskGrade | null;
}

export interface MesRealtimeTool {
  toolId: string;
  toolCode: string;
  toolName: string;
  tgId: string;
  measuredAt: string;
  utilizationRate: number | null;
  oeeEstimate: number | null;
  avgQtimeMin: number | null;
  queueLotCount: number | null;
  setupRatio: number | null;
  downRatio: number | null;
  status?: MesToolStatus | null;
}

export interface MesRealtimeTrendPoint {
  time: string;
  value: number | null;
}

export interface MesRealtimeTrends {
  utilization: MesRealtimeTrendPoint[];
  wip: MesRealtimeTrendPoint[];
  setupRatio: MesRealtimeTrendPoint[];
}

import type { RiskLevel } from '@/constants/riskLevel';

export type MesViewMode = 'all' | 'process' | 'toolGroup' | 'tool';
export type MesRiskGrade = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type MesToolStatus = 'RUN' | 'IDLE' | 'SETUP' | 'DOWN';
export type MesToolViewMode = 'card' | 'table';

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
  toolGroupCount: number;
  toolCount: number;
  avgUtilizationRate: number;
  maxUtilizationRate: number;
  wipCount: number;
  avgQtimeMin: number | null;
  setupRatio: number;
  bottleneckToolGroupCount: number;
  deliveryRate: number;
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

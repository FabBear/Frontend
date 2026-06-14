export interface DashboardApiData {
  kpi: DashboardKpiResponse;
  alerts: DashboardRiskAlertsResponse;
  processMap: DashboardProcessMapResponse;
  trends: DashboardTrendsResponse;
}

export interface DashboardKpiResponse {
  measuredAt: string;
  rtf: DashboardDeltaMetric;
  throughput24h: DashboardDeltaMetric;
  avgQtimeMin: DashboardDeltaMetric & { valueDay?: number | null };
  wip: DashboardDeltaMetric & { target?: number | null };
}

export interface DashboardDeltaMetric {
  value: number | null;
  delta: number | null;
  unit?: string | null;
  deltaType?: 'INCREASE' | 'DECREASE' | 'UNCHANGED' | null;
}

export interface DashboardTrendsResponse {
  range: string;
  intervalMin: number;
  series: Partial<Record<DashboardTrendKey, DashboardTrendPoint[]>>;
}

export type DashboardTrendKey = 'rtf' | 'throughput24h' | 'avgQtimeMin' | 'wip';

export interface DashboardTrendPoint {
  measuredAt: string;
  value: number | null;
}

export interface DashboardRiskAlertsResponse {
  items: DashboardRiskAlertItem[];
  pageInfo: DashboardPageInfo;
}

export interface DashboardPageInfo {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sort: string;
}

export interface DashboardRiskAlertItem {
  caseId: string;
  tgId: string;
  tgName: string;
  areaName: string;
  riskGrade: string;
  riskLevel?: string | null;
  bottleneckProb: number | null;
  detectedAt: string;
  estimatedDelayMin?: number | null;
  estDelayHours?: number | null;
  affectedLotCount?: number | null;
  affectedTgCount?: number | null;
  mainCause: string | null;
  status: string | null;
  currentStepName: string | null;
}

export interface DashboardProcessMapResponse {
  areas: DashboardProcessArea[];
}

export interface DashboardProcessArea {
  areaId: string;
  areaCode: string;
  areaName: string;
  totalTgCount: number;
  bottleneckTgCount: number;
  tgSummary: Record<string, number>;
  toolGroups: DashboardProcessToolGroup[];
}

export interface DashboardProcessToolGroup {
  tgId: string;
  tgCode: string;
  tgName: string;
  riskGrade: string | null;
  utilizationRate: number | null;
  bottleneckProb: number | null;
  wipCount: number | null;
}

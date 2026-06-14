import type { MesRiskGrade } from '@/types/mes';

export type MachineViewMode = 'toolGroup' | 'equipment';
export type MachineSortKey = 'bottleneckProb' | 'utilizationRate' | 'queueLotCount';
export type MachineSortDirection = 'desc' | 'asc';
export type MachineRiskFilter = 'ALL' | 'RISK' | 'MEDIUM' | 'LOW';
export type MachineEquipmentStatus = 'RUN' | 'IDLE' | 'DOWN';
export type MachineEquipmentStatusFilter = MachineEquipmentStatus | 'ALL';
export type MachinePeriodPreset = '6H' | '24H' | '7D' | '30D' | 'CUSTOM';
export type MachineCompareMode = 'PREVIOUS_SNAPSHOT' | 'ONE_HOUR_AGO' | 'SAME_TIME_YESTERDAY' | 'TG_AVERAGE';
// TG 전용 지표
export type MachineTgMetricKey =
  | 'utilizationRate'
  | 'wipCount'
  | 'avgQtimeMin'
  | 'availableToolRatio'
  | 'bottleneckProb';

// Tool 전용 지표
export type MachineToolMetricKey = 'utilizationRate' | 'oeeEstimate' | 'queueLotCount' | 'downRatio' | 'avgQtimeMin';

export type MachineMetricKey = MachineTgMetricKey | MachineToolMetricKey;
export type MachineMetricGroup = 'production' | 'queue' | 'state';
export type MachineEventType = 'DISPATCH' | 'PM' | 'BREAKDOWN' | 'STATE_CHANGE' | 'QUEUE_BUILDUP';
export type MachineEventSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type MachineScopeMode = 'process' | 'role';
export type MachinePageTab = 'overview' | 'analysis';
export type MachineAnalysisTargetType = 'toolGroup' | 'tool';
export type MachineAnalysisPresetSeverity = 'warning' | 'info';

export interface MachineSummary {
  toolGroupCount: number;
  toolCount: number;
  downEquipmentCount: number;
  idleRiskEquipmentCount: number;
  actionRequiredCount: number;
  riskToolGroupCount: number;
  riskToolCount: number;
  warningToolGroupCount: number;
  warningToolCount: number;
  normalToolGroupCount: number;
  normalToolCount: number;
  avgUtilizationRate: number | null;
  avgDownRatio: number | null;
  measuredAt: string;
  simulationDay: number;
}

export interface MachineToolGroupItem {
  tgId: string;
  tgCode: string;
  tgName: string;
  roleCode: string;
  areaCode: string;
  areaNameKo: string;
  toolCount: number;
  runToolCount: number;
  idleToolCount: number;
  downToolCount: number;
  utilizationRate: number;
  availableToolRatio: number;
  queueLotCount: number;
  bottleneckProb: number;
  riskGrade: MesRiskGrade;
  measuredAt: string;
}

export interface MachineEquipmentItem {
  toolId: string;
  toolCode: string;
  toolName: string;
  tgId: string;
  tgCode: string;
  roleCode: string;
  toolNumber: string;
  areaCode: string;
  areaNameKo: string;
  status: MachineEquipmentStatus;
  utilizationRate: number;
  oeeEstimate: number | null;
  queueLotCount: number;
  bottleneckProb: number;
  downRatio: number;
  baselineUtilizationRate: number;
  baselineOeeEstimate: number | null;
  baselineQueueLotCount: number;
  baselineDownRatio: number;
  anomalyScore: number;
  lastDispatchAt: string | null;
  measuredAt: string;
}

export interface MachineScopeOption {
  code: string;
  label: string;
  toolGroupCount: number;
  toolCount: number;
  dangerCount: number;
  avgUtilizationRate: number | null;
}

export type MachineActionSeverity = 'critical' | 'warning' | 'info';

export interface MachineActionItem {
  id: string;
  severity: MachineActionSeverity;
  equipmentCode: string;
  tgCode: string;
  areaNameKo: string;
  title: string;
  description: string;
  status: MachineEquipmentStatus;
  queueLotCount: number;
  bottleneckProb: number;
}

export interface MachineMetricDefinition {
  key: MachineMetricKey;
  label: string;
  group: MachineMetricGroup;
  unit: '%' | 'lot';
  valueFormat: 'ratio' | 'number';
  positiveGood: boolean;
}

export interface MachineTrendPoint {
  measuredAt: string;
  status: MachineEquipmentStatus;
  utilizationRate: number;
  oeeEstimate: number | null;
  queueLotCount: number;
  downRatio: number;
}

export interface MachineEventLog {
  eventId: string;
  toolId: string;
  occurredAt: string;
  eventType: MachineEventType;
  severity: MachineEventSeverity;
  message: string;
  lotId?: string | null;
}

export interface MachineComparisonTarget {
  id: string;
  code: string;
  label: string;
  groupLabel: string;
}

export interface MachineComparisonRow extends MachineComparisonTarget {
  values: Record<MachineMetricKey, number | null>;
}

export interface MachineMonitoringData {
  summary: MachineSummary;
  metricDefinitions: MachineMetricDefinition[];
  actionItems: MachineActionItem[];
  toolGroups: MachineToolGroupItem[];
  equipments: MachineEquipmentItem[];
  trendsByToolId: Record<string, MachineTrendPoint[]>;
  eventsByToolId: Record<string, MachineEventLog[]>;
}

export interface MachineAnalysisSeries {
  id: string;
  label: string;
  groupLabel: string;
  values: Record<MachineMetricKey, number[]>;
}

export interface MachineAnalysisPreset {
  key: string;
  label: string;
  description: string;
  targetType: MachineAnalysisTargetType;
  targetIds: string[];
  metricKeys: MachineMetricKey[];
  severity: MachineAnalysisPresetSeverity;
}

// ── 트렌드 API 응답 타입 ──────────────────────────────────────────────

export interface MachineEquipmentTrendPoint {
  measuredAt: string;
  // 공통
  utilizationRate: number | null;
  setupRatio: number | null;
  avgQtimeMin: number | null;
  // TG 전용
  wipCount?: number | null;
  availableToolRatio?: number | null;
  bottleneckProb?: number | null;
  // Tool 전용
  oeeEstimate?: number | null;
  queueLotCount?: number | null;
  downRatio?: number | null;
}

export interface MachineEquipmentTrendSeries {
  id: string;
  code: string;
  groupLabel: string;
  points: MachineEquipmentTrendPoint[];
}

export interface MachineEquipmentTrendsPayload {
  type: MachineAnalysisTargetType;
  from?: string;
  to?: string;
  effectiveBucket?: string;
  series: MachineEquipmentTrendSeries[];
}

export interface MachinePeriodRange {
  preset: MachinePeriodPreset;
  from: string;
  to: string;
}

// ── 장비 현황 기간 통계 (GET /v1/monitoring/equipment/overview) ──────────
// 백엔드 EquipmentOverviewResponse 미러. 공정>TG>Tool 기간 집계를 서버에서 계산해 내려준다.
export interface EquipmentOverviewSummary {
  toolGroupCount: number;
  toolCount: number;
  avgUtilizationRate: number | null;
  avgWipCount: number | null;
  maxWipCount: number | null;
  avgDownRatio: number | null;
  riskToolGroupCount: number;
}

export interface EquipmentOverviewArea {
  areaCode: string;
  areaName: string;
  toolGroupCount: number;
  toolCount: number;
  avgUtilizationRate: number | null;
  currentUtilizationRate: number | null;
  deltaUtilizationRate: number | null;
  avgWipCount: number | null;
  maxWipCount: number | null;
  avgBottleneckProb: number | null;
  riskToolGroupCount: number;
  topBurdenToolGroupCode: string | null;
}

export interface EquipmentOverviewTg {
  tgId: string;
  tgCode: string;
  tgName: string;
  areaCode: string;
  areaName: string;
  toolCount: number;
  runToolCount: number;
  idleToolCount: number;
  downToolCount: number;
  avgUtilizationRate: number | null;
  currentUtilizationRate: number | null;
  deltaUtilizationRate: number | null;
  avgWipCount: number | null;
  maxWipCount: number | null;
  avgAvailableToolRatio: number | null;
  avgBottleneckProb: number | null;
  riskGrade: MesRiskGrade;
}

export interface EquipmentOverviewTool {
  toolId: string;
  toolCode: string;
  toolName: string;
  tgId: string;
  tgCode: string;
  areaCode: string;
  areaName: string;
  currentStatus: MachineEquipmentStatus;
  avgUtilizationRate: number | null;
  currentUtilizationRate: number | null;
  deltaUtilizationRate: number | null;
  avgOeeEstimate: number | null;
  avgQueueLotCount: number | null;
  maxQueueLotCount: number | null;
  avgDownRatio: number | null;
}

export interface EquipmentOverviewPayload {
  from: string;
  to: string;
  range: string | null;
  dataCadence: string | null;
  summary: EquipmentOverviewSummary;
  processes: EquipmentOverviewArea[];
  toolGroups: EquipmentOverviewTg[];
  tools: EquipmentOverviewTool[];
}

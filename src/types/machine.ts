import type { MesRiskGrade } from '@/types/mes';

export type MachineViewMode = 'toolGroup' | 'equipment';
export type MachineSortKey = 'bottleneckProb' | 'utilizationRate' | 'queueLotCount';
export type MachineSortDirection = 'desc' | 'asc';
export type MachineRiskFilter = 'ALL' | 'RISK' | 'MEDIUM' | 'LOW';
export type MachineEquipmentStatus = 'RUN' | 'IDLE' | 'DOWN';
export type MachineEquipmentStatusFilter = MachineEquipmentStatus | 'ALL';
export type MachinePeriodPreset = '1H' | '6H' | '24H' | '7D';
export type MachineCompareMode = 'PREVIOUS_SNAPSHOT' | 'ONE_HOUR_AGO' | 'SAME_TIME_YESTERDAY' | 'TG_AVERAGE';
export type MachineMetricKey = 'utilizationRate' | 'oeeEstimate' | 'queueLotCount' | 'downRatio';
export type MachineMetricGroup = 'production' | 'queue' | 'state';
export type MachineEventType = 'DISPATCH' | 'PM' | 'BREAKDOWN' | 'STATE_CHANGE' | 'QUEUE_BUILDUP';
export type MachineEventSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type MachineScopeMode = 'process' | 'role';
export type MachinePageTab = 'overview' | 'analysis';
export type MachineAnalysisTargetType = 'toolGroup' | 'tool';

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

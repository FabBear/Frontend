import api from '@/services/api';

import { MACHINE_METRIC_DEFINITIONS } from '@/constants/mockData/machine';
import { getProcessAreaNameKo } from '@/constants/processArea';

import type {
  EquipmentOverviewPayload,
  MachineAnalysisTargetType,
  MachineEquipmentItem,
  MachineEquipmentStatus,
  MachineEquipmentTrendsPayload,
  MachineEventLog,
  MachineMonitoringData,
  MachinePeriodRange,
  MachineSummary,
  MachineToolGroupItem,
  MachineTrendPoint,
} from '@/types/machine';
import type { MesRiskGrade } from '@/types/mes';

const EQUIPMENT_CURRENT_PATH = '/v1/monitoring/equipment/current';

interface EquipmentRealtimePayload {
  simulationTime: string;
  summary: EquipmentRealtimeSummary;
  toolGroups: EquipmentRealtimeToolGroup[];
  tools: EquipmentRealtimeTool[];
}

interface EquipmentRealtimeSummary {
  totalToolGroupCount: number;
  totalToolCount: number;
  dangerToolGroupCount: number;
  warningToolGroupCount: number;
  normalToolGroupCount: number;
  avgUtilizationRate: number | null;
  avgSetupRatio: number | null;
  avgDownRatio: number | null;
}

interface EquipmentRealtimeToolGroup {
  tgId: string;
  tgCode: string;
  tgName: string;
  areaCode: string;
  measuredAt: string | null;
  machineCount: number;
  utilizationRate: number | null;
  wipCount: number | null;
  setupRatio: number | null;
  bottleneckProb: number | null;
  riskGrade: MesRiskGrade | null;
}

interface EquipmentRealtimeTool {
  toolId: string;
  toolCode: string;
  toolName: string;
  tgId: string;
  tgCode: string;
  measuredAt: string | null;
  utilizationRate: number | null;
  oeeEstimate: number | null;
  queueLotCount: number | null;
  setupRatio: number | null;
  downRatio: number | null;
}

function getRoleCode(tgCode: string): string {
  const [area, role] = tgCode.split('_');
  return area && role ? `${area}_${role}` : tgCode;
}

function getToolNumber(toolCode: string): string {
  return toolCode.includes('#') ? (toolCode.split('#').at(-1) ?? '-') : '-';
}

function inferStatus(tool: EquipmentRealtimeTool): MachineEquipmentStatus {
  if ((tool.downRatio ?? 0) > 0) return 'DOWN';
  if ((tool.utilizationRate ?? 0) > 0) return 'RUN';
  return 'IDLE';
}

function normalizeRiskGrade(value: MesRiskGrade | null, utilizationRate: number): MesRiskGrade {
  if (value) return value;
  if (utilizationRate >= 0.9) return 'CRITICAL';
  if (utilizationRate >= 0.85) return 'HIGH';
  if (utilizationRate >= 0.7) return 'MEDIUM';
  return 'LOW';
}

function toToolGroup(toolGroup: EquipmentRealtimeToolGroup): MachineToolGroupItem {
  const utilizationRate = toolGroup.utilizationRate ?? 0;
  return {
    tgId: toolGroup.tgId,
    tgCode: toolGroup.tgCode,
    tgName: toolGroup.tgName || toolGroup.tgCode,
    roleCode: getRoleCode(toolGroup.tgCode),
    areaCode: toolGroup.areaCode,
    areaNameKo: getProcessAreaNameKo(toolGroup.areaCode),
    toolCount: toolGroup.machineCount,
    runToolCount: 0,
    idleToolCount: 0,
    downToolCount: 0,
    utilizationRate,
    availableToolRatio: 0,
    queueLotCount: toolGroup.wipCount ?? 0,
    bottleneckProb: toolGroup.bottleneckProb ?? 0,
    riskGrade: normalizeRiskGrade(toolGroup.riskGrade, utilizationRate),
    measuredAt: toolGroup.measuredAt ?? '',
  };
}

function toEquipment(
  tool: EquipmentRealtimeTool,
  toolGroupById: Map<string, MachineToolGroupItem>
): MachineEquipmentItem {
  const toolGroup = toolGroupById.get(tool.tgId);
  const utilizationRate = tool.utilizationRate ?? 0;
  const oeeEstimate = tool.oeeEstimate;
  const queueLotCount = tool.queueLotCount ?? 0;
  const downRatio = tool.downRatio ?? 0;
  const baselineUtilizationRate = Math.min(utilizationRate + 0.08, 0.98);
  const baselineOeeEstimate = oeeEstimate == null ? null : Math.min(oeeEstimate + 0.05, 0.95);
  const baselineQueueLotCount = Math.max(queueLotCount - 1, 0);
  const baselineDownRatio = Math.max(downRatio - 0.04, 0);

  return {
    toolId: tool.toolId,
    toolCode: tool.toolCode,
    toolName: tool.toolName || tool.toolCode,
    tgId: tool.tgId,
    tgCode: tool.tgCode,
    roleCode: getRoleCode(tool.tgCode),
    toolNumber: getToolNumber(tool.toolCode),
    areaCode: toolGroup?.areaCode ?? '',
    areaNameKo: toolGroup?.areaNameKo ?? '-',
    status: inferStatus(tool),
    utilizationRate,
    oeeEstimate,
    queueLotCount,
    bottleneckProb: toolGroup?.bottleneckProb ?? 0,
    downRatio,
    baselineUtilizationRate,
    baselineOeeEstimate,
    baselineQueueLotCount,
    baselineDownRatio,
    anomalyScore:
      Math.max(baselineUtilizationRate - utilizationRate, 0) +
      Math.max(queueLotCount - baselineQueueLotCount, 0) * 0.08 +
      Math.max(downRatio - baselineDownRatio, 0),
    lastDispatchAt: null,
    measuredAt: tool.measuredAt ?? '',
  };
}

function createTrend(equipment: MachineEquipmentItem): MachineTrendPoint[] {
  return [
    {
      measuredAt: equipment.measuredAt,
      status: equipment.status,
      utilizationRate: equipment.utilizationRate,
      oeeEstimate: equipment.oeeEstimate,
      queueLotCount: equipment.queueLotCount,
      downRatio: equipment.downRatio,
    },
  ];
}

function createEvents(equipment: MachineEquipmentItem): MachineEventLog[] {
  void equipment;
  return [];
}

function mapEquipmentPayload(payload: EquipmentRealtimePayload): MachineMonitoringData {
  const toolGroups = payload.toolGroups.map(toToolGroup);
  const toolGroupById = new Map(toolGroups.map((toolGroup) => [toolGroup.tgId, toolGroup]));
  const equipments = payload.tools.map((tool) => toEquipment(tool, toolGroupById));

  const statusCounts = equipments.reduce<Record<string, Record<MachineEquipmentStatus, number>>>((acc, equipment) => {
    acc[equipment.tgId] ??= { RUN: 0, IDLE: 0, DOWN: 0 };
    acc[equipment.tgId][equipment.status] += 1;
    return acc;
  }, {});

  const enrichedToolGroups = toolGroups.map((toolGroup) => {
    const counts = statusCounts[toolGroup.tgId] ?? { RUN: 0, IDLE: 0, DOWN: 0 };
    return {
      ...toolGroup,
      runToolCount: counts.RUN,
      idleToolCount: counts.IDLE,
      downToolCount: counts.DOWN,
    };
  });

  const summary: MachineSummary = {
    toolGroupCount: payload.summary.totalToolGroupCount,
    toolCount: payload.summary.totalToolCount,
    downEquipmentCount: equipments.filter((equipment) => equipment.status === 'DOWN').length,
    idleRiskEquipmentCount: equipments.filter(
      (equipment) => equipment.status === 'IDLE' && equipment.bottleneckProb >= 0.5
    ).length,
    actionRequiredCount: 0,
    riskToolGroupCount: payload.summary.dangerToolGroupCount,
    riskToolCount: enrichedToolGroups
      .filter((toolGroup) => toolGroup.utilizationRate >= 0.85)
      .reduce((sum, toolGroup) => sum + toolGroup.toolCount, 0),
    warningToolGroupCount: payload.summary.warningToolGroupCount,
    warningToolCount: 0,
    normalToolGroupCount: payload.summary.normalToolGroupCount,
    normalToolCount: 0,
    avgUtilizationRate: payload.summary.avgUtilizationRate,
    avgDownRatio: payload.summary.avgDownRatio,
    measuredAt: enrichedToolGroups[0]?.measuredAt ?? payload.simulationTime,
    simulationDay: 0,
  };

  return {
    summary,
    metricDefinitions: MACHINE_METRIC_DEFINITIONS,
    actionItems: [],
    toolGroups: enrichedToolGroups,
    equipments,
    trendsByToolId: Object.fromEntries(equipments.map((equipment) => [equipment.toolId, createTrend(equipment)])),
    eventsByToolId: Object.fromEntries(equipments.map((equipment) => [equipment.toolId, createEvents(equipment)])),
  };
}

export async function fetchMachineMonitoringData(): Promise<MachineMonitoringData> {
  const { data } = await api.get<EquipmentRealtimePayload>(EQUIPMENT_CURRENT_PATH);
  return mapEquipmentPayload(data);
}

/**
 * 장비 현황 탭 기간 통계 조회 — GET /v1/monitoring/equipment/overview.
 * 공정>TG>Tool의 기간 평균/최대/현재대비를 서버에서 집계해 반환한다.
 * (클라이언트 단일 스냅샷 집계를 대체)
 */
export async function fetchEquipmentOverview(
  range: string,
  from: string,
  to: string
): Promise<EquipmentOverviewPayload> {
  const { data } = await api.get<EquipmentOverviewPayload>('/v1/monitoring/equipment/overview', {
    params: { from, to, range },
  });
  return data;
}

/**
 * TG 또는 Tool 단위 시계열 KPI 트렌드를 조회한다.
 * 백엔드 GET /v1/monitoring/equipment/trends 에 대응.
 * 엔드포인트가 아직 없으면 404/500이 발생하므로 호출 측에서 try-catch 처리.
 */
export async function fetchEquipmentTrends(
  type: MachineAnalysisTargetType,
  ids: string[],
  periodRange: MachinePeriodRange
): Promise<MachineEquipmentTrendsPayload> {
  const { data } = await api.get<MachineEquipmentTrendsPayload>('/v1/monitoring/equipment/trends', {
    params: {
      type,
      ids: ids.join(','),
      range: periodRange.preset,
      from: periodRange.from,
      to: periodRange.to,
    },
  });
  return data;
}

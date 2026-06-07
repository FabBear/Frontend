import { MOCK_MES_MONITORING_DATA } from '@/constants/mockData/mes';

import type {
  MachineActionItem,
  MachineAnalysisTargetType,
  MachineEquipmentItem,
  MachineEquipmentStatus,
  MachineEquipmentTrendPoint,
  MachineEquipmentTrendsPayload,
  MachineEventLog,
  MachineMetricDefinition,
  MachineMonitoringData,
  MachinePeriodPreset,
  MachineSummary,
  MachineTgMetricKey,
  MachineToolGroupItem,
  MachineToolMetricKey,
  MachineTrendPoint,
} from '@/types/machine';
import type { MesToolStatus } from '@/types/mes';

const TREND_OFFSETS = [-0.03, -0.01, 0.02, -0.04, 0.01, -0.02, 0.03, -0.01, 0];

function getRoleCode(tgCode: string): string {
  const [area, role] = tgCode.split('_');
  return area && role ? `${area}_${role}` : tgCode;
}

function getToolNumber(toolCode: string): string {
  return toolCode.includes('#') ? (toolCode.split('#').at(-1) ?? '-') : '-';
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// TG 분석용 지표 정의
export const MACHINE_TG_METRIC_DEFINITIONS: (MachineMetricDefinition & { key: MachineTgMetricKey })[] = [
  { key: 'utilizationRate', label: '가동률', group: 'production', unit: '%', valueFormat: 'ratio', positiveGood: true },
  { key: 'wipCount', label: 'WIP (Lot)', group: 'queue', unit: 'lot', valueFormat: 'number', positiveGood: false },
  { key: 'setupRatio', label: '셋업 비율', group: 'state', unit: '%', valueFormat: 'ratio', positiveGood: false },
  { key: 'avgQtimeMin', label: '평균 Q-time', group: 'queue', unit: 'lot', valueFormat: 'number', positiveGood: false },
  {
    key: 'availableToolRatio',
    label: '가용 장비율',
    group: 'production',
    unit: '%',
    valueFormat: 'ratio',
    positiveGood: true,
  },
  { key: 'bottleneckProb', label: '병목 확률', group: 'state', unit: '%', valueFormat: 'ratio', positiveGood: false },
];

// Tool 분석용 지표 정의
export const MACHINE_TOOL_METRIC_DEFINITIONS: (MachineMetricDefinition & { key: MachineToolMetricKey })[] = [
  { key: 'utilizationRate', label: '가동률', group: 'production', unit: '%', valueFormat: 'ratio', positiveGood: true },
  { key: 'oeeEstimate', label: 'OEE', group: 'production', unit: '%', valueFormat: 'ratio', positiveGood: true },
  { key: 'queueLotCount', label: 'Queue Lot', group: 'queue', unit: 'lot', valueFormat: 'number', positiveGood: false },
  { key: 'setupRatio', label: '셋업 비율', group: 'state', unit: '%', valueFormat: 'ratio', positiveGood: false },
  { key: 'downRatio', label: 'Down 비율', group: 'state', unit: '%', valueFormat: 'ratio', positiveGood: false },
  { key: 'avgQtimeMin', label: '평균 Q-time', group: 'queue', unit: 'lot', valueFormat: 'number', positiveGood: false },
];

// 하위 호환용 전체 목록 (기존 코드가 참조하는 곳)
export const MACHINE_METRIC_DEFINITIONS: MachineMetricDefinition[] = MACHINE_TOOL_METRIC_DEFINITIONS;

function normalizeEquipmentStatus(status: MesToolStatus): MachineEquipmentStatus {
  if (status === 'DOWN') return 'DOWN';
  if (status === 'RUN') return 'RUN';
  return 'IDLE';
}

const STATUS_SUMMARY_BY_TG_ID = MOCK_MES_MONITORING_DATA.tools.reduce<
  Record<string, Record<MachineEquipmentStatus, number>>
>((summary, tool) => {
  summary[tool.tgId] ??= { RUN: 0, IDLE: 0, DOWN: 0 };
  summary[tool.tgId][normalizeEquipmentStatus(tool.status)] += 1;
  return summary;
}, {});

export const MOCK_MACHINE_TOOL_GROUPS: MachineToolGroupItem[] = MOCK_MES_MONITORING_DATA.toolGroups.map((toolGroup) => {
  const statusSummary = STATUS_SUMMARY_BY_TG_ID[toolGroup.tgId] ?? { RUN: 0, IDLE: 0, DOWN: 0 };

  return {
    tgId: toolGroup.tgId,
    tgCode: toolGroup.tgCode,
    tgName: toolGroup.tgName,
    roleCode: getRoleCode(toolGroup.tgCode),
    areaCode: toolGroup.areaCode,
    areaNameKo: toolGroup.areaNameKo,
    toolCount: toolGroup.toolCount,
    runToolCount: statusSummary.RUN,
    idleToolCount: statusSummary.IDLE,
    downToolCount: statusSummary.DOWN,
    utilizationRate: toolGroup.utilizationRate,
    availableToolRatio: toolGroup.availableToolRatio,
    queueLotCount: Math.round(toolGroup.waitRatio * Math.max(toolGroup.toolCount, 1)),
    bottleneckProb: toolGroup.bottleneckProb,
    riskGrade: toolGroup.riskGrade,
    measuredAt: toolGroup.measuredAt,
  };
});

const TOOL_GROUP_BY_ID = new Map(MOCK_MACHINE_TOOL_GROUPS.map((toolGroup) => [toolGroup.tgId, toolGroup]));

export const MOCK_MACHINE_EQUIPMENTS: MachineEquipmentItem[] = MOCK_MES_MONITORING_DATA.tools.map((tool) => {
  const toolGroup = TOOL_GROUP_BY_ID.get(tool.tgId);
  const baselineUtilizationRate = Math.min(Math.max(tool.utilizationRate + 0.12, 0.02), 0.96);
  const baselineOeeEstimate = tool.oeeEstimate == null ? null : Math.min(tool.oeeEstimate + 0.08, 0.92);
  const baselineQueueLotCount = Math.max(tool.queueLotCount - 1, 0);
  const downRatio = normalizeEquipmentStatus(tool.status) === 'DOWN' ? Math.max(tool.downRatio, 0.18) : tool.downRatio;
  const baselineDownRatio = Math.max(downRatio - 0.12, 0);
  const utilizationDrop = Math.max(baselineUtilizationRate - tool.utilizationRate, 0);
  const queueIncrease = Math.max(tool.queueLotCount - baselineQueueLotCount, 0) * 0.08;
  const downIncrease = Math.max(downRatio - baselineDownRatio, 0);

  return {
    toolId: tool.toolId,
    toolCode: tool.toolCode,
    toolName: tool.toolName,
    tgId: tool.tgId,
    tgCode: tool.tgCode,
    roleCode: getRoleCode(tool.tgCode),
    toolNumber: getToolNumber(tool.toolCode),
    areaCode: toolGroup?.areaCode ?? '',
    areaNameKo: toolGroup?.areaNameKo ?? '-',
    status: normalizeEquipmentStatus(tool.status),
    utilizationRate: tool.utilizationRate,
    oeeEstimate: tool.oeeEstimate,
    queueLotCount: tool.queueLotCount,
    bottleneckProb: toolGroup?.bottleneckProb ?? 0,
    downRatio,
    baselineUtilizationRate,
    baselineOeeEstimate,
    baselineQueueLotCount,
    baselineDownRatio,
    anomalyScore: utilizationDrop + queueIncrease + downIncrease + (toolGroup?.bottleneckProb ?? 0) * 0.1,
    lastDispatchAt: tool.lastDispatchAt,
    measuredAt: tool.measuredAt,
  };
});

function createTrend(equipment: MachineEquipmentItem): MachineTrendPoint[] {
  return TREND_OFFSETS.map((offset, index) => {
    const isLast = index === TREND_OFFSETS.length - 1;
    return {
      measuredAt: `T-${TREND_OFFSETS.length - 1 - index}`,
      status: isLast ? equipment.status : index % 5 === 0 ? 'IDLE' : 'RUN',
      utilizationRate: isLast
        ? equipment.utilizationRate
        : Math.min(Math.max(equipment.baselineUtilizationRate + offset, 0), 0.98),
      oeeEstimate:
        equipment.baselineOeeEstimate == null
          ? null
          : isLast
            ? equipment.oeeEstimate
            : Math.min(Math.max(equipment.baselineOeeEstimate + offset * 0.8, 0), 0.95),
      queueLotCount: isLast
        ? equipment.queueLotCount
        : Math.max(equipment.baselineQueueLotCount + (index % 3 === 0 ? 1 : 0), 0),
      downRatio: isLast ? equipment.downRatio : Math.max(equipment.baselineDownRatio + (index % 6 === 0 ? 0.02 : 0), 0),
    };
  });
}

function createEvents(equipment: MachineEquipmentItem): MachineEventLog[] {
  const baseEvents: MachineEventLog[] = [
    {
      eventId: `${equipment.toolId}-dispatch`,
      toolId: equipment.toolId,
      occurredAt: 'T-3',
      eventType: 'DISPATCH',
      severity: 'INFO',
      message: 'Lot dispatch 완료. 이후 가동률 추이 확인 필요',
      lotId: `LOT-${equipment.toolCode.slice(-4)}`,
    },
    {
      eventId: `${equipment.toolId}-state`,
      toolId: equipment.toolId,
      occurredAt: 'T-1',
      eventType: 'STATE_CHANGE',
      severity: equipment.status === 'RUN' ? 'INFO' : 'WARNING',
      message: `장비 상태가 ${equipment.status}로 전환됨`,
    },
  ];

  if (equipment.status === 'DOWN') {
    baseEvents.push({
      eventId: `${equipment.toolId}-breakdown`,
      toolId: equipment.toolId,
      occurredAt: 'T-0',
      eventType: 'BREAKDOWN',
      severity: 'CRITICAL',
      message: '비가동 상태 감지. 정비 요청 및 병목 영향 확인 필요',
    });
  } else if (equipment.queueLotCount > equipment.baselineQueueLotCount) {
    baseEvents.push({
      eventId: `${equipment.toolId}-queue`,
      toolId: equipment.toolId,
      occurredAt: 'T-0',
      eventType: 'QUEUE_BUILDUP',
      severity: 'WARNING',
      message: `Queue Lot ${equipment.queueLotCount}개 누적. Dispatch 우선순위 확인 필요`,
    });
  }

  return baseEvents;
}

export const MOCK_MACHINE_TRENDS_BY_TOOL_ID: Record<string, MachineTrendPoint[]> = Object.fromEntries(
  MOCK_MACHINE_EQUIPMENTS.map((equipment) => [equipment.toolId, createTrend(equipment)])
);

export const MOCK_MACHINE_EVENTS_BY_TOOL_ID: Record<string, MachineEventLog[]> = Object.fromEntries(
  MOCK_MACHINE_EQUIPMENTS.map((equipment) => [equipment.toolId, createEvents(equipment)])
);

function createActionItem(equipment: MachineEquipmentItem): MachineActionItem | null {
  if (equipment.status === 'DOWN') {
    return {
      id: `action-${equipment.toolId}`,
      severity: 'critical',
      equipmentCode: equipment.toolCode,
      tgCode: equipment.tgCode,
      areaNameKo: equipment.areaNameKo,
      title: '정비 투입 필요',
      description: '비가동 장비입니다. 병목권 TG면 capacity loss가 즉시 누적됩니다.',
      status: equipment.status,
      queueLotCount: equipment.queueLotCount,
      bottleneckProb: equipment.bottleneckProb,
    };
  }

  if (equipment.status === 'IDLE' && equipment.bottleneckProb >= 0.5) {
    return {
      id: `action-${equipment.toolId}`,
      severity: 'warning',
      equipmentCode: equipment.toolCode,
      tgCode: equipment.tgCode,
      areaNameKo: equipment.areaNameKo,
      title: 'Dispatch 확인',
      description: '병목권 Tool Group의 대기 장비입니다. 투입 가능 Lot/레시피 조건을 확인합니다.',
      status: equipment.status,
      queueLotCount: equipment.queueLotCount,
      bottleneckProb: equipment.bottleneckProb,
    };
  }

  if (equipment.queueLotCount >= 2 && equipment.bottleneckProb >= 0.35) {
    return {
      id: `action-${equipment.toolId}`,
      severity: 'info',
      equipmentCode: equipment.toolCode,
      tgCode: equipment.tgCode,
      areaNameKo: equipment.areaNameKo,
      title: '대기 Lot 해소',
      description: '장비 앞 대기 Lot이 누적되어 있습니다. 작업 순서와 우선순위를 점검합니다.',
      status: equipment.status,
      queueLotCount: equipment.queueLotCount,
      bottleneckProb: equipment.bottleneckProb,
    };
  }

  return null;
}

export const MOCK_MACHINE_ACTION_ITEMS: MachineActionItem[] = MOCK_MACHINE_EQUIPMENTS.map(createActionItem)
  .filter((item): item is MachineActionItem => item !== null)
  .sort((a, b) => {
    const severityOrder: Record<MachineActionItem['severity'], number> = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity] || b.bottleneckProb - a.bottleneckProb;
  })
  .slice(0, 8);

const riskToolGroups = MOCK_MACHINE_TOOL_GROUPS.filter(
  (toolGroup) => toolGroup.riskGrade === 'CRITICAL' || toolGroup.riskGrade === 'HIGH'
);
const warningToolGroups = MOCK_MACHINE_TOOL_GROUPS.filter((toolGroup) => toolGroup.riskGrade === 'MEDIUM');
const normalToolGroups = MOCK_MACHINE_TOOL_GROUPS.filter((toolGroup) => toolGroup.riskGrade === 'LOW');

export const MOCK_MACHINE_SUMMARY: MachineSummary = {
  toolGroupCount: MOCK_MACHINE_TOOL_GROUPS.length,
  toolCount: MOCK_MACHINE_TOOL_GROUPS.reduce((sum, toolGroup) => sum + toolGroup.toolCount, 0),
  downEquipmentCount: MOCK_MACHINE_EQUIPMENTS.filter((equipment) => equipment.status === 'DOWN').length,
  idleRiskEquipmentCount: MOCK_MACHINE_EQUIPMENTS.filter(
    (equipment) => equipment.status === 'IDLE' && equipment.bottleneckProb >= 0.5
  ).length,
  actionRequiredCount: MOCK_MACHINE_ACTION_ITEMS.length,
  riskToolGroupCount: riskToolGroups.length,
  riskToolCount: riskToolGroups.reduce((sum, toolGroup) => sum + toolGroup.toolCount, 0),
  warningToolGroupCount: warningToolGroups.length,
  warningToolCount: warningToolGroups.reduce((sum, toolGroup) => sum + toolGroup.toolCount, 0),
  normalToolGroupCount: normalToolGroups.length,
  normalToolCount: normalToolGroups.reduce((sum, toolGroup) => sum + toolGroup.toolCount, 0),
  avgUtilizationRate: average(MOCK_MACHINE_TOOL_GROUPS.map((toolGroup) => toolGroup.utilizationRate)),
  avgDownRatio: average(MOCK_MACHINE_EQUIPMENTS.map((equipment) => equipment.downRatio)),
  measuredAt: MOCK_MES_MONITORING_DATA.snapshot.measuredAt,
  simulationDay: MOCK_MES_MONITORING_DATA.snapshot.simulationDay,
};

export const MOCK_MACHINE_MONITORING_DATA: MachineMonitoringData = {
  summary: MOCK_MACHINE_SUMMARY,
  metricDefinitions: MACHINE_METRIC_DEFINITIONS,
  actionItems: MOCK_MACHINE_ACTION_ITEMS,
  toolGroups: MOCK_MACHINE_TOOL_GROUPS,
  equipments: MOCK_MACHINE_EQUIPMENTS,
  trendsByToolId: MOCK_MACHINE_TRENDS_BY_TOOL_ID,
  eventsByToolId: MOCK_MACHINE_EVENTS_BY_TOOL_ID,
};

// ── 분석 탭용 트렌드 mock 생성 ────────────────────────────────────────

const SIM_BASE_MS = new Date('2020-02-01T09:00:00+09:00').getTime();

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const RANGE_CONFIG: Record<MachinePeriodPreset, { bucketMin: number; nPoints: number }> = {
  '6H': { bucketMin: 60, nPoints: 6 },
  '24H': { bucketMin: 60, nPoints: 24 },
  '7D': { bucketMin: 60, nPoints: 168 },
  '30D': { bucketMin: 60, nPoints: 720 },
};

function makeTgPoints(tg: MachineToolGroupItem, nPoints: number, bucketMin: number): MachineEquipmentTrendPoint[] {
  const rng = seededRng(tg.tgCode.charCodeAt(0) * 53 + tg.tgCode.length * 7);
  return Array.from({ length: nPoints }, (_, i) => {
    const offsetMin = (i - (nPoints - 1)) * bucketMin;
    const noise = (rng() - 0.5) * 0.12;
    const util = Math.max(0.05, Math.min(0.99, tg.utilizationRate + noise));
    return {
      measuredAt: new Date(SIM_BASE_MS + offsetMin * 60_000).toISOString(),
      utilizationRate: util,
      wipCount: Math.max(0, Math.round(tg.queueLotCount * (0.7 + rng() * 0.6))),
      setupRatio: Math.max(0, Math.min(0.3, 0.06 + (rng() - 0.5) * 0.04)),
      avgQtimeMin: Math.max(0, 25 + (rng() - 0.5) * 30),
      availableToolRatio: Math.max(0.3, Math.min(1, tg.availableToolRatio + (rng() - 0.5) * 0.08)),
      bottleneckProb: Math.max(0, Math.min(1, tg.bottleneckProb + (rng() - 0.5) * 0.1)),
    };
  });
}

function makeToolPoints(eq: MachineEquipmentItem, nPoints: number, bucketMin: number): MachineEquipmentTrendPoint[] {
  const rng = seededRng(eq.toolCode.charCodeAt(0) * 37 + eq.toolCode.length * 11);
  return Array.from({ length: nPoints }, (_, i) => {
    const offsetMin = (i - (nPoints - 1)) * bucketMin;
    const noise = (rng() - 0.5) * 0.14;
    const util = Math.max(0.02, Math.min(0.99, eq.utilizationRate + noise));
    const oee = eq.oeeEstimate == null ? null : Math.max(0, Math.min(0.99, util * 0.97 + (rng() - 0.5) * 0.05));
    return {
      measuredAt: new Date(SIM_BASE_MS + offsetMin * 60_000).toISOString(),
      utilizationRate: util,
      oeeEstimate: oee,
      queueLotCount: Math.max(0, Math.round(eq.queueLotCount * (0.6 + rng() * 0.8))),
      setupRatio: Math.max(0, Math.min(0.3, 0.05 + (rng() - 0.5) * 0.04)),
      downRatio: eq.status === 'DOWN' ? Math.max(0.1, rng() * 0.4) : Math.max(0, rng() * 0.05),
      avgQtimeMin: Math.max(0, 20 + (rng() - 0.5) * 25),
    };
  });
}

export interface MockTrendMeta {
  id: string;
  code: string;
  groupLabel: string;
  /** TG: 기준 가동률. 없으면 랜덤 생성. */
  baseUtil?: number;
  /** TG: 기준 WIP. 없으면 랜덤 생성. */
  baseWip?: number;
  baseAvailRatio?: number;
  baseBottleneckProb?: number;
  /** Tool: 기준 OEE. */
  baseOee?: number | null;
  /** Tool: 기준 Queue Lot. */
  baseQueue?: number;
  isDown?: boolean;
}

/**
 * 실제 API UUID를 사용하는 경우에도 동작하도록
 * 메타데이터(id, code, groupLabel 등)를 외부에서 주입받는다.
 * code 문자열을 seed로 사용해 재현 가능한 mock 시계열을 생성한다.
 */
export function generateMockEquipmentTrends(
  type: MachineAnalysisTargetType,
  targets: MockTrendMeta[],
  range: MachinePeriodPreset
): MachineEquipmentTrendsPayload {
  const { bucketMin, nPoints } = RANGE_CONFIG[range] ?? RANGE_CONFIG['24H'];

  const series = targets.map((target) => {
    const seed = target.code.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);

    if (type === 'toolGroup') {
      const baseUtil = target.baseUtil ?? 0.35 + seededRng(seed)() * 0.55;
      const baseWip = target.baseWip ?? Math.round(2 + seededRng(seed + 1)() * 8);
      const baseAvail = target.baseAvailRatio ?? 0.65 + seededRng(seed + 2)() * 0.35;
      const baseBnProb = target.baseBottleneckProb ?? seededRng(seed + 3)() * 0.7;

      const fakeTg = {
        tgCode: target.code,
        utilizationRate: baseUtil,
        queueLotCount: baseWip,
        availableToolRatio: baseAvail,
        bottleneckProb: baseBnProb,
      } as MachineToolGroupItem;

      return {
        id: target.id,
        code: target.code,
        groupLabel: target.groupLabel,
        points: makeTgPoints(fakeTg, nPoints, bucketMin),
      };
    } else {
      const baseUtil = target.baseUtil ?? 0.3 + seededRng(seed)() * 0.6;
      const baseOee = target.baseOee !== undefined ? target.baseOee : baseUtil * 0.97;
      const baseQueue = target.baseQueue ?? Math.round(seededRng(seed + 1)() * 5);

      const fakeEq = {
        toolCode: target.code,
        utilizationRate: baseUtil,
        oeeEstimate: baseOee,
        queueLotCount: baseQueue,
        status: target.isDown ? 'DOWN' : 'RUN',
      } as MachineEquipmentItem;

      return {
        id: target.id,
        code: target.code,
        groupLabel: target.groupLabel,
        points: makeToolPoints(fakeEq, nPoints, bucketMin),
      };
    }
  });

  return { type, range, series };
}

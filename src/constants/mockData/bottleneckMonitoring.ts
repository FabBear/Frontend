import { MOCK_PM_DATA } from '@/constants/mockData/dashboard';
import { getAreaBottleneckCount, getAreaToolGroupCount, getRiskLevelByUtilization } from '@/constants/processRisk';

import type {
  BottleneckAreaSummary,
  BottleneckProcessMapData,
  BottleneckSnapshot,
  BottleneckToolGroupDetail,
  BottleneckToolGroupItem,
} from '@/types/bottleneckMonitoring';
import type { ProcessAreaData, ProcessToolGroup } from '@/types/dashboard';

const CAPTURED_AT = '2026-05-22T01:00:00Z';

export const MOCK_BOTTLENECK_SNAPSHOT: BottleneckSnapshot = {
  snapshotId: 'snapshot-day25-seed99',
  caseId: 'case-de-fe-72',
  capturedAt: CAPTURED_AT,
  simulationTick: 25,
  fabId: 'fab-sk-001',
};

const AREA_NAME_MAP: Record<string, string> = {
  Etch: 'Dry Etch',
};

// 시나리오 시드: 특정 TG의 병목 확률을 안정적으로 유지한다.
const KNOWN_BOTTLENECK_PROB: Record<string, number> = {
  DE_FE_72: 0.999,
  DE_BE_67: 0.997,
  Litho_REG_BE_63: 0.997,
  Litho_BE_110: 0.996,
  LithoMet_BE_18: 0.996,
  DE_BE_11: 0.123,
  WE_FE_84: 0.051,
};

// KNOWN_STATUS에 있는 TG만 relatedCaseId를 가지므로 병목 대응 센터 버튼이 활성화된다.
const KNOWN_STATUS: Record<string, NonNullable<BottleneckToolGroupItem['status']>> = {
  DE_FE_72: 'ANALYZING',
  DE_BE_67: 'DETECTED',
  Litho_REG_BE_63: 'DETECTED',
  Litho_BE_110: 'ANALYZING',
  LithoMet_BE_18: 'DETECTED',
};

function createAreaId(areaCode: string) {
  return `area-${areaCode.toLowerCase().replaceAll('/', '-').replaceAll(' ', '-')}`;
}

function createToolGroupId(tgCode: string) {
  return `tg-${tgCode.toLowerCase().replaceAll('_', '-')}`;
}

function getRiskGrade(utilizationRate: number): BottleneckToolGroupItem['riskGrade'] {
  return getRiskLevelByUtilization(utilizationRate).toUpperCase() as BottleneckToolGroupItem['riskGrade'];
}

function getBottleneckProb(toolGroup: ProcessToolGroup) {
  if (KNOWN_BOTTLENECK_PROB[toolGroup.name] !== undefined) return KNOWN_BOTTLENECK_PROB[toolGroup.name];
  if (toolGroup.util >= 0.85) return Math.min(0.95, 0.55 + toolGroup.util * 0.35 + (toolGroup.wipCount > 0 ? 0.05 : 0));
  if (toolGroup.util >= 0.7) return Math.min(0.54, 0.05 + toolGroup.util * 0.45 + (toolGroup.wipCount > 0 ? 0.03 : 0));
  return Math.max(0.01, toolGroup.util * 0.12);
}

function getAvgQtimeMin(toolGroup: ProcessToolGroup) {
  if (toolGroup.wipCount > 0) return Math.min(1500, 30 + toolGroup.wipCount * 4.8);
  if (toolGroup.util >= 0.85) return 120 + toolGroup.util * 180;
  if (toolGroup.util >= 0.7) return 45 + toolGroup.util * 120;
  return 15 + toolGroup.util * 60;
}

function getSetupRatio(toolGroup: ProcessToolGroup) {
  const nameWeight = toolGroup.name.length % 7;

  return Math.min(0.09, 0.012 + nameWeight * 0.004 + (toolGroup.util >= 0.85 ? 0.008 : 0));
}

function getWaitRatio(toolGroup: ProcessToolGroup) {
  const raw = Math.min(0.4, toolGroup.util * 0.18 + toolGroup.wipCount / 3200);
  // setupRatio와 동일하게 0-1 소수 단위로 반환한다. formatRatioPercent로 표시.
  return Math.round(raw * 1000) / 1000;
}

function getAvailableToolRatio(toolGroup: ProcessToolGroup) {
  return Math.max(0.45, Math.min(0.99, 0.96 - toolGroup.util * 0.18 + (toolGroup.wipCount === 0 ? 0.04 : 0)));
}

function createTgSummary(area: ProcessAreaData): BottleneckAreaSummary['tgSummary'] {
  return [...area.gFE, ...area.gBE].reduce<BottleneckAreaSummary['tgSummary']>(
    (summary, toolGroup) => {
      summary[getRiskGrade(toolGroup.util)] += 1;
      return summary;
    },
    { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }
  );
}

export const MOCK_BOTTLENECK_AREAS: BottleneckAreaSummary[] = MOCK_PM_DATA.map((area) => ({
  areaId: createAreaId(area.name),
  areaCode: area.name,
  areaName: AREA_NAME_MAP[area.name] ?? area.name,
  totalTgCount: getAreaToolGroupCount(area),
  bottleneckTgCount: getAreaBottleneckCount(area),
  tgSummary: createTgSummary(area),
}));

export const MOCK_BOTTLENECK_PROCESS_MAP: BottleneckProcessMapData = {
  snapshotId: MOCK_BOTTLENECK_SNAPSHOT.snapshotId,
  capturedAt: CAPTURED_AT,
  areas: MOCK_BOTTLENECK_AREAS,
};

export const MOCK_BOTTLENECK_PROCESS_AREAS: ProcessAreaData[] = MOCK_PM_DATA;

export const MOCK_BOTTLENECK_TOOL_GROUPS: BottleneckToolGroupItem[] = MOCK_PM_DATA.flatMap((area) => {
  const areaId = createAreaId(area.name);
  const areaName = AREA_NAME_MAP[area.name] ?? area.name;

  return [...area.gFE, ...area.gBE].map((toolGroup) => ({
    tgId: createToolGroupId(toolGroup.name),
    tgCode: toolGroup.name,
    tgName: toolGroup.name,
    status: KNOWN_STATUS[toolGroup.name] ?? null,
    riskGrade: getRiskGrade(toolGroup.util),
    utilizationRate: toolGroup.util,
    wipCount: toolGroup.wipCount,
    avgQtimeMin: Math.round(getAvgQtimeMin(toolGroup) * 10) / 10,
    setupRatio: Math.round(getSetupRatio(toolGroup) * 10000) / 10000,
    waitRatio: getWaitRatio(toolGroup),
    availableToolRatio: Math.round(getAvailableToolRatio(toolGroup) * 10000) / 10000,
    bottleneckProb: getBottleneckProb(toolGroup),
    riskScore: null,
    measuredAt: CAPTURED_AT,
    areaId,
    areaCode: area.name,
    areaName,
  }));
});

export const MOCK_BOTTLENECK_TOOL_GROUP_DETAILS: Record<string, BottleneckToolGroupDetail> = Object.fromEntries(
  MOCK_BOTTLENECK_TOOL_GROUPS.map((item) => [
    item.tgId,
    {
      tgId: item.tgId,
      tgCode: item.tgCode,
      tgName: item.tgName,
      areaName: item.areaName,
      measuredAt: item.measuredAt,
      utilizationRate: item.utilizationRate,
      availableToolRatio: item.availableToolRatio,
      wipCount: item.wipCount,
      avgQtimeMin: item.avgQtimeMin,
      setupRatio: item.setupRatio,
      waitRatio: item.waitRatio,
      bottleneckProb: item.bottleneckProb,
      riskScore: item.riskScore,
      riskGrade: item.riskGrade,
      relatedCaseId: item.status ? `case-${item.tgCode.toLowerCase().replaceAll('_', '-')}` : null,
    },
  ])
);

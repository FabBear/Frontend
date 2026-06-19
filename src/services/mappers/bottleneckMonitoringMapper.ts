import { getMesSemiconductorProcessCode, getProcessAreaNameKo, getProcessAreaSortOrder } from '@/constants/processArea';
import { riskGradeToLevel } from '@/constants/riskLevel';

import type {
  BottleneckAreaSummary,
  BottleneckProcessMapData,
  BottleneckRiskGrade,
  BottleneckSnapshot,
  BottleneckToolGroupDetail,
  BottleneckToolGroupItem,
} from '@/types/bottleneckMonitoring';
import type {
  BottleneckProcessMapResponse,
  BottleneckRankingItemResponse,
  BottleneckRankingsResponse,
  BottleneckSnapshotResponse,
  BottleneckToolGroupDetailResponse,
} from '@/types/bottleneckMonitoringApi';
import type { DashboardProcessAreaData, DashboardProcessToolGroupData } from '@/types/dashboard';


const RISK_GRADES: BottleneckRiskGrade[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

interface AreaContext {
  areaId: string;
  areaCode: string;
  areaName: string;
}

export function mapBottleneckSnapshot(snapshot: BottleneckSnapshotResponse): BottleneckSnapshot {
  return {
    snapshotId: snapshot.snapshotId,
    caseId: snapshot.caseId,
    capturedAt: snapshot.capturedAt,
    simulationTick: snapshot.simulationTick,
    fabId: snapshot.fabId,
  };
}

export function mapBottleneckProcessMap(processMap: BottleneckProcessMapResponse): BottleneckProcessMapData {
  return {
    snapshotId: processMap.snapshotId,
    capturedAt: processMap.capturedAt,
    areas: processMap.areas
      .map((area) => ({
        areaId: area.areaId,
        areaCode: normalizeAreaCode(area.areaName),
        areaName: area.areaName,
        totalTgCount: area.totalTgCount,
        bottleneckTgCount: area.bottleneckTgCount,
        tgSummary: normalizeBottleneckRiskSummary(area.tgSummary),
      }))
      .sort((a, b) => getProcessAreaSortOrder(a.areaCode) - getProcessAreaSortOrder(b.areaCode)),
  };
}

export function mapBottleneckRankings(
  response: BottleneckRankingsResponse,
  areas: BottleneckAreaSummary[]
): BottleneckToolGroupItem[] {
  const areaByName = createAreaContextMap(areas);

  return response.items.map((item) => {
    const context = areaByName.get(normalizeAreaNameKey(item.areaName)) ?? {
      areaId: normalizeAreaCode(item.areaName),
      areaCode: normalizeAreaCode(item.areaName),
      areaName: item.areaName,
    };

    return mapRankingItem(item, context);
  });
}

export function mapBottleneckToolGroupDetail(detail: BottleneckToolGroupDetailResponse): BottleneckToolGroupDetail {
  return {
    tgId: detail.tgId,
    tgCode: detail.tgCode,
    tgName: detail.tgName,
    areaName: detail.areaName,
    measuredAt: detail.measuredAt,
    utilizationRate: detail.utilizationRate ?? 0,
    availableToolRatio: detail.availableToolRatio,
    wipCount: detail.wipCount ?? 0,
    avgQtimeMin: detail.avgQtimeMin,
    setupRatio: detail.setupRatio,
    waitRatio: detail.waitRatio,
    bottleneckProb: detail.bottleneckProb ?? 0,
    riskScore: detail.riskScore,
    riskGrade: detail.riskGrade ?? 'LOW',
    relatedCaseId: detail.relatedCaseId,
  };
}

function mapRankingItem(item: BottleneckRankingItemResponse, area: AreaContext): BottleneckToolGroupItem {
  // MES 원시 코드(DRY_ETCH, LITHO 등)를 반도체 8대 공정 코드(ETCH, LITHOGRAPHY 등)로 정규화
  const processCode = getMesSemiconductorProcessCode(area.areaCode, item.tgCode) || area.areaCode;
  return {
    tgId: item.tgId,
    tgCode: item.tgCode,
    tgName: item.tgName,
    status: null,
    riskGrade: item.riskGrade ?? 'LOW',
    utilizationRate: item.utilizationRate ?? 0,
    wipCount: item.wipCount ?? 0,
    avgQtimeMin: null,
    setupRatio: null,
    waitRatio: null,
    availableToolRatio: null,
    bottleneckProb: item.bottleneckProb ?? 0,
    riskScore: item.compositeScore ?? item.riskScore,
    measuredAt: item.measuredAt,
    areaId: area.areaId,
    areaCode: processCode,
    areaName: getProcessAreaNameKo(processCode),
  };
}

function mapDashboardToolGroup(toolGroup: BottleneckToolGroupItem): DashboardProcessToolGroupData {
  return {
    tgId: toolGroup.tgId,
    tgCode: toolGroup.tgCode,
    tgName: toolGroup.tgName,
    riskGrade: toolGroup.riskGrade,
    riskLevel: riskGradeToLevel(toolGroup.riskGrade),
    utilizationRate: toolGroup.utilizationRate,
    bottleneckProb: toolGroup.bottleneckProb,
    riskScore: toolGroup.riskScore,
    wipCount: toolGroup.wipCount,
  };
}

export function mapBottleneckToolGroupsToDashboardAreas(
  toolGroups: BottleneckToolGroupItem[],
  areas: BottleneckAreaSummary[] = []
): DashboardProcessAreaData[] {
  const groups = toolGroups.reduce<Record<string, BottleneckToolGroupItem[]>>((acc, toolGroup) => {
    acc[toolGroup.areaCode] ??= [];
    acc[toolGroup.areaCode].push(toolGroup);
    return acc;
  }, {});
  const areaCodes = [
    ...areas.map((area) => area.areaCode),
    ...Object.keys(groups).filter((areaCode) => !areas.some((area) => area.areaCode === areaCode)),
  ];

  return areaCodes
    .map((areaCode) => {
      const areaToolGroups = groups[areaCode] ?? [];
      const areaSummary = areas.find((area) => area.areaCode === areaCode);
      const tgSummary = RISK_GRADES.reduce(
        (summary, riskGrade) => {
          summary[riskGrade] = areaToolGroups.filter((toolGroup) => toolGroup.riskGrade === riskGrade).length;
          return summary;
        },
        {} as Record<BottleneckRiskGrade, number>
      );
      const [firstToolGroup] = areaToolGroups;

      return {
        areaId: areaSummary?.areaId ?? firstToolGroup?.areaId ?? areaCode,
        areaCode,
        areaName: areaSummary?.areaName ?? firstToolGroup?.areaName ?? getProcessAreaNameKo(areaCode),
        totalTgCount: areaSummary?.totalTgCount ?? areaToolGroups.length,
        bottleneckTgCount: areaToolGroups.filter(isBottleneckRisk).length,
        tgSummary,
        toolGroups: areaToolGroups.map(mapDashboardToolGroup),
      };
    })
    .sort((a, b) => getProcessAreaSortOrder(a.areaCode) - getProcessAreaSortOrder(b.areaCode));
}

function isBottleneckRisk(toolGroup: BottleneckToolGroupItem): boolean {
  return toolGroup.riskGrade === 'CRITICAL' || toolGroup.riskGrade === 'HIGH';
}

function createAreaContextMap(areas: BottleneckAreaSummary[]): Map<string, AreaContext> {
  return new Map(
    areas.map((area) => [
      normalizeAreaNameKey(area.areaName),
      {
        areaId: area.areaId,
        areaCode: area.areaCode,
        areaName: area.areaName,
      },
    ])
  );
}

export function normalizeBottleneckRiskSummary(
  summary: Partial<Record<BottleneckRiskGrade, number>> | Record<string, number>
): Record<BottleneckRiskGrade, number> {
  return RISK_GRADES.reduce(
    (result, grade) => {
      result[grade] = summary[grade] ?? 0;
      return result;
    },
    {} as Record<BottleneckRiskGrade, number>
  );
}

function normalizeAreaCode(areaName: string): string {
  return areaName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function normalizeAreaNameKey(areaName: string): string {
  return normalizeAreaCode(areaName);
}

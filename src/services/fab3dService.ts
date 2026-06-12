import api from '@/services/api';
import { fetchMesMonitoringData } from '@/services/mesService';

import { MOCK_FAB3D_AREAS } from '@/constants/mockData/fab3d';
import { getProcessAreaNameKo, getProcessAreaSortOrder } from '@/constants/processArea';

import type { Fab3dArea, Fab3dRisk, Fab3dToolDetail, Fab3dToolGroup, TgRouteStep, ToolActivity } from '@/types/fab3d';
import type { MesMonitoringData, MesRiskGrade, MesToolGroupMetric, MesToolMetric } from '@/types/mes';

export interface Fab3dMonitoringData {
  areas: Fab3dArea[];
  tools: Fab3dToolDetail[];
  source: 'current' | 'mock';
  measuredAt: string | null;
}

function toFabRisk(riskGrade: MesRiskGrade, utilizationRate: number): Fab3dRisk {
  if (riskGrade === 'CRITICAL' || utilizationRate >= 0.9) return 'CRITICAL';
  if (riskGrade === 'HIGH' || riskGrade === 'MEDIUM' || utilizationRate >= 0.7) return 'WARNING';
  return 'NORMAL';
}

function toFabLayoutAreaCode(toolGroup: MesToolGroupMetric): string {
  const tgName = toolGroup.tgName || toolGroup.tgCode;
  if (tgName.startsWith('Delay_')) return 'OTHER';
  if (tgName.startsWith('TF_Met')) return 'DEF_MET';
  if (tgName.startsWith('TF_')) return 'DIELECTRIC';
  if (tgName.startsWith('EPI_')) return 'DIFFUSION';
  if (toolGroup.sourceAreaCode && toolGroup.sourceAreaCode !== 'OTHER') return toolGroup.sourceAreaCode;
  return toolGroup.areaCode;
}

function toFabToolGroup(toolGroup: MesToolGroupMetric, tools: MesToolMetric[]): Fab3dToolGroup {
  const groupTools = tools.filter((tool) => tool.tgId === toolGroup.tgId);
  const waitingLots =
    groupTools.length > 0
      ? groupTools.reduce((sum, tool) => sum + tool.queueLotCount, 0)
      : Math.round(toolGroup.waitRatio * Math.max(toolGroup.toolCount, 1));

  return {
    tgId: toolGroup.tgId,
    tgName: toolGroup.tgName || toolGroup.tgCode,
    areaCode: toFabLayoutAreaCode(toolGroup),
    risk: toFabRisk(toolGroup.riskGrade, toolGroup.utilizationRate),
    utilizationRate: toolGroup.utilizationRate,
    wipCount: toolGroup.wipCount,
    waitingLots,
    bottleneckProb: toolGroup.bottleneckProb,
    toolCount: toolGroup.toolCount,
    measuredAt: toolGroup.measuredAt,
  };
}

function toFabTool(tool: MesToolMetric): Fab3dToolDetail {
  return {
    toolId: tool.toolId,
    toolCode: tool.toolCode,
    toolName: tool.toolName,
    tgId: tool.tgId,
    tgCode: tool.tgCode,
    status: tool.status,
    utilizationRate: tool.utilizationRate,
    queueLotCount: tool.queueLotCount,
    setupRatio: tool.setupRatio,
    downRatio: tool.downRatio,
    measuredAt: tool.measuredAt,
  };
}

export function mapMesMonitoringToFab3d(data: MesMonitoringData): Fab3dMonitoringData {
  const toolGroupsByArea = data.toolGroups.reduce<Map<string, Fab3dToolGroup[]>>((acc, toolGroup) => {
    const areaCode = toFabLayoutAreaCode(toolGroup);
    const current = acc.get(areaCode) ?? [];
    current.push(toFabToolGroup(toolGroup, data.tools));
    acc.set(areaCode, current);
    return acc;
  }, new Map());

  const areas: Fab3dArea[] = [...toolGroupsByArea.entries()]
    .map(([areaCode, toolGroups]) => {
      return {
        areaId: areaCode,
        areaCode,
        areaName: getProcessAreaNameKo(areaCode),
        order: getProcessAreaSortOrder(areaCode),
        toolGroups,
      };
    })
    .sort((a, b) => a.order - b.order);

  return {
    areas: areas.length > 0 ? areas : MOCK_FAB3D_AREAS,
    tools: data.tools.map(toFabTool),
    source: areas.length > 0 ? 'current' : 'mock',
    measuredAt: data.snapshot.measuredAt,
  };
}

export function createMockFab3dToolDetails(): Fab3dToolDetail[] {
  return MOCK_FAB3D_AREAS.flatMap((area) =>
    area.toolGroups.flatMap((tg) =>
      Array.from({ length: Math.min(tg.toolCount, 20) }, (_, index) => {
        const status: Fab3dToolDetail['status'] =
          tg.utilizationRate >= 0.9 && index === 0
            ? 'DOWN'
            : index % 7 === 0
              ? 'SETUP'
              : index % 5 === 0
                ? 'IDLE'
                : 'RUN';
        return {
          toolId: `${tg.tgId}-tool-${index + 1}`,
          toolCode: `${tg.tgName}#${index + 1}`,
          toolName: `${tg.tgName} #${index + 1}`,
          tgId: tg.tgId,
          tgCode: tg.tgName,
          status,
          utilizationRate: Math.max(0.05, Math.min(0.99, tg.utilizationRate + ((index % 5) - 2) * 0.035)),
          queueLotCount: Math.max(0, Math.round(tg.waitingLots / Math.max(tg.toolCount, 1)) + (index % 3) - 1),
          setupRatio: status === 'SETUP' ? 0.18 : 0,
          downRatio: status === 'DOWN' ? 0.35 : 0,
          measuredAt: new Date().toISOString(),
        };
      })
    )
  );
}

export async function fetchTgRouteSteps(tgId: string): Promise<TgRouteStep[]> {
  try {
    const { data } = await api.get<TgRouteStep[]>(`/v1/monitoring/tool-groups/${tgId}/route-steps`);
    return data ?? [];
  } catch {
    return [];
  }
}

export async function fetchToolActivity(toolId: string): Promise<ToolActivity | null> {
  try {
    const { data } = await api.get<ToolActivity>(`/v1/monitoring/tools/${toolId}/activity`);
    return data ?? null;
  } catch {
    return null;
  }
}

export async function fetchFab3dMonitoringData(): Promise<Fab3dMonitoringData> {
  try {
    return mapMesMonitoringToFab3d(await fetchMesMonitoringData());
  } catch (error) {
    console.warn('[Fab3D] current API failed, fallback to mock data.', error);
    return {
      areas: MOCK_FAB3D_AREAS,
      tools: createMockFab3dToolDetails(),
      source: 'mock',
      measuredAt: null,
    };
  }
}

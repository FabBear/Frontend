import api from '@/services/api';
import { fetchMesMonitoringData } from '@/services/mesService';

import { DEMO_CASE_ID, DEMO_DETECTED_AT } from '@/constants/mockData/demoAlert';
import { MOCK_FAB3D_AREAS } from '@/constants/mockData/fab3d';
import { shouldUseDemoMockData } from '@/constants/mockMode';
import { getProcessAreaNameKo, getProcessAreaSortOrder } from '@/constants/processArea';

import type { Fab3dArea, Fab3dRisk, Fab3dToolDetail, Fab3dToolGroup, TgRouteStep, ToolActivity } from '@/types/fab3d';
import type { MesMonitoringData, MesRiskGrade, MesToolGroupMetric, MesToolMetric } from '@/types/mes';

export interface Fab3dMonitoringData {
  areas: Fab3dArea[];
  tools: Fab3dToolDetail[];
  source: 'current' | 'case_snapshot' | 'mock';
  measuredAt: string | null;
  // 케이스 스냅샷 모드 전용
  caseId?: string;
  anchorTgCode?: string;
  anchorTgName?: string;
  compositeScore?: number;
  impactScore?: number;
  riskGrade?: string;
  affectedCount?: number;
  ctIncreaseMin?: number;
  diffusionPath?: Array<{ tgId: string; tgCode: string; tgName: string; areaName: string; hop: number }>;
}

interface BackendFabSnapshotTg {
  tgId: string;
  tgCode: string;
  tgName: string;
  areaCode: string;
  areaName: string;
  measuredAt: string | null;
  utilizationRate: number | null;
  wipCount: number | null;
  availableToolRatio: number | null;
  avgQtimeMin: number | null;
  setupRatio: number | null;
  waitRatio: number | null;
  bottleneckProb: number | null;
  compositeScore?: number | null;
  impactScore?: number | null;
  riskGrade: string | null;
  isAnchor: boolean;
  isAffected: boolean;
}

interface BackendFabSnapshot {
  mode: string;
  caseId: string;
  anchorTime: string;
  anchorTg: {
    tgId: string;
    tgCode: string;
    tgName: string;
    compositeScore: number | null;
    impactScore: number | null;
    bottleneckProb: number | null;
    riskGrade: string | null;
    affectedCount: number | null;
    ctIncreaseMin: number | null;
    atRiskLots: number | null;
  };
  toolGroups: BackendFabSnapshotTg[];
  diffusionPath: Array<{ tgId: string; tgCode: string; tgName: string; areaName: string; hop: number }>;
}

function toFabRisk(riskGrade: MesRiskGrade): Fab3dRisk {
  if (riskGrade === 'CRITICAL') return 'CRITICAL';
  if (riskGrade === 'HIGH') return 'HIGH';
  if (riskGrade === 'MEDIUM') return 'MEDIUM';
  return 'LOW';
}

export interface BottleneckOverlayItem {
  tgId: string;
  compositeScore: number | null;
  riskGrade: string | null;
}

export type BottleneckOverlayMap = Map<string, BottleneckOverlayItem>;

const MOCK_FAB3D_COMPOSITE_BY_TG_NAME: Record<string, { compositeScore: number; risk: Fab3dRisk }> = {
  DE_FE_1: { compositeScore: 0.8031, risk: 'CRITICAL' },
  DE_FE_86: { compositeScore: 0.6867, risk: 'HIGH' },
  Diffusion_FE_125: { compositeScore: 0.6867, risk: 'HIGH' },
  Diffusion_FE_127: { compositeScore: 0.42, risk: 'MEDIUM' },
};

function createMockBottleneckOverlay(): BottleneckOverlayMap {
  const entries = MOCK_FAB3D_AREAS.flatMap((area) =>
    area.toolGroups.flatMap((tg) => {
      const overlay = MOCK_FAB3D_COMPOSITE_BY_TG_NAME[tg.tgName];
      if (!overlay) return [];
      return [[tg.tgId, { tgId: tg.tgId, compositeScore: overlay.compositeScore, riskGrade: overlay.risk }]] as const;
    })
  );

  return new Map(entries);
}

function createMockFab3dAreasWithCompositeOverlay(): Fab3dArea[] {
  return MOCK_FAB3D_AREAS.map((area) => ({
    ...area,
    toolGroups: area.toolGroups.map((tg) => {
      const overlay = MOCK_FAB3D_COMPOSITE_BY_TG_NAME[tg.tgName];
      if (!overlay) return { ...tg, compositeScore: undefined };
      return {
        ...tg,
        risk: overlay.risk,
        compositeScore: overlay.compositeScore,
      };
    }),
  }));
}

function overlayRisk(overlay: BottleneckOverlayMap | null, tgId: string, fallback: Fab3dRisk): Fab3dRisk {
  if (!overlay) return fallback;
  const item = overlay.get(tgId);
  if (!item) return 'LOW';
  const g = item.riskGrade ?? '';
  if (g === 'CRITICAL') return 'CRITICAL';
  if (g === 'HIGH') return 'HIGH';
  if (g === 'MEDIUM') return 'MEDIUM';
  return 'LOW';
}

export async function fetchBottleneckOverlay(): Promise<BottleneckOverlayMap> {
  if (shouldUseDemoMockData()) return createMockBottleneckOverlay();

  try {
    const { data } = await api.get<BottleneckOverlayItem[]>('/v1/monitoring/bottleneck-overlay');
    return new Map((data ?? []).map((item) => [item.tgId, item]));
  } catch {
    return new Map();
  }
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

function toFabToolGroup(
  toolGroup: MesToolGroupMetric,
  tools: MesToolMetric[],
  overlay: BottleneckOverlayMap | null
): Fab3dToolGroup {
  const groupTools = tools.filter((tool) => tool.tgId === toolGroup.tgId);
  const waitingLots =
    groupTools.length > 0
      ? groupTools.reduce((sum, tool) => sum + tool.queueLotCount, 0)
      : Math.round(toolGroup.waitRatio * Math.max(toolGroup.toolCount, 1));

  const overlayItem = overlay?.get(toolGroup.tgId);
  return {
    tgId: toolGroup.tgId,
    tgName: toolGroup.tgName || toolGroup.tgCode,
    areaCode: toFabLayoutAreaCode(toolGroup),
    // cascade overlay가 있으면 그 등급 사용 (snapshot 없는 TG = LOW)
    // overlay null이면 XGBoost riskGrade 폴백 (초기 로딩 또는 오류 시)
    risk: overlayRisk(overlay, toolGroup.tgId, toFabRisk(toolGroup.riskGrade)),
    utilizationRate: toolGroup.utilizationRate,
    wipCount: toolGroup.wipCount,
    waitingLots,
    bottleneckProb: toolGroup.bottleneckProb,
    compositeScore: overlayItem?.compositeScore ?? undefined,
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

export function mapMesMonitoringToFab3d(
  data: MesMonitoringData,
  overlay: BottleneckOverlayMap | null = null
): Fab3dMonitoringData {
  const toolGroupsByArea = data.toolGroups.reduce<Map<string, Fab3dToolGroup[]>>((acc, toolGroup) => {
    const areaCode = toFabLayoutAreaCode(toolGroup);
    const current = acc.get(areaCode) ?? [];
    current.push(toFabToolGroup(toolGroup, data.tools, overlay));
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
    areas: areas.length > 0 ? areas : createMockFab3dAreasWithCompositeOverlay(),
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
  if (shouldUseDemoMockData()) return getMockTgRouteSteps(tgId);

  try {
    const { data } = await api.get<TgRouteStep[]>(`/v1/monitoring/tool-groups/${tgId}/route-steps`);
    return data ?? [];
  } catch {
    return getMockTgRouteSteps(tgId);
  }
}

export async function fetchToolActivity(toolId: string): Promise<ToolActivity | null> {
  if (shouldUseDemoMockData()) return null;

  try {
    const { data } = await api.get<ToolActivity>(`/v1/monitoring/tools/${toolId}/activity`);
    return data ?? null;
  } catch {
    return null;
  }
}

export async function fetchFab3dCaseSnapshot(caseId: string): Promise<Fab3dMonitoringData> {
  if (shouldUseDemoMockData()) return createMockFab3dCaseSnapshot(caseId);

  try {
    const { data } = await api.get<BackendFabSnapshot>(`/v1/response-center/cases/${caseId}/fab-snapshot`);

    const toolGroupsByArea = new Map<string, Fab3dToolGroup[]>();
    for (const tg of data.toolGroups) {
      const areaCode = tg.areaCode || 'OTHER';
      const entry = toolGroupsByArea.get(areaCode) ?? [];
      const risk = toFabRiskFromSnapshot(tg);
      entry.push({
        tgId: tg.tgId,
        tgName: tg.tgName,
        areaCode,
        risk,
        utilizationRate: tg.utilizationRate ?? 0,
        wipCount: tg.wipCount ?? 0,
        waitingLots: Math.round((tg.waitRatio ?? 0) * Math.max(tg.wipCount ?? 0, 1)),
        bottleneckProb: tg.bottleneckProb ?? 0,
        toolCount: inferToolCount(tg.tgName),
        measuredAt: tg.measuredAt ?? undefined,
        isAnchor: tg.isAnchor,
        isAffected: tg.isAffected,
        compositeScore: tg.compositeScore ?? (tg.isAnchor ? (data.anchorTg.compositeScore ?? undefined) : undefined),
        impactScore: tg.impactScore ?? (tg.isAnchor ? (data.anchorTg.impactScore ?? undefined) : undefined),
      });
      toolGroupsByArea.set(areaCode, entry);
    }

    const areas: Fab3dArea[] = [...toolGroupsByArea.entries()]
      .map(([areaCode, toolGroups]) => ({
        areaId: areaCode,
        areaCode,
        areaName: getProcessAreaNameKo(areaCode),
        order: getProcessAreaSortOrder(areaCode),
        toolGroups,
      }))
      .sort((a, b) => a.order - b.order);

    return {
      areas: areas.length > 0 ? areas : MOCK_FAB3D_AREAS,
      tools: createCaseSnapshotToolDetails(areas.length > 0 ? areas : MOCK_FAB3D_AREAS),
      source: 'case_snapshot',
      measuredAt: data.anchorTime,
      caseId: data.caseId,
      anchorTgCode: data.anchorTg.tgCode,
      anchorTgName: data.anchorTg.tgName,
      compositeScore: data.anchorTg.compositeScore ?? undefined,
      impactScore: data.anchorTg.impactScore ?? undefined,
      riskGrade: data.anchorTg.riskGrade ?? undefined,
      affectedCount: data.anchorTg.affectedCount ?? undefined,
      ctIncreaseMin: data.anchorTg.ctIncreaseMin ?? undefined,
      diffusionPath: data.diffusionPath,
    };
  } catch {
    return createMockFab3dCaseSnapshot(caseId);
  }
}

function toFabRiskFromSnapshot(tg: BackendFabSnapshotTg): Fab3dRisk {
  if (tg.isAnchor) return 'CRITICAL';
  if (tg.isAffected) return 'HIGH';
  const grade = tg.riskGrade ?? '';
  if (grade === 'CRITICAL') return 'CRITICAL';
  if (grade === 'HIGH') return 'HIGH';
  if (grade === 'MEDIUM') return 'MEDIUM';
  return 'LOW';
}

export async function fetchFab3dMonitoringData(): Promise<Fab3dMonitoringData> {
  if (shouldUseDemoMockData()) {
    return {
      areas: createMockFab3dAreasWithCompositeOverlay(),
      tools: createMockFab3dToolDetails(),
      source: 'mock',
      measuredAt: null,
    };
  }

  try {
    const [mesData, overlay] = await Promise.all([fetchMesMonitoringData(), fetchBottleneckOverlay()]);
    return mapMesMonitoringToFab3d(mesData, overlay.size > 0 ? overlay : null);
  } catch (error) {
    console.warn('[Fab3D] current API failed, fallback to local snapshot.', error);
    return {
      areas: createMockFab3dAreasWithCompositeOverlay(),
      tools: createMockFab3dToolDetails(),
      source: 'mock',
      measuredAt: null,
    };
  }
}

function createMockFab3dCaseSnapshot(caseId: string): Fab3dMonitoringData {
  const areas = MOCK_FAB3D_AREAS.map((area) => ({
    ...area,
    toolGroups: area.toolGroups.map(toSnapshotBaselineTg).map(applyDeFe1CaseOverlay),
  }));

  return {
    areas,
    tools: createCaseSnapshotToolDetails(areas),
    source: 'case_snapshot',
    measuredAt: DEMO_DETECTED_AT,
    caseId: caseId || DEMO_CASE_ID,
    anchorTgCode: 'DE_FE_1',
    anchorTgName: 'DE_FE_1',
    compositeScore: 0.8031,
    impactScore: 0.6867,
    riskGrade: 'CRITICAL',
    affectedCount: 2,
    ctIncreaseMin: 1670,
    diffusionPath: [
      { tgId: 'de-fe-1', tgCode: 'DE_FE_1', tgName: 'DE_FE_1', areaName: 'Dry Etch', hop: 0 },
      {
        tgId: 'df-fe-125',
        tgCode: 'Diffusion_FE_125',
        tgName: 'Diffusion_FE_125',
        areaName: 'Diffusion',
        hop: 1,
      },
    ],
  };
}

function toSnapshotBaselineTg(tg: Fab3dToolGroup): Fab3dToolGroup {
  const utilizationRate = Math.min(tg.utilizationRate, 0.64);
  return {
    ...tg,
    risk: utilizationRate >= 0.7 ? 'MEDIUM' : 'LOW',
    utilizationRate,
    wipCount: Math.min(tg.wipCount, 80),
    waitingLots: Math.min(tg.waitingLots, 10),
    bottleneckProb: Math.min(tg.bottleneckProb, 0.18),
    measuredAt: DEMO_DETECTED_AT,
    isAnchor: false,
    isAffected: false,
    compositeScore: undefined,
    impactScore: undefined,
  };
}

function applyDeFe1CaseOverlay(tg: Fab3dToolGroup): Fab3dToolGroup {
  if (tg.tgName === 'DE_FE_1') {
    return {
      ...tg,
      risk: 'CRITICAL',
      utilizationRate: 0.9943,
      wipCount: 10,
      waitingLots: 3,
      bottleneckProb: 0.9958,
      toolCount: 8,
      isAnchor: true,
      compositeScore: 0.8031,
      impactScore: 0.6867,
    };
  }
  if (tg.tgName === 'DE_FE_86') {
    return {
      ...tg,
      risk: 'HIGH',
      utilizationRate: 0.88,
      wipCount: 38,
      waitingLots: 12,
      bottleneckProb: 0.6867,
      toolCount: 6,
      compositeScore: 0.6867,
    };
  }
  if (tg.tgName === 'Diffusion_FE_125') {
    return {
      ...tg,
      risk: 'HIGH',
      utilizationRate: 0.8153,
      wipCount: 5,
      waitingLots: 2,
      bottleneckProb: 0.6867,
      toolCount: 5,
      isAffected: true,
      compositeScore: 0.6867,
      impactScore: 0.6867,
    };
  }
  if (tg.tgName === 'Diffusion_FE_127') {
    return {
      ...tg,
      risk: 'MEDIUM',
      utilizationRate: 0.72,
      wipCount: 8,
      waitingLots: 1,
      bottleneckProb: 0.42,
      toolCount: 5,
      compositeScore: 0.42,
    };
  }
  return tg;
}

function createCaseSnapshotToolDetails(areas: Fab3dArea[]): Fab3dToolDetail[] {
  return areas.flatMap((area) =>
    area.toolGroups.flatMap((tg) => {
      const count = Math.max(1, Math.min(tg.toolCount || inferToolCount(tg.tgName), 12));
      return Array.from({ length: count }, (_, index) => {
        const status = snapshotToolStatus(tg, index);
        return {
          toolId: `${tg.tgId}-snapshot-tool-${index + 1}`,
          toolCode: `${tg.tgName}#${index + 1}`,
          toolName: `${tg.tgName} #${index + 1}`,
          tgId: tg.tgId,
          tgCode: tg.tgName,
          status,
          utilizationRate: snapshotToolUtilization(tg, index, status),
          queueLotCount: Math.max(0, Math.round(tg.waitingLots / count) + (index === 0 ? 1 : 0)),
          setupRatio: status === 'SETUP' ? 0.16 : 0,
          downRatio: status === 'DOWN' ? 0.28 : 0,
          measuredAt: DEMO_DETECTED_AT,
        };
      });
    })
  );
}

function snapshotToolStatus(tg: Fab3dToolGroup, index: number): Fab3dToolDetail['status'] {
  if (tg.tgName === 'DE_FE_1') return index < 6 ? 'RUN' : index === 6 ? 'SETUP' : 'IDLE';
  if (tg.tgName === 'Diffusion_FE_125') return index < 4 ? 'RUN' : 'IDLE';
  if (tg.tgName === 'DE_FE_86') return index < 4 ? 'RUN' : index === 4 ? 'SETUP' : 'IDLE';
  if (tg.utilizationRate >= 0.7 && index === 0) return 'RUN';
  return index % 5 === 0 ? 'IDLE' : 'RUN';
}

function snapshotToolUtilization(tg: Fab3dToolGroup, index: number, status: Fab3dToolDetail['status']): number {
  if (status === 'IDLE') return 0;
  if (status === 'SETUP') return Math.min(0.72, tg.utilizationRate * 0.72);
  return Math.max(0.05, Math.min(0.998, tg.utilizationRate + ((index % 3) - 1) * 0.012));
}

function inferToolCount(tgName: string): number {
  if (tgName === 'DE_FE_1') return 8;
  if (tgName.startsWith('Diffusion_')) return 5;
  if (tgName.startsWith('DE_FE_')) return 6;
  if (tgName.startsWith('DE_BE_')) return 6;
  return 4;
}

function getMockTgRouteSteps(tgId: string): TgRouteStep[] {
  const normalized = tgId.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (normalized.includes('defe1')) {
    return [
      {
        routeName: 'DE_FE_86_TO_DE_FE_1_TO_DIFFUSION_FE_125',
        stepSeq: 2,
        totalSteps: 3,
        prevTgName: 'DE_FE_86',
        prevAreaCode: 'DRY_ETCH',
        prevTgId: 'de-fe-86',
        nextTgName: 'Diffusion_FE_125',
        nextAreaCode: 'DIFFUSION',
        nextTgId: 'df-fe-125',
      },
    ];
  }
  if (normalized.includes('dffe125') || normalized.includes('diffusionfe125')) {
    return [
      {
        routeName: 'DE_FE_1_TO_DIFFUSION_FE_125',
        stepSeq: 3,
        totalSteps: 3,
        prevTgName: 'DE_FE_1',
        prevAreaCode: 'DRY_ETCH',
        prevTgId: 'de-fe-1',
        nextTgName: null,
        nextAreaCode: null,
        nextTgId: null,
      },
    ];
  }
  if (normalized.includes('defe86')) {
    return [
      {
        routeName: 'DE_FE_86_TO_DE_FE_1',
        stepSeq: 1,
        totalSteps: 3,
        prevTgName: null,
        prevAreaCode: null,
        prevTgId: null,
        nextTgName: 'DE_FE_1',
        nextAreaCode: 'DRY_ETCH',
        nextTgId: 'de-fe-1',
      },
    ];
  }
  return [];
}

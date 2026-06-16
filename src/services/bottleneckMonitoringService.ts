import api from '@/services/api';
import {
  mapBottleneckProcessMap,
  mapBottleneckSnapshot,
  mapBottleneckToolGroupDetail,
} from '@/services/mappers/bottleneckMonitoringMapper';
import { mapRiskAlerts } from '@/services/mappers/dashboardMapper';

import { DEMO_CASE_ID, DEMO_DETECTED_AT, getDemoBottleneckAlertsPage } from '@/constants/mockData/demoAlert';
import { MOCK_MES_MONITORING_DATA } from '@/constants/mockData/mes';

import type {
  BottleneckProcessMapData,
  BottleneckRiskGrade,
  BottleneckSnapshot,
  BottleneckToolGroupDetail,
} from '@/types/bottleneckMonitoring';
import type {
  BottleneckAlertsResponse,
  BottleneckProcessMapResponse,
  BottleneckRankingsResponse,
  BottleneckSnapshotResponse,
  BottleneckToolGroupDetailResponse,
} from '@/types/bottleneckMonitoringApi';
import type { BottleneckAlertItem } from '@/types/dashboard';
import type { DashboardPageInfo } from '@/types/dashboardApi';
import type { MesToolGroupMetric } from '@/types/mes';

const DEFAULT_SORT = 'riskScore,desc';
const DEFAULT_PAGE = 0;
const DEFAULT_PAGE_SIZE = 200; // 전체 TG를 한 번에 받아 클라이언트 필터로 처리

const DEFAULT_BOTTLENECK_RISK_COUNTS: Record<BottleneckRiskGrade, number> = {
  CRITICAL: 0,
  HIGH: 0,
  MEDIUM: 0,
  LOW: 0,
};

const MOCK_DETECTED_TG_OVERLAY: Record<
  string,
  { riskGrade: BottleneckRiskGrade; riskScore: number; bottleneckProb: number }
> = {
  DE_FE_1: { riskGrade: 'CRITICAL', riskScore: 0.8031, bottleneckProb: 0.9958 },
  DE_FE_86: { riskGrade: 'HIGH', riskScore: 0.6867, bottleneckProb: 0.6867 },
  Diffusion_FE_125: { riskGrade: 'HIGH', riskScore: 0.6867, bottleneckProb: 0.6867 },
  Diffusion_FE_127: { riskGrade: 'MEDIUM', riskScore: 0.42, bottleneckProb: 0.42 },
};

function getMockBottleneckRiskGrade(toolGroup: MesToolGroupMetric): BottleneckRiskGrade {
  return MOCK_DETECTED_TG_OVERLAY[toolGroup.tgCode]?.riskGrade ?? 'LOW';
}

function buildMockProcessMapAreas(): BottleneckProcessMapData['areas'] {
  return MOCK_MES_MONITORING_DATA.processSummaries.map((area) => {
    const areaToolGroups = MOCK_MES_MONITORING_DATA.toolGroups.filter(
      (toolGroup) => toolGroup.areaCode === area.areaCode
    );
    const tgSummary = areaToolGroups.reduce<Record<BottleneckRiskGrade, number>>(
      (summary, toolGroup) => {
        summary[getMockBottleneckRiskGrade(toolGroup)] += 1;
        return summary;
      },
      { ...DEFAULT_BOTTLENECK_RISK_COUNTS }
    );

    return {
      areaId: area.areaId,
      areaCode: area.areaCode,
      areaName: area.areaName,
      totalTgCount: area.toolGroupCount,
      bottleneckTgCount: tgSummary.CRITICAL + tgSummary.HIGH,
      tgSummary,
    };
  });
}

function mapMockMesToolGroupToRanking(toolGroup: MesToolGroupMetric): BottleneckRankingsResponse['items'][number] {
  const overlay = MOCK_DETECTED_TG_OVERLAY[toolGroup.tgCode];
  return {
    rank: 0,
    tgId: toolGroup.tgId,
    tgCode: toolGroup.tgCode,
    tgName: toolGroup.tgName,
    areaName: toolGroup.areaCode,
    bottleneckProb: overlay?.bottleneckProb ?? 0,
    riskScore: overlay?.riskScore ?? null,
    utilizationRate: toolGroup.utilizationRate,
    wipCount: toolGroup.wipCount,
    riskGrade: overlay?.riskGrade ?? 'LOW',
    measuredAt: DEMO_DETECTED_AT,
  };
}

export interface BottleneckAlertsPage {
  items: BottleneckAlertItem[];
  pageInfo: DashboardPageInfo;
}

interface BottleneckAlertParams {
  page?: number;
  size?: number;
  detectedFrom?: string | null;
  detectedTo?: string | null;
}

export async function fetchBottleneckAlertsPage({
  page = 0,
  size = 10,
  detectedFrom,
  detectedTo,
}: BottleneckAlertParams = {}): Promise<BottleneckAlertsPage> {
  try {
    const { data } = await api.get<BottleneckAlertsResponse>('/v1/monitoring/bottleneck/alerts', {
      params: {
        page,
        size,
        sort: 'detectedAt,desc',
        riskGrade: 'CRITICAL',
        ...(detectedFrom ? { detectedFrom } : {}),
        ...(detectedTo ? { detectedTo } : {}),
      },
    });
    return {
      items: mapRiskAlerts(data),
      pageInfo: data.pageInfo,
    };
  } catch {
    return getDemoBottleneckAlertsPage({ size, detectedFrom, detectedTo });
  }
}

export async function fetchBottleneckSnapshot(caseId?: string | null): Promise<BottleneckSnapshot> {
  try {
    const { data } = caseId
      ? await api.get<BottleneckSnapshotResponse>(`/v1/snapshots/by-case/${caseId}`)
      : await api.get<BottleneckSnapshotResponse>('/v1/snapshots/latest');
    return mapBottleneckSnapshot(data);
  } catch {
    return {
      snapshotId: 'demo-snapshot-de-fe-1-3780',
      caseId: caseId ?? DEMO_CASE_ID,
      capturedAt: DEMO_DETECTED_AT,
      simulationTick: 3780,
      fabId: 'fab-demo-001',
    };
  }
}

export async function fetchBottleneckProcessMap(snapshotId?: string | null): Promise<BottleneckProcessMapData> {
  try {
    const { data } = await api.get<BottleneckProcessMapResponse>('/v1/monitoring/bottleneck/process-map', {
      params: snapshotId ? { snapshotId } : undefined,
    });
    return mapBottleneckProcessMap(data);
  } catch {
    return {
      snapshotId: snapshotId ?? 'demo-snapshot-de-fe-1-3780',
      capturedAt: DEMO_DETECTED_AT,
      areas: buildMockProcessMapAreas(),
    };
  }
}

async function fetchRankingsResponse(
  snapshotId?: string | null,
  areaId?: string | null
): Promise<BottleneckRankingsResponse> {
  try {
    const { data } = await api.get<BottleneckRankingsResponse>('/v1/monitoring/bottleneck/rankings', {
      params: {
        page: DEFAULT_PAGE,
        size: DEFAULT_PAGE_SIZE,
        sort: DEFAULT_SORT,
        ...(snapshotId ? { snapshotId } : {}),
        ...(areaId ? { areaId } : {}),
      },
    });
    return data;
  } catch {
    const items = MOCK_MES_MONITORING_DATA.toolGroups
      .filter((toolGroup) => !areaId || toolGroup.areaId === areaId || toolGroup.areaCode === areaId)
      .map(mapMockMesToolGroupToRanking)
      .sort((a, b) => (b.riskScore ?? b.bottleneckProb ?? 0) - (a.riskScore ?? a.bottleneckProb ?? 0))
      .map((item, index) => ({ ...item, rank: index + 1 }));

    return {
      items,
      pageInfo: {
        page: DEFAULT_PAGE,
        size: DEFAULT_PAGE_SIZE,
        totalElements: items.length,
        totalPages: 1,
        sort: DEFAULT_SORT,
      },
    };
  }
}

export async function fetchBottleneckRankings(snapshotId?: string | null): Promise<BottleneckRankingsResponse> {
  return fetchRankingsResponse(snapshotId);
}

export async function fetchBottleneckToolGroupDetail(
  tgId: string,
  snapshotId?: string | null
): Promise<BottleneckToolGroupDetail> {
  try {
    const { data } = await api.get<BottleneckToolGroupDetailResponse>(`/v1/monitoring/bottleneck/tool-groups/${tgId}`, {
      params: snapshotId ? { snapshotId } : undefined,
    });
    return mapBottleneckToolGroupDetail(data);
  } catch {
    const toolGroup = MOCK_MES_MONITORING_DATA.toolGroups.find((item) => item.tgId === tgId);
    if (!toolGroup) throw new Error('Bottleneck tool group not found');
    const overlay = MOCK_DETECTED_TG_OVERLAY[toolGroup.tgCode];

    return {
      tgId: toolGroup.tgId,
      tgCode: toolGroup.tgCode,
      tgName: toolGroup.tgName,
      areaName: toolGroup.areaNameKo,
      measuredAt: DEMO_DETECTED_AT,
      utilizationRate: toolGroup.utilizationRate,
      availableToolRatio: toolGroup.availableToolRatio,
      wipCount: toolGroup.wipCount,
      avgQtimeMin: toolGroup.avgQtimeMin,
      setupRatio: toolGroup.setupRatio,
      waitRatio: toolGroup.waitRatio,
      bottleneckProb: overlay?.bottleneckProb ?? 0,
      riskScore: overlay?.riskScore ?? null,
      riskGrade: overlay?.riskGrade ?? 'LOW',
      relatedCaseId: toolGroup.tgCode === 'DE_FE_1' || toolGroup.tgCode === 'Diffusion_FE_125' ? DEMO_CASE_ID : null,
    };
  }
}

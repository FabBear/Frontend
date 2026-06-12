import api from '@/services/api';
import {
  mapBottleneckProcessMap,
  mapBottleneckSnapshot,
  mapBottleneckToolGroupDetail,
} from '@/services/mappers/bottleneckMonitoringMapper';
import { mapRiskAlerts } from '@/services/mappers/dashboardMapper';

import type {
  BottleneckProcessMapData,
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

const DEFAULT_SORT = 'bottleneckProb,desc';
const DEFAULT_PAGE = 0;
const DEFAULT_PAGE_SIZE = 200; // 전체 TG를 한 번에 받아 클라이언트 필터로 처리

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
  const { data } = await api.get<BottleneckAlertsResponse>('/v1/monitoring/bottleneck/alerts', {
    params: {
      page,
      size,
      sort: 'detectedAt,desc',
      ...(detectedFrom ? { detectedFrom } : {}),
      ...(detectedTo ? { detectedTo } : {}),
    },
  });
  return {
    items: mapRiskAlerts(data),
    pageInfo: data.pageInfo,
  };
}

export async function fetchBottleneckSnapshot(caseId?: string | null): Promise<BottleneckSnapshot> {
  const { data } = caseId
    ? await api.get<BottleneckSnapshotResponse>(`/v1/snapshots/by-case/${caseId}`)
    : await api.get<BottleneckSnapshotResponse>('/v1/snapshots/latest');
  return mapBottleneckSnapshot(data);
}

export async function fetchBottleneckProcessMap(snapshotId?: string | null): Promise<BottleneckProcessMapData> {
  const { data } = await api.get<BottleneckProcessMapResponse>('/v1/monitoring/bottleneck/process-map', {
    params: snapshotId ? { snapshotId } : undefined,
  });
  return mapBottleneckProcessMap(data);
}

async function fetchRankingsResponse(
  snapshotId?: string | null,
  areaId?: string | null
): Promise<BottleneckRankingsResponse> {
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
}

export async function fetchBottleneckRankings(snapshotId: string): Promise<BottleneckRankingsResponse> {
  return fetchRankingsResponse(snapshotId);
}

export async function fetchBottleneckToolGroupDetail(
  tgId: string,
  snapshotId?: string | null
): Promise<BottleneckToolGroupDetail> {
  const { data } = await api.get<BottleneckToolGroupDetailResponse>(`/v1/monitoring/bottleneck/tool-groups/${tgId}`, {
    params: snapshotId ? { snapshotId } : undefined,
  });
  return mapBottleneckToolGroupDetail(data);
}

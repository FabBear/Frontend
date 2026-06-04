import api from '@/services/api';
import {
  mapBottleneckProcessMap,
  mapBottleneckSnapshot,
  mapBottleneckToolGroupDetail,
} from '@/services/mappers/bottleneckMonitoringMapper';

import type {
  BottleneckProcessMapData,
  BottleneckSnapshot,
  BottleneckToolGroupDetail,
} from '@/types/bottleneckMonitoring';
import type {
  BottleneckProcessMapResponse,
  BottleneckRankingsResponse,
  BottleneckSnapshotResponse,
  BottleneckToolGroupDetailResponse,
} from '@/types/bottleneckMonitoringApi';

const DEFAULT_SORT = 'bottleneckProb,desc';
const DEFAULT_PAGE = 0;
const DEFAULT_PAGE_SIZE = 200; // 전체 TG를 한 번에 받아 클라이언트 필터로 처리

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

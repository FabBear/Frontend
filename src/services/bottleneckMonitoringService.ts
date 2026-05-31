import {
  MOCK_BOTTLENECK_PROCESS_AREAS,
  MOCK_BOTTLENECK_PROCESS_MAP,
  MOCK_BOTTLENECK_SNAPSHOT,
  MOCK_BOTTLENECK_TOOL_GROUPS,
  MOCK_BOTTLENECK_TOOL_GROUP_DETAILS,
} from '@/constants/mockData/bottleneckMonitoring';

import type {
  BottleneckProcessMapData,
  BottleneckSnapshot,
  BottleneckToolGroupDetail,
  BottleneckToolGroupListData,
} from '@/types/bottleneckMonitoring';
import type { ProcessAreaData } from '@/types/dashboard';

const DEFAULT_SORT = 'bottleneckProb,desc';

export async function fetchBottleneckSnapshot(): Promise<BottleneckSnapshot> {
  return { ...MOCK_BOTTLENECK_SNAPSHOT };
}

export async function fetchBottleneckProcessMap(): Promise<BottleneckProcessMapData> {
  return {
    ...MOCK_BOTTLENECK_PROCESS_MAP,
    areas: MOCK_BOTTLENECK_PROCESS_MAP.areas.map((area) => ({ ...area, tgSummary: { ...area.tgSummary } })),
  };
}

export async function fetchBottleneckProcessAreas(): Promise<ProcessAreaData[]> {
  return MOCK_BOTTLENECK_PROCESS_AREAS.map((area) => ({
    ...area,
    gFE: area.gFE.map((toolGroup) => ({ ...toolGroup })),
    gBE: area.gBE.map((toolGroup) => ({ ...toolGroup })),
  }));
}

export async function fetchBottleneckToolGroups(areaCode: string | null): Promise<BottleneckToolGroupListData> {
  const items = MOCK_BOTTLENECK_TOOL_GROUPS.filter((item) => !areaCode || item.areaCode === areaCode);
  const firstItem = items[0] ?? MOCK_BOTTLENECK_TOOL_GROUPS[0];

  return {
    areaId: areaCode ? firstItem.areaId : 'all',
    areaName: areaCode ? firstItem.areaName : 'All Areas',
    items: items.map((item) => ({ ...item })),
    pageInfo: {
      page: 0,
      size: items.length,
      totalElements: items.length,
      totalPages: items.length > 0 ? 1 : 0,
      sort: DEFAULT_SORT,
    },
  };
}

export async function fetchBottleneckToolGroupDetail(tgId: string): Promise<BottleneckToolGroupDetail | null> {
  const detail = MOCK_BOTTLENECK_TOOL_GROUP_DETAILS[tgId];

  return detail ? { ...detail } : null;
}

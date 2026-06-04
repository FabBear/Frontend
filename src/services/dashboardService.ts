import api from '@/services/api';
import { mapKpi, mapProcessMap, mapRiskAlerts, mapTrends } from '@/services/mappers/dashboardMapper';

import {
  DASHBOARD_ALERTS_PAGE_SIZE,
  DASHBOARD_TRENDS_DAILY_KEYS,
  DASHBOARD_TRENDS_DAILY_RANGE,
  DASHBOARD_TRENDS_HOURLY_KEYS,
  DASHBOARD_TRENDS_HOURLY_RANGE,
  TREND_META,
} from '@/constants/dashboard';

import type {
  BottleneckAlertItem,
  DashboardProcessAreaData,
  DashboardSectionData,
  DashboardSectionErrors,
  FabKpiSnapshot,
  KpiTrendSeries,
} from '@/types/dashboard';
import type {
  DashboardKpiResponse,
  DashboardPageInfo,
  DashboardProcessMapResponse,
  DashboardRiskAlertsResponse,
  DashboardTrendsResponse,
} from '@/types/dashboardApi';

interface DashboardLoadResult {
  data: DashboardSectionData;
  errors: DashboardSectionErrors;
}

export interface DashboardRiskAlertsPage {
  items: BottleneckAlertItem[];
  pageInfo: DashboardPageInfo;
}

interface DashboardRiskAlertParams {
  page?: number;
  size?: number;
  detectedFrom?: string | null;
  detectedTo?: string | null;
}

export async function fetchDashboardKpi(): Promise<FabKpiSnapshot> {
  const { data } = await api.get<DashboardKpiResponse>('/v1/dashboard/kpi');
  return mapKpi(data);
}

export async function fetchDashboardRiskAlertsPage({
  page = 0,
  size = DASHBOARD_ALERTS_PAGE_SIZE,
  detectedFrom,
  detectedTo,
}: DashboardRiskAlertParams = {}): Promise<DashboardRiskAlertsPage> {
  const { data } = await api.get<DashboardRiskAlertsResponse>('/v1/dashboard/risk-alerts', {
    params: {
      page,
      size,
      ...(detectedFrom ? { detectedFrom } : {}),
      ...(detectedTo ? { detectedTo } : {}),
    },
  });
  return {
    items: mapRiskAlerts(data),
    pageInfo: data.pageInfo,
  };
}

export async function fetchDashboardRiskAlerts(size = DASHBOARD_ALERTS_PAGE_SIZE): Promise<BottleneckAlertItem[]> {
  const { items } = await fetchDashboardRiskAlertsPage({ page: 0, size });
  return items;
}

export async function fetchDashboardProcessMap(): Promise<DashboardProcessAreaData[]> {
  const { data } = await api.get<DashboardProcessMapResponse>('/v1/dashboard/process-map');
  return mapProcessMap(data);
}

export async function fetchDashboardTrends(): Promise<KpiTrendSeries[]> {
  // throughput은 일 단위로 집계되므로 7d 범위로 별도 조회
  const [hourly, daily] = await Promise.all([
    api.get<DashboardTrendsResponse>('/v1/dashboard/trends', {
      params: { range: DASHBOARD_TRENDS_HOURLY_RANGE, kpi: DASHBOARD_TRENDS_HOURLY_KEYS.join(',') },
    }),
    api.get<DashboardTrendsResponse>('/v1/dashboard/trends', {
      params: { range: DASHBOARD_TRENDS_DAILY_RANGE, kpi: DASHBOARD_TRENDS_DAILY_KEYS.join(',') },
    }),
  ]);

  // 7d 응답에서 daily 키만 취함 (백엔드가 전체 KPI를 반환할 수 있으므로 필터)
  const dailyTrends = mapTrends(daily.data).filter((t) =>
    DASHBOARD_TRENDS_DAILY_KEYS.includes(t.key as (typeof DASHBOARD_TRENDS_DAILY_KEYS)[number])
  );

  return sortDashboardTrends([...mapTrends(hourly.data), ...dailyTrends]);
}

function sortDashboardTrends(trends: KpiTrendSeries[]): KpiTrendSeries[] {
  const order = Object.keys(TREND_META);
  return [...trends].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

export async function fetchDashboardData(): Promise<DashboardLoadResult> {
  const [kpi, alerts, processMap, trends] = await Promise.allSettled([
    fetchDashboardKpi(),
    fetchDashboardRiskAlerts(),
    fetchDashboardProcessMap(),
    fetchDashboardTrends(),
  ]);

  return {
    data: {
      kpi: kpi.status === 'fulfilled' ? kpi.value : null,
      alerts: alerts.status === 'fulfilled' ? alerts.value : null,
      processAreas: processMap.status === 'fulfilled' ? processMap.value : null,
      trends: trends.status === 'fulfilled' ? trends.value : null,
    },
    errors: {
      ...(kpi.status === 'rejected' ? { kpi: 'KPI 데이터를 불러오지 못했습니다.' } : {}),
      ...(alerts.status === 'rejected' ? { alerts: '병목 위험 알림을 불러오지 못했습니다.' } : {}),
      ...(processMap.status === 'rejected' ? { processAreas: '공정 상태맵을 불러오지 못했습니다.' } : {}),
      ...(trends.status === 'rejected' ? { trends: 'KPI 추이 데이터를 불러오지 못했습니다.' } : {}),
    },
  };
}

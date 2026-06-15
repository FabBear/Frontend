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
  DashboardTrendKey,
  DashboardTrendsResponse,
} from '@/types/dashboardApi';
import type { MachinePeriodRange } from '@/types/machine';

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
      riskGrade: 'CRITICAL',
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
  const [hourly, daily] = await Promise.all([
    api.get<DashboardTrendsResponse>('/v1/dashboard/trends', {
      params: { range: DASHBOARD_TRENDS_HOURLY_RANGE, kpi: DASHBOARD_TRENDS_HOURLY_KEYS.join(',') },
    }),
    api.get<DashboardTrendsResponse>('/v1/dashboard/trends', {
      params: { range: DASHBOARD_TRENDS_DAILY_RANGE, kpi: DASHBOARD_TRENDS_DAILY_KEYS.join(',') },
    }),
  ]);

  return sortDashboardTrends([...mapTrends(hourly.data), ...mapTrends(daily.data)]);
}

export async function fetchDashboardTrendsForPeriod(
  periodRange: MachinePeriodRange,
  kpis: DashboardTrendKey[]
): Promise<KpiTrendSeries[]> {
  const { data } = await api.get<DashboardTrendsResponse>('/v1/dashboard/trends', {
    params: {
      range: toDashboardTrendRange(periodRange),
      kpi: kpis.join(','),
      from: periodRange.from,
      to: periodRange.to,
    },
  });
  return sortDashboardTrends(mapTrends(data));
}

function sortDashboardTrends(trends: KpiTrendSeries[]): KpiTrendSeries[] {
  const order = Object.keys(TREND_META);
  return [...trends].sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

function toDashboardTrendRange(periodRange: MachinePeriodRange): string {
  switch (periodRange.preset) {
    case '6H':
      return '6h';
    case '7D':
      return '7d';
    case '30D':
      return '30d';
    case 'CUSTOM':
      return 'custom';
    case '24H':
    default:
      return '24h';
  }
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

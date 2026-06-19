import api from '@/services/api';
import {
  fetchBottleneckAlertsPage,
  fetchBottleneckProcessMap,
  fetchBottleneckRankings,
} from '@/services/bottleneckMonitoringService';
import { mapKpi, mapTrends } from '@/services/mappers/dashboardMapper';
import {
  mapBottleneckRankings,
  mapBottleneckToolGroupsToDashboardAreas,
} from '@/services/mappers/bottleneckMonitoringMapper';
import { fetchReleasePlanSummary } from '@/services/productionPlanService';
import { shouldUsePresentationScenario } from '@/constants/scenarioMode';

import {
  DASHBOARD_ALERTS_PAGE_SIZE,
  DASHBOARD_TRENDS_DAILY_KEYS,
  DASHBOARD_TRENDS_DAILY_RANGE,
  DASHBOARD_TRENDS_HOURLY_KEYS,
  DASHBOARD_TRENDS_HOURLY_RANGE,
  TREND_META,
} from '@/constants/dashboard';
import { MOCK_FAB_KPI, MOCK_KPI_TRENDS } from '@/constants/mockData/dashboard';
import { getDemoBottleneckAlertsPage } from '@/constants/mockData/demoAlert';
import { MOCK_MES_MONITORING_DATA } from '@/constants/mockData/mes';
import { getProcessAreaSortOrder } from '@/constants/processArea';
import { riskGradeToLevel } from '@/constants/riskLevel';

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
  DashboardTrendKey,
  DashboardTrendsResponse,
} from '@/types/dashboardApi';
import type { MachinePeriodRange } from '@/types/machine';
import type { MesRiskGrade, MesToolGroupMetric } from '@/types/mes';

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

const MOCK_DETECTED_TG_OVERLAY: Record<string, { riskGrade: MesRiskGrade; riskScore: number; bottleneckProb: number }> =
  {
    DE_FE_1: { riskGrade: 'CRITICAL', riskScore: 0.8031, bottleneckProb: 0.9958 },
    DE_FE_86: { riskGrade: 'HIGH', riskScore: 0.6867, bottleneckProb: 0.6867 },
    Diffusion_FE_125: { riskGrade: 'HIGH', riskScore: 0.6867, bottleneckProb: 0.6867 },
    Diffusion_FE_127: { riskGrade: 'MEDIUM', riskScore: 0.42, bottleneckProb: 0.42 },
  };

function mapMockToolGroup(toolGroup: MesToolGroupMetric): DashboardProcessAreaData['toolGroups'][number] {
  const overlay = MOCK_DETECTED_TG_OVERLAY[toolGroup.tgCode];
  const riskGrade = overlay?.riskGrade ?? 'LOW';

  return {
    tgId: toolGroup.tgId,
    tgCode: toolGroup.tgCode,
    tgName: toolGroup.tgName,
    riskGrade,
    riskLevel: riskGradeToLevel(riskGrade),
    utilizationRate: toolGroup.utilizationRate,
    bottleneckProb: overlay?.bottleneckProb ?? toolGroup.bottleneckProb,
    riskScore: overlay?.riskScore ?? null,
    wipCount: toolGroup.wipCount,
  };
}

function buildMockDashboardProcessMap(): DashboardProcessAreaData[] {
  return MOCK_MES_MONITORING_DATA.processSummaries
    .map((area) => {
      const toolGroups = MOCK_MES_MONITORING_DATA.toolGroups
        .filter((toolGroup) => toolGroup.areaCode === area.areaCode)
        .map(mapMockToolGroup);
      const tgSummary = toolGroups.reduce(
        (summary, toolGroup) => {
          const riskGrade = toolGroup.riskGrade as MesRiskGrade;
          summary[riskGrade] += 1;
          return summary;
        },
        { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<MesRiskGrade, number>
      );

      return {
        areaId: area.areaId,
        areaCode: area.areaCode,
        areaName: area.areaName,
        totalTgCount: area.toolGroupCount,
        bottleneckTgCount: tgSummary.CRITICAL + tgSummary.HIGH,
        tgSummary,
        toolGroups,
      };
    })
    .sort((a, b) => getProcessAreaSortOrder(a.areaCode) - getProcessAreaSortOrder(b.areaCode));
}

export async function fetchDashboardKpi(): Promise<FabKpiSnapshot> {
  try {
    const { data } = await api.get<DashboardKpiResponse>('/v1/dashboard/kpi');
    return mapKpi(data);
  } catch (e) {
    if (shouldUsePresentationScenario()) return MOCK_FAB_KPI;
    throw e;
  }
}

export async function fetchDashboardRiskAlertsPage({
  page = 0,
  size = DASHBOARD_ALERTS_PAGE_SIZE,
  detectedFrom,
  detectedTo,
}: DashboardRiskAlertParams = {}): Promise<DashboardRiskAlertsPage> {
  try {
    return await fetchBottleneckAlertsPage({ page, size, riskGrade: 'CRITICAL', detectedFrom, detectedTo });
  } catch (e) {
    if (shouldUsePresentationScenario()) return getDemoBottleneckAlertsPage({ size, detectedFrom, detectedTo });
    throw e;
  }
}

export async function fetchDashboardRiskAlerts(size = DASHBOARD_ALERTS_PAGE_SIZE): Promise<BottleneckAlertItem[]> {
  const { items } = await fetchDashboardRiskAlertsPage({ page: 0, size });
  return items;
}

export async function fetchDashboardProcessMap(): Promise<DashboardProcessAreaData[]> {
  try {
    const [processMapData, rankingsRaw] = await Promise.all([
      fetchBottleneckProcessMap(null),
      fetchBottleneckRankings(null),
    ]);
    const rankings = mapBottleneckRankings(rankingsRaw, processMapData.areas);
    return mapBottleneckToolGroupsToDashboardAreas(rankings, processMapData.areas);
  } catch (e) {
    if (shouldUsePresentationScenario()) return buildMockDashboardProcessMap();
    throw e;
  }
}

export async function fetchDashboardTrends(): Promise<KpiTrendSeries[]> {
  try {
    const [hourly, daily] = await Promise.all([
      api.get<DashboardTrendsResponse>('/v1/dashboard/trends', {
        params: { range: DASHBOARD_TRENDS_HOURLY_RANGE, kpi: DASHBOARD_TRENDS_HOURLY_KEYS.join(',') },
      }),
      api.get<DashboardTrendsResponse>('/v1/dashboard/trends', {
        params: { range: DASHBOARD_TRENDS_DAILY_RANGE, kpi: DASHBOARD_TRENDS_DAILY_KEYS.join(',') },
      }),
    ]);

    return sortDashboardTrends([...mapTrends(hourly.data), ...mapTrends(daily.data)]);
  } catch (e) {
    if (shouldUsePresentationScenario()) return sortDashboardTrends(MOCK_KPI_TRENDS);
    throw e;
  }
}

export async function fetchDashboardTrendsForPeriod(
  periodRange: MachinePeriodRange,
  kpis: DashboardTrendKey[]
): Promise<KpiTrendSeries[]> {
  try {
    const { data } = await api.get<DashboardTrendsResponse>('/v1/dashboard/trends', {
      params: {
        range: toDashboardTrendRange(periodRange),
        kpi: kpis.join(','),
        from: periodRange.from,
        to: periodRange.to,
      },
    });
    return sortDashboardTrends(mapTrends(data));
  } catch (e) {
    if (shouldUsePresentationScenario()) return sortDashboardTrends(MOCK_KPI_TRENDS.filter((trend) => kpis.includes(trend.key as DashboardTrendKey)));
    throw e;
  }
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
  const [kpi, releasePlan, alerts, processMap, trends] = await Promise.allSettled([
    fetchDashboardKpi(),
    fetchReleasePlanSummary(),
    fetchDashboardRiskAlerts(),
    fetchDashboardProcessMap(),
    fetchDashboardTrends(),
  ]);

  return {
    data: {
      kpi: kpi.status === 'fulfilled' ? kpi.value : null,
      releasePlan: releasePlan.status === 'fulfilled' ? releasePlan.value : null,
      alerts: alerts.status === 'fulfilled' ? alerts.value : null,
      processAreas: processMap.status === 'fulfilled' ? processMap.value : null,
      trends: trends.status === 'fulfilled' ? trends.value : null,
    },
    errors: {
      ...(kpi.status === 'rejected' ? { kpi: 'KPI 데이터를 불러오지 못했습니다.' } : {}),
      ...(releasePlan.status === 'rejected' ? { releasePlan: 'Release 계획을 불러오지 못했습니다.' } : {}),
      ...(alerts.status === 'rejected' ? { alerts: '병목 위험 알림을 불러오지 못했습니다.' } : {}),
      ...(processMap.status === 'rejected' ? { processAreas: '공정 상태맵을 불러오지 못했습니다.' } : {}),
      ...(trends.status === 'rejected' ? { trends: 'KPI 추이 데이터를 불러오지 못했습니다.' } : {}),
    },
  };
}

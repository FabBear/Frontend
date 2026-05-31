import { MOCK_BOTTLENECK_ALERTS, MOCK_FAB_KPI, MOCK_KPI_TRENDS, MOCK_PM_DATA } from '@/constants/mockData/dashboard';

import type { DashboardData } from '@/types/dashboard';

export async function fetchDashboardData(): Promise<DashboardData> {
  return {
    kpi: MOCK_FAB_KPI,
    alerts: MOCK_BOTTLENECK_ALERTS,
    processAreas: MOCK_PM_DATA,
    trends: MOCK_KPI_TRENDS,
  };
}

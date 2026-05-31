import { MOCK_MES_MONITORING_DATA } from '@/constants/mockData/mes';

import type { MesMonitoringData, MesToolGroupMetric, MesToolMetric } from '@/types/mes';

export async function fetchMesMonitoringData(): Promise<MesMonitoringData> {
  return {
    ...MOCK_MES_MONITORING_DATA,
    snapshot: { ...MOCK_MES_MONITORING_DATA.snapshot },
    kpiCards: MOCK_MES_MONITORING_DATA.kpiCards.map((card) => ({ ...card })),
    utilizationSeries: MOCK_MES_MONITORING_DATA.utilizationSeries.map((series) => ({
      ...series,
      values: [...series.values],
    })),
    wipTrend: [...MOCK_MES_MONITORING_DATA.wipTrend],
    setupSeries: MOCK_MES_MONITORING_DATA.setupSeries.map((series) => ({ ...series, values: [...series.values] })),
    processSummaries: MOCK_MES_MONITORING_DATA.processSummaries.map((process) => ({ ...process })),
    toolGroups: MOCK_MES_MONITORING_DATA.toolGroups.map((toolGroup) => ({ ...toolGroup })),
    tools: MOCK_MES_MONITORING_DATA.tools.map((tool) => ({ ...tool })),
  };
}

export async function fetchMesToolGroups(): Promise<MesToolGroupMetric[]> {
  return MOCK_MES_MONITORING_DATA.toolGroups.map((toolGroup) => ({ ...toolGroup }));
}

export async function fetchMesToolsByToolGroup(tgId: string): Promise<MesToolMetric[]> {
  return MOCK_MES_MONITORING_DATA.tools.filter((tool) => tool.tgId === tgId).map((tool) => ({ ...tool }));
}

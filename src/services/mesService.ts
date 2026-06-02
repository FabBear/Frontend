import api from '@/services/api';

import { MOCK_MES_MONITORING_DATA } from '@/constants/mockData/mes';
import { getMesSemiconductorProcessCode, getProcessAreaNameKo } from '@/constants/processArea';

import type {
  MesKpiCard,
  MesMonitoringData,
  MesProcessSummary,
  MesRealtimePayload,
  MesRealtimeTool,
  MesRealtimeToolGroup,
  MesRiskGrade,
  MesToolGroupMetric,
  MesToolMetric,
  MesToolStatus,
  MesTrendSeries,
} from '@/types/mes';

import {
  formatKoMonthDayTime,
  formatNumber,
  formatPercentPoint,
  formatQtimeDays,
  formatRatioPercent,
} from '@/utils/format';
import { average } from '@/utils/mesMetrics';

const MES_STREAM_PATH = '/v1/monitoring/mes/stream';
const MES_CURRENT_PATH = '/v1/monitoring/mes/current';
const UTILIZATION_COLORS = ['--color-chart-blue', '--color-chart-violet', '--color-risk-high'];

function cloneMockMesData(): MesMonitoringData {
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

function normalizeNumber(value: number | null | undefined): number | null {
  return value == null ? null : value;
}

function normalizeCount(value: number | null | undefined): number {
  return value ?? 0;
}

function normalizeRiskGrade(value: MesRiskGrade | null | undefined, utilizationRate: number): MesRiskGrade {
  if (value) return value;
  if (utilizationRate >= 0.9) return 'CRITICAL';
  if (utilizationRate >= 0.85) return 'HIGH';
  if (utilizationRate >= 0.7) return 'MEDIUM';
  return 'LOW';
}

function deriveToolStatus(tool: MesRealtimeTool): MesToolStatus {
  if (tool.status) return tool.status;
  if ((tool.downRatio ?? 0) > 0.05) return 'DOWN';
  if ((tool.setupRatio ?? 0) > 0.05) return 'SETUP';
  if ((tool.utilizationRate ?? 0) >= 0.5) return 'RUN';
  return 'IDLE';
}

function toSimulationDay(simulationTime: string): number {
  const date = new Date(simulationTime);
  if (Number.isNaN(date.getTime())) return 0;

  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((date.getTime() - startOfYear) / (1000 * 60 * 60 * 24));
}

function toToolGroupMetric(toolGroup: MesRealtimeToolGroup): MesToolGroupMetric {
  const sourceAreaCode = toolGroup.areaCode;
  const areaCode = getMesSemiconductorProcessCode(sourceAreaCode, toolGroup.tgCode);
  const utilizationRate = normalizeNumber(toolGroup.utilizationRate) ?? 0;

  return {
    tgId: toolGroup.tgId,
    tgCode: toolGroup.tgCode,
    tgName: toolGroup.tgName || toolGroup.tgCode,
    areaId: `area-${areaCode.toLowerCase().replaceAll('_', '-')}`,
    areaCode,
    areaName: areaCode,
    areaNameKo: getProcessAreaNameKo(areaCode),
    sourceAreaCode,
    sourceAreaNameKo: getProcessAreaNameKo(sourceAreaCode),
    toolCount: 0,
    utilizationRate,
    availableToolRatio: normalizeNumber(toolGroup.availableToolRatio) ?? 0,
    wipCount: normalizeCount(toolGroup.wipCount),
    avgQtimeMin: normalizeNumber(toolGroup.avgQtimeMin),
    setupRatio: normalizeNumber(toolGroup.setupRatio) ?? 0,
    waitRatio: normalizeNumber(toolGroup.waitRatio) ?? 0,
    bottleneckProb: normalizeNumber(toolGroup.bottleneckProb) ?? 0,
    riskGrade: normalizeRiskGrade(toolGroup.riskGrade, utilizationRate),
    measuredAt: toolGroup.measuredAt,
  };
}

function toToolMetric(tool: MesRealtimeTool, toolGroupById: Map<string, MesToolGroupMetric>): MesToolMetric {
  const toolGroup = toolGroupById.get(tool.tgId);

  return {
    toolId: tool.toolId,
    toolCode: tool.toolCode,
    toolName: tool.toolName || tool.toolCode,
    tgId: tool.tgId,
    tgCode: toolGroup?.tgCode ?? '',
    utilizationRate: normalizeNumber(tool.utilizationRate) ?? 0,
    oeeEstimate: normalizeNumber(tool.oeeEstimate),
    avgQtimeMin: normalizeNumber(tool.avgQtimeMin),
    queueLotCount: normalizeCount(tool.queueLotCount),
    setupRatio: normalizeNumber(tool.setupRatio) ?? 0,
    downRatio: normalizeNumber(tool.downRatio) ?? 0,
    status: deriveToolStatus(tool),
    lastDispatchAt: null,
    measuredAt: tool.measuredAt,
  };
}

function createProcessSummaries(toolGroups: MesToolGroupMetric[]): MesProcessSummary[] {
  const groups = toolGroups.reduce<Record<string, MesToolGroupMetric[]>>((acc, toolGroup) => {
    acc[toolGroup.areaCode] ??= [];
    acc[toolGroup.areaCode].push(toolGroup);
    return acc;
  }, {});

  return Object.entries(groups).map(([areaCode, areaToolGroups]) => {
    const maxUtilizationRate = Math.max(...areaToolGroups.map((toolGroup) => toolGroup.utilizationRate));
    const qtimeValues = areaToolGroups.map((toolGroup) => toolGroup.avgQtimeMin).filter((value) => value != null);

    return {
      areaId: `area-${areaCode.toLowerCase().replaceAll('_', '-')}`,
      areaCode,
      areaName: areaCode,
      areaNameKo: getProcessAreaNameKo(areaCode),
      sourceAreaCodes: [...new Set(areaToolGroups.map((toolGroup) => toolGroup.sourceAreaCode))],
      toolGroupCount: areaToolGroups.length,
      toolCount: areaToolGroups.reduce((sum, toolGroup) => sum + toolGroup.toolCount, 0),
      avgUtilizationRate: average(areaToolGroups.map((toolGroup) => toolGroup.utilizationRate)),
      maxUtilizationRate,
      wipCount: areaToolGroups.reduce((sum, toolGroup) => sum + toolGroup.wipCount, 0),
      avgQtimeMin: qtimeValues.length > 0 ? average(qtimeValues) : null,
      maxQtimeMin: qtimeValues.length > 0 ? Math.max(...qtimeValues) : null,
      setupRatio: average(areaToolGroups.map((toolGroup) => toolGroup.setupRatio)),
      bottleneckToolGroupCount: areaToolGroups.filter((toolGroup) => toolGroup.bottleneckProb >= 0.5).length,
      avgAvailableToolRatio: average(areaToolGroups.map((toolGroup) => toolGroup.availableToolRatio)),
      riskGrade: normalizeRiskGrade(null, maxUtilizationRate),
    };
  });
}

function createKpiCards(payload: MesRealtimePayload, toolGroups: MesToolGroupMetric[]): MesKpiCard[] {
  const summary = payload.summary;
  const measuredAt = payload.fab?.measuredAt ?? payload.simulationTime;
  const subtitle = `${formatKoMonthDayTime(measuredAt)} 기준`;

  return [
    {
      key: 'wip',
      title: '현재 WIP',
      value: formatNumber(summary?.totalWipCount ?? null),
      subtitle,
      tone: 'info',
    },
    {
      key: 'utilization',
      title: '평균 가동률',
      value: formatRatioPercent(summary?.avgUtilizationRate ?? null),
      subtitle: 'FAB 평균',
      isPositiveGood: false,
      tone: 'warning',
    },
    {
      key: 'tat',
      title: '평균 TAT',
      value: formatQtimeDays(summary?.tatMin ?? null),
      subtitle,
      isPositiveGood: false,
      tone: 'danger',
    },
    {
      key: 'bottleneck',
      title: '병목 TG 수',
      value: `${formatNumber(summary?.bottleneckTgCount ?? null)}개`,
      subtitle: '병목 확률 ≥50%',
      tone: 'danger',
    },
    {
      key: 'throughput',
      title: 'Daily Throughput',
      value: formatNumber(summary?.throughput24h ?? null),
      subtitle: 'lots/24h',
      tone: 'success',
    },
    {
      key: 'delivery',
      title: '납기 준수율',
      value: summary?.deliveryCompliance != null ? formatPercentPoint(summary.deliveryCompliance) : '-',
      subtitle: `${toolGroups.length}개 TG 기준`,
      tone: 'success',
    },
  ];
}

function toTrendValues(points: { value: number | null }[] | undefined): number[] {
  return (points ?? []).map((point) => point.value ?? 0);
}

function createTrendSeries(name: string, values: number[], colorIndex = 0): MesTrendSeries[] {
  if (values.length === 0) return [];

  return [
    {
      name,
      colorToken: UTILIZATION_COLORS[colorIndex % UTILIZATION_COLORS.length],
      values,
    },
  ];
}

export function mapMesPayload(payload: MesRealtimePayload, isConnected = true): MesMonitoringData {
  const toolGroups = (payload.toolGroups ?? []).map(toToolGroupMetric);
  const toolGroupById = new Map(toolGroups.map((toolGroup) => [toolGroup.tgId, toolGroup]));
  const tools = (payload.tools ?? []).map((tool) => toToolMetric(tool, toolGroupById));
  const toolCountByTgId = tools.reduce<Record<string, number>>((acc, tool) => {
    acc[tool.tgId] = (acc[tool.tgId] ?? 0) + 1;
    return acc;
  }, {});
  const normalizedToolGroups = toolGroups.map((toolGroup) => ({
    ...toolGroup,
    toolCount: toolCountByTgId[toolGroup.tgId] ?? 0,
  }));
  const trendLabels = (payload.trends?.utilization ?? payload.trends?.wip ?? payload.trends?.setupRatio ?? []).map(
    (point) => formatKoMonthDayTime(point.time)
  );

  return {
    snapshot: {
      measuredAt: payload.fab?.measuredAt ?? payload.simulationTime,
      simulationDay: toSimulationDay(payload.simulationTime),
      isConnected,
    },
    days: trendLabels,
    kpiCards: createKpiCards(payload, normalizedToolGroups),
    utilizationSeries: createTrendSeries('FAB 평균 가동률', toTrendValues(payload.trends?.utilization), 0),
    wipTrend: toTrendValues(payload.trends?.wip),
    setupSeries: createTrendSeries('평균 Setup 비율', toTrendValues(payload.trends?.setupRatio), 1),
    processSummaries: createProcessSummaries(normalizedToolGroups),
    toolGroups: normalizedToolGroups,
    tools,
  };
}

export async function fetchMesMonitoringData(): Promise<MesMonitoringData> {
  const { data } = await api.get<MesRealtimePayload>(MES_CURRENT_PATH);
  return mapMesPayload(data, true);
}

export async function fetchMesMonitoringFallbackData(): Promise<MesMonitoringData> {
  try {
    return await fetchMesMonitoringData();
  } catch {
    return { ...cloneMockMesData(), snapshot: { ...MOCK_MES_MONITORING_DATA.snapshot, isConnected: false } };
  }
}

export function createMesMonitoringEventSource(): EventSource {
  const baseURL = api.defaults.baseURL ?? '/api';
  const url = `${baseURL.replace(/\/$/, '')}${MES_STREAM_PATH}`;
  return new EventSource(url, { withCredentials: true });
}

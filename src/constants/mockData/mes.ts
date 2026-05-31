import { MES_DAYS } from '@/constants/mes';
import { MOCK_PM_DATA } from '@/constants/mockData/dashboard';
import { getProcessAreaNameKo } from '@/constants/processArea';

import type { ProcessToolGroup } from '@/types/dashboard';
import type {
  MesKpiCard,
  MesMonitoringData,
  MesProcessSummary,
  MesRiskGrade,
  MesToolGroupMetric,
  MesToolMetric,
  MesToolStatus,
  MesTrendSeries,
} from '@/types/mes';

import { calculateMesOeeEstimate } from '@/utils/mesMetrics';

const MEASURED_AT = '2026-05-22T01:00:00Z';

const KNOWN_TG_META: Record<string, { toolCount: number; setupRatio: number; bottleneckProb: number }> = {
  LithoMet_BE_18: { toolCount: 13, setupRatio: 0, bottleneckProb: 0.9963 },
  Litho_REG_BE_63: { toolCount: 8, setupRatio: 0, bottleneckProb: 0.9967 },
  Litho_BE_110: { toolCount: 28, setupRatio: 0, bottleneckProb: 0.9963 },
  Litho_FE_92: { toolCount: 33, setupRatio: 0, bottleneckProb: 0.9861 },
  DE_FE_72: { toolCount: 9, setupRatio: 0, bottleneckProb: 0.999 },
  DE_BE_67: { toolCount: 10, setupRatio: 0, bottleneckProb: 0.9973 },
  LithoTrack_FE_115: { toolCount: 51, setupRatio: 0.0508, bottleneckProb: 0.0298 },
  LithoTrack_FE_95: { toolCount: 49, setupRatio: 0.0899, bottleneckProb: 0.0076 },
};

export const MOCK_MES_UTILIZATION_SERIES: MesTrendSeries[] = [
  { name: 'DE_FE_72', colorToken: '--color-risk-critical', values: [0.612, 0.713, 0.789, 0.836, 0.871, 0.897] },
  { name: 'Litho_BE_110', colorToken: '--color-risk-high', values: [0.71, 0.745, 0.793, 0.831, 0.86, 0.884] },
  { name: 'DE_BE_67', colorToken: '--color-risk-medium', values: [0.68, 0.728, 0.769, 0.81, 0.845, 0.882] },
  { name: 'Litho_REG_BE_63', colorToken: '--color-status-info', values: [0.651, 0.71, 0.752, 0.793, 0.817, 0.875] },
];

export const MOCK_MES_SETUP_SERIES: MesTrendSeries[] = [
  { name: 'LithoMet_BE_18', colorToken: '--color-status-info', values: [0, 0, 0, 0, 0, 0] },
  { name: 'Litho_FE_92', colorToken: '--color-status-success', values: [0.012, 0.018, 0.023, 0.027, 0.03, 0.031] },
  { name: 'DE_FE_72', colorToken: '--color-risk-critical', values: [0, 0, 0, 0, 0, 0] },
];

export const MOCK_MES_WIP_TREND = [312, 1840, 2450, 2980, 3520, 3794];

function createAreaId(areaCode: string) {
  return `area-${areaCode.toLowerCase().replaceAll('/', '-').replaceAll(' ', '-')}`;
}

function createToolGroupId(tgCode: string) {
  return `tg-${tgCode.toLowerCase().replaceAll('_', '-')}`;
}

function createToolId(toolCode: string) {
  return `tool-${toolCode.toLowerCase().replaceAll('_', '-')}`;
}

function getRiskGrade(utilizationRate: number): MesRiskGrade {
  if (utilizationRate >= 0.9) return 'CRITICAL';
  if (utilizationRate >= 0.85) return 'HIGH';
  if (utilizationRate >= 0.7) return 'MEDIUM';
  return 'LOW';
}

function estimateQtimeMin(utilizationRate: number, wipPerToolGroup: number) {
  const days = utilizationRate * 8 + wipPerToolGroup / 420;
  return Math.round(days * 24 * 60 * 10) / 10;
}

function estimateDeliveryRate(qtimeDays: number) {
  if (qtimeDays < 8) return 0.991;
  if (qtimeDays < 10) return 0.974;
  if (qtimeDays < 12) return 0.946;
  if (qtimeDays < 15) return 0.882;
  return 0.745;
}

function getToolGroupMeta(toolGroup: ProcessToolGroup) {
  const known = KNOWN_TG_META[toolGroup.name];
  if (known) return known;

  const nameWeight = toolGroup.name.length % 9;
  const toolCount = Math.max(1, 2 + ((toolGroup.name.charCodeAt(0) + nameWeight) % 18));
  const setupRatio = Math.min(0.09, nameWeight * 0.006);
  const bottleneckProb = Math.min(0.98, toolGroup.util * 0.45 + (toolGroup.wipCount > 0 ? 0.06 : 0.001));

  return { toolCount, setupRatio, bottleneckProb };
}

function getWaitRatio(toolGroup: ProcessToolGroup) {
  return Math.round(Math.min(40, toolGroup.util * 18 + toolGroup.wipCount / 32) * 10) / 10;
}

export const MOCK_MES_TOOL_GROUP_METRICS: MesToolGroupMetric[] = MOCK_PM_DATA.flatMap((area) => {
  const areaId = createAreaId(area.name);
  const areaNameKo = getProcessAreaNameKo(area.name);

  return [...area.gFE, ...area.gBE].map((toolGroup) => {
    const meta = getToolGroupMeta(toolGroup);

    return {
      tgId: createToolGroupId(toolGroup.name),
      tgCode: toolGroup.name,
      tgName: toolGroup.name,
      areaId,
      areaCode: area.name,
      areaName: area.name,
      areaNameKo,
      toolCount: meta.toolCount,
      utilizationRate: toolGroup.util,
      availableToolRatio: Math.max(0.3, 1 - toolGroup.util * 0.22),
      wipCount: toolGroup.wipCount,
      avgQtimeMin: estimateQtimeMin(toolGroup.util, toolGroup.wipCount),
      setupRatio: meta.setupRatio,
      waitRatio: getWaitRatio(toolGroup),
      bottleneckProb: meta.bottleneckProb,
      riskGrade: getRiskGrade(toolGroup.util),
      measuredAt: MEASURED_AT,
    };
  });
});

export const MOCK_MES_PROCESS_SUMMARIES: MesProcessSummary[] = MOCK_PM_DATA.map((area) => {
  const toolGroups = MOCK_MES_TOOL_GROUP_METRICS.filter((toolGroup) => toolGroup.areaCode === area.name);
  const totalUtilization = toolGroups.reduce((sum, toolGroup) => sum + toolGroup.utilizationRate, 0);
  const maxUtilizationRate = Math.max(...toolGroups.map((toolGroup) => toolGroup.utilizationRate));
  const wipCount = toolGroups.reduce((sum, toolGroup) => sum + toolGroup.wipCount, 0);
  const setupRatio = toolGroups.reduce((sum, toolGroup) => sum + toolGroup.setupRatio, 0) / toolGroups.length;
  const avgQtimeMin = estimateQtimeMin(maxUtilizationRate, wipCount / Math.max(toolGroups.length, 1));

  return {
    areaId: createAreaId(area.name),
    areaCode: area.name,
    areaName: area.name,
    areaNameKo: getProcessAreaNameKo(area.name),
    toolGroupCount: toolGroups.length,
    toolCount: toolGroups.reduce((sum, toolGroup) => sum + toolGroup.toolCount, 0),
    avgUtilizationRate: totalUtilization / toolGroups.length,
    maxUtilizationRate,
    wipCount,
    avgQtimeMin,
    setupRatio,
    bottleneckToolGroupCount: toolGroups.filter((toolGroup) => toolGroup.utilizationRate >= 0.85).length,
    deliveryRate: estimateDeliveryRate(avgQtimeMin / 60 / 24),
    riskGrade: getRiskGrade(maxUtilizationRate),
  };
});

function createToolStatus(index: number, utilizationRate: number): MesToolStatus {
  if (index % 17 === 0) return 'DOWN';
  if (utilizationRate < 0.2) return 'IDLE';
  if (index % 11 === 0) return 'SETUP';
  return 'RUN';
}

export const MOCK_MES_TOOL_METRICS: MesToolMetric[] = MOCK_MES_TOOL_GROUP_METRICS.flatMap((toolGroup) =>
  Array.from({ length: toolGroup.toolCount }, (_, index) => {
    const toolIndex = index + 1;
    const hash = (toolGroup.tgName.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) + toolIndex * 13) % 100;
    const utilizationOffset = ((hash % 20) - 10) * 0.004;
    const status = createToolStatus(toolIndex, toolGroup.utilizationRate);
    const utilizationRate =
      status === 'DOWN' ? 0 : Math.min(0.999, Math.max(0.01, toolGroup.utilizationRate + utilizationOffset));
    const queueLotCount =
      status === 'DOWN'
        ? 0
        : Math.round(toolGroup.wipCount * (toolIndex === 1 ? 0.5 : toolIndex === 2 ? 0.3 : toolIndex === 3 ? 0.2 : 0));
    const avgQtimeMin = estimateQtimeMin(utilizationRate, queueLotCount);
    const toolCode = `${toolGroup.tgCode}#${toolIndex}`;

    return {
      toolId: createToolId(toolCode),
      toolCode,
      toolName: toolCode,
      tgId: toolGroup.tgId,
      tgCode: toolGroup.tgCode,
      utilizationRate,
      oeeEstimate: status === 'DOWN' ? null : calculateMesOeeEstimate(utilizationRate, toolGroup.setupRatio),
      avgQtimeMin,
      queueLotCount,
      setupRatio: toolGroup.setupRatio,
      downRatio: status === 'DOWN' ? 1 : 0,
      status,
      lastDispatchAt: `Day ${(24 + (hash % 90) / 100).toFixed(2)}`,
      measuredAt: MEASURED_AT,
    };
  })
);

export const MOCK_MES_KPI_CARDS: MesKpiCard[] = [
  {
    key: 'wip',
    title: '현재 WIP',
    value: '3,794',
    subtitle: '대기 Lot · Day 25',
    delta: 274,
    deltaUnit: ' lots',
    isPositiveGood: false,
    tone: 'info',
  },
  {
    key: 'utilization',
    title: '평균 가동률',
    value: '72.4%',
    subtitle: '상위 병목 TG 기준',
    delta: 1.2,
    deltaUnit: '%p',
    isPositiveGood: false,
    tone: 'warning',
  },
  {
    key: 'qtime',
    title: '평균 Q-time',
    value: '10.55일',
    subtitle: '목표 10일 초과',
    delta: 0.38,
    deltaUnit: '일',
    isPositiveGood: false,
    tone: 'danger',
  },
  {
    key: 'bottleneck',
    title: '병목 TG 수',
    value: '25개',
    subtitle: '가동률 ≥85% TG',
    note: 'Critical 2 · High 23',
    tone: 'danger',
  },
  {
    key: 'throughput',
    title: 'Throughput',
    value: '3,468',
    subtitle: 'Lots / 24h',
    delta: 22,
    deltaUnit: ' lots',
    isPositiveGood: true,
    tone: 'success',
  },
  {
    key: 'rtf',
    title: 'RTF',
    value: '87.3%',
    subtitle: '실적 / 계획 목표',
    delta: -0.4,
    deltaUnit: '%p',
    isPositiveGood: true,
    tone: 'warning',
  },
];

export const MOCK_MES_MONITORING_DATA: MesMonitoringData = {
  snapshot: {
    measuredAt: MEASURED_AT,
    simulationDay: 25,
    isConnected: true,
  },
  days: MES_DAYS,
  kpiCards: MOCK_MES_KPI_CARDS,
  utilizationSeries: MOCK_MES_UTILIZATION_SERIES,
  wipTrend: MOCK_MES_WIP_TREND,
  setupSeries: MOCK_MES_SETUP_SERIES,
  processSummaries: MOCK_MES_PROCESS_SUMMARIES,
  toolGroups: MOCK_MES_TOOL_GROUP_METRICS,
  tools: MOCK_MES_TOOL_METRICS,
};

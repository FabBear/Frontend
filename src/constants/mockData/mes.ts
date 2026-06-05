import {
  MES_CSV_FAB_LATEST,
  MES_CSV_MEASURED_AT,
  MES_CSV_SNAPSHOT_TIME_MIN,
  MES_CSV_TOOL_GROUP_ROWS,
  MES_CSV_TOOL_ROWS,
  MES_CSV_TREND_LABELS,
  MES_CSV_UTILIZATION_SERIES_ROWS,
  MES_CSV_WIP_TREND,
} from '@/constants/mockData/mesCsvSnapshot';
import { getMesSemiconductorProcessCode, getProcessAreaNameKo } from '@/constants/processArea';

import type {
  MesKpiCard,
  MesMonitoringData,
  MesProcessSummary,
  MesRiskGrade,
  MesToolGroupMetric,
  MesToolMetric,
  MesToolStatus,
  MesToolStatusSummary,
  MesTrendSeries,
} from '@/types/mes';

import { formatNumber, formatRatioPercent } from '@/utils/format';
import { average } from '@/utils/mesMetrics';

const MES_QUALITY_FACTOR_LABEL = '추정 OEE';
const SIMULATION_DAY = Math.round(MES_CSV_SNAPSHOT_TIME_MIN / 1440);
const UTILIZATION_COLORS = ['--color-risk-critical', '--color-risk-high', '--color-risk-medium', '--color-status-info'];
const DEFAULT_STATUS_SUMMARY: MesToolStatusSummary = { RUN: 0, IDLE: 0, SETUP: 0, DOWN: 0 };
const DEFAULT_RISK_COUNTS: Record<MesRiskGrade, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

function createAreaId(areaCode: string) {
  return `area-${areaCode.toLowerCase().replaceAll('_', '-').replaceAll('/', '-')}`;
}

function createToolGroupId(tgCode: string) {
  return `tg-${tgCode.toLowerCase().replaceAll('_', '-').replaceAll('#', '-')}`;
}

function createToolId(toolCode: string) {
  return `tool-${toolCode.toLowerCase().replaceAll('_', '-').replaceAll('#', '-')}`;
}

function getRiskGrade(utilizationRate: number): MesRiskGrade {
  if (utilizationRate >= 0.9) return 'CRITICAL';
  if (utilizationRate >= 0.85) return 'HIGH';
  if (utilizationRate >= 0.7) return 'MEDIUM';
  return 'LOW';
}

function createOeeEstimate(utilizationRate: number, setupRatio: number): number {
  return utilizationRate * Math.max(1 - setupRatio, 0.7) * 0.995;
}

export const MOCK_MES_TOOL_GROUP_METRICS: MesToolGroupMetric[] = MES_CSV_TOOL_GROUP_ROWS.map(
  ([
    tgCode,
    sourceAreaCode,
    toolCount,
    utilizationRate,
    availableToolRatio,
    wipCount,
    avgQtimeMin,
    setupRatio,
    waitRatio,
    bottleneckProb,
  ]) => {
    const areaCode = getMesSemiconductorProcessCode(sourceAreaCode, tgCode);

    return {
      tgId: createToolGroupId(tgCode),
      tgCode,
      tgName: tgCode,
      areaId: createAreaId(areaCode),
      areaCode,
      areaName: areaCode,
      areaNameKo: getProcessAreaNameKo(areaCode),
      sourceAreaCode,
      sourceAreaNameKo: getProcessAreaNameKo(sourceAreaCode),
      toolCount,
      utilizationRate,
      availableToolRatio,
      wipCount,
      avgQtimeMin,
      setupRatio,
      waitRatio,
      bottleneckProb,
      riskGrade: getRiskGrade(utilizationRate),
      measuredAt: MES_CSV_MEASURED_AT,
      statusSummary: { ...DEFAULT_STATUS_SUMMARY },
      oeeEstimate: createOeeEstimate(utilizationRate, setupRatio),
    };
  }
);

const TOOL_GROUP_BY_CODE = new Map(MOCK_MES_TOOL_GROUP_METRICS.map((toolGroup) => [toolGroup.tgCode, toolGroup]));

export const MOCK_MES_TOOL_METRICS: MesToolMetric[] = MES_CSV_TOOL_ROWS.map(
  ([toolCode, tgCode, utilizationRate, oeeEstimate, avgQtimeMin, queueLotCount, setupRatio, downRatio, status]) => ({
    toolId: createToolId(toolCode),
    toolCode,
    toolName: toolCode,
    tgId: createToolGroupId(tgCode),
    tgCode,
    utilizationRate,
    oeeEstimate,
    avgQtimeMin,
    queueLotCount,
    setupRatio,
    downRatio,
    status: status as MesToolStatus,
    lastDispatchAt: null,
    measuredAt: MES_CSV_MEASURED_AT,
  })
);

const PROCESS_GROUPS = MOCK_MES_TOOL_GROUP_METRICS.reduce<Record<string, MesToolGroupMetric[]>>((groups, toolGroup) => {
  groups[toolGroup.areaCode] ??= [];
  groups[toolGroup.areaCode].push(toolGroup);
  return groups;
}, {});

export const MOCK_MES_PROCESS_SUMMARIES: MesProcessSummary[] = Object.entries(PROCESS_GROUPS).map(
  ([areaCode, toolGroups]) => {
    const maxUtilizationRate = Math.max(...toolGroups.map((toolGroup) => toolGroup.utilizationRate));
    const totalToolCount = toolGroups.reduce((sum, toolGroup) => sum + toolGroup.toolCount, 0);

    return {
      areaId: createAreaId(areaCode),
      areaCode,
      areaName: areaCode,
      areaNameKo: getProcessAreaNameKo(areaCode),
      sourceAreaCodes: [...new Set(toolGroups.map((toolGroup) => toolGroup.sourceAreaCode))],
      toolGroupCount: toolGroups.length,
      toolCount: totalToolCount,
      avgUtilizationRate: average(toolGroups.map((toolGroup) => toolGroup.utilizationRate)),
      maxUtilizationRate,
      wipCount: toolGroups.reduce((sum, toolGroup) => sum + toolGroup.wipCount, 0),
      avgQtimeMin: average(toolGroups.map((toolGroup) => toolGroup.avgQtimeMin ?? 0)),
      maxQtimeMin: toolGroups.reduce<number | null>((max, tg) => {
        if (tg.avgQtimeMin === null) return max;
        return max === null ? tg.avgQtimeMin : Math.max(max, tg.avgQtimeMin);
      }, null),
      setupRatio: average(toolGroups.map((toolGroup) => toolGroup.setupRatio)),
      bottleneckToolGroupCount: toolGroups.filter((toolGroup) => toolGroup.utilizationRate >= 0.85).length,
      avgAvailableToolRatio: average(toolGroups.map((toolGroup) => toolGroup.availableToolRatio)),
      riskGrade: getRiskGrade(maxUtilizationRate),
      oeeEstimate: average(toolGroups.map((toolGroup) => toolGroup.oeeEstimate ?? 0)),
      riskCounts: toolGroups.reduce<Record<MesRiskGrade, number>>(
        (counts, toolGroup) => {
          counts[toolGroup.riskGrade] += 1;
          return counts;
        },
        { ...DEFAULT_RISK_COUNTS }
      ),
    };
  }
);

export const MOCK_MES_UTILIZATION_SERIES: MesTrendSeries[] = MES_CSV_UTILIZATION_SERIES_ROWS.map(
  ([name, values], index) => ({
    name,
    colorToken: UTILIZATION_COLORS[index % UTILIZATION_COLORS.length],
    values,
  })
);

export const MOCK_MES_WIP_TREND = [...MES_CSV_WIP_TREND];
export const MOCK_MES_SETUP_SERIES: MesTrendSeries[] = MOCK_MES_UTILIZATION_SERIES.map((series) => ({
  name: series.name,
  colorToken: series.colorToken,
  values: series.values.map((value) => {
    const setupRatio = TOOL_GROUP_BY_CODE.get(series.name)?.setupRatio ?? 0;
    return value > 0 ? setupRatio : 0;
  }),
}));

const statusCounts = MOCK_MES_TOOL_METRICS.reduce(
  (summary, tool) => {
    summary[tool.status] += 1;
    return summary;
  },
  { RUN: 0, IDLE: 0, SETUP: 0, DOWN: 0 } as Record<MesToolStatus, number>
);
const avgTopUtilization = average(
  [...MOCK_MES_TOOL_GROUP_METRICS]
    .sort((a, b) => b.utilizationRate - a.utilizationRate)
    .slice(0, 10)
    .map((toolGroup) => toolGroup.utilizationRate)
);
const avgOeeEstimate = average(MOCK_MES_TOOL_METRICS.map((tool) => tool.oeeEstimate ?? 0));
const bottleneckToolGroupCount = MOCK_MES_TOOL_GROUP_METRICS.filter(
  (toolGroup) => toolGroup.utilizationRate >= 0.85
).length;

export const MOCK_MES_KPI_CARDS: MesKpiCard[] = [
  {
    key: 'wip',
    title: '현재 WIP',
    value: formatNumber(MES_CSV_FAB_LATEST.wip),
    subtitle: `WIP Lot · Day ${SIMULATION_DAY}`,
    tone: 'info',
  },
  {
    key: 'utilization',
    title: '평균 가동률',
    value: formatRatioPercent(avgTopUtilization),
    subtitle: '상위 TG 10개 기준',
    isPositiveGood: false,
    tone: 'warning',
  },
  {
    key: 'qtime',
    title: '평균 Q-time',
    value: `${(MES_CSV_FAB_LATEST.q_time_min / 60 / 24).toFixed(1)}일`,
    subtitle: 'FAB 평균 대기 시간',
    isPositiveGood: false,
    tone: 'danger',
  },
  {
    key: 'bottleneck',
    title: '고가동 TG 수',
    value: `${formatNumber(bottleneckToolGroupCount)}개`,
    subtitle: '가동률 ≥85% TG',
    tone: 'danger',
  },
  {
    key: 'tool-state',
    title: 'Tool 상태',
    value: `${formatNumber(statusCounts.RUN)}대`,
    subtitle: `대기 ${formatNumber(statusCounts.IDLE)} · 정비 ${formatNumber(statusCounts.DOWN)}`,
    tone: 'success',
  },
  {
    key: 'oee',
    title: '평균 OEE',
    value: formatRatioPercent(avgOeeEstimate),
    subtitle: MES_QUALITY_FACTOR_LABEL,
    tone: 'success',
  },
];

export const MOCK_MES_MONITORING_DATA: MesMonitoringData = {
  snapshot: {
    measuredAt: MES_CSV_MEASURED_AT,
    simulationDay: SIMULATION_DAY,
    isConnected: true,
  },
  days: [...MES_CSV_TREND_LABELS],
  kpiCards: MOCK_MES_KPI_CARDS,
  fabSummary: {
    bottleneckTgCount: bottleneckToolGroupCount,
    criticalTgCount: MOCK_MES_TOOL_GROUP_METRICS.filter((toolGroup) => toolGroup.riskGrade === 'CRITICAL').length,
    highTgCount: MOCK_MES_TOOL_GROUP_METRICS.filter((toolGroup) => toolGroup.riskGrade === 'HIGH').length,
    avgAvailableToolRatio: average(MOCK_MES_TOOL_GROUP_METRICS.map((toolGroup) => toolGroup.availableToolRatio)),
    toolStatusSummary: statusCounts,
  },
  utilizationSeries: MOCK_MES_UTILIZATION_SERIES,
  wipTrend: MOCK_MES_WIP_TREND,
  setupSeries: MOCK_MES_SETUP_SERIES,
  processSummaries: MOCK_MES_PROCESS_SUMMARIES,
  toolGroups: MOCK_MES_TOOL_GROUP_METRICS,
  tools: MOCK_MES_TOOL_METRICS,
};

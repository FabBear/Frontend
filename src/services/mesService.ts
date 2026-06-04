import api from '@/services/api';

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

import { formatKoMonthDayTime, formatNumber, formatQtimeDays, formatRatioPercent } from '@/utils/format';
import { average } from '@/utils/mesMetrics';

const MES_STREAM_PATH = '/v1/monitoring/mes/stream';
const MES_CURRENT_PATH = '/v1/monitoring/mes/current';
const UTILIZATION_COLORS = ['--color-chart-blue', '--color-chart-violet', '--color-risk-high'];

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

function createKpiCards(payload: MesRealtimePayload): MesKpiCard[] {
  const fab = payload.fab;
  const summary = payload.summary;

  return [
    {
      key: 'rtf',
      title: 'RTF',
      value: formatRatioPercent(fab?.rtf ?? null),
      subtitle: '재작업 없이 정상 통과한 Lot 비율',
      isPositiveGood: true,
      tone: 'success',
    },
    {
      key: 'utilization',
      title: '평균 가동률',
      value: formatRatioPercent(fab?.utilizationRate ?? null),
      subtitle: 'FAB 평균',
      isPositiveGood: false,
      tone: 'warning',
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
      value: formatNumber(fab?.throughput24h ?? null),
      subtitle: 'lots/24h',
      tone: 'success',
    },
    {
      key: 'wip',
      title: '현재 WIP',
      value: formatNumber(fab?.wipCount ?? null),
      subtitle: '전체 대기 Lot 합산',
      tone: 'info',
    },
    {
      key: 'qtime',
      title: '평균 Q-time',
      value: formatQtimeDays(fab?.avgQtimeMin ?? null),
      subtitle: 'FAB 평균 · 장비 대기 시간',
      isPositiveGood: false,
      tone: 'danger',
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
    kpiCards: createKpiCards(payload),
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

export function createMesMonitoringEventSource(): EventSource {
  const baseURL = api.defaults.baseURL ?? '/api';
  const url = `${baseURL.replace(/\/$/, '')}${MES_STREAM_PATH}`;
  return new EventSource(url, { withCredentials: true });
}

type ExportType = 'toolGroups' | 'tools' | 'processSummaries';

export function exportMesCsv(data: MesMonitoringData, type: ExportType): void {
  const date = new Date().toISOString().slice(0, 10);
  let headers: string[];
  let rows: string[][];
  let filename: string;

  if (type === 'toolGroups') {
    headers = [
      'TG명',
      '공정',
      '가동률(%)',
      '위험도',
      'WIP(Lot)',
      '병목확률(%)',
      '평균Q-time(분)',
      'Setup비율(%)',
      '가용장비율(%)',
    ];
    rows = data.toolGroups.map((tg) => [
      tg.tgName,
      tg.areaNameKo,
      (tg.utilizationRate * 100).toFixed(1),
      tg.riskGrade,
      String(tg.wipCount),
      (tg.bottleneckProb * 100).toFixed(1),
      tg.avgQtimeMin != null ? tg.avgQtimeMin.toFixed(1) : '',
      (tg.setupRatio * 100).toFixed(1),
      (tg.availableToolRatio * 100).toFixed(1),
    ]);
    filename = `mes_tg_kpi_${date}.csv`;
  } else if (type === 'tools') {
    headers = [
      '장비코드',
      'TG',
      '상태',
      '가동률(%)',
      'OEE(%)',
      '평균Q-time(분)',
      '대기Lot',
      'Setup비율(%)',
      'Down비율(%)',
    ];
    rows = data.tools.map((tool) => [
      tool.toolCode,
      tool.tgCode,
      tool.status,
      (tool.utilizationRate * 100).toFixed(1),
      tool.oeeEstimate != null ? (tool.oeeEstimate * 100).toFixed(1) : '',
      tool.avgQtimeMin != null ? tool.avgQtimeMin.toFixed(1) : '',
      String(tool.queueLotCount),
      (tool.setupRatio * 100).toFixed(1),
      (tool.downRatio * 100).toFixed(1),
    ]);
    filename = `mes_tool_kpi_${date}.csv`;
  } else {
    headers = ['공정명', 'TG수', '평균가동률(%)', '최대가동률(%)', 'WIP(Lot)', '위험도', '병목TG수', 'Setup비율(%)'];
    rows = data.processSummaries.map((p) => [
      p.areaNameKo,
      String(p.toolGroupCount),
      (p.avgUtilizationRate * 100).toFixed(1),
      (p.maxUtilizationRate * 100).toFixed(1),
      String(p.wipCount),
      p.riskGrade,
      String(p.bottleneckToolGroupCount),
      (p.setupRatio * 100).toFixed(1),
    ]);
    filename = `mes_process_kpi_${date}.csv`;
  }

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

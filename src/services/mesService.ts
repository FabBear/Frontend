import api from '@/services/api';

import { MOCK_MES_MONITORING_DATA } from '@/constants/mockData/mes';
import { shouldUseDemoMockData } from '@/constants/mockMode';
import { getMesSemiconductorProcessCode, getProcessAreaNameKo } from '@/constants/processArea';
import { RISK_LEVEL_META, riskGradeToLevel } from '@/constants/riskLevel';

import type {
  MesFabSummary,
  MesKpiCard,
  MesMonitoringData,
  MesProcessSummary,
  MesRealtimePayload,
  MesRealtimeProcessSummary,
  MesRealtimeTool,
  MesRealtimeToolGroup,
  MesRealtimeToolStatusSummary,
  MesRiskGrade,
  MesToolGroupMetric,
  MesToolMetric,
  MesToolStatusSummary,
  MesTrendSeries,
} from '@/types/mes';

import { formatKoMonthDayTime, formatNumber, formatQtimeDays, formatRatioPercent } from '@/utils/format';

const MES_STREAM_PATH = '/v1/monitoring/mes/stream';
const MES_CURRENT_PATH = '/v1/monitoring/mes/current';
const UTILIZATION_COLORS = ['--color-chart-blue', '--color-chart-violet', '--color-risk-high'];

const DEFAULT_STATUS_SUMMARY: MesToolStatusSummary = { RUN: 0, IDLE: 0, SETUP: 0, DOWN: 0 };
const DEFAULT_RISK_COUNTS: Record<MesRiskGrade, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

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

function compareRiskGrade(a: MesRiskGrade, b: MesRiskGrade): number {
  return RISK_LEVEL_META[riskGradeToLevel(a)].sortOrder - RISK_LEVEL_META[riskGradeToLevel(b)].sortOrder;
}

function normalizeStatusSummary(value: MesRealtimeToolStatusSummary | null | undefined): MesToolStatusSummary {
  return { ...DEFAULT_STATUS_SUMMARY, ...value };
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
    areaId: toolGroup.areaId,
    areaCode,
    areaName: areaCode,
    areaNameKo: getProcessAreaNameKo(areaCode),
    sourceAreaCode,
    sourceAreaNameKo: getProcessAreaNameKo(sourceAreaCode),
    toolCount: normalizeCount(toolGroup.toolCount),
    utilizationRate,
    availableToolRatio: normalizeNumber(toolGroup.availableToolRatio) ?? 0,
    wipCount: normalizeCount(toolGroup.wipCount),
    avgQtimeMin: normalizeNumber(toolGroup.avgQtimeMin),
    setupRatio: normalizeNumber(toolGroup.setupRatio) ?? 0,
    waitRatio: normalizeNumber(toolGroup.waitRatio) ?? 0,
    bottleneckProb: normalizeNumber(toolGroup.bottleneckProb) ?? 0,
    riskGrade: normalizeRiskGrade(toolGroup.riskGrade, utilizationRate),
    measuredAt: toolGroup.measuredAt,
    statusSummary: normalizeStatusSummary(toolGroup.statusSummary),
    oeeEstimate: normalizeNumber(toolGroup.oeeEstimate),
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
    status: tool.status ?? 'IDLE',
    lastDispatchAt: tool.lastDispatchAt ?? null,
    measuredAt: tool.measuredAt,
  };
}

function toProcessSummary(raw: MesRealtimeProcessSummary, toolGroups: MesToolGroupMetric[]): MesProcessSummary {
  const areaCode = getMesSemiconductorProcessCode(raw.areaCode);
  const areaToolGroups = toolGroups.filter((tg) => tg.sourceAreaCode === raw.areaCode);
  const sourceAreaCodes = [...new Set([raw.areaCode, ...areaToolGroups.map((tg) => tg.sourceAreaCode)])];

  const avgUtilizationRate = normalizeNumber(raw.avgUtilizationRate) ?? 0;
  const maxUtilizationRate = normalizeNumber(raw.maxUtilizationRate) ?? 0;
  const riskCounts: Record<MesRiskGrade, number> = raw.riskCounts
    ? { ...DEFAULT_RISK_COUNTS, ...raw.riskCounts }
    : { ...DEFAULT_RISK_COUNTS };

  return {
    areaId: raw.areaId,
    areaCode,
    areaName: raw.areaName,
    areaNameKo: getProcessAreaNameKo(areaCode),
    sourceAreaCodes,
    toolGroupCount: raw.toolGroupCount,
    toolCount: raw.toolCount,
    avgUtilizationRate,
    maxUtilizationRate,
    wipCount: normalizeCount(raw.wipCount),
    avgQtimeMin: normalizeNumber(raw.avgQtimeMin),
    maxQtimeMin: normalizeNumber(raw.maxQtimeMin),
    setupRatio: normalizeNumber(raw.setupRatio) ?? 0,
    bottleneckToolGroupCount: normalizeCount(raw.bottleneckToolGroupCount),
    avgAvailableToolRatio: normalizeNumber(raw.avgAvailableToolRatio) ?? 0,
    riskGrade: normalizeRiskGrade(raw.riskGrade, maxUtilizationRate),
    oeeEstimate: normalizeNumber(raw.oeeEstimate),
    riskCounts,
  };
}

function weightedAverage(
  values: MesProcessSummary[],
  getValue: (summary: MesProcessSummary) => number | null,
  getWeight: (summary: MesProcessSummary) => number
): number | null {
  let totalWeight = 0;
  let totalValue = 0;

  values.forEach((summary) => {
    const value = getValue(summary);
    if (value === null) return;

    const weight = getWeight(summary);
    if (weight <= 0) return;

    totalWeight += weight;
    totalValue += value * weight;
  });

  return totalWeight === 0 ? null : totalValue / totalWeight;
}

function sumRiskCounts(summaries: MesProcessSummary[]): Record<MesRiskGrade, number> {
  return summaries.reduce<Record<MesRiskGrade, number>>(
    (acc, summary) => {
      (Object.keys(DEFAULT_RISK_COUNTS) as MesRiskGrade[]).forEach((grade) => {
        acc[grade] += summary.riskCounts[grade] ?? 0;
      });
      return acc;
    },
    { ...DEFAULT_RISK_COUNTS }
  );
}

function mergeProcessSummaries(summaries: MesProcessSummary[]): MesProcessSummary[] {
  const grouped = summaries.reduce<Map<string, MesProcessSummary[]>>((acc, summary) => {
    const current = acc.get(summary.areaCode) ?? [];
    current.push(summary);
    acc.set(summary.areaCode, current);
    return acc;
  }, new Map());

  return [...grouped.entries()].map(([areaCode, group]) => {
    if (group.length === 1) return group[0];

    const base = group[0];
    const toolGroupCount = group.reduce((sum, summary) => sum + summary.toolGroupCount, 0);
    const toolCount = group.reduce((sum, summary) => sum + summary.toolCount, 0);
    const riskCounts = sumRiskCounts(group);
    const maxUtilizationRate = Math.max(...group.map((summary) => summary.maxUtilizationRate));
    const highestRiskGrade = [...group].map((summary) => summary.riskGrade).sort(compareRiskGrade)[0];

    return {
      ...base,
      areaId: areaCode,
      areaCode,
      areaName: areaCode,
      areaNameKo: getProcessAreaNameKo(areaCode),
      sourceAreaCodes: [...new Set(group.flatMap((summary) => summary.sourceAreaCodes))].sort(),
      toolGroupCount,
      toolCount,
      avgUtilizationRate:
        weightedAverage(
          group,
          (summary) => summary.avgUtilizationRate,
          (summary) => summary.toolGroupCount
        ) ?? 0,
      maxUtilizationRate,
      wipCount: group.reduce((sum, summary) => sum + summary.wipCount, 0),
      avgQtimeMin: weightedAverage(
        group,
        (summary) => summary.avgQtimeMin,
        (summary) => summary.toolGroupCount
      ),
      maxQtimeMin: (() => {
        const vals = group.map((s) => s.maxQtimeMin).filter((v): v is number => v !== null);
        return vals.length > 0 ? Math.max(...vals) : null;
      })(),
      setupRatio:
        weightedAverage(
          group,
          (summary) => summary.setupRatio,
          (summary) => summary.toolGroupCount
        ) ?? 0,
      bottleneckToolGroupCount: group.reduce((sum, summary) => sum + summary.bottleneckToolGroupCount, 0),
      avgAvailableToolRatio:
        weightedAverage(
          group,
          (summary) => summary.avgAvailableToolRatio,
          (summary) => summary.toolGroupCount
        ) ?? 0,
      riskGrade: highestRiskGrade,
      oeeEstimate: weightedAverage(
        group,
        (summary) => summary.oeeEstimate,
        (summary) => summary.toolGroupCount
      ),
      riskCounts,
    };
  });
}

function toFabSummary(fab: MesRealtimePayload['fab']): MesFabSummary {
  return {
    bottleneckTgCount: normalizeCount(fab?.bottleneckTgCount),
    criticalTgCount: normalizeCount(fab?.criticalTgCount),
    highTgCount: normalizeCount(fab?.highTgCount),
    avgAvailableToolRatio: normalizeNumber(fab?.avgAvailableToolRatio) ?? 0,
    toolStatusSummary: normalizeStatusSummary(fab?.toolStatusSummary),
  };
}

function createKpiCards(payload: MesRealtimePayload): MesKpiCard[] {
  const fab = payload.fab;

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
      title: '고가동 TG 수',
      value: `${formatNumber(fab?.bottleneckTgCount ?? null)}개`,
      subtitle: '가동률 High 이상',
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
  return [{ name, colorToken: UTILIZATION_COLORS[colorIndex % UTILIZATION_COLORS.length], values }];
}

export function mapMesPayload(payload: MesRealtimePayload, isConnected = true): MesMonitoringData {
  const toolGroups = (payload.toolGroups ?? []).map(toToolGroupMetric);
  const toolGroupById = new Map(toolGroups.map((tg) => [tg.tgId, tg]));
  const tools = (payload.tools ?? []).map((tool) => toToolMetric(tool, toolGroupById));

  const processSummaries = mergeProcessSummaries(
    (payload.processSummaries ?? []).map((raw) => toProcessSummary(raw, toolGroups))
  );

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
    fabSummary: toFabSummary(payload.fab),
    utilizationSeries: createTrendSeries('FAB 평균 가동률', toTrendValues(payload.trends?.utilization), 0),
    wipTrend: toTrendValues(payload.trends?.wip),
    setupSeries: createTrendSeries('평균 Setup 비율', toTrendValues(payload.trends?.setupRatio), 1),
    processSummaries,
    toolGroups,
    tools,
  };
}

export async function fetchMesMonitoringData(): Promise<MesMonitoringData> {
  if (shouldUseDemoMockData()) return MOCK_MES_MONITORING_DATA;

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
      'XGBoost 확률(%)',
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
      '정비비율(%)',
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
    headers = ['공정명', 'TG수', '평균가동률(%)', '최대가동률(%)', 'WIP(Lot)', '위험도', '고가동TG수', 'Setup비율(%)'];
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

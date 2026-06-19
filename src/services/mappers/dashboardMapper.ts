import { TREND_META } from '@/constants/dashboard';
import { getMesSemiconductorProcessCode, getProcessAreaSortOrder } from '@/constants/processArea';
import { riskGradeToLevel } from '@/constants/riskLevel';

import type { BncAlertMetrics } from '@/types/bnc';
import type {
  BottleneckAlertItem,
  DashboardData,
  DashboardProcessAreaData,
  DashboardProcessToolGroupData,
  FabKpiSnapshot,
  KpiTrendSeries,
} from '@/types/dashboard';
import type {
  DashboardApiData,
  DashboardKpiResponse,
  DashboardProcessMapResponse,
  DashboardProcessToolGroup,
  DashboardRiskAlertItem,
  DashboardRiskAlertsResponse,
  DashboardTrendKey,
  DashboardTrendsResponse,
} from '@/types/dashboardApi';

const SEOUL_TREND_LABEL_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function mapDashboardData(data: DashboardApiData): DashboardData {
  return {
    kpi: mapKpi(data.kpi),
    alerts: mapRiskAlerts(data.alerts),
    processAreas: mapProcessMap(data.processMap),
    trends: mapTrends(data.trends),
  };
}

export function mapKpi(kpi: DashboardKpiResponse): FabKpiSnapshot {
  return {
    rtf: kpi.rtf.value,
    rtfDelta: kpi.rtf.delta,
    throughput24h: kpi.throughput24h.value,
    throughputDelta: kpi.throughput24h.delta,
    throughputUnit: kpi.throughput24h.unit ?? 'lots/24h',
    avgQtimeMin: kpi.avgQtimeMin.value,
    qtimeDelta: kpi.avgQtimeMin.delta,
    qtimeUnit: kpi.avgQtimeMin.unit ?? 'min',
    wipCount: kpi.wip.value,
    wipDelta: kpi.wip.delta,
    wipTarget: kpi.wip.target ?? null,
    wipUnit: kpi.wip.unit ?? 'lots',
    updatedAt: kpi.measuredAt,
  };
}

export function mapRiskAlerts(alerts: DashboardRiskAlertsResponse): BottleneckAlertItem[] {
  return alerts.items.map(mapAlert);
}

function mapAlert(alert: DashboardRiskAlertItem): BottleneckAlertItem {
  const currentStepName = alert.currentStepName ?? '-';
  const hasCause = Boolean(alert.mainCause);
  const affectedTgCount = alert.affectedTgCount ?? 0;
  const alertMetrics = mapAlertMetrics(alert);

  return {
    caseId: alert.caseId,
    tgId: alert.tgId,
    tgName: alert.tgName,
    areaName: alert.areaName,
    riskGrade: alert.riskGrade,
    riskLevel: riskGradeToLevel(alert.riskGrade),
    bottleneckProb: alert.bottleneckProb ?? 0,
    riskScore: alert.riskScore ?? alertMetrics?.compositeScore ?? null,
    impactScore: alert.impactScore ?? alertMetrics?.impactScore ?? null,
    alertMetrics,
    estDelayHours: alert.estDelayHours ?? minutesToHours(alert.estimatedDelayMin ?? 0),
    affectedTgCount,
    affectedLotCount: alert.affectedLotCount ?? null,
    mainCause: alert.mainCause ?? '원인 분석 진행 중',
    status: alert.status ?? '-',
    currentStepName,
    canAnalyzeCause: hasCause || getAgentStepOrder(currentStepName) >= 2,
    canShowSolutions: getAgentStepOrder(currentStepName) >= 4,
    detectedAt: alert.detectedAt,
    batchCriticalCount: alert.batchCriticalCount ?? 1,
    batchAreaCount: alert.batchAreaCount ?? 1,
  };
}

function mapAlertMetrics(alert: DashboardRiskAlertItem): BncAlertMetrics | null {
  const metrics = alert.alertMetrics ?? null;
  const mapped: BncAlertMetrics = {
    compositeScore: metrics?.compositeScore ?? alert.riskScore ?? null,
    probability: metrics?.probability ?? alert.bottleneckProb ?? null,
    impactScore: metrics?.impactScore ?? alert.impactScore ?? null,
    affectedCount: metrics?.affectedCount ?? alert.affectedTgCount ?? null,
    ctIncreaseMin: metrics?.ctIncreaseMin ?? null,
    atRiskLots: metrics?.atRiskLots ?? alert.affectedLotCount ?? null,
  };

  return Object.values(mapped).some((value) => value !== null) ? mapped : null;
}

function getAgentStepOrder(stepName: string): number {
  switch (stepName) {
    case 'DIFFUSION_ANALYSIS':
      return 1;
    case 'CAUSE_ANALYSIS':
      return 2;
    case 'ACTION_PLAN_GEN':
      return 3;
    case 'ACTION_PLAN_COMPARE':
      return 4;
    case 'HITL_WAITING':
      return 5;
    case 'REPORT_GEN':
    case 'PORT_GEN':
      return 6;
    default:
      return 0;
  }
}

export function mapProcessMap(processMap: DashboardProcessMapResponse): DashboardProcessAreaData[] {
  const areaGroups = new Map<string, DashboardProcessAreaData>();

  for (const area of processMap.areas) {
    for (const toolGroup of area.toolGroups) {
      const processCode = getMesSemiconductorProcessCode(area.areaCode, toolGroup.tgCode);
      const mappedToolGroup = mapProcessToolGroup(toolGroup);
      const current = areaGroups.get(processCode);

      if (!current) {
        areaGroups.set(processCode, createProcessAreaGroup(processCode, mappedToolGroup));
        continue;
      }

      current.totalTgCount += 1;
      current.toolGroups.push(mappedToolGroup);
      current.tgSummary[mappedToolGroup.riskGrade] = (current.tgSummary[mappedToolGroup.riskGrade] ?? 0) + 1;
      if (mappedToolGroup.riskGrade === 'CRITICAL' || mappedToolGroup.riskGrade === 'HIGH') {
        current.bottleneckTgCount += 1;
      }
    }
  }

  return [...areaGroups.values()].sort(
    (a, b) => getProcessAreaSortOrder(a.areaCode) - getProcessAreaSortOrder(b.areaCode)
  );
}

function createProcessAreaGroup(
  processCode: string,
  toolGroup: DashboardProcessToolGroupData
): DashboardProcessAreaData {
  const tgSummary = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<string, number>;
  tgSummary[toolGroup.riskGrade] = 1;

  return {
    areaId: processCode,
    areaCode: processCode,
    areaName: processCode,
    totalTgCount: 1,
    bottleneckTgCount: toolGroup.riskGrade === 'CRITICAL' || toolGroup.riskGrade === 'HIGH' ? 1 : 0,
    tgSummary,
    toolGroups: [toolGroup],
  };
}

function mapProcessToolGroup(toolGroup: DashboardProcessToolGroup): DashboardProcessToolGroupData {
  const utilizationRate = toolGroup.utilizationRate ?? 0;
  // 등급은 백엔드 ML 기반(riskScore) 등급을 그대로 사용. 가동률 폴백 폐기.
  const riskGrade = normalizeRiskGrade(toolGroup.riskGrade) ?? 'LOW';

  return {
    tgId: toolGroup.tgId,
    tgCode: toolGroup.tgCode,
    tgName: toolGroup.tgName,
    riskGrade,
    riskLevel: riskGradeToLevel(riskGrade),
    utilizationRate,
    bottleneckProb: toolGroup.bottleneckProb ?? 0,
    riskScore: toolGroup.riskScore,
    wipCount: toolGroup.wipCount ?? 0,
  };
}

function normalizeRiskGrade(riskGrade: string | null): string | null {
  if (!riskGrade) return null;
  const normalized = riskGrade.toUpperCase();
  return normalized === 'CRITICAL' || normalized === 'HIGH' || normalized === 'MEDIUM' || normalized === 'LOW'
    ? normalized
    : null;
}

export function mapTrends(trends: DashboardTrendsResponse): KpiTrendSeries[] {
  return (Object.keys(TREND_META) as DashboardTrendKey[]).flatMap((key) => {
    const points = (trends.series[key] ?? []).filter(
      (point): point is { measuredAt: string; value: number } => point.value !== null
    );
    if (points.length === 0) return [];

    const meta = TREND_META[key];

    return [
      {
        key,
        title: meta.title,
        subtitle: buildTrendSubtitle(trends.range, trends.intervalMin, key),
        values: points.map((point) => normalizeTrendValue(key, point.value)),
        colorToken: meta.colorToken,
        xLabels: points.map((point) => formatTrendLabel(point.measuredAt, trends.intervalMin)),
        valueFormat: meta.valueFormat,
      },
    ];
  });
}

function normalizeTrendValue(key: DashboardTrendKey, value: number): number {
  if (key === 'rtf') return Number((value * 100).toFixed(1));
  if (key === 'avgQtimeMin') return Number(minutesToDays(value).toFixed(2));
  return value;
}

function buildTrendSubtitle(range: string, intervalMin: number, key: DashboardTrendKey): string {
  const unit = key === 'rtf' ? '%' : key === 'avgQtimeMin' ? '일' : key === 'throughput24h' ? 'lots/24h' : '대기 Lot';
  return `최근 ${formatRangeLabel(range)} · ${formatIntervalLabel(intervalMin)} 단위 · ${unit}`;
}

function formatRangeLabel(range: string): string {
  if (range === '6h') return '6시간';
  if (range === '24h') return '24시간';
  if (range === '7d') return '7일';
  if (range === '30d') return '30일';
  if (range === '1h') return '1시간';
  if (range === 'custom') return '직접 설정';
  return range;
}

function formatIntervalLabel(intervalMin: number): string {
  if (intervalMin % 1440 === 0) return `${intervalMin / 1440}일`;
  if (intervalMin % 60 === 0) return `${intervalMin / 60}시간`;
  return `${intervalMin}분`;
}

function formatTrendLabel(value: string, intervalMin: number): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = SEOUL_TREND_LABEL_FORMATTER.formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';

  if (intervalMin >= 1440) {
    return `${getPart('month')}.${getPart('day')}`;
  }
  return `${getPart('hour')}:${getPart('minute')}`;
}

function minutesToHours(value: number): number {
  return Number((value / 60).toFixed(1));
}

function minutesToDays(value: number): number {
  return value / 60 / 24;
}

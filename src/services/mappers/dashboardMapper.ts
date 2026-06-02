import { TREND_META } from '@/constants/dashboard';
import { getMesSemiconductorProcessCode, getProcessAreaSortOrder } from '@/constants/processArea';
import { PROCESS_RISK_THRESHOLDS } from '@/constants/processRisk';
import type { RiskLevel } from '@/constants/riskLevel';

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
  return {
    caseId: alert.caseId,
    tgId: alert.tgId,
    tgName: alert.tgName,
    areaName: alert.areaName,
    riskGrade: alert.riskGrade,
    riskLevel: toRiskLevel(alert.riskGrade),
    bottleneckProb: alert.bottleneckProb ?? 0,
    estDelayHours: minutesToHours(alert.estimatedDelayMin ?? 0),
    affectedLotCount: alert.affectedLotCount ?? 0,
    mainCause: alert.mainCause ?? '원인 분석 대기',
    status: alert.status ?? '-',
    currentStepName: alert.currentStepName ?? '-',
    detectedAt: alert.detectedAt,
  };
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
  const riskGrade = normalizeRiskGrade(toolGroup.riskGrade) ?? getRiskGradeByUtilization(utilizationRate);

  return {
    tgId: toolGroup.tgId,
    tgCode: toolGroup.tgCode,
    tgName: toolGroup.tgName,
    riskGrade,
    riskLevel: toRiskLevel(riskGrade),
    utilizationRate,
    bottleneckProb: toolGroup.bottleneckProb ?? 0,
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

function getRiskGradeByUtilization(utilizationRate: number): string {
  if (utilizationRate >= PROCESS_RISK_THRESHOLDS.critical) return 'CRITICAL';
  if (utilizationRate >= PROCESS_RISK_THRESHOLDS.high) return 'HIGH';
  if (utilizationRate >= PROCESS_RISK_THRESHOLDS.medium) return 'MEDIUM';
  return 'LOW';
}

export function mapTrends(trends: DashboardTrendsResponse): KpiTrendSeries[] {
  return (Object.keys(TREND_META) as DashboardTrendKey[]).flatMap((key) => {
    const points = trends.series[key] ?? [];
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
        targetValue: meta.targetValue,
      },
    ];
  });
}

function toRiskLevel(riskGrade: string): RiskLevel {
  const normalized = riskGrade.toLowerCase();
  if (normalized === 'critical' || normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized;
  }
  return 'low';
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
  if (range === '24h') return '24시간';
  if (range === '7d') return '7일';
  if (range === '1h') return '1시간';
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

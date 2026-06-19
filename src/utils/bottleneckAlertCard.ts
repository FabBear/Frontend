import { BNC_STATUS_META, BNC_STEP_LABELS } from '@/constants/bnc';
import { formatAlertAreaDisplay } from '@/constants/processArea';

import type { BottleneckAlertItem } from '@/types/dashboard';

import { formatKoMonthDayTime, formatNumber, formatRatioPercent, formatRiskScore } from '@/utils/format';

type MetricTone = 'default' | 'risk' | 'muted';
type StatusVariant = 'success' | 'warning' | 'info' | 'danger';

interface BottleneckCaseMetric {
  label: string;
  value: string;
  unit?: string;
  tone?: MetricTone;
}

interface BottleneckStatusBadge {
  label: string;
  variant: StatusVariant;
}

const DASHBOARD_STEP_LABELS: Record<string, string> = {
  ...BNC_STEP_LABELS,
  DIFFUSION_ANALYSIS: '연쇄 영향 분석',
  CAUSE_ANALYSIS: '원인 분석',
  ACTION_PLAN_GEN: '대응안 생성',
  ACTION_PLAN_COMPARE: '대응안 비교',
  HITL_WAITING: 'HITL 승인',
  REPORT_GEN: '보고서 작성',
  PORT_GEN: '보고서 작성',
};

const DASHBOARD_STEP_PROGRESS: Record<string, number> = {
  BOTTLENECK_DETECTOR: 16,
  CASCADE_ANALYZER: 33,
  CAUSE_ANALYZER: 50,
  SOLUTION_GENERATOR: 66,
  COMPARE_AGENT: 83,
  REPORT_AGENT: 100,
  DIFFUSION_ANALYSIS: 33,
  CAUSE_ANALYSIS: 50,
  ACTION_PLAN_GEN: 66,
  ACTION_PLAN_COMPARE: 83,
  HITL_WAITING: 88,
  REPORT_GEN: 100,
  PORT_GEN: 100,
};

export function getBottleneckAlertTitle(alert: BottleneckAlertItem): string {
  return (alert.batchCriticalCount ?? 1) > 1
    ? `${alert.batchCriticalCount}개 TG`
    : alert.tgName;
}

export function getBottleneckAlertSubtitle(alert: BottleneckAlertItem): string {
  const time = formatKoMonthDayTime(alert.detectedAt);
  if ((alert.batchCriticalCount ?? 1) > 1) {
    return `${alert.batchCriticalCount}개 TG 동시 탐지 · ${time}`;
  }
  return `${formatAlertAreaDisplay(alert.areaName, alert.tgName)} · ${time}`;
}

export function getBottleneckAlertMetrics(alert: BottleneckAlertItem): BottleneckCaseMetric[] {
  return [
    { label: '위험 점수', value: formatRiskScore(alert.riskScore), tone: 'risk' },
    { label: '영향', value: formatAlertImpact(alert) },
    { label: '위험 Lot', value: formatNumber(alert.alertMetrics?.atRiskLots ?? null) },
  ];
}


function formatAlertImpact(alert: BottleneckAlertItem): string {
  if (alert.alertMetrics?.impactScore !== null && alert.alertMetrics?.impactScore !== undefined) {
    return formatRatioPercent(alert.alertMetrics.impactScore);
  }
  return `${formatNumber(alert.alertMetrics?.affectedCount ?? alert.affectedTgCount)}개`;
}

export function getBottleneckAlertStatusText(alert: BottleneckAlertItem): string {
  const stepName = normalizeText(alert.currentStepName);
  if (!stepName || stepName === '-') return '에이전트 분석 준비';
  return DASHBOARD_STEP_LABELS[stepName] ?? stepName;
}

export function getBottleneckAlertProgress(alert: BottleneckAlertItem): number | null {
  const stepName = normalizeText(alert.currentStepName);
  const status = normalizeText(alert.status);

  if (isResolvedStatus(status)) return 100;
  if (isUsableStepName(stepName) && DASHBOARD_STEP_PROGRESS[stepName] !== undefined) {
    return DASHBOARD_STEP_PROGRESS[stepName];
  }
  if (status === 'DETECTED') return 8;
  return null;
}

export function getBottleneckAlertStatusBadge(alert: BottleneckAlertItem): BottleneckStatusBadge {
  const status = normalizeText(alert.status);
  const stepName = normalizeText(alert.currentStepName);

  if (status === 'DETECTED') return BNC_STATUS_META.DETECTED;
  if (isResolvedStatus(status)) return BNC_STATUS_META.RESOLVED;
  if (status === 'AWAITING_HITL' || stepName === 'HITL_WAITING') return BNC_STATUS_META.AWAITING_HITL;
  if (isFailedStatus(status)) return { label: '확인 필요', variant: 'danger' };
  if (status === 'ANALYZING' || status === 'RUNNING' || status === 'IN_PROGRESS' || isUsableStepName(stepName)) {
    return BNC_STATUS_META.ANALYZING;
  }

  return BNC_STATUS_META.DETECTED;
}

function normalizeText(value: string | null | undefined): string {
  return value?.trim().toUpperCase() ?? '';
}

function isUsableStepName(stepName: string): boolean {
  return Boolean(stepName && stepName !== '-');
}

function isResolvedStatus(status: string): boolean {
  return status === 'RESOLVED' || status === 'NOT_ACTIONABLE' || status === 'SUCCEEDED' || status === 'COMPLETED' || status === 'DONE';
}

function isFailedStatus(status: string): boolean {
  return status === 'FAILED' || status === 'ERROR' || status === 'CANCELED';
}

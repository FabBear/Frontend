import type { ReportV1Kpi, ReportV1KpiImpact } from '@/types/report';

import type {
  ReportV1CandidateDisplay,
  ReportV1ForecastMetric,
  ReportV1TrendSeries,
} from '@/utils/reportV1DisplayAdapter';

export type ReportV1DeltaTone = 'good' | 'bad' | 'flat';

export function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString('ko-KR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: Number.isInteger(value) ? 0 : Math.min(digits, 1),
  });
}

export function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%`;
}

export function formatPctPoint(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value * 100, 1)}%p`;
}

export function isRatioPercentKey(key: string): boolean {
  return key.includes('util') || key.includes('available') || key === 'max_util';
}

export function formatValue(key: string, unit: string | undefined, value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (key === 'risk_score') return formatNumber(value, 1);
  if (unit === 'min' || key.includes('time')) return `${formatNumber(value, 1)}분`;
  if (unit === 'lots' || key === 'wip') return `${formatNumber(value, 0)} Lot`;
  if (isRatioPercentKey(key)) return formatPercent(value);
  return formatNumber(value, 2);
}

export function formatKpiValue(kpi: ReportV1Kpi): string {
  return formatValue(kpi.key, kpi.unit, kpi.value);
}

export function formatKpiDelta(kpi: ReportV1Kpi): string {
  if (kpi.delta === null) return '비교 기준 없음';
  if (kpi.unit === 'min') return `${kpi.delta > 0 ? '+' : ''}${formatNumber(kpi.delta, 1)}분`;
  if (kpi.unit === 'lots') return `${kpi.delta > 0 ? '+' : ''}${formatNumber(kpi.delta, 0)} Lot`;
  if (isRatioPercentKey(kpi.key)) return formatPctPoint(kpi.delta);
  return `${kpi.delta > 0 ? '+' : ''}${formatNumber(kpi.delta, 2)}`;
}

export function isBadWhenIncreased(key: string): boolean {
  return ['risk_score', 'q_time_min', 'wait_ratio', 'wip', 'utilization_avg', 'max_util'].includes(key);
}

export function deltaTone(key: string, delta: number | null | undefined): ReportV1DeltaTone {
  if (!delta) return 'flat';
  if (isBadWhenIncreased(key)) return delta < 0 ? 'good' : 'bad';
  return delta > 0 ? 'good' : 'bad';
}

export function kpiTone(kpi: ReportV1Kpi): string {
  if (kpi.threshold_state === 'danger') return 'danger';
  if (deltaTone(kpi.key, kpi.delta) === 'bad') return 'warning';
  return 'neutral';
}

export function formatForecastDelta(metric: ReportV1ForecastMetric): string {
  const sign = metric.delta > 0 ? '+' : '';
  if (metric.unit === 'min') return `${sign}${formatNumber(metric.delta, 1)}분`;
  if (metric.unit === 'lots') return `${sign}${formatNumber(metric.delta, 0)} Lot`;
  if (isRatioPercentKey(metric.key)) return formatPctPoint(metric.delta);
  return `${sign}${formatNumber(metric.delta, 2)}`;
}

export function barWidth(value: number, maxValue: number): string {
  const pct = Math.min(100, Math.max(4, (Math.abs(value) / Math.max(Math.abs(maxValue), 1)) * 100));
  return `${pct}%`;
}

export function formatTrendSlope(series: ReportV1TrendSeries): string {
  const sign = series.slopePerHour > 0 ? '+' : '';
  if (series.key.includes('util')) return `${sign}${formatNumber(series.slopePerHour * 100, 2)}%p/h`;
  if (series.key === 'wip') return `${sign}${formatNumber(series.slopePerHour, 1)} Lot/h`;
  return `${sign}${formatNumber(series.slopePerHour, 2)}/h`;
}

export function cleanStepText(text: string): string {
  return text.replace(/^\d+\)\s*/, '');
}

export function monitoringTargetText(item: { kpi: string; target: number | string | null; unit: string }): string {
  if (item.target === null) return '';
  if (typeof item.target === 'string') return item.target;
  return `목표 ${formatValue(item.kpi, item.unit, item.target)}`;
}

export function visibleImpacts(candidate: ReportV1CandidateDisplay): ReportV1KpiImpact[] {
  return candidate.kpiImpacts.filter((impact) => impact.verdict !== 'baseline').slice(0, 5);
}

export function impactDeltaText(impact: ReportV1KpiImpact): string {
  const sign = impact.delta > 0 ? '+' : '';
  if (impact.unit === 'min') return `${sign}${formatNumber(impact.delta, 1)}분`;
  if (impact.unit === 'lots') return `${sign}${formatNumber(impact.delta, 0)} Lot`;
  if (isRatioPercentKey(impact.kpi)) return formatPctPoint(impact.delta);
  return `${sign}${formatNumber(impact.delta, 2)}`;
}

export function evidenceStrengthLabel(strength: string | undefined): string {
  const map: Record<string, string> = { strong: '근거 강함', moderate: '근거 보통', weak: '근거 약함' };
  return strength ? (map[strength] ?? strength) : '-';
}

export function riskLevelLabel(risk: string | undefined): string {
  const map: Record<string, string> = { high: '위험 높음', medium: '위험 중간', low: '위험 낮음' };
  return risk ? (map[risk] ?? risk) : '-';
}

export function evidenceClass(value: string | undefined): string {
  if (value === 'strong' || value === 'low') return 'report-v1__pill--success';
  if (value === 'moderate' || value === 'medium') return 'report-v1__pill--warning';
  return 'report-v1__pill--info';
}

export function ragScoreVariant(score: number | undefined): 'success' | 'warning' | 'info' {
  if (!score) return 'info';
  if (score >= 0.9) return 'success';
  if (score >= 0.7) return 'warning';
  return 'info';
}

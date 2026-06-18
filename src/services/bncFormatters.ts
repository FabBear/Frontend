/**
 * BNC(병목 대응) 표시용 순수 포맷터 — 숫자/라벨 변환만 담당.
 * (bncService.ts에서 분리: 매핑 로직과 표시 포맷 책임 분리)
 */

const FEATURE_LABELS: Record<string, string> = {
  wip_count: 'WIP',
  waiting_lots: '대기 Lot',
  util_rate: '가동률',
  utilization_rate: '가동률',
  queue_time: '대기 시간',
  setup_ratio: 'Setup 비율',
  avg_wait_day: '평균 대기일',
  avg_delay_day: '평균 지연일',
  throughput: '처리량',
  delivery_compliance: '납기 준수율',
};

export function toNumber(value: number | null | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return value.toLocaleString('ko-KR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function formatDelta(value: number | null | undefined, suffix = '', digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value, digits)}${suffix}`;
}

export function formatMetricValue(value: number | null | undefined, suffix = '', digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${formatNumber(value, digits)}${suffix}`;
}

export function addNullable(base: number | null | undefined, delta: number | null | undefined): number | null {
  if (base === null || base === undefined || delta === null || delta === undefined) return null;
  return base + delta;
}

export function featureLabel(feature: string): string {
  return FEATURE_LABELS[feature] ?? feature.replaceAll('_', ' ');
}

const ACTION_LABELS = ['conservative', 'standard', 'aggressive'] as const;

export function actionLabelFromIndex(index: number): string {
  return ACTION_LABELS[index] ?? `option-${index + 1}`;
}

export function extractActionLabel(label: string): string {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return label;
  if (normalized.includes('standard') || normalized.includes('표준')) return 'standard';
  if (normalized.includes('conservative') || normalized.includes('보수')) return 'conservative';
  if (normalized.includes('aggressive') || normalized.includes('강화') || normalized.includes('공격')) {
    return 'aggressive';
  }

  const alphaLabel = normalized.match(/\b([abc])\b/)?.[1];
  if (alphaLabel) return actionLabelFromIndex(alphaLabel.charCodeAt(0) - 'a'.charCodeAt(0));

  return normalized;
}

export function normalizeActionLabelRecord(
  record: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!record) return undefined;
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [extractActionLabel(key), value]));
}

export function formatNeutralDelta(value: number | null | undefined, suffix = '', digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (value === 0) return `0${suffix}`;
  return formatDelta(value, suffix, digits);
}

export function formatDecisionStatus(status: string): string {
  const labels: Record<string, string> = {
    clear_winner: '명확한 추천안',
    equivalent_candidates: '동등 후보',
    no_meaningful_effect: '유의미한 개선 없음',
    approved: '승인',
    rejected: '반려',
  };
  return labels[status] ?? status.replaceAll('_', ' ');
}

export function formatScope(scope: string | null | undefined): string {
  const labels: Record<string, string> = {
    fab_wide: 'FAB 전체',
    tool_group: 'Tool Group',
  };
  return scope ? (labels[scope] ?? scope) : '-';
}

export function formatReversibility(reversibility: string | null | undefined): string {
  const labels: Record<string, string> = {
    low: '낮음',
    medium: '보통',
    high: '높음',
  };
  return reversibility ? (labels[reversibility] ?? reversibility) : '-';
}

export function isPercentRatioKpi(key: string): boolean {
  return key === 'utilization_avg' || key === 'available_tool_ratio';
}

export function formatCompareV2Value(key: string, value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (key === 'q_time_min') return `${formatNumber(value, 1)}분`;
  if (key === 'wip') return `${formatNumber(value, 0)} Lot`;
  if (isPercentRatioKpi(key)) return `${formatNumber(value * 100, 1)}%`;
  return formatNumber(value, key === 'wait_ratio' || key === 'risk_score' ? 2 : 1);
}

export function formatCompareV2Delta(key: string, value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (key === 'q_time_min') return formatDelta(value, '분', 1);
  if (key === 'wip') return formatDelta(value, ' Lot', 0);
  if (isPercentRatioKpi(key)) return formatDelta(value * 100, '%p', 1);
  return formatDelta(value, '', key === 'wait_ratio' || key === 'risk_score' ? 2 : 1);
}

export function formatCompareParamLine(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === false) return null;
  const labels: Record<string, string> = {
    release_interval_minutes: 'Release Interval',
    current_interval_minutes: '현재 Release Interval',
    release_interval_delta_min: 'Release Interval 변경폭',
    lot_priority_rule: '투입 우선순위',
    superhotlot_enable: 'SUPERHOTLOT',
  };
  const label = labels[key] ?? key.replaceAll('_', ' ');
  if (typeof value === 'number') return `${label} ${formatNumber(value, 1)}분`;
  if (typeof value === 'boolean') return `${label} ${value ? '활성화' : '비활성화'}`;
  return `${label} ${String(value)}`;
}

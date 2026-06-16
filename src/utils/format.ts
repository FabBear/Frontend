export type MetricValueFormat = 'percent' | 'integer' | 'decimal';

const KO_NUMBER_FORMATTER = new Intl.NumberFormat('ko-KR');
const KO_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const KO_MONTH_DAY_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatNumber(value: number | null): string {
  if (value === null) return '-';
  return KO_NUMBER_FORMATTER.format(value);
}

// 0-1 소수 입력 (utilizationRate, setupRatio 등 API 반환값)
export function formatRatioPercent(value: number | null): string {
  if (value === null) return '-';
  return `${(value * 100).toFixed(1)}%`;
}

// 병목 위험 점수: 0-1 입력 → 0-100 정수 점수(% 아님). composite(검출) or 0.5*확률(그 외).
export function formatRiskScore(value: number | null): string {
  if (value === null) return '-';
  return `${Math.round(value * 100)}`;
}

// ECharts 등 숫자가 필요한 곳에서 사용 (문자열 퍼센트 대신)
export function toRatioPercentNumber(value: number): number {
  return Number((value * 100).toFixed(1));
}

// 0-100 퍼센트 포인트 입력 (API가 이미 % 단위로 반환하는 경우)
export function formatPercentPoint(value: number | null): string {
  if (value === null) return '-';
  return `${value.toFixed(1)}%`;
}

export function formatQtimeDays(value: number | null): string {
  if (value === null) return '-';
  if (value < 60) return `${Math.round(value)}분`;
  if (value < 60 * 24) return `${(value / 60).toFixed(1)}시간`;
  return `${(value / 60 / 24).toFixed(1)}일`;
}

export function formatMetricValue(value: number, valueFormat: MetricValueFormat): string {
  if (valueFormat === 'percent') {
    return `${value.toFixed(1)}%`;
  }

  if (valueFormat === 'decimal') {
    return value.toFixed(2);
  }

  return formatNumber(value);
}

export function formatKoTime(dateTime: string): string {
  return KO_TIME_FORMATTER.format(new Date(dateTime));
}

export function formatKoMonthDayTime(dateTime: string): string {
  const parts = KO_MONTH_DAY_TIME_FORMATTER.formatToParts(new Date(dateTime));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';

  return `${value('month')}.${value('day')} ${value('hour')}:${value('minute')}`;
}

export function formatMesDispatchAt(value?: string | null): string {
  const normalizedValue = value?.trim();
  if (!normalizedValue) return '-';

  if (normalizedValue.startsWith('Day')) {
    return normalizedValue;
  }

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return normalizedValue;
  }

  return formatKoTime(normalizedValue);
}

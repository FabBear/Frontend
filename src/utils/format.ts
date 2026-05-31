export type MetricValueFormat = 'percent' | 'integer' | 'decimal';

const KO_NUMBER_FORMATTER = new Intl.NumberFormat('ko-KR');
const KO_TIME_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

export function formatNumber(value: number): string {
  return KO_NUMBER_FORMATTER.format(value);
}

// 0-1 소수 입력 (utilizationRate, setupRatio, waitRatio 등 API 반환값)
export function formatRatioPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ECharts 등 숫자가 필요한 곳에서 사용 (문자열 퍼센트 대신)
export function toRatioPercentNumber(value: number): number {
  return Number((value * 100).toFixed(1));
}

// 0-100 퍼센트 포인트 입력 (API가 이미 % 단위로 반환하는 경우)
export function formatPercentPoint(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatQtimeDays(value: number | null): string {
  return value === null ? '-' : `${(value / 60 / 24).toFixed(1)}일`;
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

export function formatMesDispatchAt(value?: string | null): string {
  const normalizedValue = value?.trim();
  if (!normalizedValue) return '-';

  const date = new Date(normalizedValue);

  if (normalizedValue.startsWith('Day') || Number.isNaN(date.getTime())) {
    return normalizedValue;
  }

  return formatKoTime(normalizedValue);
}

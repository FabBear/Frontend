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

export function formatRatioPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
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

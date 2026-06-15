import type { ReportV1TrendSeries } from '@/utils/reportV1DisplayAdapter';

const CHART_WIDTH = 720;
const CHART_HEIGHT = 240;
const PAD_X = 34;
const PAD_Y = 26;

export function trendClass(key: string): string {
  if (key === 'q_time_min') return 'report-v1__trend-line--qtime';
  if (key === 'wip') return 'report-v1__trend-line--wip';
  return 'report-v1__trend-line--util';
}

export function trendPath(series: ReportV1TrendSeries): string {
  const values = series.values;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const plotW = CHART_WIDTH - PAD_X * 2;
  const plotH = CHART_HEIGHT - PAD_Y * 2;

  return values
    .map((value, index) => {
      const x = PAD_X + (values.length <= 1 ? plotW / 2 : (plotW * index) / (values.length - 1));
      const y = PAD_Y + plotH - ((value - min) / range) * plotH;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export function trendX(series: ReportV1TrendSeries, index: number): number {
  const plotW = CHART_WIDTH - PAD_X * 2;
  return PAD_X + (series.values.length <= 1 ? plotW / 2 : (plotW * index) / (series.values.length - 1));
}

export function trendY(series: ReportV1TrendSeries, value: number): number {
  const min = Math.min(...series.values);
  const max = Math.max(...series.values);
  const range = max - min || 1;
  const plotH = CHART_HEIGHT - PAD_Y * 2;
  return PAD_Y + plotH - ((value - min) / range) * plotH;
}

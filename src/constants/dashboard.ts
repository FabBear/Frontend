import type { DashboardTrendKey } from '@/types/dashboardApi';

export const DASHBOARD_POLL_INTERVAL_MS = 30_000;

export const DASHBOARD_ALERTS_PAGE_SIZE = 3;

export const DASHBOARD_TRENDS_HOURLY_RANGE = '24h';
export const DASHBOARD_TRENDS_DAILY_RANGE = '7d';

export const DASHBOARD_TRENDS_HOURLY_KEYS: DashboardTrendKey[] = ['rtf', 'avgQtimeMin', 'wip'];
export const DASHBOARD_TRENDS_DAILY_KEYS: DashboardTrendKey[] = ['throughput24h'];

export const TREND_META: Record<
  DashboardTrendKey,
  { title: string; colorToken: string; valueFormat: 'percent' | 'integer' | 'decimal' }
> = {
  rtf: {
    title: 'RTF 추이',
    colorToken: '--color-risk-medium',
    valueFormat: 'percent',
  },
  throughput24h: {
    title: 'Throughput 추이',
    colorToken: '--color-action-primary',
    valueFormat: 'integer',
  },
  avgQtimeMin: {
    title: '평균 Q-time 추이',
    colorToken: '--color-risk-critical',
    valueFormat: 'decimal',
  },
  wip: {
    title: 'WIP 추이',
    colorToken: '--color-status-info',
    valueFormat: 'integer',
  },
};

import { KPI_TARGETS } from '@/constants/kpiTargets';

import type { DashboardTrendKey } from '@/types/dashboardApi';

export const DASHBOARD_POLL_INTERVAL_MS = 30_000;

export const DASHBOARD_ALERTS_PAGE_SIZE = 3;

export const DASHBOARD_TRENDS_HOURLY_RANGE = '24h';
export const DASHBOARD_TRENDS_DAILY_RANGE = '7d';

export const DASHBOARD_TRENDS_HOURLY_KEYS: DashboardTrendKey[] = ['rtf', 'avgQtimeMin', 'wip'];
export const DASHBOARD_TRENDS_DAILY_KEYS: DashboardTrendKey[] = ['throughput24h'];

export const TREND_META: Record<
  DashboardTrendKey,
  { title: string; colorToken: string; valueFormat: 'percent' | 'integer' | 'decimal'; targetValue?: number }
> = {
  rtf: {
    title: 'RTF 추이',
    colorToken: '--color-risk-medium',
    valueFormat: 'percent',
    targetValue: KPI_TARGETS.rtf * 100,
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
    targetValue: KPI_TARGETS.qtimeDays,
  },
  wip: {
    title: 'WIP 추이',
    colorToken: '--color-status-info',
    valueFormat: 'integer',
    targetValue: KPI_TARGETS.wipCount,
  },
};

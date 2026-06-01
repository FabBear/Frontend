import type { MesRiskGrade, MesTabOption, MesToolStatus } from '@/types/mes';

export const MES_TABS: MesTabOption[] = [
  { value: 'all', label: '공정 전체' },
  { value: 'process', label: '공정별' },
  { value: 'toolGroup', label: 'TG / Tool' },
];

export const MES_RISK_FILTERS: { value: MesRiskGrade | 'ALL'; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

export const MES_DAYS = ['Day 0', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25'];
export const MES_QTIME_TARGET_DAYS = 10;
export const MES_QUALITY_FACTOR = 0.995;

export const MES_TOOL_STATUS_META: Record<MesToolStatus, { label: string; color: string; background: string }> = {
  RUN: {
    label: '가동',
    color: 'var(--color-status-success)',
    background: 'var(--color-status-success-soft)',
  },
  IDLE: {
    label: '대기',
    color: 'var(--color-status-warning)',
    background: 'var(--color-status-warning-soft)',
  },
  SETUP: {
    label: '셋업',
    color: 'var(--color-status-info)',
    background: 'var(--color-action-primary-soft)',
  },
  DOWN: {
    label: '정비',
    color: 'var(--color-status-danger)',
    background: 'var(--color-bg-surface)',
  },
};

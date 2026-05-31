import type { RiskLevel } from '@/constants/riskLevel';

import type { ProcessAreaData, ProcessToolGroup } from '@/types/dashboard';

export type ProcessRiskGrade = 'dc' | 'dr' | 'dy' | 'dg';

export const PROCESS_RISK_GRADES: ProcessRiskGrade[] = ['dc', 'dr', 'dy', 'dg'];

export const PROCESS_RISK_THRESHOLDS = {
  critical: 0.9,
  high: 0.85,
  medium: 0.7,
} as const;

export const PROCESS_RISK_META: Record<
  ProcessRiskGrade,
  { label: string; color: string; borderColor: string; bg: string }
> = {
  dc: {
    label: 'Critical',
    color: 'var(--color-risk-critical)',
    borderColor: 'color-mix(in srgb, var(--color-risk-critical) 80%, transparent)',
    bg: 'color-mix(in srgb, var(--color-risk-critical) 12%, transparent)',
  },
  dr: {
    label: 'High',
    color: 'var(--color-risk-high)',
    borderColor: 'color-mix(in srgb, var(--color-risk-high) 60%, transparent)',
    bg: 'color-mix(in srgb, var(--color-risk-high) 12%, transparent)',
  },
  dy: {
    label: 'Medium',
    color: 'var(--color-risk-medium)',
    borderColor: 'color-mix(in srgb, var(--color-risk-medium) 55%, transparent)',
    bg: 'color-mix(in srgb, var(--color-risk-medium) 10%, transparent)',
  },
  dg: {
    label: 'Low',
    color: 'var(--color-risk-low)',
    borderColor: 'color-mix(in srgb, var(--color-risk-low) 40%, transparent)',
    bg: 'color-mix(in srgb, var(--color-risk-low) 8%, transparent)',
  },
};

export function getProcessRiskGrade(utilizationRate: number): ProcessRiskGrade {
  if (utilizationRate >= PROCESS_RISK_THRESHOLDS.critical) return 'dc';
  if (utilizationRate >= PROCESS_RISK_THRESHOLDS.high) return 'dr';
  if (utilizationRate >= PROCESS_RISK_THRESHOLDS.medium) return 'dy';
  return 'dg';
}

export function getRiskLevelByUtilization(utilizationRate: number): RiskLevel {
  if (utilizationRate >= PROCESS_RISK_THRESHOLDS.critical) return 'critical';
  if (utilizationRate >= PROCESS_RISK_THRESHOLDS.high) return 'high';
  if (utilizationRate >= PROCESS_RISK_THRESHOLDS.medium) return 'medium';
  return 'low';
}

export function isBottleneckUtilization(utilizationRate: number): boolean {
  return utilizationRate >= PROCESS_RISK_THRESHOLDS.high;
}

export function getAreaToolGroups(area: ProcessAreaData): ProcessToolGroup[] {
  return [...area.gFE, ...area.gBE];
}

export function getAreaMaxUtilization(area: ProcessAreaData): number {
  const toolGroups = getAreaToolGroups(area);
  return toolGroups.length ? Math.max(...toolGroups.map((toolGroup) => toolGroup.util)) : 0;
}

export function getAreaBottleneckCount(area: ProcessAreaData): number {
  return getAreaToolGroups(area).filter((toolGroup) => isBottleneckUtilization(toolGroup.util)).length;
}

export function getAreaToolGroupCount(area: ProcessAreaData): number {
  return area.gFE.length + area.gBE.length;
}

export function getProcessAreaCode(areaName: string): string {
  return areaName.toUpperCase().replaceAll('/', '_');
}

export function getProcessStepTone(utilizationRate: number) {
  const grade = getProcessRiskGrade(utilizationRate);
  const meta = PROCESS_RISK_META[grade];
  const borderWidth = isBottleneckUtilization(utilizationRate)
    ? 'var(--border-width-thick)'
    : 'var(--border-width-default)';

  return {
    background: meta.bg,
    border: `${borderWidth} solid ${meta.borderColor}`,
    color: meta.color,
  };
}

export function getProcessFilterButtonStyle(grade: ProcessRiskGrade, active: boolean) {
  const meta = PROCESS_RISK_META[grade];
  return active
    ? { borderColor: meta.borderColor, background: meta.bg, color: meta.color }
    : { borderColor: meta.borderColor, background: 'transparent', color: 'var(--color-fg-muted)' };
}

export const RISK_LEVELS = ['critical', 'high', 'medium', 'low'] as const;

export type RiskLevel = (typeof RISK_LEVELS)[number];

export function riskGradeToLevel(grade: string): RiskLevel {
  const lower = grade.toLowerCase();
  return lower === 'critical' || lower === 'high' || lower === 'medium' || lower === 'low' ? lower : 'low';
}

export interface RiskLevelMeta {
  label: string;
  description: string;
  color: string;
  background: string;
  sortOrder: number;
}

export const RISK_LEVEL_META: Record<RiskLevel, RiskLevelMeta> = {
  critical: {
    label: 'Critical',
    description: '즉시 대응 필요',
    color: 'var(--color-risk-critical)',
    background: 'var(--color-risk-critical-soft)',
    sortOrder: 1,
  },
  high: {
    label: 'High',
    description: '위험',
    color: 'var(--color-risk-high)',
    background: 'var(--color-risk-high-soft)',
    sortOrder: 2,
  },
  medium: {
    label: 'Medium',
    description: '주의',
    color: 'var(--color-risk-medium)',
    background: 'var(--color-risk-medium-soft)',
    sortOrder: 3,
  },
  low: {
    label: 'Low',
    description: '정상',
    color: 'var(--color-risk-low)',
    background: 'var(--color-risk-low-soft)',
    sortOrder: 4,
  },
};

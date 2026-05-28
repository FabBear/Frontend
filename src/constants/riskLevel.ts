export const RISK_LEVELS = ['critical', 'high', 'medium', 'low'] as const;

export type RiskLevel = (typeof RISK_LEVELS)[number];

export interface RiskLevelMeta {
  label: string;
  color: string;
  sortOrder: number;
}

export const RISK_LEVEL_META: Record<RiskLevel, RiskLevelMeta> = {
  critical: {
    label: 'Critical',
    color: 'var(--color-risk-critical)',
    sortOrder: 1,
  },
  high: {
    label: 'High',
    color: 'var(--color-risk-high)',
    sortOrder: 2,
  },
  medium: {
    label: 'Medium',
    color: 'var(--color-risk-medium)',
    sortOrder: 3,
  },
  low: {
    label: 'Low',
    color: 'var(--color-risk-low)',
    sortOrder: 4,
  },
};

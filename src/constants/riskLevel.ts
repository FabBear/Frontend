export const RISK_LEVELS = ['critical', 'high', 'medium', 'low'] as const;

export type RiskLevel = (typeof RISK_LEVELS)[number];

// grade는 타입상 string이지만 런타임에는 null/undefined가 올 수 있다(병목 스냅샷 없는 TG 등).
// null을 toLowerCase하면 화면 렌더가 통째로 깨지므로 안전하게 'low'로 폴백한다.
export function riskGradeToLevel(grade: string | null | undefined): RiskLevel {
  if (!grade) return 'low';
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

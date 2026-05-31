import { MES_QUALITY_FACTOR } from '@/constants/mes';
import { RISK_LEVEL_META, type RiskLevel } from '@/constants/riskLevel';

export function calculateMesOeeEstimate(utilizationRate: number, setupRatio: number): number {
  return utilizationRate * Math.max(1 - setupRatio, 0.7) * MES_QUALITY_FACTOR;
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getMesUtilizationRiskLevel(utilizationRate: number): RiskLevel {
  if (utilizationRate >= 0.9) return 'critical';
  if (utilizationRate >= 0.85) return 'high';
  if (utilizationRate >= 0.7) return 'medium';
  return 'low';
}

export function getMesUtilizationColor(utilizationRate: number): string {
  return RISK_LEVEL_META[getMesUtilizationRiskLevel(utilizationRate)].color;
}

export function getMesQtimeColor(avgQtimeMin: number | null): string {
  if (avgQtimeMin === null) return 'var(--color-fg-muted)';

  const days = avgQtimeMin / 60 / 24;
  if (days > 10) return 'var(--color-status-danger)';
  if (days > 5) return 'var(--color-status-warning)';
  return 'var(--color-status-success)';
}

export function getMesQueueColor(queueLotCount: number): string {
  return queueLotCount > 0 ? 'var(--color-status-warning)' : 'var(--color-fg-strong)';
}

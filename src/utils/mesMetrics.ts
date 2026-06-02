import { MES_QUALITY_FACTOR } from '@/constants/mes';
import { PROCESS_RISK_THRESHOLDS } from '@/constants/processRisk';
import { RISK_LEVEL_META, type RiskLevel } from '@/constants/riskLevel';

import type { MesToolMetric, MesToolStatusSummary } from '@/types/mes';

export function calculateMesOeeEstimate(utilizationRate: number, setupRatio: number): number {
  return utilizationRate * Math.max(1 - setupRatio, 0.7) * MES_QUALITY_FACTOR;
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getMesUtilizationRiskLevel(utilizationRate: number): RiskLevel {
  if (utilizationRate >= PROCESS_RISK_THRESHOLDS.critical) return 'critical';
  if (utilizationRate >= PROCESS_RISK_THRESHOLDS.high) return 'high';
  if (utilizationRate >= PROCESS_RISK_THRESHOLDS.medium) return 'medium';
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

export function createMesToolStatusSummary(tools: MesToolMetric[]): MesToolStatusSummary {
  return tools.reduce<MesToolStatusSummary>(
    (summary, tool) => {
      summary[tool.status] += 1;
      return summary;
    },
    { RUN: 0, IDLE: 0, SETUP: 0, DOWN: 0 }
  );
}

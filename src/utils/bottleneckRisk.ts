import { RISK_LEVEL_META } from '@/constants/riskLevel';

import type { BottleneckToolGroupItem } from '@/types/bottleneckMonitoring';

export function getBottleneckRiskSortValue(toolGroup: Pick<BottleneckToolGroupItem, 'riskScore'>): number {
  return toolGroup.riskScore ?? 0;
}

export function compareBottleneckRisk(
  a: Pick<BottleneckToolGroupItem, 'riskGrade' | 'riskScore' | 'utilizationRate' | 'tgName'>,
  b: Pick<BottleneckToolGroupItem, 'riskGrade' | 'riskScore' | 'utilizationRate' | 'tgName'>
): number {
  const scoreDiff = getBottleneckRiskSortValue(b) - getBottleneckRiskSortValue(a);
  if (scoreDiff !== 0) return scoreDiff;

  const riskDiff =
    RISK_LEVEL_META[a.riskGrade.toLowerCase() as keyof typeof RISK_LEVEL_META].sortOrder -
    RISK_LEVEL_META[b.riskGrade.toLowerCase() as keyof typeof RISK_LEVEL_META].sortOrder;
  if (riskDiff !== 0) return riskDiff;

  return b.utilizationRate - a.utilizationRate || a.tgName.localeCompare(b.tgName);
}

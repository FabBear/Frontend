/**
 * 대응안 카드의 KPI 행/델타 표시용 순수 헬퍼.
 * `isNeutralImpact`는 부모(BncSolutionsTab)와 카드(BncSolutionsCompareCards)가 공유한다.
 */
import type { BncActionPlan } from '@/types/bnc';

export function parseDelta(delta: string): number | null {
  const match = delta.replaceAll(',', '').match(/[+-]?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

// 기준선 대비 변화 = 0 / "변화 없음" 인지
export function isFlatDelta(delta: string | null | undefined): boolean {
  if (!delta) return true;
  if (delta.includes('변화 없음') || delta.includes('변동 없음')) return true;
  return parseDelta(delta) === 0;
}

// 값이 클수록 개선인 지표(처리량·가용 Tool 비율·납기 준수 등) → 증가가 개선
const HIGHER_IS_BETTER_TOKENS = ['throughput', 'available', '처리', '가용', '납기'];

export function isImprovement(label: string, delta: string): boolean | null {
  if (!delta || delta === '-') return null;
  const numericDelta = parseDelta(delta);
  if (numericDelta === null || numericDelta === 0) return null;
  const lowerLabel = label.toLowerCase();
  if (HIGHER_IS_BETTER_TOKENS.some((token) => lowerLabel.includes(token))) return numericDelta > 0;
  return numericDelta < 0;
}

export function deltaArrow(delta: string): string {
  const n = parseDelta(delta);
  if (n === null || n === 0) return '';
  return n > 0 ? '▲' : '▼';
}

// compare 데이터는 절대값이 없어 after==delta로 중복될 수 있음 → 의미 있는 절대값일 때만 결과값 표시
export function showMetricAfter(metric: { after: string; delta: string }): boolean {
  return /\d/.test(metric.after) && metric.after !== metric.delta;
}

export function targetGroupCount(plan: BncActionPlan): number {
  return plan.targetToolGroups?.length ?? 0;
}

export function isNeutralImpact(plan: BncActionPlan): boolean {
  if (plan.impactTone === 'neutral') return true;
  return plan.metrics.length > 0 && plan.metrics.every((metric) => parseDelta(metric.delta) === 0);
}

export function cardMainChange(plan: BncActionPlan): string {
  return plan.operationItems?.[0] ?? plan.summary;
}

// 카드에 노출할 KPI 행 — 종합 점수는 상세 '점수 분해'에서 다루므로 제외
export function kpiCardMetrics(plan: BncActionPlan) {
  return (plan.metrics ?? []).filter((metric) => !metric.label.includes('종합'));
}

export function planLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

export function planDisplayLabel(plan: BncActionPlan, index: number): string {
  return plan.actionLabel ?? planLabel(index);
}

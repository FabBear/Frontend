/**
 * RAG 유사사례 / 근거 강도 / 위험도 표시용 순수 헬퍼.
 * BncSolutionsRagEvidence.vue · BncSolutionsCompareCards.vue가 공유한다.
 */

type BadgeVariant = 'success' | 'warning' | 'info';

export function ragScoreVariant(score: number | undefined): BadgeVariant {
  if (!score) return 'info';
  if (score >= 0.9) return 'success';
  if (score >= 0.7) return 'warning';
  return 'info';
}

export function evidenceStrengthLabel(strength: string | undefined): string {
  const map: Record<string, string> = { strong: '근거 강함', moderate: '근거 보통', weak: '근거 약함' };
  return strength ? (map[strength] ?? strength) : '-';
}

export function evidenceStrengthVariant(strength: string | undefined): BadgeVariant {
  if (strength === 'strong') return 'success';
  if (strength === 'moderate') return 'warning';
  return 'info';
}

export function riskLevelLabel(risk: string | undefined): string {
  const map: Record<string, string> = { high: '위험 높음', medium: '위험 중간', low: '위험 낮음' };
  return risk ? (map[risk] ?? risk) : '-';
}

export function riskLevelVariant(risk: string | undefined): 'danger' | 'warning' | 'info' {
  if (risk === 'high') return 'danger';
  if (risk === 'medium') return 'warning';
  return 'info';
}

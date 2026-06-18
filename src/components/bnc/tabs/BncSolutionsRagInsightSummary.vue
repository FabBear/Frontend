<script setup lang="ts">
import type { BncActionPlan, BncRagEvidence } from '@/types/bnc';

import BaseBadge from '@/components/base/BaseBadge.vue';

defineProps<{
  plans: BncActionPlan[];
  ragEvidence: BncRagEvidence | null | undefined;
}>();

const fallbackEvidenceItems = [
  {
    label: 'conservative',
    effect: '효과 보통',
    risk: '리스크 낮음',
    paragraphs: [
      '현재 후보는 Release Interval을 소폭 조정하고 우선순위 개입을 사용하지 않는 방식이다.',
      '과거 유사 사례에서 WIP와 대기 악화를 일부 완화했지만, 병목 회복 폭은 제한적이었다.',
      '따라서 운영 부담을 최소화해야 하는 상황에서는 적합하지만, 빠른 병목 해소가 필요한 경우에는 효과가 부족할 수 있다.',
    ],
    source: 'DE_FE_1 conservative 대응 합성 사례',
  },
  {
    label: 'standard',
    effect: '효과 보통 이상',
    risk: '리스크 낮음',
    paragraphs: [
      '현재 후보는 Release Interval 조정과 제한적 우선순위 상향을 함께 적용하는 방식이다.',
      '과거 유사 사례에서 WIP와 대기 시간이 함께 감소한 근거가 확인되었고, 뚜렷한 운영 부작용은 관측되지 않았다.',
      '따라서 개선 효과와 실행 안정성의 균형이 가장 좋은 대응안으로 판단된다.',
    ],
    source: 'DE_FE_1 standard 대응 합성 사례',
  },
  {
    label: 'aggressive',
    effect: '효과 높음',
    risk: '리스크 보통',
    paragraphs: [
      '현재 후보는 Release Interval을 크게 조정하고, 일부 제품에 SuperHotLot을 적용하는 강한 대응 방식이다.',
      '과거 유사 사례에서 대기 개선은 가장 빠르게 나타났지만, 우선순위 개입 강도가 높아 운영 부담과 후속 영향 가능성이 존재했다.',
      '따라서 납기 지연 위험이 크거나 긴급 처리가 필요한 경우에 한해 조건부로 검토하는 것이 적절하다.',
    ],
    source: 'DE_FE_1 aggressive 대응 합성 사례',
  },
];

const fallbackEffectSummaries = [
  'Conservative는 리스크는 낮지만 병목 KPI가 여전히 악화되어 개선 효과가 제한적이다.',
  'Aggressive는 개선 폭은 가장 크지만 가용 Tool 비율 감소로 운영 리스크가 존재한다.',
  '반면 Standard는 평균 대기, WIP, Wait Ratio를 모두 개선하면서도 가용 Tool 비율 저하가 발생하지 않는다.',
  '따라서 현재 상황에서는 병목 완화 효과와 운영 안정성의 균형이 가장 좋은 Standard 대응안을 우선 승인 후보로 추천한다.',
];

const evidenceItems = fallbackEvidenceItems;
const effectSummaries = fallbackEffectSummaries;
</script>

<template>
  <section class="bnc-rag-summary">
    <div class="bnc-rag-summary__head">
      <h3>대응안별 사례 기반 근거</h3>
      <span>RAG 요약</span>
    </div>

    <div class="bnc-rag-summary__grid">
      <article v-for="item in evidenceItems" :key="item.label" class="bnc-rag-summary__card">
        <div class="bnc-rag-summary__card-head">
          <strong>{{ item.label }}</strong>
          <span class="bnc-rag-summary__card-badges">
            <BaseBadge variant="info">{{ item.effect }}</BaseBadge>
            <BaseBadge variant="success">{{ item.risk }}</BaseBadge>
          </span>
        </div>

        <div class="bnc-rag-summary__card-body">
          <p v-for="paragraph in item.paragraphs.slice(0, -1)" :key="paragraph">{{ paragraph }}</p>
        </div>

        <div class="bnc-rag-summary__card-conclusion">
          <span class="bnc-rag-summary__conclusion-label">결론</span>
          <p>{{ item.paragraphs[item.paragraphs.length - 1] }}</p>
        </div>

        <div class="bnc-rag-summary__card-footer">
          <small>근거: {{ item.source }}</small>
          <button type="button" class="bnc-rag-summary__report-btn">리포트 보기 →</button>
        </div>
      </article>
    </div>

    <article class="bnc-rag-summary__effect">
      <h4>AI 효과 요약</h4>
      <p v-for="summary in effectSummaries" :key="summary">{{ summary }}</p>
    </article>
  </section>
</template>

<style scoped>
.bnc-rag-summary {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}

.bnc-rag-summary__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
}

.bnc-rag-summary__head h3,
.bnc-rag-summary__notes h4 {
  margin: 0;
  color: var(--color-fg-strong);
}

.bnc-rag-summary__head h3 {
  font-size: var(--font-size-base);
}

.bnc-rag-summary__head span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-rag-summary__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.bnc-rag-summary__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
}

.bnc-rag-summary__effect {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
}

.bnc-rag-summary__card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border-subtle);
}

.bnc-rag-summary__card-head strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  line-height: 1.4;
}

.bnc-rag-summary__card-badges {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-1);
  flex-shrink: 0;
}

.bnc-rag-summary__card-body {
  display: grid;
  gap: var(--space-2);
  flex: 1;
}

.bnc-rag-summary__card-body p {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.bnc-rag-summary__card-conclusion {
  display: grid;
  gap: var(--space-1);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border-subtle);
}

.bnc-rag-summary__conclusion-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.bnc-rag-summary__card-conclusion p {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.bnc-rag-summary__card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding-top: var(--space-2);
  margin-top: auto;
  border-top: 1px solid var(--color-border-subtle);
}

.bnc-rag-summary__card-footer small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.4;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bnc-rag-summary__report-btn {
  flex-shrink: 0;
  padding: 2px var(--space-2);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.bnc-rag-summary__report-btn:hover {
  background: color-mix(in srgb, var(--color-action-primary) 8%, transparent);
  border-color: var(--color-action-primary);
}

.bnc-rag-summary__effect p {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.bnc-rag-summary__effect h4 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

@media (max-width: 1180px) {
  .bnc-rag-summary__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

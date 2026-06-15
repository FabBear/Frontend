<script setup lang="ts">
import type { BncRagCandidateEvidence, BncRagSimilarCase } from '@/types/bnc';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import {
  evidenceStrengthLabel,
  evidenceStrengthVariant,
  ragScoreVariant,
  riskLevelLabel,
  riskLevelVariant,
} from '@/components/bnc/bncRagHelpers';

defineProps<{
  ragHits: BncRagSimilarCase[];
  planEvidence: BncRagCandidateEvidence | null;
}>();

const emit = defineEmits<{
  openArchive: [caseId: string];
}>();
</script>

<template>
  <section class="bnc-solutions__section bnc-solutions__section--rag">
    <div class="bnc-solutions__section-hd">
      <h3>AI 근거 — RAG 유사사례</h3>
      <span>벡터 검색 유사 사례 · 클릭 시 아카이브 이동</span>
    </div>

    <div v-if="planEvidence" class="bnc-solutions__rag-plan-evidence">
      <div class="bnc-solutions__rag-plan-evidence-head">
        <BaseBadge :variant="evidenceStrengthVariant(planEvidence.evidenceStrength)">
          {{ evidenceStrengthLabel(planEvidence.evidenceStrength) }}
        </BaseBadge>
        <BaseBadge :variant="riskLevelVariant(planEvidence.riskLevel)">
          {{ riskLevelLabel(planEvidence.riskLevel) }}
        </BaseBadge>
      </div>
      <p class="bnc-solutions__rag-plan-summary">{{ planEvidence.candidateSummary }}</p>
      <p v-if="planEvidence.effectOutlook" class="bnc-solutions__rag-plan-outlook">
        {{ planEvidence.effectOutlook }}
      </p>
      <ul v-if="planEvidence.claims?.length" class="bnc-solutions__rag-claims">
        <li v-for="claim in planEvidence.claims" :key="claim">{{ claim }}</li>
      </ul>
    </div>

    <ul v-if="ragHits.length" class="bnc-solutions__rag-list">
      <li v-for="hit in ragHits" :key="hit.caseId" class="bnc-solutions__rag-item">
        <BaseBadge :variant="ragScoreVariant(hit.score)">
          {{ hit.score !== undefined ? `${Math.round(hit.score * 100)}%` : '-' }}
        </BaseBadge>
        <div class="bnc-solutions__rag-item-body">
          <strong>{{ hit.reportTitle ?? hit.caseId }}</strong>
          <span v-if="hit.tgCode" class="bnc-solutions__rag-tg">{{ hit.tgCode }}</span>
          <p>{{ hit.summary }}</p>
        </div>
        <BaseButton variant="ghost" size="sm" @click="emit('openArchive', hit.caseId)">리포트 →</BaseButton>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.bnc-solutions__section {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}

.bnc-solutions__section-hd {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  min-width: 0;
}

.bnc-solutions__section-hd h3 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.bnc-solutions__section-hd span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-solutions__rag-plan-evidence {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
}

.bnc-solutions__rag-plan-evidence-head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.bnc-solutions__rag-plan-summary {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.bnc-solutions__rag-plan-outlook {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-solutions__rag-claims {
  margin: 0;
  padding-left: var(--space-4);
  display: grid;
  gap: var(--space-1);
}

.bnc-solutions__rag-claims li {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

.bnc-solutions__rag-list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.bnc-solutions__rag-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
}

.bnc-solutions__rag-item-body {
  display: grid;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.bnc-solutions__rag-item-body strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__rag-tg {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-solutions__rag-item-body p {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}
</style>

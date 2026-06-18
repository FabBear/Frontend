<script setup lang="ts">
import { computed } from 'vue';

import type { BncActionPlan, BncRagCandidateEvidence, BncRagEvidence, BncRagSimilarCase } from '@/types/bnc';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import {
  evidenceStrengthLabel,
  evidenceStrengthVariant,
  ragScoreVariant,
  riskLevelLabel,
  riskLevelVariant,
} from '@/components/bnc/bncRagHelpers';

const props = defineProps<{
  plans: BncActionPlan[];
  ragEvidence: BncRagEvidence | null | undefined;
}>();

const emit = defineEmits<{
  openArchive: [caseId: string];
}>();

interface EvidenceColumn {
  plan: BncActionPlan;
  evidence: BncRagCandidateEvidence | null;
  hits: BncRagSimilarCase[];
}

function normalize(value: string | undefined | null) {
  return (value ?? '').toLowerCase();
}

function matchesPlan(hit: BncRagSimilarCase, plan: BncActionPlan) {
  const label = normalize(plan.actionLabel ?? plan.title);
  if (!label) return false;
  return normalize(hit.reportTitle).includes(label) || normalize(hit.summary).includes(label);
}

const evidenceColumns = computed<EvidenceColumn[]>(() =>
  props.plans.map((plan) => ({
    plan,
    evidence: props.ragEvidence?.perPlan?.[plan.planId] ?? null,
    hits: (props.ragEvidence?.commonHits ?? []).filter((hit) => matchesPlan(hit, plan)),
  }))
);
</script>

<template>
  <section class="bnc-rag-evidence">
    <div class="bnc-rag-evidence__head">
      <h3>사례 기반 근거</h3>
      <span>RAG 유사사례 · 후보별 근거</span>
    </div>

    <div class="bnc-rag-evidence__stack">
      <article v-for="column in evidenceColumns" :key="column.plan.planId" class="bnc-rag-evidence__group">
        <div class="bnc-rag-evidence__plan">
          <div class="bnc-rag-evidence__plan-head">
            <strong>{{ column.plan.actionLabel ?? column.plan.title }}</strong>
            <span v-if="column.evidence" class="bnc-rag-evidence__badges">
              <BaseBadge :variant="evidenceStrengthVariant(column.evidence.evidenceStrength)">
                {{ evidenceStrengthLabel(column.evidence.evidenceStrength) }}
              </BaseBadge>
              <BaseBadge :variant="riskLevelVariant(column.evidence.riskLevel)">
                {{ riskLevelLabel(column.evidence.riskLevel) }}
              </BaseBadge>
            </span>
          </div>

          <p v-if="column.evidence" class="bnc-rag-evidence__summary">
            {{ column.evidence.candidateSummary }}
          </p>
          <ul v-if="column.evidence?.claims?.length" class="bnc-rag-evidence__claims">
            <li v-for="claim in column.evidence.claims" :key="claim">{{ claim }}</li>
          </ul>
          <p v-else class="bnc-rag-evidence__empty-text">등록된 후보 근거가 없습니다.</p>
        </div>

        <ul v-if="column.hits.length" class="bnc-rag-evidence__cases">
          <li v-for="hit in column.hits" :key="hit.caseId" class="bnc-rag-evidence__case">
            <BaseBadge :variant="ragScoreVariant(hit.score)">
              {{ hit.score !== undefined ? `${Math.round(hit.score * 100)}%` : '-' }}
            </BaseBadge>
            <div class="bnc-rag-evidence__case-body">
              <strong>{{ hit.reportTitle ?? hit.caseId }}</strong>
              <span v-if="hit.tgCode" class="bnc-rag-evidence__tg">{{ hit.tgCode }}</span>
              <p>{{ hit.summary }}</p>
            </div>
            <BaseButton variant="ghost" size="sm" @click="emit('openArchive', hit.caseId)">리포트 →</BaseButton>
          </li>
        </ul>
        <p v-else class="bnc-rag-evidence__empty">연결된 사례 리포트가 없습니다.</p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.bnc-rag-evidence {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}

.bnc-rag-evidence__head {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  min-width: 0;
}

.bnc-rag-evidence__head h3 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.bnc-rag-evidence__head span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-rag-evidence__stack {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  min-width: 0;
}

.bnc-rag-evidence__group {
  display: grid;
  grid-template-rows: 1fr auto;
  gap: 0;
  width: 100%;
  min-width: 0;
}

.bnc-rag-evidence__plan {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
}

.bnc-rag-evidence__plan-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.bnc-rag-evidence__plan-head strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.bnc-rag-evidence__badges {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-1);
}

.bnc-rag-evidence__summary {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.bnc-rag-evidence__empty-text {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-rag-evidence__claims {
  display: grid;
  gap: var(--space-1);
  margin: 0;
  padding-left: var(--space-4);
}

.bnc-rag-evidence__claims li {
  color: var(--color-fg);
  font-size: var(--font-size-xs);
  line-height: 1.6;
}

.bnc-rag-evidence__cases {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.bnc-rag-evidence__case {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-top: 0;
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
}

.bnc-rag-evidence__case :deep(.base-button),
.bnc-rag-evidence__case button {
  grid-column: 2;
  justify-self: start;
  margin-top: var(--space-1);
}

.bnc-rag-evidence__cases .bnc-rag-evidence__case {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.bnc-rag-evidence__cases .bnc-rag-evidence__case:not(:last-child) {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.bnc-rag-evidence__cases .bnc-rag-evidence__case + .bnc-rag-evidence__case {
  border-top: 0;
}

.bnc-rag-evidence__case-body {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.bnc-rag-evidence__case-body strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.35;
}

.bnc-rag-evidence__tg {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-rag-evidence__case-body p {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

.bnc-rag-evidence__empty {
  margin: 0;
  padding: var(--space-3);
  border: 1px dashed var(--color-border-subtle);
  border-top: 0;
  border-radius: var(--radius-md);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

@media (max-width: 1180px) {
  .bnc-rag-evidence__stack {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>

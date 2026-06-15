<script setup lang="ts">
import type { ReportV1DisplayModel } from '@/utils/reportV1DisplayAdapter';
import { evidenceClass, evidenceStrengthLabel, ragScoreVariant, riskLevelLabel } from '@/utils/reportV1Formatters';

defineProps<{
  comparison: NonNullable<ReportV1DisplayModel['ragComparison']>;
}>();

const emit = defineEmits<{
  openArchive: [caseId: string];
}>();
</script>

<template>
  <section class="report-v1__panel">
    <div class="report-v1__panel-head">
      <h3>사례 기반 근거</h3>
      <span>RAG 유사사례 · 중복 제거</span>
    </div>
    <p v-if="comparison.summary" class="report-v1__rag-summary">
      {{ comparison.summary }}
    </p>
    <div v-if="comparison.candidates.length" class="report-v1__rag-candidates">
      <article v-for="candidate in comparison.candidates" :key="candidate.label">
        <div>
          <strong>{{ candidate.label }}</strong>
          <span :class="['report-v1__pill', evidenceClass(candidate.evidence.evidenceStrength)]">
            {{ evidenceStrengthLabel(candidate.evidence.evidenceStrength) }}
          </span>
          <span :class="['report-v1__pill', evidenceClass(candidate.evidence.riskLevel)]">
            {{ riskLevelLabel(candidate.evidence.riskLevel) }}
          </span>
        </div>
        <p>{{ candidate.evidence.candidateSummary }}</p>
        <ul v-if="candidate.evidence.claims.length">
          <li v-for="claim in candidate.evidence.claims" :key="claim">{{ claim }}</li>
        </ul>
      </article>
    </div>
    <ul v-if="comparison.cases.length" class="report-v1__rag-list">
      <li v-for="hit in comparison.cases.slice(0, 8)" :key="hit.caseId" class="report-v1__rag-item">
        <span class="report-v1__rag-score" :class="`report-v1__rag-score--${ragScoreVariant(hit.score)}`">
          {{ hit.score !== undefined ? `${Math.round(hit.score * 100)}%` : '근거' }}
        </span>
        <div class="report-v1__rag-body">
          <strong>{{ hit.title }}</strong>
          <span v-if="hit.tgCode" class="report-v1__rag-tg">{{ hit.tgCode }}</span>
          <p>{{ hit.summary }}</p>
        </div>
        <button type="button" class="report-v1__rag-link" @click="emit('openArchive', hit.caseId)">리포트 →</button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { ReportV1 } from '@/types/report';

import type { ReportV1CandidateDisplay } from '@/utils/reportV1DisplayAdapter';
import {
  deltaTone,
  evidenceClass,
  evidenceStrengthLabel,
  formatNumber,
  impactDeltaText,
  riskLevelLabel,
  visibleImpacts,
} from '@/utils/reportV1Formatters';

defineProps<{
  report: ReportV1;
  candidates: ReportV1CandidateDisplay[];
}>();
</script>

<template>
  <section class="report-v1__panel">
    <div class="report-v1__panel-head">
      <h3>대응안 비교</h3>
      <span>ReportV1 기준 비교</span>
    </div>
    <div class="report-v1__candidate-grid">
      <article
        v-for="candidate in candidates"
        :key="candidate.label"
        class="report-v1__candidate"
        :class="{
          'report-v1__candidate--approved': candidate.isApproved,
          'report-v1__candidate--base': candidate.isBaseline,
        }"
      >
        <div class="report-v1__candidate-head">
          <div>
            <span>{{ candidate.isBaseline ? '현재' : candidate.label }}</span>
            <strong>{{ candidate.kind }}</strong>
          </div>
          <em v-if="candidate.isApproved">승인</em>
          <em v-else-if="candidate.isBaseline">기준</em>
        </div>
        <p>{{ candidate.description }}</p>
        <div class="report-v1__score-bar">
          <span>Score {{ formatNumber(candidate.scorePct, 1) }}</span>
          <i><b :style="{ width: `${Math.min(100, Math.max(0, candidate.scorePct))}%` }" /></i>
        </div>
        <ul>
          <li v-for="impact in visibleImpacts(candidate)" :key="impact.kpi">
            <span>{{ impact.kpi }}</span>
            <strong :class="`report-v1__delta--${deltaTone(impact.kpi, impact.delta)}`">{{
              impactDeltaText(impact)
            }}</strong>
          </li>
        </ul>
        <div v-if="candidate.evidence" class="report-v1__candidate-evidence">
          <span :class="['report-v1__pill', evidenceClass(candidate.evidence.evidenceStrength)]">
            {{ evidenceStrengthLabel(candidate.evidence.evidenceStrength) }}
          </span>
          <span :class="['report-v1__pill', evidenceClass(candidate.evidence.riskLevel)]">
            {{ riskLevelLabel(candidate.evidence.riskLevel) }}
          </span>
        </div>
      </article>
    </div>

    <div
      v-if="
        report.actions.recommendation.why_not_others.length ||
        report.actions.recommendation.caveats.length ||
        report.actions.recommendation.tradeoffs.length
      "
      class="report-v1__decision-notes"
    >
      <article
        v-if="report.actions.recommendation.why_not_others.length"
        class="report-v1__decision-note report-v1__decision-note--why"
      >
        <h4>다른 안 제외 사유</h4>
        <ul>
          <li v-for="item in report.actions.recommendation.why_not_others" :key="item.label">
            <strong>{{ item.label }}</strong>
            <span>{{ item.reason }}</span>
          </li>
        </ul>
      </article>
      <article
        v-if="report.actions.recommendation.tradeoffs.length"
        class="report-v1__decision-note report-v1__decision-note--tradeoff"
      >
        <h4>Trade-off</h4>
        <ul>
          <li v-for="item in report.actions.recommendation.tradeoffs" :key="item">{{ item }}</li>
        </ul>
      </article>
      <article
        v-if="report.actions.recommendation.caveats.length"
        class="report-v1__decision-note report-v1__decision-note--caution"
      >
        <h4>주의사항</h4>
        <ul>
          <li v-for="item in report.actions.recommendation.caveats" :key="item">{{ item }}</li>
        </ul>
      </article>
    </div>
  </section>
</template>

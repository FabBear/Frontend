<script setup lang="ts">
import { ClipboardCheck } from '@lucide/vue';

import type { ReportV1 } from '@/types/report';

import ReportV1TgForecastPanel from '@/components/report/reportV1/ReportV1TgForecastPanel.vue';

import type { ReportV1CandidateDisplay, ReportV1TgForecastRow } from '@/utils/reportV1DisplayAdapter';
import {
  cleanStepText,
  deltaTone,
  impactDeltaText,
  monitoringTargetText,
  visibleImpacts,
} from '@/utils/reportV1Formatters';

defineProps<{
  report: ReportV1;
  approvedLabel: string;
  approvedCandidate: ReportV1CandidateDisplay | null;
  forecastGroups: Array<{ toolgroup: string; rows: ReportV1TgForecastRow[] }>;
}>();
</script>

<template>
  <section class="report-v1__panel">
    <div class="report-v1__panel-head">
      <h3>승인된 대응안</h3>
    </div>
    <div class="report-v1__action-summary">
      <ClipboardCheck :size="22" aria-hidden="true" />
      <div>
        <span>{{ approvedLabel }}</span>
        <strong>{{ approvedCandidate?.description ?? report.actions.recommendation.headline }}</strong>
        <p>{{ report.actions.recommendation.primary_reason }}</p>
      </div>
    </div>
    <div class="report-v1__action-grid">
      <article v-if="report.actions.playbook.immediate_actions.length">
        <h4>즉시 실행</h4>
        <ol>
          <li v-for="item in report.actions.playbook.immediate_actions" :key="item.order">
            {{ cleanStepText(item.text) }}
          </li>
        </ol>
      </article>
      <article v-if="report.actions.playbook.monitoring.length">
        <h4>모니터링</h4>
        <ul>
          <li v-for="item in report.actions.playbook.monitoring" :key="`${item.kpi}-${item.check_after_min}`">
            <strong>T+{{ item.check_after_min }}분 · {{ item.kpi }}</strong>
            <span v-if="monitoringTargetText(item)">{{ monitoringTargetText(item) }}</span>
          </li>
        </ul>
      </article>
      <article v-if="approvedCandidate">
        <h4>승인안 KPI 변화</h4>
        <dl>
          <div v-for="impact in visibleImpacts(approvedCandidate)" :key="impact.kpi">
            <dt>{{ impact.kpi }}</dt>
            <dd :class="`report-v1__delta--${deltaTone(impact.kpi, impact.delta)}`">
              {{ impactDeltaText(impact) }}
            </dd>
          </div>
        </dl>
      </article>
    </div>

    <div v-if="forecastGroups.length" class="report-v1__tg-forecast">
      <h4>TG별 전망</h4>
      <ReportV1TgForecastPanel :groups="forecastGroups" />
    </div>
  </section>
</template>

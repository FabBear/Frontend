<script setup lang="ts">
import { computed } from 'vue';

import { ShieldAlert } from '@lucide/vue';

import type { ReportV1 } from '@/types/report';

import { formatNumber } from '@/utils/reportV1Formatters';

const props = defineProps<{
  report: ReportV1;
}>();

const topCauseCategories = computed(() => props.report.cause.categories.slice(0, 4));
const topShapFeatures = computed(() => props.report.cause.shap_top.slice(0, 5));
</script>

<template>
  <section class="report-v1__panel">
    <div class="report-v1__panel-head">
      <h3>원인 요약</h3>
      <span>{{ report.cause.consensus_axes.axes_agreed_count }}/4 분석 수렴</span>
    </div>
    <div class="report-v1__cause-layout">
      <div class="report-v1__primary-cause">
        <ShieldAlert :size="22" aria-hidden="true" />
        <div>
          <span>주원인</span>
          <strong>{{ report.cause.primary.category }}</strong>
          <p>{{ report.cause.summary || report.cause.primary.reasoning }}</p>
        </div>
      </div>

      <div class="report-v1__cause-bars" data-pdf-avoid-break>
        <div v-for="cause in topCauseCategories" :key="cause.name" class="report-v1__cause-bar">
          <div>
            <span>{{ cause.name }}</span>
            <strong>{{ formatNumber(cause.shap_share_pct, 1) }}%</strong>
          </div>
          <i><b :style="{ width: `${Math.min(100, cause.shap_share_pct)}%` }" /></i>
        </div>
      </div>
    </div>

    <div class="report-v1__evidence-grid">
      <article>
        <h4>Top Feature</h4>
        <ul>
          <li v-for="feature in topShapFeatures" :key="feature.feature">
            <span>{{ feature.feature }}</span>
            <strong>{{ formatNumber(feature.contribution_pct, 1) }}%</strong>
          </li>
        </ul>
      </article>
      <article>
        <h4>보조 원인</h4>
        <p>
          {{
            report.cause.secondary_categories.length
              ? report.cause.secondary_categories.join(', ')
              : '별도 보조 원인 없음'
          }}
        </p>
      </article>
      <article>
        <h4>업스트림 의심</h4>
        <p>
          {{
            report.cause.upstream_suspects.length ? report.cause.upstream_suspects.join(', ') : '확인된 의심 TG 없음'
          }}
        </p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { ReportV1 } from '@/types/report';

import type { ReportV1DisplayModel } from '@/utils/reportV1DisplayAdapter';
import {
  cleanStepText,
  evidenceStrengthLabel,
  formatForecastDelta,
  formatKpiDelta,
  formatKpiValue,
  formatNumber,
  formatTrendSlope,
  formatValue,
  impactDeltaText,
  monitoringTargetText,
  riskLevelLabel,
  visibleImpacts,
} from '@/utils/reportV1Formatters';
import { trendClass, trendPath } from '@/utils/reportV1TrendChart';

const props = defineProps<{
  report: ReportV1;
  display: ReportV1DisplayModel;
  approvedLabel: string;
  decisionBody: string;
}>();

const approvedCandidate = computed(() => props.display.approvedCandidate);
const topShapFeatures = computed(() => props.report.cause.shap_top.slice(0, 5));
const highImpactProcesses = computed(() => props.report.diffusion.high_impact_processes.slice(0, 5));
</script>

<template>
  <header class="report-v1__pdf-cover">
    <p>FAB BOTTLENECK RESPONSE REPORT</p>
    <h1>{{ report.meta.process_name }} 병목 대응 최종 보고서</h1>
    <span>{{ report.meta.severity }} · Risk {{ formatNumber(report.risk.score, 1) }}</span>
    <dl>
      <div>
        <dt>탐지</dt>
        <dd>{{ report.meta.detected_at }}</dd>
      </div>
      <div>
        <dt>생성</dt>
        <dd>{{ report.meta.generated_at }}</dd>
      </div>
      <div>
        <dt>승인 대응안</dt>
        <dd>{{ approvedLabel }}</dd>
      </div>
      <div v-if="report.approval.approver_name">
        <dt>승인자</dt>
        <dd>{{ report.approval.approver_name }} · {{ report.approval.approver_role }}</dd>
      </div>
    </dl>
  </header>

  <section class="report-v1__pdf-section" data-pdf-page-boundary>
    <h2>1. 요약 및 핵심 KPI</h2>
    <p>{{ report.actions.recommendation.headline }}</p>
    <p>{{ decisionBody }}</p>
    <div class="report-v1__pdf-kpis" data-pdf-avoid-break>
      <div v-for="kpi in display.selectedKpis" :key="`pdf-${kpi.key}`">
        <span>{{ kpi.label }}</span>
        <strong>{{ formatKpiValue(kpi) }}</strong>
        <em>{{ formatKpiDelta(kpi) }}</em>
      </div>
    </div>
  </section>

  <section v-if="display.noActionMetrics.length" class="report-v1__pdf-section" data-pdf-page-boundary>
    <h2>2. 무대응 예측</h2>
    <table class="report-v1__pdf-table" data-pdf-avoid-break>
      <thead>
        <tr>
          <th>KPI</th>
          <th>현재</th>
          <th>{{ report.if_no_action.horizon_min }}분 후</th>
          <th>변화</th>
          <th>신뢰도</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="metric in display.noActionMetrics" :key="`pdf-no-${metric.key}`">
          <td>{{ metric.label }}</td>
          <td>{{ formatValue(metric.key, metric.unit, metric.now) }}</td>
          <td>{{ formatValue(metric.key, metric.unit, metric.after) }}</td>
          <td>{{ formatForecastDelta(metric) }}</td>
          <td>{{ metric.reliabilityToken }}</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section v-if="display.trendSeries.length" class="report-v1__pdf-section" data-pdf-page-boundary>
    <h2>3. 기간 추이</h2>
    <div class="report-v1__pdf-chart" data-pdf-avoid-break>
      <svg viewBox="0 0 720 240" role="img" aria-label="병목 주요 지표 추이">
        <line
          v-for="y in [26, 73, 120, 167, 214]"
          :key="`pdf-grid-${y}`"
          x1="34"
          x2="686"
          :y1="y"
          :y2="y"
          class="report-v1__trend-grid"
        />
        <path
          v-for="series in display.trendSeries"
          :key="`pdf-${series.key}`"
          :d="trendPath(series)"
          class="report-v1__trend-line"
          :class="trendClass(series.key)"
        />
      </svg>
    </div>
    <table class="report-v1__pdf-table" data-pdf-avoid-break>
      <thead>
        <tr>
          <th>지표</th>
          <th>현재</th>
          <th>기울기</th>
          <th>R²</th>
          <th>판정</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="series in display.trendSeries" :key="`pdf-trend-${series.key}`">
          <td>{{ series.label }}</td>
          <td>
            {{
              formatValue(
                series.key,
                series.key === 'wip' ? 'lots' : series.key === 'q_time_min' ? 'min' : 'ratio',
                series.values.at(-1)
              )
            }}
          </td>
          <td>{{ formatTrendSlope(series) }}</td>
          <td>{{ formatNumber(series.r2, 2) }}</td>
          <td>{{ series.significant ? '유의 추세' : '관찰 추세' }}</td>
        </tr>
      </tbody>
    </table>
    <div
      v-if="
        report.actions.recommendation.why_not_others.length ||
        report.actions.recommendation.tradeoffs.length ||
        report.actions.recommendation.caveats.length
      "
      class="report-v1__pdf-decision-notes"
      data-pdf-avoid-break
    >
      <h3>선정 판단 근거</h3>
      <table v-if="report.actions.recommendation.why_not_others.length" class="report-v1__pdf-table">
        <thead>
          <tr>
            <th>제외 후보</th>
            <th>제외 사유</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in report.actions.recommendation.why_not_others" :key="`pdf-why-${item.label}`">
            <td>{{ item.label }}</td>
            <td>{{ item.reason }}</td>
          </tr>
        </tbody>
      </table>
      <div class="report-v1__pdf-note-grid">
        <div v-if="report.actions.recommendation.tradeoffs.length">
          <strong>Trade-off</strong>
          <ul>
            <li v-for="item in report.actions.recommendation.tradeoffs" :key="`pdf-tradeoff-${item}`">{{ item }}</li>
          </ul>
        </div>
        <div v-if="report.actions.recommendation.caveats.length">
          <strong>주의사항</strong>
          <ul>
            <li v-for="item in report.actions.recommendation.caveats" :key="`pdf-caveat-${item}`">{{ item }}</li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <section class="report-v1__pdf-section" data-pdf-page-boundary>
    <h2>4. 원인 및 확산 영향</h2>
    <p>
      <strong>주원인:</strong> {{ report.cause.primary.category }} —
      {{ report.cause.summary || report.cause.primary.reasoning }}
    </p>
    <table class="report-v1__pdf-table" data-pdf-avoid-break>
      <thead>
        <tr>
          <th>Feature</th>
          <th>기여도</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="feature in topShapFeatures" :key="`pdf-shap-${feature.feature}`">
          <td>{{ feature.feature }}</td>
          <td>{{ formatNumber(feature.contribution_pct, 1) }}%</td>
        </tr>
      </tbody>
    </table>
    <p><strong>확산 경로:</strong> {{ report.diffusion.diffusion_path.join(' → ') }}</p>
    <table class="report-v1__pdf-table" data-pdf-avoid-break>
      <thead>
        <tr>
          <th>Tool Group</th>
          <th>가동률</th>
          <th>Wait</th>
          <th>WIP</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="proc in highImpactProcesses" :key="`pdf-proc-${proc.toolgroup}`">
          <td>{{ proc.toolgroup }}</td>
          <td>{{ formatNumber(proc.utilization_pct, 1) }}%</td>
          <td>{{ formatNumber(proc.wait_ratio, 2) }}</td>
          <td>{{ formatNumber(proc.wip, 0) }}</td>
        </tr>
      </tbody>
    </table>
  </section>

  <section class="report-v1__pdf-section" data-pdf-page-boundary>
    <h2>5. 대응안 및 모니터링</h2>
    <p>
      <strong>{{ approvedLabel }}</strong> · {{ approvedCandidate?.description ?? '-' }}
    </p>
    <p>{{ report.actions.recommendation.primary_reason }}</p>
    <h3>즉시 실행</h3>
    <ol data-pdf-avoid-break>
      <li v-for="item in report.actions.playbook.immediate_actions" :key="`pdf-action-${item.order}`">
        {{ cleanStepText(item.text) }}
      </li>
    </ol>
    <h3>모니터링</h3>
    <ul data-pdf-avoid-break>
      <li v-for="item in report.actions.playbook.monitoring" :key="`pdf-m-${item.kpi}`">
        T+{{ item.check_after_min }}분 · {{ item.kpi }}
        <span v-if="monitoringTargetText(item)"> · {{ monitoringTargetText(item) }}</span>
      </li>
    </ul>
    <table v-if="display.actionCandidates.length" class="report-v1__pdf-table" data-pdf-avoid-break>
      <thead>
        <tr>
          <th>후보</th>
          <th>유형</th>
          <th>Score</th>
          <th>주요 변화</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="candidate in display.actionCandidates" :key="`pdf-candidate-${candidate.label}`">
          <td>{{ candidate.isApproved ? '승인 · ' : '' }}{{ candidate.label }}</td>
          <td>{{ candidate.kind }}</td>
          <td>{{ formatNumber(candidate.scorePct, 1) }}</td>
          <td>
            {{
              visibleImpacts(candidate)
                .map((impact) => `${impact.kpi} ${impactDeltaText(impact)}`)
                .join(' · ') || '-'
            }}
          </td>
        </tr>
      </tbody>
    </table>
  </section>

  <section v-if="display.ragComparison" class="report-v1__pdf-section" data-pdf-page-boundary>
    <h2>6. 사례 기반 근거</h2>
    <p v-if="display.ragComparison.summary">{{ display.ragComparison.summary }}</p>
    <table v-if="display.ragComparison.candidates.length" class="report-v1__pdf-table" data-pdf-avoid-break>
      <thead>
        <tr>
          <th>후보</th>
          <th>근거</th>
          <th>리스크</th>
          <th>요약</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="candidate in display.ragComparison.candidates" :key="`pdf-rag-c-${candidate.label}`">
          <td>{{ candidate.label }}</td>
          <td>{{ evidenceStrengthLabel(candidate.evidence.evidenceStrength) }}</td>
          <td>{{ riskLevelLabel(candidate.evidence.riskLevel) }}</td>
          <td>{{ candidate.evidence.candidateSummary }}</td>
        </tr>
      </tbody>
    </table>
    <ul v-if="display.ragComparison.cases.length" data-pdf-avoid-break>
      <li v-for="hit in display.ragComparison.cases.slice(0, 6)" :key="`pdf-rag-${hit.caseId}`">
        {{ hit.title }}{{ hit.tgCode ? ` (${hit.tgCode})` : '' }} — {{ hit.summary }}
      </li>
    </ul>
  </section>
</template>

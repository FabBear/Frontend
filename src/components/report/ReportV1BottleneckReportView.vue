<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

import { AlertTriangle, CheckCircle2, ClipboardCheck, Route, ShieldAlert, TrendingUp } from '@lucide/vue';

import type { ReportV1, ReportV1ActionCandidate, ReportV1Kpi } from '@/types/report';

import InsightCallout from '@/components/common/InsightCallout.vue';

import { renderMarkdown } from '@/utils/markdown';
import { buildReportPdfFilename, downloadElementAsPdf } from '@/utils/reportPdf';

const props = defineProps<{
  report: ReportV1;
}>();

const pdfReportRef = ref<HTMLElement | null>(null);
const pdfError = ref<string | null>(null);
const isDownloading = ref(false);

const IMPORTANT_KPIS = new Set(['risk_score', 'q_time_min', 'wait_ratio', 'utilization_avg', 'wip', 'max_util']);
const TREND_KEYS = ['wip', 'wait_ratio', 'utilization_avg'];

const selectedKpis = computed(() => props.report.bottleneck_kpis.filter((kpi) => IMPORTANT_KPIS.has(kpi.key)));
const warnings = computed(() => props.report.data_quality.warnings ?? []);
const hasSimulationWarning = computed(() => warnings.value.some((warning) => warning.code === 'SIM_KPI_IDENTICAL'));
const approvedLabel = computed(
  () => props.report.actions.approved_label ?? props.report.approval.selected_label ?? '-'
);
const actionCandidates = computed(() => props.report.actions.candidates.filter((candidate) => !candidate.is_baseline));
const approvedCandidate = computed(
  () =>
    actionCandidates.value.find((candidate) => candidate.label.toUpperCase() === approvedLabel.value.toUpperCase()) ??
    actionCandidates.value[0] ??
    null
);
const baselineCandidate = computed(() => props.report.actions.candidates.find((candidate) => candidate.is_baseline));
const highImpactProcesses = computed(() => props.report.diffusion.high_impact_processes.slice(0, 5));
const topCauseCategories = computed(() => props.report.cause.categories.slice(0, 3));
const topShapFeatures = computed(() => props.report.cause.shap_top.slice(0, 4));
const trendSignals = computed(() =>
  TREND_KEYS.map((key) => {
    const trend = props.report.cause.trend_series.features[key];
    return trend ? { key, ...trend } : null;
  }).filter(
    (trend): trend is { key: string; values: number[]; slope_per_hour: number; r2: number; significant: boolean } =>
      Boolean(trend)
  )
);
const renderedMarkdown = computed(() => renderMarkdown(props.report.rendered.markdown));
const summaryHighlights = computed(() => {
  const quoted = props.report.sections.summary
    .split(/\r?\n/)
    .map((line) => stripMarkdown(line))
    .filter((line) => line.length > 0 && !line.startsWith('1. 요약') && !line.includes('|'));
  return quoted.slice(0, 3).length ? quoted.slice(0, 3) : [props.report.cause.summary];
});
const noActionForecastText = computed(() =>
  props.report.if_no_action.kpi_changes
    .slice(0, 2)
    .map((change) => `${change.kpi} ${formatNumber(change.now, 1)} -> ${formatNumber(change.after, 1)}`)
    .join(' · ')
);

const decisionBannerTone = computed<'warning' | 'success' | 'info'>(() => {
  if (hasSimulationWarning.value) return 'warning';
  if (props.report.approval.status_token === 'approved') return 'success';
  return 'info';
});

const reportFilename = computed(() =>
  buildReportPdfFilename(props.report.meta.process_name, props.report.meta.generated_at)
);

function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString('ko-KR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: Number.isInteger(value) ? 0 : Math.min(digits, 1),
  });
}

function stripMarkdown(value: string): string {
  return value
    .replace(/^#+\s*/, '')
    .replace(/^>\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .trim();
}

function formatPercent(value: number): string {
  return `${(value * 100).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%`;
}

function formatKpiValue(kpi: ReportV1Kpi): string {
  if (kpi.key === 'risk_score') return formatNumber(kpi.value, 1);
  if (kpi.unit === 'min') return `${formatNumber(kpi.value, 1)}분`;
  if (kpi.unit === 'lots') return `${formatNumber(kpi.value, 0)} Lot`;
  if (kpi.key.includes('util') || kpi.key.includes('available')) return formatPercent(kpi.value);
  return formatNumber(kpi.value, 2);
}

function formatKpiDelta(kpi: ReportV1Kpi): string {
  if (kpi.delta === null) return '비교 기준 없음';
  const sign = kpi.delta > 0 ? '+' : '';
  if (kpi.unit === 'min') return `${sign}${formatNumber(kpi.delta, 1)}분`;
  if (kpi.unit === 'lots') return `${sign}${formatNumber(kpi.delta, 0)} Lot`;
  if (kpi.key.includes('util') || kpi.key.includes('available')) return `${sign}${formatNumber(kpi.delta * 100, 1)}%p`;
  return `${sign}${formatNumber(kpi.delta, 2)}`;
}

function kpiTone(kpi: ReportV1Kpi): string {
  if (kpi.threshold_state === 'danger') return 'danger';
  if ((kpi.delta ?? 0) > 0 && ['q_time_min', 'wait_ratio', 'wip', 'utilization_avg', 'max_util'].includes(kpi.key)) {
    return 'warning';
  }
  return 'neutral';
}

function formatTrendValue(key: string, value: number): string {
  if (key.includes('util')) return formatPercent(value);
  if (key === 'wip') return `${formatNumber(value, 0)} Lot`;
  return formatNumber(value, 2);
}

function formatTrendSlope(key: string, value: number): string {
  const sign = value > 0 ? '+' : '';
  if (key.includes('util')) return `${sign}${formatNumber(value * 100, 2)}%p/h`;
  if (key === 'wip') return `${sign}${formatNumber(value, 1)} Lot/h`;
  return `${sign}${formatNumber(value, 2)}/h`;
}

function formatImpactScore(value: number): string {
  return formatPercent(value);
}

function candidateImpact(candidate: ReportV1ActionCandidate, key: string): string {
  const impact = candidate.kpi_impact.find((item) => item.kpi === key);
  if (!impact) return '-';
  if (impact.unit === 'min') return `${formatNumber(impact.delta, 1)}분`;
  if (impact.unit === 'lots') return `${formatNumber(impact.delta, 0)} Lot`;
  if (impact.kpi.includes('util')) return `${formatNumber(impact.delta * 100, 1)}%p`;
  return formatNumber(impact.delta, 2);
}

function cleanStepText(text: string): string {
  return text.replace(/^\d+\)\s*/, '');
}

async function handlePdfDownload() {
  if (!pdfReportRef.value || isDownloading.value) return;
  isDownloading.value = true;
  pdfError.value = null;

  await nextTick();

  try {
    await downloadElementAsPdf(pdfReportRef.value, reportFilename.value);
  } catch (err) {
    pdfError.value = err instanceof Error ? err.message : 'PDF 생성 실패';
    console.error('[PDF]', err);
  } finally {
    isDownloading.value = false;
  }
}

defineExpose({ triggerPdfDownload: handlePdfDownload, isDownloading, pdfError });
</script>

<template>
  <section class="report-v1">
    <article class="report-v1__surface">
      <header class="report-v1__hero">
        <div>
          <span class="report-v1__eyebrow">판단 요약 리포트</span>
          <h2>{{ report.meta.process_name }}</h2>
          <p>
            {{ report.meta.severity }} · Risk {{ formatNumber(report.risk.score, 1) }} · 병목확률
            {{ formatPercent(report.risk.probability) }}
          </p>
        </div>
        <dl class="report-v1__meta">
          <div>
            <dt>탐지</dt>
            <dd>{{ report.meta.detected_at }}</dd>
          </div>
          <div>
            <dt>생성</dt>
            <dd>{{ report.meta.generated_at }}</dd>
          </div>
          <div>
            <dt>승인</dt>
            <dd>{{ report.approval.status }} · {{ approvedLabel }}</dd>
          </div>
        </dl>
      </header>

      <InsightCallout
        class="report-v1__banner"
        :variant="decisionBannerTone"
        :title="report.actions.recommendation.headline"
      >
        <template #icon>
          <AlertTriangle v-if="decisionBannerTone === 'warning'" :size="20" aria-hidden="true" />
          <CheckCircle2 v-else :size="20" aria-hidden="true" />
        </template>
        <p>{{ report.actions.decision_caveat }}</p>
        <p v-if="hasSimulationWarning">SIM_KPI_IDENTICAL: 시뮬레이션 결과는 현장 검증 전까지 잠정 판단입니다.</p>
      </InsightCallout>

      <dl class="report-v1__kpis">
        <div v-for="kpi in selectedKpis" :key="kpi.key" :class="`report-v1__kpi report-v1__kpi--${kpiTone(kpi)}`">
          <dt>{{ kpi.label }}</dt>
          <dd>{{ formatKpiValue(kpi) }}</dd>
          <span>{{ formatKpiDelta(kpi) }}</span>
        </div>
      </dl>

      <section class="report-v1__grid report-v1__grid--summary">
        <article class="report-v1__panel report-v1__panel--wide">
          <div class="report-v1__panel-head">
            <h3>요약</h3>
            <span>{{ report.confidence.level }} confidence</span>
          </div>
          <ul class="report-v1__summary-list">
            <li v-for="line in summaryHighlights" :key="line">{{ line }}</li>
          </ul>
          <div class="report-v1__forecast">
            <TrendingUp :size="18" aria-hidden="true" />
            <span>
              무대응 {{ report.if_no_action.horizon_min }}분 전망:
              {{ noActionForecastText }}
            </span>
          </div>
        </article>

        <article class="report-v1__panel">
          <div class="report-v1__panel-head">
            <h3>승인 정보</h3>
            <span>{{ report.approval.status_token }}</span>
          </div>
          <dl class="report-v1__facts">
            <div>
              <dt>승인자</dt>
              <dd>{{ report.approval.approver_name }} · {{ report.approval.approver_role }}</dd>
            </div>
            <div>
              <dt>승인일시</dt>
              <dd>{{ report.approval.approved_at }}</dd>
            </div>
            <div>
              <dt>의견</dt>
              <dd>{{ report.approval.comment }}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section class="report-v1__panel">
        <div class="report-v1__panel-head">
          <h3>원인</h3>
          <span>{{ report.cause.consensus_axes.axes_agreed_count }}/4 분석 수렴</span>
        </div>
        <div class="report-v1__cause-layout">
          <div class="report-v1__primary-cause">
            <ShieldAlert :size="22" aria-hidden="true" />
            <div>
              <span>주원인</span>
              <strong>{{ report.cause.primary.category }}</strong>
              <p>{{ report.cause.primary.reasoning }}</p>
            </div>
          </div>

          <div class="report-v1__cause-bars">
            <div v-for="cause in topCauseCategories" :key="cause.name" class="report-v1__cause-bar">
              <div>
                <span>{{ cause.name }}</span>
                <strong>{{ formatNumber(cause.shap_share_pct, 1) }}%</strong>
              </div>
              <i :style="{ width: `${Math.min(100, cause.shap_share_pct)}%` }" />
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
            <h4>악화 신호</h4>
            <ul>
              <li v-for="trend in trendSignals" :key="trend.key">
                <span>{{ trend.key }} · {{ formatTrendValue(trend.key, trend.values.at(-1) ?? 0) }}</span>
                <strong>{{ formatTrendSlope(trend.key, trend.slope_per_hour) }}</strong>
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section class="report-v1__panel">
        <div class="report-v1__panel-head">
          <h3>확산 영향</h3>
          <span>상위 영향 TG {{ highImpactProcesses.length }}개</span>
        </div>
        <div class="report-v1__path">
          <Route :size="18" aria-hidden="true" />
          <span v-for="node in report.diffusion.diffusion_path" :key="node">{{ node }}</span>
        </div>
        <div class="report-v1__impact-list">
          <article v-for="process in highImpactProcesses" :key="process.toolgroup">
            <strong>{{ process.toolgroup }}</strong>
            <dl>
              <div>
                <dt>가동률</dt>
                <dd>{{ formatNumber(process.utilization_pct, 1) }}%</dd>
              </div>
              <div>
                <dt>WIP</dt>
                <dd>{{ formatNumber(process.wip, 0) }}</dd>
              </div>
              <div>
                <dt>영향도</dt>
                <dd>{{ formatImpactScore(process.impact_score) }}</dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <section class="report-v1__panel">
        <div class="report-v1__panel-head">
          <h3>승인된 대응안</h3>
          <span>{{ report.actions.decision_status }}</span>
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
          <article>
            <h4>선택안 KPI 변화</h4>
            <dl>
              <div>
                <dt>평균 대기</dt>
                <dd>{{ approvedCandidate ? candidateImpact(approvedCandidate, 'q_time_min') : '-' }}</dd>
              </div>
              <div>
                <dt>WIP</dt>
                <dd>{{ approvedCandidate ? candidateImpact(approvedCandidate, 'wip') : '-' }}</dd>
              </div>
              <div>
                <dt>Wait Ratio</dt>
                <dd>{{ approvedCandidate ? candidateImpact(approvedCandidate, 'wait_ratio') : '-' }}</dd>
              </div>
              <div>
                <dt>Baseline</dt>
                <dd>{{ baselineCandidate?.description ?? '-' }}</dd>
              </div>
            </dl>
          </article>
          <article>
            <h4>즉시 실행</h4>
            <ol>
              <li v-for="item in report.actions.playbook.immediate_actions.slice(0, 3)" :key="item.order">
                {{ cleanStepText(item.text) }}
              </li>
            </ol>
          </article>
          <article>
            <h4>모니터링/롤백</h4>
            <ul>
              <li v-for="item in report.actions.playbook.monitoring" :key="`${item.kpi}-${item.check_after_min}`">
                T+{{ item.check_after_min }}분 {{ item.kpi }} 확인
              </li>
              <li>{{ report.actions.playbook.rollback_condition }}</li>
            </ul>
          </article>
        </div>
      </section>

      <p v-if="pdfError" class="report-v1__pdf-error" role="alert">PDF 생성 중 오류 발생: {{ pdfError }}</p>
    </article>

    <article ref="pdfReportRef" class="report-v1__pdf" aria-hidden="true">
      <header class="report-v1__pdf-cover">
        <p>FAB BOTTLENECK RESPONSE REPORT</p>
        <h1>{{ report.meta.process_name }} 병목 대응 보고서</h1>
        <span>{{ report.meta.severity }} · Risk {{ formatNumber(report.risk.score, 1) }}</span>
      </header>

      <section class="report-v1__pdf-section" data-pdf-page-boundary>
        <h2>1. 판단 요약</h2>
        <p>{{ report.actions.recommendation.headline }}</p>
        <p>{{ report.actions.decision_caveat }}</p>
        <div class="report-v1__pdf-kpis">
          <div v-for="kpi in selectedKpis" :key="`pdf-${kpi.key}`">
            <span>{{ kpi.label }}</span>
            <strong>{{ formatKpiValue(kpi) }}</strong>
            <em>{{ formatKpiDelta(kpi) }}</em>
          </div>
        </div>
      </section>

      <section class="report-v1__pdf-section" data-pdf-page-boundary>
        <h2>2. 원인/확산/대응</h2>
        <h3>원인</h3>
        <p>{{ report.cause.primary.reasoning }}</p>
        <h3>확산 경로</h3>
        <p>{{ report.diffusion.diffusion_path.join(' -> ') }}</p>
        <h3>승인 대응안</h3>
        <p>{{ approvedLabel }} · {{ approvedCandidate?.description ?? '-' }}</p>
        <p>{{ report.actions.playbook.rollback_condition }}</p>
      </section>

      <section class="report-v1__pdf-section report-v1__markdown" data-pdf-page-boundary>
        <h2>3. Agent 원문 보고서</h2>
        <!-- eslint-disable-next-line vue/no-v-html -- markdown is sanitized by renderMarkdown. -->
        <div v-html="renderedMarkdown" />
      </section>
    </article>
  </section>
</template>

<style scoped>
.report-v1 {
  min-width: 0;
}

.report-v1__surface {
  display: grid;
  gap: var(--space-4);
}

.report-v1__hero,
.report-v1__panel {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
}

.report-v1__hero {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5);
}

.report-v1__eyebrow,
.report-v1__panel-head span,
.report-v1__meta dt,
.report-v1__facts dt,
.report-v1__kpi dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.report-v1__hero h2 {
  margin: var(--space-1) 0;
  color: var(--color-fg-strong);
  font-size: 28px;
  letter-spacing: 0;
}

.report-v1__hero p,
.report-v1__panel p {
  margin: 0;
  color: var(--color-fg);
  line-height: 1.6;
}

.report-v1__summary-list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding-left: 1rem;
  color: var(--color-fg);
  line-height: 1.6;
}

.report-v1__meta,
.report-v1__facts,
.report-v1__action-grid dl,
.report-v1__impact-list dl {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

.report-v1__meta {
  min-width: 220px;
}

.report-v1__meta div,
.report-v1__facts div,
.report-v1__action-grid dl div,
.report-v1__impact-list dl div {
  min-width: 0;
}

.report-v1__meta dd,
.report-v1__facts dd,
.report-v1__action-grid dd,
.report-v1__impact-list dd {
  margin: 2px 0 0;
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-semibold);
}

.report-v1__kpis {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
}

.report-v1__kpi {
  min-width: 0;
  padding: var(--space-3);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
}

.report-v1__kpi dd {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
}

.report-v1__kpi span {
  display: block;
  margin-top: 2px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.report-v1__kpi--danger {
  border-color: color-mix(in srgb, var(--color-status-danger) 35%, var(--color-border-default));
}

.report-v1__kpi--warning {
  border-color: color-mix(in srgb, var(--color-status-warning) 35%, var(--color-border-default));
}

.report-v1__grid {
  display: grid;
  gap: var(--space-4);
}

.report-v1__grid--summary {
  grid-template-columns: minmax(0, 1.6fr) minmax(280px, 0.8fr);
}

.report-v1__panel {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
}

.report-v1__panel-head {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.report-v1__panel-head h3,
.report-v1__evidence-grid h4,
.report-v1__action-grid h4 {
  margin: 0;
  color: var(--color-fg-strong);
}

.report-v1__forecast,
.report-v1__primary-cause,
.report-v1__action-summary {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.report-v1__forecast svg,
.report-v1__primary-cause svg,
.report-v1__action-summary svg {
  flex-shrink: 0;
  color: var(--color-action-primary);
}

.report-v1__cause-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(260px, 0.8fr);
  gap: var(--space-4);
}

.report-v1__primary-cause span,
.report-v1__action-summary span {
  display: block;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.report-v1__primary-cause strong,
.report-v1__action-summary strong {
  display: block;
  margin: 2px 0 var(--space-1);
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

.report-v1__cause-bars {
  display: grid;
  align-content: start;
  gap: var(--space-3);
}

.report-v1__cause-bar div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.report-v1__cause-bar i {
  display: block;
  height: 8px;
  margin-top: var(--space-1);
  background: var(--color-action-primary);
  border-radius: var(--radius-pill);
}

.report-v1__evidence-grid,
.report-v1__action-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.report-v1__evidence-grid article,
.report-v1__action-grid article,
.report-v1__impact-list article {
  min-width: 0;
  padding: var(--space-3);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.report-v1__evidence-grid ul,
.report-v1__action-grid ul,
.report-v1__action-grid ol {
  display: grid;
  gap: var(--space-2);
  margin: var(--space-3) 0 0;
  padding-left: 1rem;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.report-v1__evidence-grid li {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
}

.report-v1__path {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.report-v1__path span {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 var(--space-3);
  color: var(--color-fg-strong);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.report-v1__impact-list {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--space-3);
}

.report-v1__impact-list strong {
  color: var(--color-fg-strong);
}

.report-v1__impact-list dl {
  margin-top: var(--space-2);
}

.report-v1__impact-list dt,
.report-v1__action-grid dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.report-v1__pdf-error {
  margin: 0;
  color: var(--color-status-danger);
  font-size: var(--font-size-sm);
}

.report-v1__pdf {
  position: fixed;
  top: 0;
  left: -10000px;
  width: 794px;
  min-height: 1123px;
  padding: 42px;
  background: #ffffff;
  color: #111827;
  font-family:
    Pretendard,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  pointer-events: none;
}

.report-v1__pdf * {
  box-sizing: border-box;
}

.report-v1__pdf-cover {
  padding: 28px;
  color: #ffffff;
  background: #1f2937;
  border-radius: 8px;
}

.report-v1__pdf-cover p,
.report-v1__pdf-cover h1 {
  margin: 0;
}

.report-v1__pdf-cover h1 {
  margin-top: 8px;
  font-size: 28px;
}

.report-v1__pdf-section {
  margin-top: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.report-v1__pdf-section h2 {
  margin: 0 0 12px;
  color: #111827;
  font-size: 18px;
}

.report-v1__pdf-section h3 {
  margin: 14px 0 6px;
  color: #374151;
  font-size: 13px;
}

.report-v1__pdf-section p {
  margin: 6px 0;
  color: #374151;
  font-size: 12px;
  line-height: 1.6;
}

.report-v1__pdf-kpis {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 14px;
}

.report-v1__pdf-kpis div {
  padding: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.report-v1__pdf-kpis span,
.report-v1__pdf-kpis em {
  display: block;
  color: #6b7280;
  font-size: 10px;
  font-style: normal;
}

.report-v1__pdf-kpis strong {
  display: block;
  margin: 4px 0;
  color: #111827;
  font-size: 16px;
}

.report-v1__markdown :deep(h1),
.report-v1__markdown :deep(h2),
.report-v1__markdown :deep(h3) {
  margin: 18px 0 8px;
  color: #111827;
}

.report-v1__markdown :deep(p),
.report-v1__markdown :deep(li) {
  color: #374151;
  font-size: 11px;
  line-height: 1.55;
}

.report-v1__markdown :deep(table) {
  width: 100%;
  margin: 10px 0 14px;
  border-collapse: collapse;
  font-size: 9px;
}

.report-v1__markdown :deep(th),
.report-v1__markdown :deep(td) {
  padding: 5px 6px;
  border: 1px solid #e5e7eb;
  text-align: left;
  vertical-align: top;
}

.report-v1__markdown :deep(th) {
  background: #f3f4f6;
  color: #111827;
}

@media (max-width: 1180px) {
  .report-v1__kpis,
  .report-v1__impact-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .report-v1__evidence-grid,
  .report-v1__action-grid,
  .report-v1__grid--summary,
  .report-v1__cause-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .report-v1__hero {
    flex-direction: column;
  }

  .report-v1__kpis,
  .report-v1__impact-list {
    grid-template-columns: 1fr;
  }
}
</style>

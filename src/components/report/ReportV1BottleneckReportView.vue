<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ROUTE_NAMES } from '@/constants/routes';

import type { ReportV1 } from '@/types/report';

import ReportV1ApprovedActionSection from '@/components/report/reportV1/ReportV1ApprovedActionSection.vue';
import ReportV1CandidateComparisonSection from '@/components/report/reportV1/ReportV1CandidateComparisonSection.vue';
import ReportV1CauseSection from '@/components/report/reportV1/ReportV1CauseSection.vue';
import ReportV1DiffusionSection from '@/components/report/reportV1/ReportV1DiffusionSection.vue';
import ReportV1ForecastSection from '@/components/report/reportV1/ReportV1ForecastSection.vue';
import ReportV1PdfDocument from '@/components/report/reportV1/ReportV1PdfDocument.vue';
import ReportV1RagEvidenceSection from '@/components/report/reportV1/ReportV1RagEvidenceSection.vue';
import ReportV1SummaryHeader from '@/components/report/reportV1/ReportV1SummaryHeader.vue';
import ReportV1TrendSection from '@/components/report/reportV1/ReportV1TrendSection.vue';
import '@/components/report/reportV1/reportV1.css';

import { buildReportPdfFilename, downloadElementAsPdf } from '@/utils/reportPdf';
import type { ReportV1TgForecastRow } from '@/utils/reportV1DisplayAdapter';
import { buildReportV1DisplayModel } from '@/utils/reportV1DisplayAdapter';

const props = defineProps<{
  report: ReportV1;
}>();

const router = useRouter();

const pdfReportRef = ref<HTMLElement | null>(null);
const pdfError = ref<string | null>(null);
const isDownloading = ref(false);

const display = computed(() => buildReportV1DisplayModel(props.report));
const warnings = computed(() => props.report.data_quality.warnings ?? []);
const visibleWarnings = computed(() => warnings.value.slice(0, 3));
const hasSimulationWarning = computed(() => warnings.value.some((warning) => warning.code === 'SIM_KPI_IDENTICAL'));
const approvedCandidate = computed(() => display.value.approvedCandidate);
const approvedLabel = computed(
  () =>
    approvedCandidate.value?.label ?? props.report.actions.approved_label ?? props.report.approval.selected_label ?? '-'
);
const decisionBannerTone = computed<'warning' | 'success' | 'info'>(() => {
  if (hasSimulationWarning.value) return 'warning';
  if (props.report.approval.status_token === 'approved') return 'success';
  return 'info';
});
const decisionBody = computed(
  () => props.report.actions.decision_caveat || props.report.actions.recommendation.primary_reason
);
const approvedForecastGroups = computed(() => {
  const groups = new Map<string, ReportV1TgForecastRow[]>();
  display.value.approvedForecastRows.forEach((row) => {
    const existing = groups.get(row.toolgroup) ?? [];
    existing.push(row);
    groups.set(row.toolgroup, existing);
  });
  return [...groups.entries()].map(([toolgroup, rows]) => ({ toolgroup, rows }));
});
const reportFilename = computed(() =>
  buildReportPdfFilename(props.report.meta.process_name, props.report.meta.generated_at)
);

function openInArchive(caseId: string) {
  void router.push({ name: ROUTE_NAMES.reportArchive, query: { caseId } });
}

function goToFab3d(tgName: string) {
  void router.push({ name: ROUTE_NAMES.fab3d, query: { tg: tgName } });
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
      <ReportV1SummaryHeader
        :report="report"
        :selected-kpis="display.selectedKpis"
        :approved-label="approvedLabel"
        :decision-banner-tone="decisionBannerTone"
        :decision-body="decisionBody"
        :visible-warnings="visibleWarnings"
        :has-simulation-warning="hasSimulationWarning"
      />

      <ReportV1ForecastSection
        v-if="display.noActionMetrics.length"
        :metrics="display.noActionMetrics"
        :horizon-min="report.if_no_action.horizon_min"
        :will-get-worse="report.if_no_action.will_get_worse"
      />

      <ReportV1TrendSection v-if="display.trendSeries.length" :series="display.trendSeries" />
      <ReportV1CauseSection :report="report" />
      <ReportV1DiffusionSection :report="report" @open-fab3d="goToFab3d" />

      <ReportV1ApprovedActionSection
        :report="report"
        :approved-label="approvedLabel"
        :approved-candidate="approvedCandidate"
        :forecast-groups="approvedForecastGroups"
      />

      <ReportV1CandidateComparisonSection
        v-if="report.actions.available && display.actionCandidates.length"
        :report="report"
        :candidates="display.actionCandidates"
      />

      <ReportV1RagEvidenceSection
        v-if="display.ragComparison"
        :comparison="display.ragComparison"
        @open-archive="openInArchive"
      />

      <p v-if="pdfError" class="report-v1__pdf-error" role="alert">PDF 생성 중 오류 발생: {{ pdfError }}</p>
    </article>

    <article ref="pdfReportRef" class="report-v1__pdf" aria-hidden="true">
      <ReportV1PdfDocument
        :report="report"
        :display="display"
        :approved-label="approvedLabel"
        :decision-body="decisionBody"
      />
    </article>
  </section>
</template>

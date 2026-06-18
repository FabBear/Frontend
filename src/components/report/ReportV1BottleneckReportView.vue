<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ROUTE_NAMES } from '@/constants/routes';

import type { ReportV1 } from '@/types/report';

import ReportV1ApprovedActionSection from '@/components/report/reportV1/ReportV1ApprovedActionSection.vue';
import ReportV1CandidateComparisonSection from '@/components/report/reportV1/ReportV1CandidateComparisonSection.vue';
import ReportV1CauseSection from '@/components/report/reportV1/ReportV1CauseSection.vue';
import ReportV1DiffusionSection from '@/components/report/reportV1/ReportV1DiffusionSection.vue';
import ReportV1EffectSection from '@/components/report/reportV1/ReportV1EffectSection.vue';
import ReportV1SummaryHeader from '@/components/report/reportV1/ReportV1SummaryHeader.vue';
import '@/components/report/reportV1/reportV1.css';

import { buildReportPdfFilename } from '@/utils/reportPdf';
import type { ReportV1TgForecastRow } from '@/utils/reportV1DisplayAdapter';
import { buildReportV1DisplayModel } from '@/utils/reportV1DisplayAdapter';
import { downloadReportV1DocumentPdf } from '@/utils/reportV1Pdf';

const props = defineProps<{
  report: ReportV1;
  caseId?: string | null;
}>();

const router = useRouter();

const pdfError = ref<string | null>(null);
const isDownloading = ref(false);

const display = computed(() => buildReportV1DisplayModel(props.report));
const warnings = computed(() => props.report.data_quality.warnings ?? []);
const visibleWarnings = computed(() => warnings.value.slice(0, 3));
const approvedCandidate = computed(() => display.value.approvedCandidate);
const approvedLabel = computed(
  () =>
    approvedCandidate.value?.label ?? props.report.actions.approved_label ?? props.report.approval?.selected_label ?? '-'
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

function goToFab3d(tgName: string) {
  void router.push({
    name: ROUTE_NAMES.fab3d,
    query: {
      ...(props.caseId ? { caseId: props.caseId } : {}),
      tg: tgName,
    },
  });
}

async function handlePdfDownload() {
  if (isDownloading.value) return;
  isDownloading.value = true;
  pdfError.value = null;

  try {
    await downloadReportV1DocumentPdf(props.report, reportFilename.value, props.caseId);
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
        :visible-warnings="visibleWarnings"
      />

      <ReportV1DiffusionSection :report="report" @open-fab3d="goToFab3d" />
      <ReportV1CauseSection :report="report" />

      <ReportV1CandidateComparisonSection
        v-if="report.actions.available && report.actions.candidates.length"
        :report="report"
        :case-id="caseId"
      />

      <ReportV1ApprovedActionSection
        :report="report"
        :approved-label="approvedLabel"
        :approved-candidate="approvedCandidate"
      />

      <ReportV1EffectSection
        v-if="display.noActionMetrics.length || approvedCandidate || approvedForecastGroups.length"
        :no-action-metrics="display.noActionMetrics"
        :no-action-horizon-min="report.if_no_action.horizon_min"
        :no-action-will-get-worse="report.if_no_action.will_get_worse"
        :approved-candidate="approvedCandidate"
        :forecast-groups="approvedForecastGroups"
      />

      <p v-if="pdfError" class="report-v1__pdf-error" role="alert">PDF 생성 중 오류 발생: {{ pdfError }}</p>
    </article>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { ArrowLeft } from '@lucide/vue';

import { fetchBncReport } from '@/services/bncService';

import type { BncReportPayload } from '@/types/bnc';
import type { ActionHistoryDetail } from '@/types/report';

import BaseButton from '@/components/base/BaseButton.vue';
import BottleneckReportPanel from '@/components/report/BottleneckReportPanel.vue';

const props = defineProps<{ detail: ActionHistoryDetail; aiBusy?: boolean }>();

defineEmits<{
  back: [];
  askAi: [detail: ActionHistoryDetail];
}>();

const reportPayload = ref<BncReportPayload | null>(null);
const isReportLoading = ref(false);
const reportError = ref<string | null>(null);

const fallbackReport = computed<BncReportPayload | null>(() => {
  if (!props.detail.finalReport) return null;
  const report = props.detail.finalReport;

  return {
    reportId: props.detail.reportId,
    caseId: props.detail.caseId,
    summary:
      report.cause_analysis[0]?.summary ??
      `${report.meta.process_name} 병목 이력에서 ${props.detail.hitlDecision.selectedPlanTitle} 대응안이 승인되었습니다.`,
    rootCauseText:
      report.cause_analysis[0]?.cause ??
      report.cause_analysis[0]?.summary ??
      `${report.meta.process_name}의 queue, WIP, utilization 지표를 기준으로 병목 원인을 검토했습니다.`,
    actionComparisonText:
      report.recommendation.reason ||
      `${report.recommendation.action_label} 대응안을 기준으로 현장 적용 이력과 KPI 변화를 확인합니다.`,
    timeline: [
      { time: props.detail.detectedAt, event: `${props.detail.targetTgText} 병목 감지` },
      { time: props.detail.hitlDecision.decidedAt, event: `${props.detail.hitlDecision.selectedPlanTitle} 승인` },
    ],
    hasPdf: props.detail.hasPdf,
    generatedAt: report.meta.generated_at,
    regeneratedCount: 0,
    qdrantIndexed: false,
  };
});

const activeReport = computed(() => reportPayload.value ?? fallbackReport.value);

async function loadReport() {
  reportPayload.value = null;
  reportError.value = null;

  if (!props.detail.caseId) return;

  isReportLoading.value = true;
  try {
    reportPayload.value = await fetchBncReport(props.detail.caseId);
  } catch {
    if (!fallbackReport.value) {
      reportError.value = '보관된 리포트를 불러오지 못했습니다.';
    }
  } finally {
    isReportLoading.value = false;
  }
}

onMounted(() => {
  void loadReport();
});

watch(
  () => props.detail.caseId,
  () => {
    void loadReport();
  }
);
</script>

<template>
  <div class="action-history-detail">
    <div class="action-history-detail__toolbar">
      <div class="action-history-detail__title">
        <strong>{{ detail.targetTgText }}</strong>
        <span>{{ detail.displayDay }} · {{ detail.hitlDecision.selectedPlanTitle }}</span>
      </div>
      <BaseButton variant="ghost" size="sm" @click="$emit('back')">
        <ArrowLeft :size="14" />
        목록
      </BaseButton>
    </div>

    <BottleneckReportPanel
      :report="activeReport"
      :loading="isReportLoading"
      :error-message="reportError"
      :ai-busy="aiBusy"
      @ask-ai="$emit('askAi', detail)"
    />
  </div>
</template>

<style scoped>
.action-history-detail {
  display: grid;
  gap: var(--space-4);
}

.action-history-detail__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  border-bottom: 1px solid var(--color-border-subtle);
  padding-bottom: var(--space-3);
}

.action-history-detail__title {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.action-history-detail__title strong {
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-history-detail__title span {
  overflow: hidden;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

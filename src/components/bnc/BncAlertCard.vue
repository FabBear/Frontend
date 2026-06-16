<script setup lang="ts">
import { computed } from 'vue';

import { BNC_STATUS_META, BNC_STEP_LABELS } from '@/constants/bnc';
import { riskGradeToLevel } from '@/constants/riskLevel';

import type { BncAlertCase } from '@/types/bnc';

import BottleneckCaseCard from '@/components/common/BottleneckCaseCard.vue';

import { formatKoMonthDayTime, formatNumber, formatRatioPercent, formatRiskScore } from '@/utils/format';

const props = defineProps<{
  item: BncAlertCase;
  selected?: boolean;
}>();

defineEmits<{
  select: [caseId: string];
}>();

const riskLevel = computed(() => riskGradeToLevel(props.item.riskGrade));
const progressRate = computed(() => {
  if (!props.item.totalSteps) return 0;
  return Math.round((props.item.stepProgress / props.item.totalSteps) * 100);
});
const statusMeta = computed(() => BNC_STATUS_META[props.item.status]);
const currentStepLabel = computed(() =>
  props.item.currentStepName ? (BNC_STEP_LABELS[props.item.currentStepName] ?? props.item.currentStepName) : null
);
const subtitle = computed(() => `${props.item.areaName} · ${formatKoMonthDayTime(props.item.detectedAt)}`);
const alertMetrics = computed(() => props.item.alertMetrics ?? null);
const metrics = computed(() => [
  {
    label: '위험 점수',
    value: formatRiskScore(props.item.riskScore ?? alertMetrics.value?.compositeScore ?? null),
    tone: 'risk' as const,
  },
  { label: '영향', value: formatImpactMetric() },
  {
    label: '위험 Lot',
    value: formatNumber(alertMetrics.value?.atRiskLots ?? null),
  },
]);

function formatImpactMetric(): string {
  if (!alertMetrics.value) return '-';
  return alertMetrics.value.impactScore !== null
    ? formatRatioPercent(alertMetrics.value.impactScore)
    : `${formatNumber(alertMetrics.value.affectedCount)}개`;
}

const statusText = computed(() =>
  currentStepLabel.value
    ? `${currentStepLabel.value} · ${props.item.stepProgress}/${props.item.totalSteps}`
    : `${props.item.stepProgress}/${props.item.totalSteps} 완료`
);
</script>

<template>
  <BottleneckCaseCard
    variant="compact"
    :title="item.tgName"
    :subtitle="subtitle"
    :risk-level="riskLevel"
    :metrics="metrics"
    :status-badge="{ label: statusMeta.label, variant: statusMeta.variant }"
    :status-text="statusText"
    :progress="progressRate"
    :selected="selected"
    selectable
    @select="$emit('select', item.caseId)"
  />
</template>

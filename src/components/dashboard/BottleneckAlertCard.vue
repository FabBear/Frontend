<script setup lang="ts">
import { computed } from 'vue';

import { Activity, Gauge } from '@lucide/vue';

import { formatAlertAreaDisplay } from '@/constants/processArea';

import type { BottleneckAlertItem } from '@/types/dashboard';

import BaseButton from '@/components/base/BaseButton.vue';
import BottleneckCaseCard from '@/components/common/BottleneckCaseCard.vue';

import { formatKoTime, formatNumber, formatRatioPercent } from '@/utils/format';

interface Props {
  alert: BottleneckAlertItem;
  selected?: boolean; // 모니터링 뷰 목록에서 선택 상태
  showActions?: boolean; // false이면 액션 버튼 숨김 (목록용)
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  showActions: true,
});

const emit = defineEmits<{
  select: [];
  openCenter: [caseId: string];
  openMonitoring: [caseId: string];
}>();

const detectedTime = computed(() => formatKoTime(props.alert.detectedAt));
const areaDisplay = computed(() => formatAlertAreaDisplay(props.alert.areaName, props.alert.tgName));
const metrics = computed(() => [
  { label: '예상 지연', value: props.alert.estDelayHours.toFixed(1), unit: '시간', tone: 'risk' as const },
  { label: '영향 TG', value: formatNumber(props.alert.affectedTgCount), unit: '개' },
  { label: '병목 확률', value: formatRatioPercent(props.alert.bottleneckProb) },
]);

const STEP_LABELS: Record<string, string> = {
  DIFFUSION_ANALYSIS: '확산 분석 중',
  CAUSE_ANALYSIS: '원인 분석 중',
  ACTION_PLAN_GEN: '대응안 생성 중',
  ACTION_PLAN_COMPARE: '대응안 비교 중',
  HITL_WAITING: '승인 대기',
  REPORT_GEN: '리포트 생성 중',
};

const statusLine = computed(() => {
  const stepLabel = STEP_LABELS[props.alert.currentStepName] ?? '에이전트 분석 준비 중';
  return { type: 'step' as const, text: stepLabel };
});

function handleCardClick() {
  if (!props.showActions) emit('select');
}
</script>

<template>
  <BottleneckCaseCard
    variant="dashboard"
    :title="alert.tgName"
    :subtitle="areaDisplay"
    :risk-level="alert.riskLevel"
    :time-label="detectedTime"
    :time-datetime="alert.detectedAt"
    :metrics="metrics"
    :status-text="statusLine.text"
    :status-kind="statusLine.type"
    :selected="selected"
    :selectable="!showActions"
    @select="handleCardClick"
  >
    <template v-if="showActions" #actions>
      <BaseButton variant="soft" size="sm" @click="emit('openMonitoring', alert.caseId)">
        <Activity :size="14" aria-hidden="true" />
        병목 모니터링
      </BaseButton>
      <BaseButton
        size="sm"
        :disabled="!alert.canAnalyzeCause"
        :title="
          alert.canAnalyzeCause
            ? '원인 분석과 대응안을 병목 대응 센터에서 확인합니다.'
            : '원인 분석 완료 후 활성화됩니다.'
        "
        @click="emit('openCenter', alert.caseId)"
      >
        <Gauge :size="14" aria-hidden="true" />
        병목 대응 센터
      </BaseButton>
    </template>
  </BottleneckCaseCard>
</template>

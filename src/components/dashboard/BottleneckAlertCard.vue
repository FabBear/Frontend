<script setup lang="ts">
import { computed } from 'vue';

import type { BottleneckAlertItem } from '@/types/dashboard';

import BaseButton from '@/components/base/BaseButton.vue';
import BottleneckCaseCard from '@/components/common/BottleneckCaseCard.vue';

import {
  getBottleneckAlertMetrics,
  getBottleneckAlertProgress,
  getBottleneckAlertStatusBadge,
  getBottleneckAlertStatusText,
  getBottleneckAlertSubtitle,
} from '@/utils/bottleneckAlertCard';

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

const subtitle = computed(() => getBottleneckAlertSubtitle(props.alert));
const metrics = computed(() => getBottleneckAlertMetrics(props.alert));
const statusBadge = computed(() => getBottleneckAlertStatusBadge(props.alert));
const statusText = computed(() => getBottleneckAlertStatusText(props.alert));
const progress = computed(() => getBottleneckAlertProgress(props.alert));

function handleCardClick() {
  if (!props.showActions) emit('select');
}
</script>

<template>
  <BottleneckCaseCard
    variant="compact"
    :title="alert.tgName"
    :subtitle="subtitle"
    :risk-level="alert.riskLevel"
    :metrics="metrics"
    :status-badge="statusBadge"
    :status-text="statusText"
    status-kind="step"
    :progress="progress"
    :selected="selected"
    :selectable="!showActions"
    @select="handleCardClick"
  >
    <template v-if="showActions" #actions>
      <BaseButton variant="soft" size="sm" @click="emit('openMonitoring', alert.caseId)"> 병목 모니터링 </BaseButton>
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
        병목 대응 센터
      </BaseButton>
    </template>
  </BottleneckCaseCard>
</template>

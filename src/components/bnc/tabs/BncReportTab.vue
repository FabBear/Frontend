<script setup lang="ts">
import type { BncReportPayload } from '@/types/bnc';

import BottleneckReportPanel from '@/components/report/BottleneckReportPanel.vue';

defineProps<{
  report: BncReportPayload | null;
  loading?: boolean;
  errorMessage?: string | null;
  aiBusy?: boolean;
}>();

defineEmits<{
  askAi: [];
}>();
</script>

<template>
  <BottleneckReportPanel
    :report="report"
    :loading="loading"
    :error-message="errorMessage"
    :ai-busy="aiBusy"
    @ask-ai="$emit('askAi')"
  />
</template>

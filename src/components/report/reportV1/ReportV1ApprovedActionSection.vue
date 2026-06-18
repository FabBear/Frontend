<script setup lang="ts">
import { computed } from 'vue';

import { ClipboardCheck } from '@lucide/vue';

import type { ReportV1 } from '@/types/report';

import type { ReportV1CandidateDisplay } from '@/utils/reportV1DisplayAdapter';

const props = defineProps<{
  report: ReportV1;
  approvedLabel: string;
  approvedCandidate: ReportV1CandidateDisplay | null;
}>();

const rec = computed(() => props.report.actions.recommendation);

const planDescription = computed(
  () => rec.value.plan_description ?? props.approvedCandidate?.description ?? rec.value.headline
);

const effectAndRisk = computed(() => rec.value.effect_and_risk ?? rec.value.primary_reason);

const approvalReason = computed(() => {
  if (rec.value.approval_reason) return rec.value.approval_reason;
  if (rec.value.why_not_others.length) {
    return rec.value.why_not_others.map((w) => `${w.label}: ${w.reason}`).join(' ');
  }
  return null;
});
</script>

<template>
  <section class="report-v1__panel">
    <div class="report-v1__panel-head">
      <h3>승인된 대응안</h3>
    </div>

    <div class="approved-action__header">
      <ClipboardCheck :size="20" aria-hidden="true" class="approved-action__icon" />
      <span class="approved-action__label">{{ approvedLabel }}</span>
    </div>

    <div class="approved-action__sections">
      <!-- 1. 대응안 -->
      <div class="approved-action__section">
        <h4 class="approved-action__section-title">대응안</h4>
        <p class="approved-action__section-body">{{ planDescription }}</p>
      </div>

      <!-- 2. 효과 및 리스크 -->
      <div class="approved-action__section">
        <h4 class="approved-action__section-title">효과 및 리스크</h4>
        <p class="approved-action__section-body">{{ effectAndRisk }}</p>
      </div>

      <!-- 3. 승인 사유 -->
      <div v-if="approvalReason" class="approved-action__section approved-action__section--reason">
        <h4 class="approved-action__section-title">승인 사유</h4>
        <p class="approved-action__section-body">{{ approvalReason }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.approved-action__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}

.approved-action__icon {
  color: var(--color-status-success);
  flex-shrink: 0;
}

.approved-action__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-status-success);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.approved-action__sections {
  display: grid;
  gap: var(--space-3);
}

.approved-action__section {
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-left: 3px solid var(--color-border-default);
  border-radius: var(--radius-md);
}

.approved-action__section--reason {
  border-left-color: color-mix(in srgb, var(--color-status-success) 50%, var(--color-border-default));
  background: color-mix(in srgb, var(--color-status-success) 3%, var(--color-bg-page));
}

.approved-action__section-title {
  margin: 0 0 var(--space-2);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.approved-action__section-body {
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: 1.65;
  color: var(--color-fg);
  word-break: keep-all;
}
</style>

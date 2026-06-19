<script setup lang="ts">
import type { BncActionPlan } from '@/types/bnc';

import BaseButton from '@/components/base/BaseButton.vue';

defineProps<{
  plans: BncActionPlan[];
  selectedPlanId: string | null;
  isPendingReject: boolean;
  isCurrentOptionSelected: boolean;
  canSubmit: boolean;
}>();

defineEmits<{
  selectPlan: [planId: string];
  approve: [];
  rejectStart: [];
  rejectCancel: [];
  rejectConfirm: [];
}>();

const rejectionNote = defineModel<string>('rejectionNote', { required: true });
const approvalNote = defineModel<string>('approvalNote', { required: true });
</script>

<template>
  <section
    class="bnc-solutions__hitl"
    :class="{
      'bnc-solutions__hitl--pending-reject': isPendingReject,
    }"
  >
    <!-- 반려 / 현황 유지 확인 -->
    <template v-if="isPendingReject">
      <div class="bnc-solutions__hitl-header">
        <div>
          <h3>반려 · 현황 유지 확인</h3>
        </div>
      </div>
      <div class="bnc-solutions__hitl-reject-form">
        <p class="bnc-solutions__hitl-confirm-desc">
          현재 운영 상태를 유지하고 대응안을 반려합니다. 계속하시겠습니까?
        </p>
        <label class="bnc-solutions__hitl-label" for="bnc-rejection-note">
          반려 사유 <span class="bnc-solutions__hitl-optional">(선택)</span>
        </label>
        <textarea
          id="bnc-rejection-note"
          v-model="rejectionNote"
          class="bnc-solutions__hitl-textarea"
          placeholder="사유를 남길 수 있습니다 (선택)"
          rows="2"
        />
        <div class="bnc-solutions__hitl-actions">
          <BaseButton variant="ghost" @click="$emit('rejectCancel')">취소</BaseButton>
          <button
            type="button"
            class="bnc-solutions__btn-reject-confirm"
            @click="$emit('rejectConfirm')"
          >
            ✗ 반려 · 현황 유지 확정
          </button>
        </div>
      </div>
    </template>

    <!-- 대기 중 -->
    <template v-else>
      <div class="bnc-solutions__hitl-header">
        <h3>HITL 검토 및 승인</h3>
      </div>
      <div class="bnc-solutions__hitl-approve-form">
        <label class="bnc-solutions__hitl-field" for="bnc-hitl-plan-select">
          <span class="bnc-solutions__hitl-label">대응안 선택</span>
          <select
            id="bnc-hitl-plan-select"
            class="bnc-solutions__hitl-select"
            :value="isCurrentOptionSelected ? '' : (selectedPlanId ?? '')"
            @change="$emit('selectPlan', ($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>승인할 대응안을 선택하세요</option>
            <option v-for="plan in plans" :key="plan.planId" :value="plan.planId">
              {{ plan.actionLabel ?? plan.title }}
            </option>
          </select>
        </label>

        <label class="bnc-solutions__hitl-field" for="bnc-approval-note">
          <span class="bnc-solutions__hitl-label"> 비고 <span class="bnc-solutions__hitl-optional">(선택)</span> </span>
          <textarea
            id="bnc-approval-note"
            v-model="approvalNote"
            class="bnc-solutions__hitl-textarea"
            placeholder="승인 비고를 남길 수 있습니다"
            rows="1"
            :disabled="!canSubmit"
          />
        </label>

        <div class="bnc-solutions__hitl-actions">
          <BaseButton :disabled="!canSubmit" @click="$emit('approve')">✓ 승인</BaseButton>
          <BaseButton variant="ghost" :disabled="!canSubmit" @click="$emit('rejectStart')">
            ✗ 반려 · 현황 유지
          </BaseButton>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.bnc-solutions__hitl {
  padding: var(--space-3);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  display: grid;
  gap: var(--space-2);
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.bnc-solutions__hitl--pending-reject {
  border-color: color-mix(in srgb, var(--color-status-danger) 35%, var(--color-border-default));
}

/* 헤더 row */
.bnc-solutions__hitl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.bnc-solutions__hitl-header h3 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}

/* 반려 사유 / 승인 비고 폼 */
.bnc-solutions__hitl-reject-form,
.bnc-solutions__hitl-approve-form {
  display: grid;
  gap: var(--space-2);
}

.bnc-solutions__hitl-field {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.bnc-solutions__hitl-optional {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__hitl-label {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__hitl-required {
  color: var(--color-status-danger);
  margin-left: 2px;
}

.bnc-solutions__hitl-confirm-desc {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.bnc-solutions__hitl-textarea {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  color: var(--color-fg);
  font: inherit;
  font-size: var(--font-size-sm);
  resize: none;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.bnc-solutions__hitl-select {
  width: 100%;
  height: 38px;
  padding: 0 var(--space-3);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  color: var(--color-fg);
  font: inherit;
  font-size: var(--font-size-sm);
  box-sizing: border-box;
}

.bnc-solutions__hitl-select:focus {
  outline: none;
  border-color: var(--color-action-primary-border);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-action-primary) 15%, transparent);
}

.bnc-solutions__hitl-textarea:focus {
  outline: none;
  border-color: var(--color-action-primary-border);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-action-primary) 15%, transparent);
}

.bnc-solutions__hitl-textarea::placeholder {
  color: var(--color-fg-muted);
}

/* 액션 버튼 행 */
.bnc-solutions__hitl-actions {
  display: flex;
  justify-content: flex-end;
  align-self: end;
  gap: var(--space-2);
}

.bnc-solutions__btn-reject-confirm {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-4);
  min-height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-status-danger);
  border: 1px solid var(--color-status-danger);
  color: #fff;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.bnc-solutions__btn-reject-confirm:disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}

.bnc-solutions__btn-reject-confirm:not(:disabled):hover {
  opacity: 0.88;
}

@media (min-width: 900px) {
  .bnc-solutions__hitl-approve-form {
    grid-template-columns: minmax(220px, 280px) minmax(0, 1fr) auto;
    align-items: end;
  }
}
</style>

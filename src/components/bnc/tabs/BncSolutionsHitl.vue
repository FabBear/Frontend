<script setup lang="ts">
import BaseButton from '@/components/base/BaseButton.vue';

defineProps<{
  selectedPlanTitle: string | null;
  recommendedPlanLabel: string | null;
  isPendingReject: boolean;
  isCurrentOptionSelected: boolean;
  isSelectionOffRecommendation: boolean;
  canSubmit: boolean;
}>();

defineEmits<{
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
    <!-- 반려 사유 입력 중 -->
    <template v-if="isPendingReject">
      <div class="bnc-solutions__hitl-header">
        <div>
          <h3>반려 사유 입력</h3>
          <p>
            선택된 대응안: <strong>{{ selectedPlanTitle }}</strong>
          </p>
        </div>
      </div>
      <div class="bnc-solutions__hitl-reject-form">
        <label class="bnc-solutions__hitl-label" for="bnc-rejection-note">
          반려 사유 <span class="bnc-solutions__hitl-required" aria-hidden="true">*</span>
        </label>
        <textarea
          id="bnc-rejection-note"
          v-model="rejectionNote"
          class="bnc-solutions__hitl-textarea"
          placeholder="현장 담당자 확인 후 반려 사유를 작성하세요"
          rows="3"
        />
        <div class="bnc-solutions__hitl-actions">
          <BaseButton variant="ghost" @click="$emit('rejectCancel')">취소</BaseButton>
          <button
            type="button"
            class="bnc-solutions__btn-reject-confirm"
            :disabled="!rejectionNote.trim()"
            @click="$emit('rejectConfirm')"
          >
            ✗ 반려 확정
          </button>
        </div>
      </div>
    </template>

    <!-- 대기 중 -->
    <template v-else>
      <div class="bnc-solutions__hitl-header">
        <div>
          <h3>HITL 검토 및 승인</h3>
          <p v-if="isCurrentOptionSelected" class="bnc-solutions__hitl-hint">
            현재 유지는 비교 기준입니다. 승인할 후보 대응안을 선택하세요.
          </p>
          <p v-else-if="selectedPlanTitle">
            선택된 대응안: <strong>{{ selectedPlanTitle }}</strong>
          </p>
          <p v-else class="bnc-solutions__hitl-hint">위 카드에서 대응안을 선택하세요.</p>
          <p v-if="isSelectionOffRecommendation" class="bnc-solutions__hitl-warn">
            ⚠ 기준 선택안({{ recommendedPlanLabel ?? '-' }})과 다른 대응안을 선택했습니다.
          </p>
        </div>
      </div>
      <div class="bnc-solutions__hitl-approve-form">
        <label class="bnc-solutions__hitl-label" for="bnc-approval-note">
          비고 <span class="bnc-solutions__hitl-optional">(선택)</span>
        </label>
        <textarea
          id="bnc-approval-note"
          v-model="approvalNote"
          class="bnc-solutions__hitl-textarea"
          placeholder="승인 비고를 남길 수 있습니다 (선택)"
          rows="2"
          :disabled="!canSubmit"
        />
        <div class="bnc-solutions__hitl-actions">
          <BaseButton :disabled="!canSubmit" @click="$emit('approve')">✓ 승인</BaseButton>
          <BaseButton variant="ghost" :disabled="!canSubmit" @click="$emit('rejectStart')"> ✗ 반려 </BaseButton>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.bnc-solutions__hitl {
  padding: var(--space-4);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  display: grid;
  gap: var(--space-3);
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

.bnc-solutions__hitl-header p {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.bnc-solutions__hitl-header strong {
  color: var(--color-fg-strong);
}

.bnc-solutions__hitl-hint {
  color: var(--color-fg-muted);
  font-style: italic;
}

.bnc-solutions__hitl-warn {
  margin: var(--space-1) 0 0;
  color: var(--color-status-warning);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

/* 반려 사유 / 승인 비고 폼 */
.bnc-solutions__hitl-reject-form,
.bnc-solutions__hitl-approve-form {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-3);
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

.bnc-solutions__hitl-textarea {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  color: var(--color-fg);
  font: inherit;
  font-size: var(--font-size-sm);
  resize: vertical;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
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
</style>

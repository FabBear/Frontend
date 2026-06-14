<script setup lang="ts">
import type { AdminAccessUser } from '@/types/admin';

import BaseButton from '@/components/base/BaseButton.vue';
import BaseModal from '@/components/base/BaseModal.vue';

defineProps<{
  modelValue: boolean;
  user: AdminAccessUser | null;
  isLastAdmin?: boolean;
}>();

defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [];
}>();
</script>

<template>
  <BaseModal :model-value="modelValue" title="사용자 삭제" @update:model-value="$emit('update:modelValue', $event)">
    <div class="admin-delete-user-modal">
      <p v-if="isLastAdmin" class="admin-delete-user-modal__warn">
        관리자(ADMIN) 계정은 최소 1개 이상 유지해야 합니다. 다른 관리자를 먼저 지정하세요.
      </p>
      <template v-else>
        <p>
          <strong>{{ user?.name }}</strong>
          <span class="admin-delete-user-modal__id">({{ user?.id }})</span>
          사용자를 삭제합니다.
        </p>
        <p class="admin-delete-user-modal__sub">
          삭제 후 해당 계정으로 로그인할 수 없습니다. 이 작업은 되돌릴 수 없습니다.
        </p>
      </template>
      <footer>
        <BaseButton
          v-if="!isLastAdmin"
          size="sm"
          variant="ghost"
          class="admin-delete-user-modal__delete-btn"
          @click="$emit('confirm')"
        >
          삭제
        </BaseButton>
        <BaseButton variant="ghost" size="sm" @click="$emit('update:modelValue', false)">취소</BaseButton>
      </footer>
    </div>
  </BaseModal>
</template>

<style scoped>
.admin-delete-user-modal {
  display: grid;
  gap: var(--space-3);
}

.admin-delete-user-modal p {
  margin: 0;
  color: var(--color-fg-muted);
}

.admin-delete-user-modal strong {
  color: var(--color-fg-strong);
}

.admin-delete-user-modal__id {
  margin-left: 4px;
  color: var(--color-fg-muted);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
}

.admin-delete-user-modal__sub {
  border: var(--border-width-default) solid
    color-mix(in srgb, var(--color-risk-critical) 36%, var(--color-border-default));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-risk-critical) 6%, var(--color-bg-card));
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
}

.admin-delete-user-modal__warn {
  border: var(--border-width-default) solid color-mix(in srgb, var(--color-risk-high) 36%, var(--color-border-default));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-risk-high) 6%, var(--color-bg-card));
  padding: var(--space-2) var(--space-3);
  font-size: var(--font-size-sm);
}

.admin-delete-user-modal footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.admin-delete-user-modal__delete-btn {
  color: var(--color-risk-critical) !important;
}
</style>

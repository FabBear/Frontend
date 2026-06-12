<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import type { AdminAccessUser, AdminUserRole } from '@/types/admin';

import BaseButton from '@/components/base/BaseButton.vue';
import BaseInput from '@/components/base/BaseInput.vue';
import BaseModal from '@/components/base/BaseModal.vue';
import BaseToggle from '@/components/base/BaseToggle.vue';

const ROLE_OPTIONS: Array<{ value: AdminUserRole; label: string }> = [
  { value: 'ADMIN', label: '관리자' },
  { value: 'ENGINEER', label: '공정 엔지니어' },
  { value: 'VIEWER', label: '조회자' },
];

const props = defineProps<{
  modelValue: boolean;
  user: AdminAccessUser | null;
  existingIds: string[];
  originalId: string | null;
  departmentSuggestions: string[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  save: [user: AdminAccessUser];
}>();

const draft = ref<AdminAccessUser | null>(null);
const errors = ref<Record<string, string>>({});
const pendingUser = ref<AdminAccessUser | null>(null);
const isConfirmOpen = ref(false);
const OTHER_DEPARTMENT_VALUE = '__OTHER__';
const isOtherSelected = ref(false);
const selectedDepartment = computed({
  get() {
    if (isOtherSelected.value) return OTHER_DEPARTMENT_VALUE;
    return draft.value?.department ?? '';
  },
  set(value: string) {
    if (!draft.value) return;
    if (value === OTHER_DEPARTMENT_VALUE) {
      isOtherSelected.value = true;
      draft.value.department = '';
    } else {
      isOtherSelected.value = false;
      draft.value.department = value;
    }
  },
});

watch(
  () => props.user,
  (user) => {
    draft.value = user ? { ...user } : null;
    errors.value = {};
    pendingUser.value = null;
    isConfirmOpen.value = false;
    if (user) {
      isOtherSelected.value = !user.department || !props.departmentSuggestions.includes(user.department);
    } else {
      isOtherSelected.value = false;
    }
  },
  { immediate: true }
);

function close() {
  pendingUser.value = null;
  isConfirmOpen.value = false;
  emit('update:modelValue', false);
}

function handleModalUpdate(value: boolean) {
  if (!value) close();
}

function updateLoginId(value: string) {
  if (!draft.value || props.originalId) return;
  draft.value.id = value.replace(/[^a-zA-Z0-9._-]/g, '');
  if (errors.value.id) {
    errors.value = { ...errors.value, id: '' };
  }
}

function normalizeUser(user: AdminAccessUser): AdminAccessUser {
  return {
    ...user,
    id: user.id.trim(),
    name: user.name.trim(),
    department: user.department.trim(),
    fabAccess: user.fabAccess.trim(),
  };
}

function validateUser(user: AdminAccessUser) {
  const nextErrors: Record<string, string> = {};
  if (!user.id) nextErrors.id = '로그인 ID를 입력하세요.';
  if (user.id && !/^[a-zA-Z0-9._-]{3,50}$/.test(user.id)) {
    nextErrors.id = '한글 없이 3~50자의 영문, 숫자, ., _, -만 사용할 수 있습니다.';
  }
  if (props.existingIds.some((id) => id === user.id && id !== props.originalId)) {
    nextErrors.id = '이미 사용 중인 로그인 ID입니다.';
  }
  if (!user.name) nextErrors.name = '이름을 입력하세요.';
  if (!user.department) nextErrors.department = '부서를 입력하세요.';
  if (!user.fabAccess) nextErrors.fabAccess = '소속 공장을 입력하세요.';
  if (!user.role) nextErrors.role = '역할을 선택하세요.';
  return nextErrors;
}

function statusLabel(status: AdminAccessUser['status']) {
  const labels: Record<AdminAccessUser['status'], string> = {
    ACTIVE: '활성',
    PENDING: '대기',
    INACTIVE: '비활성',
    LOCKED: '잠김',
  };
  return labels[status];
}

function roleLabel(role: AdminUserRole) {
  return ROLE_OPTIONS.find((opt) => opt.value === role)?.label ?? role;
}

function save() {
  if (!draft.value) return;
  const normalizedUser = normalizeUser(draft.value);
  const nextErrors = validateUser(normalizedUser);
  errors.value = nextErrors;
  if (Object.keys(nextErrors).length > 0) return;
  pendingUser.value = normalizedUser;
  isConfirmOpen.value = true;
}

function confirmSave() {
  if (!pendingUser.value) return;
  emit('save', pendingUser.value);
  close();
}
</script>

<template>
  <BaseModal :model-value="modelValue" title="사용자 정보" width="480px" @update:model-value="handleModalUpdate">
    <form v-if="draft" class="admin-access-user-modal" @submit.prevent="save">
      <div class="admin-access-user-modal__grid">
        <label>
          <span>로그인 ID</span>
          <BaseInput
            :model-value="draft.id"
            :disabled="Boolean(originalId)"
            placeholder="예: engineer01"
            @update:model-value="updateLoginId"
          />
          <em>영문, 숫자, ., _, -만 입력할 수 있습니다.</em>
          <small v-if="errors.id">{{ errors.id }}</small>
        </label>
        <label>
          <span>이름</span>
          <BaseInput v-model="draft.name" />
          <small v-if="errors.name">{{ errors.name }}</small>
        </label>
        <label>
          <span>부서</span>
          <select v-model="selectedDepartment" class="input">
            <option v-for="department in departmentSuggestions" :key="department" :value="department">
              {{ department }}
            </option>
            <option :value="OTHER_DEPARTMENT_VALUE">기타</option>
          </select>
          <input v-if="isOtherSelected" v-model="draft.department" class="input" placeholder="신규 부서명 입력" />
          <em>목록에 없는 부서는 기타를 선택한 뒤 입력하세요.</em>
          <small v-if="errors.department">{{ errors.department }}</small>
        </label>
        <label>
          <span>소속 공장</span>
          <BaseInput v-model="draft.fabAccess" disabled />
          <em>로그인/연결된 MES 기준 공장입니다.</em>
          <small v-if="errors.fabAccess">{{ errors.fabAccess }}</small>
        </label>
      </div>
      <label>
        <span>역할</span>
        <select v-model="draft.role" class="input">
          <option v-for="option in ROLE_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
        <em>VIEWER 조회 전용 · ENGINEER 분석/운영 · ADMIN 전체 권한</em>
        <small v-if="errors.role">{{ errors.role }}</small>
      </label>
      <section class="admin-access-user-modal__state-panel" aria-label="계정 접근 상태">
        <div class="admin-access-user-modal__login-row">
          <span>로그인 허용</span>
          <BaseToggle v-model="draft.isActive" />
          <em>꺼짐이면 계정 상태와 관계없이 로그인할 수 없습니다.</em>
        </div>
        <label class="admin-access-user-modal__status-row">
          <span>계정 상태</span>
          <select v-model="draft.status" class="input">
            <option value="ACTIVE">활성</option>
            <option value="PENDING">대기</option>
            <option value="INACTIVE">비활성</option>
            <option value="LOCKED">잠김</option>
          </select>
        </label>
      </section>
      <footer>
        <BaseButton type="submit" size="sm">저장</BaseButton>
        <BaseButton type="button" variant="ghost" size="sm" @click="close">취소</BaseButton>
      </footer>
    </form>
  </BaseModal>
  <BaseModal :model-value="isConfirmOpen" title="저장 확인" @update:model-value="isConfirmOpen = $event">
    <div v-if="pendingUser" class="admin-access-user-modal__confirm">
      <p>아래 정보로 사용자 계정을 저장하시겠습니까?</p>
      <dl>
        <div>
          <dt>로그인 ID</dt>
          <dd>{{ pendingUser.id }}</dd>
        </div>
        <div>
          <dt>역할</dt>
          <dd>{{ roleLabel(pendingUser.role) }}</dd>
        </div>
        <div>
          <dt>로그인</dt>
          <dd>{{ pendingUser.isActive ? '허용' : '차단' }}</dd>
        </div>
        <div>
          <dt>계정 상태</dt>
          <dd>{{ statusLabel(pendingUser.status) }}</dd>
        </div>
      </dl>
      <footer>
        <BaseButton size="sm" @click="confirmSave">저장</BaseButton>
        <BaseButton size="sm" variant="ghost" @click="isConfirmOpen = false">취소</BaseButton>
      </footer>
    </div>
  </BaseModal>
</template>

<style scoped>
.admin-access-user-modal,
.admin-access-user-modal label {
  display: grid;
  gap: var(--space-2);
  align-content: start;
}

.admin-access-user-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: var(--space-4);
  row-gap: var(--space-3);
  align-items: start;
}

.admin-access-user-modal p,
.admin-access-user-modal span {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.admin-access-user-modal small {
  color: var(--color-risk-critical);
  font-size: var(--font-size-xs);
}

.admin-access-user-modal :deep(.input),
.admin-access-user-modal .input {
  width: 100%;
}

.admin-access-user-modal em {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-style: normal;
  line-height: 1.45;
  max-width: 32ch;
}

.admin-access-user-modal__state-panel {
  display: grid;
  gap: var(--space-3);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  padding: var(--space-4);
}

.admin-access-user-modal__state-panel > div,
.admin-access-user-modal__state-panel label {
  display: grid;
  gap: var(--space-2);
}

.admin-access-user-modal__login-row {
  display: grid !important;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.admin-access-user-modal__status-row {
  display: grid !important;
  grid-template-columns: auto minmax(180px, 1fr);
  align-items: center;
  gap: var(--space-3);
}

.admin-access-user-modal__status-row span {
  white-space: nowrap;
}

.admin-access-user-modal__login-row :deep(.base-toggle) {
  display: inline-flex !important;
  flex: 0 0 auto;
  white-space: nowrap;
}

.admin-access-user-modal__login-row span {
  white-space: nowrap;
}

.admin-access-user-modal__state-panel em {
  max-width: none;
  white-space: nowrap;
}

.admin-access-user-modal footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-2);
}

.admin-access-user-modal__confirm {
  display: grid;
  gap: var(--space-4);
}

.admin-access-user-modal__confirm p {
  margin: 0;
  color: var(--color-fg-muted);
}

.admin-access-user-modal__confirm dl {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

.admin-access-user-modal__confirm dl div {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: var(--space-3);
  align-items: center;
  border-bottom: 1px solid var(--color-border-subtle);
  padding-bottom: var(--space-2);
}

.admin-access-user-modal__confirm dt,
.admin-access-user-modal__confirm dd {
  margin: 0;
}

.admin-access-user-modal__confirm dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.admin-access-user-modal__confirm dd {
  color: var(--color-fg-strong);
  font-weight: 700;
}

@media (max-width: 680px) {
  .admin-access-user-modal__grid {
    grid-template-columns: 1fr;
  }

  .admin-access-user-modal__state-panel em {
    white-space: normal;
  }

  .admin-access-user-modal__login-row {
    grid-template-columns: 1fr;
  }

  .admin-access-user-modal__status-row {
    grid-template-columns: 1fr;
  }
}
</style>

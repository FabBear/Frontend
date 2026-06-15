<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { useAuthStore } from '@/stores/auth';

import {
  createAdminAccessUser,
  deleteAdminAccessUser,
  fetchAdminAccessUsers,
  updateAdminAccessUser,
} from '@/services/adminService';
import { getApiErrorMessage } from '@/services/api';

import type { AdminAccessUser, AdminUserRole } from '@/types/admin';

import AdminAccessTable from '@/components/admin/AdminAccessTable.vue';
import AdminAccessUserModal from '@/components/admin/AdminAccessUserModal.vue';
import AdminDeleteUserModal from '@/components/admin/AdminDeleteUserModal.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseInput from '@/components/base/BaseInput.vue';

const authStore = useAuthStore();
const users = ref<AdminAccessUser[]>([]);
const isLoading = ref(false);
const loadError = ref<string | null>(null);
const actionError = ref<string | null>(null);
const keyword = ref('');
const statusFilters = ref<AdminAccessUser['status'][]>([]);
const roleFilter = ref<AdminUserRole | 'ALL'>('ALL');
const editingUser = ref<AdminAccessUser | null>(null);
const originalLoginId = ref<string | null>(null);
const isUserModalOpen = ref(false);
const deletingUser = ref<AdminAccessUser | null>(null);
const isDeleteModalOpen = ref(false);

const filteredUsers = computed(() => {
  const value = keyword.value.trim().toLowerCase();
  const keywordMatchedUsers = value
    ? users.value.filter((user) => `${user.id} ${user.name} ${user.department}`.toLowerCase().includes(value))
    : users.value;
  const roleMatchedUsers =
    roleFilter.value === 'ALL'
      ? keywordMatchedUsers
      : keywordMatchedUsers.filter((user) => user.role === roleFilter.value);
  if (statusFilters.value.length === 0) return roleMatchedUsers;
  return roleMatchedUsers.filter((user) => statusFilters.value.includes(user.status));
});
const adminCount = computed(() => users.value.filter((user) => user.role === 'ADMIN').length);
// 활성(ACTIVE & 로그인 허용)이 아닌 계정 = 조치 필요. 라벨과 집계 기준을 일치시킨다.
const actionNeededCount = computed(
  () => users.value.filter((user) => user.status !== 'ACTIVE' || !user.isActive).length
);
const roleLabelMap: Record<AdminUserRole, string> = {
  ADMIN: '관리자',
  ENGINEER: '공정 엔지니어',
};
const roleOptions = computed<Array<{ value: AdminUserRole | 'ALL'; label: string }>>(() => [
  { value: 'ALL', label: '전체' },
  ...(['ADMIN', 'ENGINEER'] as AdminUserRole[]).map((role) => ({ value: role, label: roleLabelMap[role] })),
]);
const statusOptions: Array<{ value: AdminAccessUser['status']; label: string }> = [
  { value: 'ACTIVE', label: '활성' },
  { value: 'PENDING', label: '대기' },
  { value: 'INACTIVE', label: '비활성' },
  { value: 'LOCKED', label: '잠김' },
];
const statusFilterLabel = computed(() => {
  if (statusFilters.value.length === 0) return '전체 상태';
  return statusOptions
    .filter((option) => statusFilters.value.includes(option.value))
    .map((option) => option.label)
    .join(', ');
});
const currentFabName = computed(() => authStore.user?.fabName ?? authStore.user?.fabCode ?? '현재 FAB');
const existingIds = computed(() => users.value.map((user) => user.id));
const departmentSuggestions = computed(() => {
  const departments = users.value.map((user) => user.department).filter(Boolean);
  return Array.from(new Set(departments));
});
const activeAdminCount = computed(
  () => users.value.filter((user) => user.role === 'ADMIN' && user.status === 'ACTIVE' && user.isActive).length
);
const isDeleteBlocked = computed(() => {
  if (!deletingUser.value) return false;
  return isSelfUser(deletingUser.value) || isLastActiveAdmin(deletingUser.value);
});
const deleteBlockMessage = computed(() => {
  if (!deletingUser.value) return '';
  if (isSelfUser(deletingUser.value)) return '본인 계정은 삭제할 수 없습니다.';
  if (isLastActiveAdmin(deletingUser.value)) {
    return '관리자(ADMIN) 계정은 최소 1개 이상 유지해야 합니다. 다른 관리자를 먼저 지정하세요.';
  }
  return '';
});
function toggleStatusFilter(status: AdminAccessUser['status']) {
  statusFilters.value = statusFilters.value.includes(status)
    ? statusFilters.value.filter((value) => value !== status)
    : [...statusFilters.value, status];
}
function clearStatusFilters() {
  statusFilters.value = [];
}
async function loadUsers() {
  isLoading.value = true;
  loadError.value = null;
  try {
    users.value = await fetchAdminAccessUsers();
  } catch {
    loadError.value = '사용자 목록을 불러오지 못했습니다.';
    users.value = [];
  } finally {
    isLoading.value = false;
  }
}

function createBlankUser(): AdminAccessUser {
  return {
    userId: '',
    id: '',
    name: '',
    role: 'ENGINEER',
    department: authStore.user?.department ?? '',
    fabAccess: currentFabName.value,
    lastLogin: '-',
    status: 'ACTIVE',
    isActive: true,
    password: '',
    passwordConfirm: '',
  };
}

function openCreateModal() {
  actionError.value = null;
  editingUser.value = createBlankUser();
  originalLoginId.value = null;
  isUserModalOpen.value = true;
}

function openEditModal(user: AdminAccessUser) {
  actionError.value = null;
  editingUser.value = { ...user };
  originalLoginId.value = user.id;
  isUserModalOpen.value = true;
}

function openDeleteModal(user: AdminAccessUser) {
  actionError.value = null;
  deletingUser.value = user;
  isDeleteModalOpen.value = true;
}

async function saveUser(user: AdminAccessUser) {
  actionError.value = null;
  try {
    if (originalLoginId.value === null) {
      await createAdminAccessUser({
        loginId: user.id,
        userName: user.name,
        department: user.department,
        roleCode: user.role,
        password: user.password ?? '',
        status: user.status,
        isActive: user.isActive,
      });
    } else {
      await updateAdminAccessUser(user.userId, {
        userName: user.name,
        department: user.department,
        roleCode: user.role,
        status: user.status,
        isActive: user.isActive,
      });
    }
    await loadUsers();
  } catch (error) {
    actionError.value = getApiErrorMessage(error, '사용자 정보를 저장하지 못했습니다.');
  }
}

async function confirmDeleteUser() {
  if (!deletingUser.value || isDeleteBlocked.value) return;
  actionError.value = null;
  try {
    await deleteAdminAccessUser(deletingUser.value.userId);
    isDeleteModalOpen.value = false;
    deletingUser.value = null;
    await loadUsers();
  } catch (error) {
    actionError.value = getApiErrorMessage(error, '사용자를 삭제하지 못했습니다.');
  }
}

function isSelfUser(user: AdminAccessUser) {
  return Boolean(authStore.user?.userId && user.userId === authStore.user.userId);
}

function isLastActiveAdmin(user: AdminAccessUser) {
  return user.role === 'ADMIN' && user.status === 'ACTIVE' && user.isActive && activeAdminCount.value <= 1;
}

onMounted(loadUsers);
</script>
<template>
  <div class="admin-access-view">
    <header class="admin-access-view__header">
      <div>
        <h1>권한 관리</h1>
        <p>사용자 계정과 현장 역할·계정 상태를 관리합니다.</p>
      </div>
      <BaseButton class="admin-access-view__create-button" size="sm" @click="openCreateModal">사용자 추가</BaseButton>
    </header>
    <section class="admin-access-view__overview">
      <div class="surface-card">
        <span>전체 사용자</span>
        <strong>{{ users.length }}</strong>
        <small>등록 계정</small>
      </div>
      <div class="surface-card">
        <span>관리자</span>
        <strong>{{ adminCount }}</strong>
        <small>ADMIN 역할</small>
      </div>
      <div class="surface-card">
        <span>조치 필요</span>
        <strong>{{ actionNeededCount }}</strong>
        <small>대기 · 잠김 · 비활성</small>
      </div>
    </section>
    <section class="admin-access-view__card surface-card">
      <div class="admin-access-view__section-head">
        <div class="admin-access-view__title-row">
          <h2>사용자 계정</h2>
          <span>{{ filteredUsers.length }}명</span>
          <BaseInput
            v-model="keyword"
            class="admin-access-view__search"
            type="search"
            placeholder="ID, 이름, 부서 검색"
          />
        </div>
      </div>
      <div class="admin-access-view__filters">
        <label>
          <span>역할</span>
          <select v-model="roleFilter" class="input">
            <option v-for="option in roleOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <div class="admin-access-view__multi-filter">
          <span>상태</span>
          <details class="admin-access-view__status-dropdown">
            <summary>{{ statusFilterLabel }}</summary>
            <div class="admin-access-view__status-panel">
              <label v-for="option in statusOptions" :key="option.value">
                <input
                  type="checkbox"
                  :checked="statusFilters.includes(option.value)"
                  @change="toggleStatusFilter(option.value)"
                />
                <span>{{ option.label }}</span>
              </label>
              <button type="button" @click="clearStatusFilters">전체 상태 보기</button>
            </div>
          </details>
        </div>
      </div>
      <p v-if="isLoading" class="admin-access-view__state">사용자 목록을 불러오는 중입니다.</p>
      <p v-else-if="loadError" class="admin-access-view__state admin-access-view__state--error">
        {{ loadError }}
        <button type="button" class="admin-access-view__retry" @click="loadUsers">다시 시도</button>
      </p>
      <p v-if="actionError" class="admin-access-view__state admin-access-view__state--error">{{ actionError }}</p>
      <AdminAccessTable
        v-if="!isLoading && !loadError"
        :users="filteredUsers"
        @edit="openEditModal"
        @delete="openDeleteModal"
      />
    </section>
    <AdminAccessUserModal
      v-model="isUserModalOpen"
      :user="editingUser"
      :existing-ids="existingIds"
      :original-id="originalLoginId"
      :department-suggestions="departmentSuggestions"
      @save="saveUser"
    />
    <AdminDeleteUserModal
      v-model="isDeleteModalOpen"
      :user="deletingUser"
      :is-last-admin="isDeleteBlocked"
      :blocked-message="deleteBlockMessage"
      @confirm="confirmDeleteUser"
    />
  </div>
</template>
<style scoped>
.admin-access-view,
.admin-access-view__card {
  display: grid;
  gap: var(--space-4);
}
.admin-access-view__header,
.admin-access-view__section-head {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-4);
  align-items: end;
}
.admin-access-view__title-row {
  display: flex;
  gap: var(--space-2);
}
.admin-access-view__title-row {
  align-items: center;
}
.admin-access-view__search {
  width: 260px;
  max-width: 100%;
}
.admin-access-view__state {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}
.admin-access-view__state--error {
  color: var(--color-status-danger);
}
.admin-access-view__retry {
  margin-left: var(--space-2);
  border: 0;
  background: transparent;
  color: var(--color-action-primary);
  cursor: pointer;
  font: inherit;
  font-size: var(--font-size-sm);
  padding: 0;
  text-decoration: underline;
}
.admin-access-view__create-button {
  width: auto;
  min-width: 108px;
  justify-self: end;
}
.admin-access-view__filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  align-items: end;
}
.admin-access-view__filters label,
.admin-access-view__multi-filter {
  display: grid;
  gap: var(--space-1);
}
.admin-access-view__filters label {
  width: 220px;
}
.admin-access-view__multi-filter {
  position: relative;
  width: 260px;
}
.admin-access-view__status-dropdown {
  position: relative;
}
.admin-access-view__status-dropdown summary {
  min-height: 40px;
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  color: var(--color-fg-strong);
  cursor: pointer;
  padding: 0 var(--space-3);
  user-select: none;
}
.admin-access-view__status-dropdown summary::-webkit-details-marker {
  display: none;
}
.admin-access-view__status-dropdown summary::after {
  content: '⌄';
  margin-left: auto;
  color: var(--color-fg-muted);
}
.admin-access-view__status-panel {
  position: absolute;
  z-index: var(--z-index-dropdown);
  top: calc(100% + 4px);
  left: 0;
  width: 100%;
  display: grid;
  gap: var(--space-1);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-panel);
  padding: var(--space-2);
}
.admin-access-view__status-panel label {
  width: auto;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--color-fg-strong);
  cursor: pointer;
  padding: var(--space-2);
}
.admin-access-view__status-panel label:hover {
  background: var(--color-bg-subtle);
}
.admin-access-view__status-panel button {
  border: 0;
  border-top: 1px solid var(--color-border-subtle);
  background: transparent;
  color: var(--color-fg-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--font-size-sm);
  margin-top: var(--space-1);
  padding: var(--space-2);
  text-align: left;
}
.admin-access-view__overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}
.admin-access-view__overview div {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3);
}
.admin-access-view__card {
  padding: var(--space-4);
}
.admin-access-view__overview strong {
  font-size: var(--font-size-xl);
}
.admin-access-view__overview small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}
h1,
h2,
p {
  margin: 0;
}
p,
span,
dt {
  color: var(--color-fg-muted);
}
strong,
h1,
h2,
dd {
  color: var(--color-fg-strong);
}
.admin-access-view__header h1 {
  font-size: var(--text-page-title-size);
  line-height: var(--text-page-title-line-height);
}
.admin-access-view__title-row h2 {
  font-size: var(--font-size-lg);
}
.admin-access-view__header p {
  font-size: var(--font-size-base);
}
@media (max-width: 980px) {
  .admin-access-view__header,
  .admin-access-view__section-head,
  .admin-access-view__overview {
    grid-template-columns: 1fr;
  }
  .admin-access-view__title-row {
    align-items: flex-start;
    flex-direction: column;
  }
  .admin-access-view__search {
    width: min(100%, 320px);
  }
  .admin-access-view__create-button {
    justify-self: start;
  }
  .admin-access-view__filters label,
  .admin-access-view__multi-filter {
    width: min(100%, 320px);
  }
  .admin-access-view__filters {
    grid-template-columns: 1fr;
  }
}
</style>

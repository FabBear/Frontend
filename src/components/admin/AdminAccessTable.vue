<script setup lang="ts">
import type { AdminAccessUser } from '@/types/admin';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseTable from '@/components/base/BaseTable.vue';
import type { BaseTableColumn, BaseTableRow } from '@/components/base/BaseTable.vue';

defineProps<{
  users: AdminAccessUser[];
}>();

defineEmits<{
  edit: [user: AdminAccessUser];
  delete: [user: AdminAccessUser];
}>();

const columns: BaseTableColumn[] = [
  { key: 'id', label: '로그인 ID' },
  { key: 'name', label: '이름' },
  { key: 'role', label: '역할' },
  { key: 'department', label: '부서' },
  { key: 'fabAccess', label: '소속 공장' },
  { key: 'lastLogin', label: '마지막 로그인' },
  { key: 'isActive', label: '로그인' },
  { key: 'status', label: '상태' },
  { key: 'actions', label: '관리' },
];

function toRow(user: AdminAccessUser): BaseTableRow {
  return { ...user };
}

function getUser(row: BaseTableRow): AdminAccessUser {
  return row as unknown as AdminAccessUser;
}

function statusLabel(status: AdminAccessUser['status']) {
  const labels: Record<AdminAccessUser['status'], string> = {
    PENDING: '대기',
    ACTIVE: '활성',
    INACTIVE: '비활성',
    LOCKED: '잠김',
  };
  return labels[status];
}

function statusVariant(status: AdminAccessUser['status']) {
  if (status === 'LOCKED') return 'critical';
  if (status === 'INACTIVE') return 'high';
  if (status === 'PENDING') return 'medium';
  return 'low';
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    ADMIN: '관리자',
    ENGINEER: '공정 엔지니어',
    VIEWER: '조회자',
  };
  return labels[role] ?? role;
}
</script>

<template>
  <BaseTable :columns="columns" :rows="users.map(toRow)" row-key="id">
    <template #cell-role="{ value }">
      <span class="admin-access-table__role">{{ roleLabel(String(value)) }}</span>
    </template>
    <template #cell-isActive="{ value }">
      <BaseBadge class="admin-access-table__status" :variant="value ? 'low' : 'high'">
        {{ value ? '허용' : '차단' }}
      </BaseBadge>
    </template>
    <template #cell-status="{ row }">
      <BaseBadge class="admin-access-table__status" :variant="statusVariant(getUser(row).status)">
        {{ statusLabel(getUser(row).status) }}
      </BaseBadge>
    </template>
    <template #cell-actions="{ row }">
      <div class="admin-access-table__actions">
        <BaseButton variant="ghost" size="sm" @click="$emit('edit', getUser(row))">수정</BaseButton>
        <BaseButton variant="ghost" size="sm" @click="$emit('delete', getUser(row))">삭제</BaseButton>
      </div>
    </template>
  </BaseTable>
</template>

<style scoped>
.admin-access-table__actions {
  display: flex;
  gap: var(--space-2);
}

.admin-access-table__role {
  color: var(--color-fg-strong);
  font-weight: 600;
}

.admin-access-table__status {
  color: var(--color-fg-strong) !important;
  -webkit-text-fill-color: var(--color-fg-strong);
}

.admin-access-table__status.badge--critical {
  color: var(--color-risk-critical) !important;
  -webkit-text-fill-color: var(--color-risk-critical);
}

.admin-access-table__status.badge--high {
  color: var(--color-risk-high) !important;
  -webkit-text-fill-color: var(--color-risk-high);
}

.admin-access-table__status.badge--medium {
  color: var(--color-risk-medium) !important;
  -webkit-text-fill-color: var(--color-risk-medium);
}

.admin-access-table__status.badge--low {
  color: var(--color-risk-low) !important;
  -webkit-text-fill-color: var(--color-risk-low);
}
</style>

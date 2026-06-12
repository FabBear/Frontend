<script setup lang="ts">
import type { AdminResourceItem, AdminResourceMeta } from '@/types/admin';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseTable from '@/components/base/BaseTable.vue';
import type { BaseTableColumn, BaseTableRow } from '@/components/base/BaseTable.vue';

import { getAdminStatusLabel, getAdminStatusVariant } from '@/utils/admin';
import { formatKoMonthDayTime } from '@/utils/format';

defineProps<{
  meta: AdminResourceMeta;
  items: AdminResourceItem[];
  selectedId?: string | null;
}>();

defineEmits<{
  select: [item: AdminResourceItem];
}>();

const columns: BaseTableColumn[] = [
  { key: 'primary', label: '항목' },
  { key: 'secondary', label: '기준' },
  { key: 'category', label: '유형' },
  { key: 'status', label: '상태' },
  { key: 'owner', label: '담당' },
  { key: 'metrics', label: '운영값' },
  { key: 'updatedAt', label: '갱신' },
];

function toRow(item: AdminResourceItem): BaseTableRow {
  return { ...item };
}

function getItem(row: BaseTableRow): AdminResourceItem {
  return row as unknown as AdminResourceItem;
}
</script>

<template>
  <BaseTable
    :columns="columns"
    :rows="items.map(toRow)"
    row-key="id"
    :selected-row-key="selectedId"
    @row-click="$emit('select', getItem($event))"
  >
    <template #cell-primary="{ row }">
      <strong>{{ getItem(row).primary }}</strong>
      <small>{{ meta.primaryLabel }}</small>
    </template>
    <template #cell-secondary="{ row }">
      <span>{{ getItem(row).secondary }}</span>
      <small>{{ meta.secondaryLabel }}</small>
    </template>
    <template #cell-status="{ row }">
      <BaseBadge :variant="getAdminStatusVariant(getItem(row).status)">
        {{ getAdminStatusLabel(getItem(row).status) }}
      </BaseBadge>
    </template>
    <template #cell-metrics="{ row }">
      <dl>
        <div v-for="metric in getItem(row).metrics" :key="metric.label">
          <dt>{{ metric.label }}</dt>
          <dd>{{ metric.value }}</dd>
        </div>
      </dl>
    </template>
    <template #cell-updatedAt="{ row }">{{ formatKoMonthDayTime(getItem(row).updatedAt) }}</template>
  </BaseTable>
</template>

<style scoped>
strong,
span {
  display: block;
  color: var(--color-fg-strong);
}

small {
  display: block;
  margin-top: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

dl {
  display: grid;
  gap: var(--space-1);
  margin: 0;
}

dl div {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

dd {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
}
</style>

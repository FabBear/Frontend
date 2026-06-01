<script setup lang="ts">
export interface BaseTableColumn {
  key: string;
  label: string;
}

export type BaseTableRow = Record<string, unknown>;

interface Props {
  columns: BaseTableColumn[];
  rows: BaseTableRow[];
  loading?: boolean;
  rowKey?: string;
  selectedRowKey?: string | number | null;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  rowKey: 'id',
  selectedRowKey: null,
});

const emit = defineEmits<{
  rowClick: [row: BaseTableRow];
}>();

function getCellValue(row: BaseTableRow, key: string) {
  return row[key] ?? '';
}

function getRowKey(row: BaseTableRow, rowIndex: number) {
  const keyValue = row[props.rowKey];
  if (typeof keyValue === 'string' || typeof keyValue === 'number') return keyValue;
  return rowIndex;
}

function isSelected(row: BaseTableRow) {
  if (props.selectedRowKey == null) return false;
  return row[props.rowKey] === props.selectedRowKey;
}
</script>

<template>
  <div class="table-wrap base-table">
    <table class="data-table">
      <thead>
        <tr>
          <th v-for="column in columns" :key="column.key" scope="col">
            {{ column.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td class="base-table__state" :colspan="columns.length">Loading...</td>
        </tr>
        <tr v-else-if="rows.length === 0">
          <td class="base-table__state" :colspan="columns.length">
            <slot name="empty">데이터가 없습니다.</slot>
          </td>
        </tr>
        <tr
          v-for="(row, rowIndex) in rows"
          v-else
          :key="getRowKey(row, rowIndex)"
          :class="{ 'data-table__row--selected': isSelected(row), 'data-table__row--clickable': $attrs.onRowClick }"
          @click="emit('rowClick', row)"
        >
          <td v-for="column in columns" :key="column.key">
            <slot :name="`cell-${column.key}`" :row="row" :value="getCellValue(row, column.key)">
              {{ getCellValue(row, column.key) }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.base-table__state {
  height: 72px;
  color: var(--color-fg-muted);
  text-align: center;
}

:global(.data-table__row--clickable) {
  cursor: pointer;
}

:global(.data-table__row--clickable:hover) {
  background: var(--color-row-hover);
}

:global(.data-table__row--selected) {
  background: var(--color-action-primary-soft);
}
</style>

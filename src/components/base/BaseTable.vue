<script setup lang="ts">
export interface BaseTableColumn {
  key: string;
  label: string;
}

type TableRow = Record<string, string | number | boolean | null | undefined>;

interface Props {
  columns: BaseTableColumn[];
  rows: TableRow[];
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  loading: false,
});

function getCellValue(row: TableRow, key: string) {
  return row[key] ?? '';
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
        <tr v-for="(row, rowIndex) in rows" v-else :key="rowIndex">
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
</style>

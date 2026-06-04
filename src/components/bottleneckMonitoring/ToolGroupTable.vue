<script setup lang="ts">
import { TOOL_GROUP_TABLE_COLUMNS, TOOL_GROUP_TABLE_COLUMN_COUNT } from '@/constants/bottleneckMonitoring';

import type { BottleneckToolGroupItem } from '@/types/bottleneckMonitoring';

import ToolGroupTableRow from '@/components/bottleneckMonitoring/ToolGroupTableRow.vue';

interface Props {
  toolGroups: BottleneckToolGroupItem[];
  selectedToolGroupId: string | null;
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  selectToolGroup: [tgId: string];
}>();
</script>

<template>
  <div class="tool-group-table">
    <div class="table-wrap tool-group-table__wrap">
      <table class="data-table tool-group-table__table">
        <colgroup>
          <col v-for="column in TOOL_GROUP_TABLE_COLUMNS" :key="column.key" :class="column.colClass" />
        </colgroup>
        <thead>
          <tr>
            <th v-for="column in TOOL_GROUP_TABLE_COLUMNS" :key="column.key" scope="col">{{ column.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td class="tool-group-table__empty" :colspan="TOOL_GROUP_TABLE_COLUMN_COUNT">
              Tool Group 데이터를 불러오는 중입니다.
            </td>
          </tr>
          <tr v-else-if="toolGroups.length === 0">
            <td class="tool-group-table__empty" :colspan="TOOL_GROUP_TABLE_COLUMN_COUNT">
              표시할 Tool Group이 없습니다.
            </td>
          </tr>
          <template v-else>
            <ToolGroupTableRow
              v-for="toolGroup in toolGroups"
              :key="toolGroup.tgId"
              :tool-group="toolGroup"
              :selected="selectedToolGroupId === toolGroup.tgId"
              @select="emit('selectToolGroup', $event)"
            />
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.tool-group-table {
  --tool-group-table-min-width: 520px;
  --tool-group-table-status-width: 100px;
  --tool-group-table-name-width: auto;
  --tool-group-table-metric-width: 90px;
  min-width: 0;
}

.tool-group-table__wrap {
  min-width: 0;
  max-height: 480px;
  overflow: auto;
  scrollbar-gutter: stable;
}

.tool-group-table__table {
  width: 100%;
  min-width: var(--tool-group-table-min-width);
  border-collapse: collapse;
  table-layout: fixed;
}

.tool-group-table__table thead {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--color-bg-card);
}

.tool-group-table__table :deep(th),
.tool-group-table__table :deep(td) {
  padding: 8px 10px;
  font-size: var(--font-size-base);
  vertical-align: middle;
}

.tool-group-table__table :deep(th:nth-child(n + 3)),
.tool-group-table__table :deep(td:nth-child(n + 3)) {
  text-align: right;
}

.tool-group-table__table :deep(th:nth-child(1)),
.tool-group-table__table :deep(td:nth-child(1)),
.tool-group-table__table :deep(th:nth-child(2)),
.tool-group-table__table :deep(td:nth-child(2)) {
  text-align: left;
}

.tool-group-table__col-status {
  width: var(--tool-group-table-status-width);
}

.tool-group-table__col-name {
  /* auto: 남은 공간을 TG명 컬럼이 모두 차지 */
}

.tool-group-table__col-util,
.tool-group-table__col-wip {
  width: var(--tool-group-table-metric-width);
}

.tool-group-table__empty {
  height: 120px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  text-align: center;
}
</style>

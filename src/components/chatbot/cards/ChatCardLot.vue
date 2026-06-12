<script setup lang="ts">
import { computed } from 'vue';

interface LotColumn {
  key: string;
  label: string;
  unit?: string;
}
type LotRow = { label: string } & Record<string, unknown>;

const props = defineProps<{
  data: { title?: string; labelHeader?: string; columns?: LotColumn[]; rows: LotRow[] };
}>();

// columns 미지정 시 기존 구역/TG 표(WIP/대기/Q-time/가동률) 그대로 — 하위호환.
const DEFAULT_COLUMNS: LotColumn[] = [
  { key: 'wip', label: 'WIP' },
  { key: 'wait', label: '대기' },
  { key: 'qtime', label: 'Q-time', unit: '분' },
  { key: 'util', label: '가동률', unit: '%' },
];
const columns = computed(() => (props.data.columns?.length ? props.data.columns : DEFAULT_COLUMNS));
</script>

<template>
  <div class="chat-card-lot">
    <span v-if="data.title" class="chat-card-lot__title">{{ data.title }}</span>
    <table class="chat-card-lot__table">
      <thead>
        <tr>
          <th>{{ data.labelHeader || '구역/TG' }}</th>
          <th v-for="col in columns" :key="col.key">{{ col.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in data.rows" :key="row.label">
          <td class="chat-card-lot__label" :title="row.label">{{ row.label }}</td>
          <td v-for="(col, i) in columns" :key="col.key" class="chat-card-lot__num">
            <strong v-if="i === 0">{{ row[col.key] }}{{ col.unit || '' }}</strong>
            <template v-else>{{ row[col.key] }}{{ col.unit || '' }}</template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.chat-card-lot {
  display: grid;
  gap: var(--space-1);
}
.chat-card-lot__title {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.chat-card-lot__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-xs);
}
.chat-card-lot__table th {
  padding: 4px 6px;
  border-bottom: 1px solid var(--color-border-subtle);
  color: var(--color-fg-muted);
  font-weight: var(--font-weight-semibold);
  text-align: right;
}
.chat-card-lot__table th:first-child {
  text-align: left;
}
.chat-card-lot__table td {
  padding: 4px 6px;
  border-bottom: 1px solid var(--color-border-subtle);
}
.chat-card-lot__label {
  max-width: 160px;
  overflow: hidden;
  color: var(--color-fg-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-card-lot__num {
  color: var(--color-fg-default);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>

<script setup lang="ts">
interface CaseRow {
  when: string;
  where: string;
  grade: string;
  prob: number;
  status: string;
}
defineProps<{ data: { title?: string; rows: CaseRow[] } }>();

function gradeClass(grade: string) {
  return grade === 'CRITICAL' ? 'chat-card-cases__grade--critical' : 'chat-card-cases__grade--high';
}
</script>

<template>
  <div class="chat-card-cases">
    <span v-if="data.title" class="chat-card-cases__title">{{ data.title }}</span>
    <ul class="chat-card-cases__list">
      <li v-for="(row, i) in data.rows" :key="`${row.when}-${i}`" class="chat-card-cases__item">
        <span class="chat-card-cases__grade" :class="gradeClass(row.grade)">{{ row.grade }}</span>
        <span class="chat-card-cases__where" :title="row.where">{{ row.where }}</span>
        <span class="chat-card-cases__prob">{{ row.prob }}%</span>
        <span class="chat-card-cases__status">{{ row.status }}</span>
        <span class="chat-card-cases__when">{{ row.when }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.chat-card-cases {
  display: grid;
  gap: var(--space-1);
}
.chat-card-cases__title {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.chat-card-cases__list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.chat-card-cases__item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 4px 6px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
}
.chat-card-cases__grade {
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: var(--radius-pill);
  color: var(--color-text-inverse);
  font-size: 10px;
  font-weight: var(--font-weight-bold);
}
.chat-card-cases__grade--critical {
  background: var(--color-status-danger);
}
.chat-card-cases__grade--high {
  background: var(--color-status-warning);
}
.chat-card-cases__where {
  flex: 1 1 auto;
  overflow: hidden;
  color: var(--color-fg-strong);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-card-cases__prob {
  flex: 0 0 auto;
  color: var(--color-fg-default);
  font-variant-numeric: tabular-nums;
}
.chat-card-cases__status {
  flex: 0 0 auto;
  color: var(--color-fg-muted);
}
.chat-card-cases__when {
  flex: 0 0 auto;
  color: var(--color-fg-muted);
}
</style>

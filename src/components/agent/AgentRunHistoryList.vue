<script setup lang="ts">
import type { AgentRunListItem } from '@/services/agentTaskService';

defineProps<{
  items: AgentRunListItem[];
  loading?: boolean;
  title?: string;
}>();

const emit = defineEmits<{ (e: 'select', item: AgentRunListItem): void }>();

function fmt(ts: string | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}
</script>

<template>
  <section class="agent-run-history surface-card">
    <div class="agent-run-history__head">
      <h3>{{ title ?? '지난 실행 이력' }}</h3>
    </div>
    <p v-if="loading" class="agent-run-history__state">불러오는 중…</p>
    <p v-else-if="items.length === 0" class="agent-run-history__state">아직 실행 이력이 없습니다.</p>
    <ul v-else class="agent-run-history__list">
      <li v-for="item in items" :key="item.id">
        <button type="button" class="agent-run-history__item" @click="emit('select', item)">
          <span class="agent-run-history__summary">{{ item.summary ?? '(요약 없음)' }}</span>
          <span class="agent-run-history__meta">
            <span class="agent-run-history__status" :data-status="item.status">{{ item.status }}</span>
            <span v-if="item.reportIntent">· {{ item.reportIntent }}</span>
            <time>{{ fmt(item.completedAt ?? item.createdAt) }}</time>
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.agent-run-history {
  display: grid;
  gap: var(--space-3, 12px);
}
.agent-run-history__head h3 {
  margin: 0;
  font-size: 0.95rem;
}
.agent-run-history__state {
  color: var(--text-muted, #888);
  font-size: 0.85rem;
}
.agent-run-history__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-2, 8px);
  max-height: 320px;
  overflow-y: auto;
}
.agent-run-history__item {
  width: 100%;
  text-align: left;
  display: grid;
  gap: 4px;
  padding: var(--space-2, 8px) var(--space-3, 12px);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12));
  border-radius: var(--radius-2, 8px);
  background: transparent;
  cursor: pointer;
}
.agent-run-history__item:hover {
  background: var(--surface-hover, rgba(255, 255, 255, 0.04));
}
.agent-run-history__summary {
  font-size: 0.9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.agent-run-history__meta {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.75rem;
  color: var(--text-muted, #999);
}
.agent-run-history__status[data-status='FAILED'] {
  color: var(--danger, #e5484d);
}
.agent-run-history__status[data-status='SUCCEEDED'] {
  color: var(--success, #46a758);
}
</style>

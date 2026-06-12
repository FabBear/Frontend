<script setup lang="ts">
import { X } from '@lucide/vue';

import type { ChatSession } from '@/types/chatbot';

import { formatKoMonthDayTime } from '@/utils/format';

defineProps<{
  sessions: ChatSession[];
  activeSessionId: string | null;
}>();

defineEmits<{
  select: [sessionId: string];
  delete: [sessionId: string];
}>();
</script>

<template>
  <nav class="chat-session-list" aria-label="AI 채팅 세션">
    <div
      v-for="session in sessions"
      :key="session.sessionId"
      class="chat-session-list__item"
      :class="{ 'chat-session-list__item--active': session.sessionId === activeSessionId }"
    >
      <button class="chat-session-list__select" type="button" @click="$emit('select', session.sessionId)">
        <strong>{{ session.sessionTitle }}</strong>
        <span>{{ formatKoMonthDayTime(session.lastMessageAt) }}</span>
      </button>
      <button
        class="chat-session-list__delete"
        type="button"
        aria-label="이 대화 삭제"
        title="대화 삭제"
        @click.stop="$emit('delete', session.sessionId)"
      >
        <X :size="13" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>

<style scoped>
.chat-session-list {
  display: flex;
  gap: var(--space-2);
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 2px;
}

.chat-session-list__item {
  position: relative;
  display: flex;
  width: 128px;
  min-width: 128px;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
}

.chat-session-list__item--active {
  background: color-mix(in srgb, var(--color-action-primary) 7%, var(--color-bg-card));
  border-color: var(--color-state-selected-border);
  box-shadow: inset 0 0 0 1px var(--color-state-selected-border);
}

.chat-session-list__select {
  display: inline-grid;
  gap: 1px;
  flex: 1;
  min-width: 0;
  min-height: 44px;
  padding: 7px 24px 7px 10px;
  border: 0;
  background: transparent;
  color: var(--color-fg);
  text-align: left;
  cursor: pointer;
}

.chat-session-list__select strong {
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-session-list__select span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.2;
}

.chat-session-list__delete {
  position: absolute;
  top: 3px;
  right: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-fg-muted);
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.12s,
    color 0.12s,
    background 0.12s;
}

.chat-session-list__item:hover .chat-session-list__delete,
.chat-session-list__item--active .chat-session-list__delete {
  opacity: 1;
}

.chat-session-list__delete:hover {
  background: color-mix(in srgb, var(--color-status-danger) 14%, transparent);
  color: var(--color-status-danger);
}
</style>

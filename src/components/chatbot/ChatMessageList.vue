<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import type { ChatMessage as ChatMessageType, ChatQuickPrompt, ChatReportContextInput } from '@/types/chatbot';

import ChatMessage from '@/components/chatbot/ChatMessage.vue';
import ChatStatusIndicator from '@/components/chatbot/ChatStatusIndicator.vue';

const props = defineProps<{
  messages: ChatMessageType[];
  responding?: boolean;
  quickPrompts?: ChatQuickPrompt[];
  quickPromptTitle?: string;
  reportContext?: ChatReportContextInput | null;
}>();

const emit = defineEmits<{
  prompt: [message: string];
}>();

// SSE 스트리밍 중에는 진행 상태(단계 라벨·토큰)가 pending 말풍선 안에 표시되므로
// 별도 "응답 생성 중..." 인디케이터를 겹쳐 보여주지 않는다(중복 UI 방지).
const streamingActive = computed(() => Boolean(props.messages[props.messages.length - 1]?.pending));
const showReportStart = computed(() => props.messages.length === 0 && Boolean(props.reportContext));
const reportDetectedAt = computed(() => formatDetectedAt(props.reportContext?.detectedAt));

const listRef = ref<HTMLElement | null>(null);

watch(
  () => [props.messages.length, props.responding],
  async () => {
    await nextTick();
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight;
    }
  },
  { immediate: true }
);

function formatDetectedAt(iso?: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
</script>

<template>
  <div ref="listRef" class="chat-message-list">
    <div v-if="showReportStart && reportContext" class="chat-message-list__report-start">
      <span class="chat-message-list__report-label">리포트 Q&A</span>
      <strong>이 리포트에 대해 물어보세요</strong>
      <p>승인 대응안, 무대응 예측, 원인, 유사 사례 근거를 리포트 기준으로 답변합니다.</p>
      <div class="chat-message-list__report-meta">
        <span>{{ reportContext.processName }}</span>
        <span>{{ reportContext.severity }}</span>
        <span>Risk {{ reportContext.riskScore }}</span>
        <span>{{ reportDetectedAt }}</span>
      </div>
    </div>
    <div v-else-if="messages.length === 0" class="chat-message-list__empty">
      <img src="@/assets/fabbear-symbol.svg" alt="" aria-hidden="true" />
      <strong>현재 공장에 대해 물어보세요.</strong>
      <span>공정, 장비, 리포트 내용을 확인할 수 있습니다.</span>
    </div>
    <template v-for="message in messages" :key="message.messageId">
      <ChatMessage :message="message" />
      <section
        v-if="message.role === 'ASSISTANT' && message.followUps?.length"
        class="chat-message-list__suggestions"
        aria-label="추천 질문"
      >
        <div class="chat-message-list__suggestions-head">
          <span>이어서 물어볼 질문</span>
        </div>
        <div class="chat-message-list__suggestions-list">
          <button
            v-for="(prompt, index) in message.followUps"
            :key="`${message.messageId}-${index}`"
            type="button"
            :disabled="responding"
            @click="emit('prompt', prompt)"
          >
            <span>{{ prompt }}</span>
          </button>
        </div>
      </section>
    </template>
    <section
      v-if="messages.length === 0 && quickPrompts?.length"
      class="chat-message-list__suggestions chat-message-list__suggestions--start"
      aria-label="추천 질문"
    >
      <div class="chat-message-list__suggestions-head">
        <span>{{ quickPromptTitle ?? '추천 후속 질문' }}</span>
      </div>
      <div class="chat-message-list__suggestions-list">
        <button
          v-for="prompt in quickPrompts"
          :key="prompt.id"
          type="button"
          :disabled="responding"
          @click="emit('prompt', prompt.message)"
        >
          <span>{{ prompt.label }}</span>
        </button>
      </div>
    </section>
    <ChatStatusIndicator
      v-if="responding && !streamingActive"
      class="chat-message-list__typing"
      label="응답 생성 중..."
    />
  </div>
</template>

<style scoped>
.chat-message-list {
  display: flex;
  min-height: 0;
  flex-direction: column;
  gap: var(--space-3);
  overflow: auto;
  padding: var(--space-4) var(--space-4) var(--space-5);
}

.chat-message-list__empty {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  margin: auto 0;
  border: var(--border-width-default) dashed var(--color-login-panel-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-login-panel-bg) 82%, transparent);
  padding: var(--space-6) var(--space-4);
  text-align: center;
}

.chat-message-list__empty img {
  width: 58px;
  height: auto;
}

.chat-message-list__empty strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}

.chat-message-list__empty span {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-base);
}

.chat-message-list__report-start {
  display: grid;
  gap: var(--space-2);
  align-content: start;
  margin: 0;
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 16%, var(--color-border-subtle));
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-action-primary-soft) 18%, var(--color-bg-card));
  padding: var(--space-4);
}

.chat-message-list__report-label {
  width: fit-content;
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 28%, transparent);
  border-radius: var(--radius-pill);
  background: var(--color-bg-card);
  padding: 2px 8px;
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.chat-message-list__report-start strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

.chat-message-list__report-start p {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

.chat-message-list__report-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: var(--space-1);
}

.chat-message-list__report-meta span {
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-bg-surface) 86%, transparent);
  padding: 3px 8px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.chat-message-list__typing {
  margin-top: var(--space-1);
}

.chat-message-list__suggestions {
  display: grid;
  width: min(100%, 520px);
  gap: 6px;
  margin: var(--space-1) 0 0 40px;
}

.chat-message-list__suggestions--start {
  width: 100%;
  margin: var(--space-2) 0 0;
}

.chat-message-list__suggestions-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.chat-message-list__suggestions-head span {
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.chat-message-list__suggestions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.chat-message-list__suggestions button {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  min-height: 32px;
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 14%, var(--color-border-subtle));
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-action-primary-soft) 14%, var(--color-bg-card));
  color: var(--color-fg);
  cursor: pointer;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.35;
  padding: 6px 11px;
  text-align: left;
  transition:
    border-color 0.12s ease,
    background 0.12s ease,
    color 0.12s ease,
    transform 0.12s ease;
}

.chat-message-list__suggestions button span {
  display: -webkit-box;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.chat-message-list__suggestions button:hover:not(:disabled) {
  border-color: var(--color-action-primary-border);
  background: var(--color-bg-card);
  color: var(--color-action-primary);
  transform: translateY(-1px);
}

.chat-message-list__suggestions button:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

@media (max-width: 760px) {
  .chat-message-list__suggestions {
    width: 100%;
    margin-left: 0;
  }
}
</style>

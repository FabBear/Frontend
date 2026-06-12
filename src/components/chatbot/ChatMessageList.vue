<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';

import type { ChatMessage as ChatMessageType } from '@/types/chatbot';

import ChatMessage from '@/components/chatbot/ChatMessage.vue';
import ChatStatusIndicator from '@/components/chatbot/ChatStatusIndicator.vue';

const props = defineProps<{
  messages: ChatMessageType[];
  responding?: boolean;
}>();

// SSE 스트리밍 중에는 진행 상태(단계 라벨·토큰)가 pending 말풍선 안에 표시되므로
// 별도 "응답 생성 중..." 인디케이터를 겹쳐 보여주지 않는다(중복 UI 방지).
const streamingActive = computed(() => Boolean(props.messages[props.messages.length - 1]?.pending));

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
</script>

<template>
  <div ref="listRef" class="chat-message-list">
    <div v-if="messages.length === 0" class="chat-message-list__empty">
      <img src="@/assets/fabbear-symbol.svg" alt="" aria-hidden="true" />
      <strong>지금 화면 기준으로 물어보세요.</strong>
      <span>병목, 장비, 리포트 내용을 함께 확인할 수 있습니다.</span>
    </div>
    <ChatMessage v-for="message in messages" :key="message.messageId" :message="message" />
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

.chat-message-list__typing {
  margin-top: var(--space-1);
}
</style>

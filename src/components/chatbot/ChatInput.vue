<script setup lang="ts">
import { computed, ref } from 'vue';

import { SendHorizontal } from '@lucide/vue';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  }
);

const emit = defineEmits<{
  send: [message: string];
}>();

const message = ref('');
const canSend = computed(() => !props.disabled && message.value.trim().length > 0);

function handleSend() {
  if (!canSend.value) return;
  emit('send', message.value.trim());
  message.value = '';
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey) return;
  // 한국어 IME 조합 중 Enter — 조합 글자가 전송 후 입력창에 남는 것 방지(keyCode 229 = 구형 브라우저 호환).
  if (event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  handleSend();
}
</script>

<template>
  <form class="chat-input" @submit.prevent="handleSend">
    <div class="chat-input__composer">
      <textarea
        v-model="message"
        class="chat-input__field"
        :disabled="disabled"
        rows="2"
        placeholder="AI에게 질문하기"
        @keydown="handleKeydown"
      />
      <div class="chat-input__toolbar">
        <button class="chat-input__send" type="submit" :disabled="!canSend" aria-label="전송">
          <SendHorizontal :size="17" aria-hidden="true" />
        </button>
      </div>
    </div>
  </form>
</template>

<style scoped>
.chat-input {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4) var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  background: var(--color-bg-surface);
}

.chat-input__composer {
  display: grid;
  gap: var(--space-2);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-2);
  box-shadow: inset 0 0 0 1px transparent;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.chat-input__composer:focus-within {
  border-color: var(--color-action-primary-border);
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.chat-input__field {
  width: 100%;
  min-height: 48px;
  max-height: 160px;
  border: 0;
  background: transparent;
  color: var(--color-fg);
  font: inherit;
  line-height: var(--line-height-normal);
  outline: none;
  resize: vertical;
}

.chat-input__field::placeholder {
  color: var(--color-fg-muted);
}

.chat-input__toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
}

.chat-input__send {
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-action-primary);
  background: var(--color-action-primary);
  color: var(--color-text-inverse);
  cursor: pointer;
}

.chat-input__send:hover:not(:disabled) {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-hover);
  color: var(--color-text-inverse);
}

.chat-input__send:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}
</style>

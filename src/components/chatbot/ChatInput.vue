<script setup lang="ts">
import { computed, ref } from 'vue';

import { Paperclip, SendHorizontal, X } from '@lucide/vue';

import type { ChatAttachment } from '@/types/chatbot';

const props = withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  }
);

const emit = defineEmits<{
  send: [message: string, attachments: ChatAttachment[]];
}>();

const message = ref('');
const attachments = ref<ChatAttachment[]>([]);
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const canSend = computed(() => !props.disabled && (message.value.trim().length > 0 || attachments.value.length > 0));

function handleSend() {
  if (!canSend.value) return;
  emit('send', message.value.trim(), attachments.value);
  message.value = '';
  attachments.value = [];
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey) return;
  // 한국어 IME 조합 중 Enter — 조합 글자가 전송 후 입력창에 남는 것 방지(keyCode 229 = 구형 브라우저 호환).
  if (event.isComposing || event.keyCode === 229) return;
  event.preventDefault();
  handleSend();
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(size / 1024))}KB`;
}

function addFiles(fileList: FileList | File[]) {
  attachments.value = [
    ...attachments.value,
    ...Array.from(fileList).map((file) => ({
      id: `file-${Date.now()}-${file.name}`,
      name: file.name,
      size: file.size,
      type: file.type || file.name.split('.').pop() || 'file',
      status: 'READY' as const,
    })),
  ];
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files) addFiles(target.files);
  target.value = '';
}

function handleDrop(event: DragEvent) {
  isDragging.value = false;
  if (event.dataTransfer?.files) addFiles(event.dataTransfer.files);
}

function removeAttachment(id: string) {
  attachments.value = attachments.value.filter((item) => item.id !== id);
}
</script>

<template>
  <form
    class="chat-input"
    :class="{ 'chat-input--dragging': isDragging }"
    @submit.prevent="handleSend"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
  >
    <div v-if="attachments.length" class="chat-input__attachments">
      <span v-for="file in attachments" :key="file.id">
        <Paperclip :size="13" aria-hidden="true" />
        {{ file.name }} · {{ formatFileSize(file.size) }}
        <button type="button" :aria-label="`${file.name} 삭제`" @click="removeAttachment(file.id)">
          <X :size="12" aria-hidden="true" />
        </button>
      </span>
    </div>

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
        <input ref="fileInputRef" class="chat-input__file" type="file" multiple @change="handleFileChange" />
        <button
          type="button"
          class="chat-input__tool"
          title="파일 첨부"
          aria-label="파일 첨부"
          @click="fileInputRef?.click()"
        >
          <Paperclip :size="16" aria-hidden="true" />
        </button>
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

.chat-input--dragging {
  background: var(--color-state-selected-bg);
}

.chat-input__attachments {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.chat-input__attachments span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  max-width: 100%;
  padding: var(--space-1) var(--space-2);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-pill);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
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

.chat-input__attachments button,
.chat-input__tool,
.chat-input__send {
  display: inline-grid;
  place-items: center;
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-card);
  color: var(--color-fg-muted);
  cursor: pointer;
}

.chat-input__attachments button {
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

.chat-input__toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
}

.chat-input__tool,
.chat-input__send {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
}

.chat-input__send {
  border-color: var(--color-action-primary);
  background: var(--color-action-primary);
  color: var(--color-text-inverse);
}

.chat-input__tool:hover:not(:disabled),
.chat-input__send:hover:not(:disabled) {
  border-color: var(--color-action-primary-border);
  color: var(--color-action-primary);
}

.chat-input__send:hover:not(:disabled) {
  background: var(--color-action-primary-hover);
  color: var(--color-text-inverse);
}

.chat-input__tool:disabled,
.chat-input__send:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.chat-input__file {
  display: none;
}
</style>

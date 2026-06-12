<script setup lang="ts">
import { RotateCcw, SearchX } from '@lucide/vue';

withDefaults(
  defineProps<{
    label?: string;
    variant?: 'thinking' | 'retry' | 'nobasis';
  }>(),
  {
    label: '응답 생성 중...',
    variant: 'thinking',
  }
);
</script>

<template>
  <div class="chat-status" :class="`chat-status--${variant}`" role="status" aria-live="polite">
    <img class="chat-status__avatar" src="@/assets/fabbear-symbol.svg" alt="" aria-hidden="true" />
    <RotateCcw
      v-if="variant === 'retry'"
      :size="15"
      class="chat-status__icon chat-status__icon--spin"
      aria-hidden="true"
    />
    <SearchX v-else-if="variant === 'nobasis'" :size="15" class="chat-status__icon" aria-hidden="true" />
    <span class="chat-status__pixels" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
    <span class="chat-status__label">{{ label }}</span>
  </div>
</template>

<style scoped>
.chat-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  width: fit-content;
  max-width: 100%;
  border: var(--border-width-default) solid var(--color-login-panel-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg-card);
  padding: 6px 12px 6px 6px;
  color: var(--color-brand-brown);
  box-shadow: 0 4px 14px #5536150f;
}

.chat-status__avatar {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border-radius: var(--radius-pill);
  object-fit: contain;
}

.chat-status__icon {
  flex: 0 0 auto;
  color: var(--color-status-warning);
}

.chat-status__icon--spin {
  animation: chat-status-spin 1s linear infinite;
}

.chat-status__pixels {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
}

.chat-status__pixels i {
  display: block;
  width: 7px;
  height: 7px;
  border-radius: 2px;
  background: var(--color-gold);
  animation: chat-status-pixel 1.2s infinite both;
}

.chat-status__pixels i:nth-child(2) {
  animation-delay: 200ms;
}

.chat-status__pixels i:nth-child(3) {
  animation-delay: 400ms;
}

.chat-status__label {
  overflow: hidden;
  color: currentColor;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-status--retry {
  color: var(--color-status-warning);
}

.chat-status--retry .chat-status__pixels i {
  background: var(--color-status-warning);
}

.chat-status--nobasis {
  background: var(--color-login-control-bg);
  color: var(--color-fg-muted);
}

.chat-status--nobasis .chat-status__avatar {
  filter: grayscale(0.6) opacity(0.7);
}

.chat-status--nobasis .chat-status__pixels i {
  border: 1px solid var(--color-fg-muted);
  background: transparent;
  opacity: 0.65;
  animation: none;
}

@keyframes chat-status-pixel {
  0%,
  100% {
    opacity: 0.22;
    transform: scale(0.78);
  }

  38% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes chat-status-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

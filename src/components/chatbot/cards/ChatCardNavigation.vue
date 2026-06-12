<script setup lang="ts">
import { useRouter } from 'vue-router';

import { ArrowRight, ShieldAlert } from '@lucide/vue';

// 실행성 요청(승인/스케줄/실행 등)을 챗봇이 직접 처리하지 않고 담당 화면으로 안내하는 카드.
const props = defineProps<{ data: { label?: string; route?: string; reason?: string } }>();
const router = useRouter();

function go() {
  if (props.data.route) void router.push(props.data.route);
}
</script>

<template>
  <div class="chat-card-nav">
    <p v-if="data.reason" class="chat-card-nav__reason">
      <ShieldAlert :size="13" aria-hidden="true" />
      {{ data.reason }}
    </p>
    <button v-if="data.route" type="button" class="chat-card-nav__button" @click="go">
      {{ data.label || '담당 화면으로 이동' }}
      <ArrowRight :size="14" aria-hidden="true" />
    </button>
  </div>
</template>

<style scoped>
.chat-card-nav {
  display: grid;
  gap: var(--space-2);
}
.chat-card-nav__reason {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}
.chat-card-nav__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: fit-content;
  padding: 6px 12px;
  border: 1px solid var(--color-action-primary);
  border-radius: var(--radius-md);
  background: var(--color-action-primary);
  color: var(--color-text-inverse);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}
.chat-card-nav__button:hover {
  background: var(--color-action-primary-hover);
}
</style>

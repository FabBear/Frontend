<script setup lang="ts">
import { Bell, Bot } from '@lucide/vue';

import BaseButton from '@/components/base/BaseButton.vue';

interface Props {
  title: string;
  notificationCount: number;
  notificationOpen?: boolean;
}

withDefaults(defineProps<Props>(), {
  notificationOpen: false,
});

const emit = defineEmits<{
  toggleNotifications: [];
}>();
</script>

<template>
  <header class="the-header">
    <div>
      <p class="the-header__eyebrow">Fab 운영</p>
      <h1 class="the-header__title">{{ title }}</h1>
    </div>

    <div class="the-header__actions">
      <BaseButton variant="ghost" size="sm">
        <Bot :size="16" aria-hidden="true" />
        AI 챗봇
      </BaseButton>
      <button
        class="the-header__notification-button"
        :class="{ 'the-header__notification-button--active': notificationOpen }"
        type="button"
        aria-label="알림"
        :aria-expanded="notificationOpen"
        @click="emit('toggleNotifications')"
      >
        <Bell :size="17" aria-hidden="true" />
        <span v-if="notificationCount > 0" class="the-header__badge">
          {{ notificationCount }}
        </span>
      </button>
      <div class="the-header__user">
        <span class="the-header__avatar">E</span>
        <div>
          <strong>김엔지니어</strong>
          <span>일반 엔지니어</span>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.the-header {
  display: flex;
  height: var(--layout-header-height);
  align-items: center;
  justify-content: space-between;
  border-bottom: var(--border-width-default) solid var(--color-border-default);
  background: var(--color-bg-surface);
  padding: 0 var(--spacing-page);
}

.the-header__eyebrow {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.the-header__title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  line-height: var(--line-height-tight);
}

.the-header__actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.the-header__notification-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 32px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.the-header__notification-button--active,
.the-header__notification-button:hover {
  border-color: var(--color-action-primary-border);
  color: var(--color-action-primary);
}

.the-header__badge {
  position: absolute;
  top: -6px;
  right: -6px;
  border-radius: var(--radius-pill);
  background: var(--color-status-danger);
  padding: 1px 6px;
  color: var(--color-text-inverse);
  font-size: var(--font-size-xs);
}

.the-header__user {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-pill);
  padding: 4px 12px 4px 4px;
  font-size: var(--font-size-xs);
}

.the-header__user span {
  display: block;
  color: var(--color-fg-muted);
}

.the-header__avatar {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: var(--radius-pill);
  background: var(--color-action-primary);
  color: var(--color-text-inverse) !important;
  font-weight: var(--font-weight-bold);
}
</style>

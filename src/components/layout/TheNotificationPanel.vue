<script setup lang="ts">
import type { Component } from 'vue';

import { AlertTriangle, CheckCircle2, Info, TriangleAlert, X } from '@lucide/vue';

import type { NotificationItem, NotificationLevel } from '@/types/notification';

import BaseBadge from '@/components/base/BaseBadge.vue';

interface Props {
  open: boolean;
  notifications: NotificationItem[];
}

defineProps<Props>();

const emit = defineEmits<{
  close: [];
}>();

const levelIconMap: Record<NotificationLevel, Component> = {
  critical: AlertTriangle,
  warning: TriangleAlert,
  info: Info,
  success: CheckCircle2,
};

const levelLabelMap: Record<NotificationLevel, string> = {
  critical: '위험',
  warning: '경고',
  info: '정보',
  success: '완료',
};
</script>

<template>
  <aside v-if="open" class="notification-panel" aria-label="알림 패널">
    <header class="notification-panel__header">
      <h2>알림</h2>
      <button class="notification-panel__close" type="button" aria-label="알림 닫기" @click="emit('close')">
        <X :size="18" aria-hidden="true" />
      </button>
    </header>

    <ul class="notification-panel__list">
      <li v-for="notification in notifications" :key="notification.id" class="notification-panel__item">
        <div class="notification-panel__item-header">
          <BaseBadge :variant="notification.level">
            <component :is="levelIconMap[notification.level]" :size="14" aria-hidden="true" />
            {{ levelLabelMap[notification.level] }}
          </BaseBadge>
          <span class="notification-panel__time">{{ notification.createdAt }}</span>
        </div>
        <strong>{{ notification.title }}</strong>
        <p>{{ notification.message }}</p>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.notification-panel {
  position: fixed;
  top: var(--layout-header-height);
  right: 0;
  z-index: var(--z-index-overlay);
  width: 340px;
  max-height: calc(100svh - var(--layout-header-height));
  overflow-y: auto;
  border-left: var(--border-width-default) solid var(--color-border-default);
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-panel);
}

.notification-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
  padding: var(--spacing-card);
}

.notification-panel__header h2 {
  font-size: var(--font-size-lg);
}

.notification-panel__close {
  border: 0;
  background: transparent;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xl);
}

.notification-panel__list {
  display: grid;
  gap: var(--space-2);
  list-style: none;
  padding: var(--spacing-card);
}

.notification-panel__item {
  display: grid;
  gap: var(--space-2);
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
  padding-bottom: var(--space-3);
}

.notification-panel__item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.notification-panel__item p,
.notification-panel__time {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}
</style>

<script setup lang="ts">
import type { Component } from 'vue';

import { AlertTriangle, CheckCircle2, Info, TriangleAlert, X } from '@lucide/vue';

import type { NotificationItem, NotificationLevel } from '@/types/notification';

import BaseBadge from '@/components/base/BaseBadge.vue';

import { formatKoTime } from '@/utils/format';

interface Props {
  open: boolean;
  notifications: NotificationItem[];
  loading?: boolean;
  errorMessage?: string | null;
  streamError?: boolean;
}

withDefaults(defineProps<Props>(), {
  loading: false,
  errorMessage: null,
  streamError: false,
});

const emit = defineEmits<{
  close: [];
  markRead: [notificationId: string];
  openCase: [caseId: string];
  openMonitoring: [caseId: string];
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

    <p v-if="streamError" class="notification-panel__status notification-panel__status--warning">
      실시간 알림 연결이 끊겼습니다. 목록 조회 데이터로 표시합니다.
    </p>
    <p v-if="loading" class="notification-panel__status">알림을 불러오는 중입니다.</p>
    <p v-else-if="errorMessage" class="notification-panel__status notification-panel__status--error">
      {{ errorMessage }}
    </p>
    <p v-else-if="notifications.length === 0" class="notification-panel__status">표시할 알림이 없습니다.</p>

    <ul class="notification-panel__list">
      <li
        v-for="notification in notifications"
        :key="notification.id"
        class="notification-panel__item"
        :class="{ 'notification-panel__item--unread': notification.unread }"
      >
        <div class="notification-panel__item-header">
          <BaseBadge :variant="notification.level">
            <component :is="levelIconMap[notification.level]" :size="14" aria-hidden="true" />
            {{ levelLabelMap[notification.level] }}
          </BaseBadge>
          <span class="notification-panel__time">{{ formatKoTime(notification.createdAt) }}</span>
        </div>
        <strong>{{ notification.title }}</strong>
        <p>{{ notification.message }}</p>
        <div class="notification-panel__actions">
          <button
            v-if="notification.refCaseId"
            class="notification-panel__action"
            type="button"
            @click="emit('openMonitoring', notification.refCaseId)"
          >
            병목 모니터링
          </button>
          <button
            v-if="notification.refCaseId"
            class="notification-panel__action notification-panel__action--ghost"
            type="button"
            @click="emit('openCase', notification.refCaseId)"
          >
            케이스 보기
          </button>
          <button
            v-if="notification.unread"
            class="notification-panel__action notification-panel__action--muted"
            type="button"
            @click="emit('markRead', notification.id)"
          >
            읽음 처리
          </button>
        </div>
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

.notification-panel__status {
  margin: var(--space-3) var(--spacing-card) 0;
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  padding: var(--space-2);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.notification-panel__status--warning {
  border-color: var(--color-status-warning);
  color: var(--color-status-warning);
}

.notification-panel__status--error {
  border-color: var(--color-status-danger);
  color: var(--color-status-danger);
}

.notification-panel__item {
  display: grid;
  gap: var(--space-2);
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
  padding-bottom: var(--space-3);
}

.notification-panel__item--unread {
  border-radius: var(--radius-md);
  border-bottom-color: transparent;
  background: var(--color-bg-card);
  padding: var(--space-2);
  box-shadow: inset 0 0 0 1px var(--color-border-subtle);
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

.notification-panel__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.notification-panel__action {
  min-height: 28px;
  border: var(--border-width-default) solid var(--color-action-primary-border);
  border-radius: var(--radius-md);
  background: var(--color-action-primary);
  padding: 0 10px;
  color: var(--color-text-inverse);
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.notification-panel__action--ghost {
  background: transparent;
  color: var(--color-action-primary);
}

.notification-panel__action--muted {
  border-color: var(--color-border-default);
  background: transparent;
  color: var(--color-fg-muted);
}
</style>

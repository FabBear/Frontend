<script setup lang="ts">
import { type Component, computed } from 'vue';

import { AlertTriangle, CheckCircle2, Info, TriangleAlert, X } from '@lucide/vue';

import type { NotificationItem, NotificationLevel } from '@/types/notification';

import BaseBadge from '@/components/base/BaseBadge.vue';

import { formatKoTime } from '@/utils/format';

interface Props {
  open: boolean;
  notifications: NotificationItem[];
  unreadCount?: number;
  loading?: boolean;
  errorMessage?: string | null;
  streamError?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  unreadCount: 0,
  loading: false,
  errorMessage: null,
  streamError: false,
});

const emit = defineEmits<{
  close: [];
  markRead: [notificationId: string];
  markAllRead: [];
  openCase: [caseId: string];
  openMonitoring: [caseId: string];
  openMlflow: [notificationId: string];
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

const hasUnread = computed(() => props.unreadCount > 0);

function handleOpenCase(notification: NotificationItem) {
  if (!notification.refCaseId) return;
  emit('markRead', notification.id);
  emit('openCase', notification.refCaseId);
}

function handleOpenMonitoring(notification: NotificationItem) {
  if (!notification.refCaseId) return;
  emit('markRead', notification.id);
  emit('openMonitoring', notification.refCaseId);
}
</script>

<template>
  <aside v-if="open" class="notification-panel" aria-label="알림 패널">
    <header class="notification-panel__header">
      <h2>알림</h2>
      <div class="notification-panel__header-actions">
        <button class="notification-panel__mark-all" type="button" :disabled="!hasUnread" @click="emit('markAllRead')">
          전체 읽음
        </button>
        <button class="notification-panel__close" type="button" aria-label="알림 닫기" @click="emit('close')">
          <X :size="18" aria-hidden="true" />
        </button>
      </div>
    </header>

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
        <dl v-if="notification.detailItems?.length" class="notification-panel__details">
          <div v-for="item in notification.detailItems" :key="`${notification.id}-${item.label}`">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
        <div class="notification-panel__actions">
          <button
            v-if="notification.refCaseId"
            class="notification-panel__action"
            type="button"
            @click="handleOpenMonitoring(notification)"
          >
            병목 모니터링
          </button>
          <button
            v-if="notification.refCaseId"
            class="notification-panel__action notification-panel__action--ghost"
            type="button"
            @click="handleOpenCase(notification)"
          >
            케이스 보기
          </button>
          <button
            v-if="notification.type === 'MODEL_RETRAIN'"
            class="notification-panel__action"
            type="button"
            @click="emit('openMlflow', notification.id)"
          >
            확인
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

.notification-panel__header-actions {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.notification-panel__mark-all {
  min-height: 28px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: 0 10px;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.notification-panel__mark-all:hover:not(:disabled),
.notification-panel__mark-all:focus-visible {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
  outline: none;
}

.notification-panel__mark-all:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
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

.notification-panel__details {
  display: grid;
  gap: 6px;
  margin: 0;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-status-warning) 7%, var(--color-bg-page));
  padding: var(--space-2);
}

.notification-panel__details div {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr);
  gap: var(--space-2);
  align-items: start;
}

.notification-panel__details dt,
.notification-panel__details dd {
  margin: 0;
  font-size: var(--font-size-xs);
  line-height: 1.4;
}

.notification-panel__details dt {
  color: var(--color-fg-muted);
  font-weight: var(--font-weight-semibold);
}

.notification-panel__details dd {
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-semibold);
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

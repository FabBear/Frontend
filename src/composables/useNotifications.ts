import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';

import {
  createNotificationEventSource,
  fetchNotifications,
  mapNotificationStreamEvent,
  markNotificationsRead,
} from '@/services/notificationService';

import type { NotificationItem, NotificationStreamEvent } from '@/types/notification';

export function useNotifications() {
  const notifications = shallowRef<NotificationItem[]>([]);
  const unreadCount = ref(0);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);
  const streamConnected = ref(false);
  const streamError = ref(false);

  const latestCriticalUnread = computed(
    () => notifications.value.find((notification) => notification.unread && notification.level === 'critical') ?? null
  );

  async function loadNotifications() {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const data = await fetchNotifications();
      notifications.value = data.items;
      unreadCount.value = data.totalUnreadCount;
    } catch {
      errorMessage.value = '알림을 불러오지 못했습니다.';
      notifications.value = [];
      unreadCount.value = 0;
    } finally {
      isLoading.value = false;
    }
  }

  async function markRead(notificationId: string) {
    const target = notifications.value.find((notification) => notification.id === notificationId);
    if (!target || !target.unread) return;

    notifications.value = notifications.value.map((notification) =>
      notification.id === notificationId ? { ...notification, unread: false } : notification
    );
    unreadCount.value = Math.max(unreadCount.value - 1, 0);

    try {
      await markNotificationsRead([notificationId]);
    } catch {
      notifications.value = notifications.value.map((n) => (n.id === notificationId ? { ...n, unread: true } : n));
      unreadCount.value += 1;
    }
  }

  let eventSource: EventSource | null = null;

  function connectStream() {
    eventSource?.close();
    eventSource = createNotificationEventSource();

    eventSource.addEventListener('open', () => {
      streamConnected.value = true;
      streamError.value = false;
    });

    eventSource.addEventListener('notification', (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as NotificationStreamEvent;
      const item = mapNotificationStreamEvent(payload);
      notifications.value = [item, ...notifications.value.filter((notification) => notification.id !== item.id)].slice(
        0,
        20
      );
      unreadCount.value = payload.unreadCount ?? unreadCount.value + 1;
      streamConnected.value = true;
      streamError.value = false;
    });

    eventSource.onerror = () => {
      streamConnected.value = false;
      streamError.value = true;
    };
  }

  onMounted(() => {
    void loadNotifications();
    connectStream();
  });

  onUnmounted(() => {
    eventSource?.close();
  });

  return {
    notifications,
    unreadCount,
    latestCriticalUnread,
    isLoading,
    errorMessage,
    streamConnected,
    streamError,
    loadNotifications,
    markRead,
  };
}

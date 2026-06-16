import api from '@/services/api';

import { DEMO_NOTIFICATION_LIST } from '@/constants/mockData/demoAlert';
import { shouldUseDemoMockData } from '@/constants/mockMode';

import type {
  NotificationItem,
  NotificationItemResponse,
  NotificationLevel,
  NotificationListData,
  NotificationListResponse,
  NotificationStreamEvent,
  NotificationType,
} from '@/types/notification';

const NOTIFICATION_STREAM_PATH = '/v1/notifications/stream';

export async function fetchNotifications(): Promise<NotificationListData> {
  if (shouldUseDemoMockData()) return DEMO_NOTIFICATION_LIST;

  try {
    const { data } = await api.get<NotificationListResponse>('/v1/notifications', {
      params: {
        page: 0,
        size: 20,
        sort: 'createdAt,desc',
      },
    });

    return {
      totalUnreadCount: data.totalUnreadCount,
      items: data.items.map(mapNotificationItem),
    };
  } catch {
    return DEMO_NOTIFICATION_LIST;
  }
}

export async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  if (shouldUseDemoMockData()) return;
  await api.put('/v1/notifications/read', { notificationIds, readAll: false });
}

export async function markAllNotificationsRead(): Promise<void> {
  if (shouldUseDemoMockData()) return;
  await api.put('/v1/notifications/read', { notificationIds: [], readAll: true });
}

export function createNotificationEventSource(): EventSource {
  const baseURL = api.defaults.baseURL ?? '/api';
  const url = `${baseURL.replace(/\/$/, '')}${NOTIFICATION_STREAM_PATH}`;
  return new EventSource(url, { withCredentials: true });
}

export function mapNotificationStreamEvent(event: NotificationStreamEvent): NotificationItem {
  return {
    id: event.notificationId,
    type: event.notificationType,
    level: getNotificationLevel(event.notificationType, event.riskGrade),
    title: getNotificationTitle(event.notificationType),
    message: event.message,
    refCaseId: event.refCaseId,
    createdAt: event.createdAt,
    unread: true,
  };
}

function mapNotificationItem(item: NotificationItemResponse): NotificationItem {
  return {
    id: item.notificationId,
    type: item.notificationType,
    level: getNotificationLevel(item.notificationType, item.riskGrade),
    title: getNotificationTitle(item.notificationType),
    message: item.message,
    refCaseId: item.refCaseId,
    createdAt: item.createdAt,
    unread: !item.isRead,
  };
}

function getNotificationLevel(type: NotificationType, riskGrade: 'HIGH' | 'CRITICAL' | null): NotificationLevel {
  if (type === 'BOTTLENECK_CRITICAL' || riskGrade === 'CRITICAL') return 'critical';
  if (type === 'BOTTLENECK_HIGH' || type === 'QTIME_EXCEEDED' || riskGrade === 'HIGH') return 'warning';
  if (type === 'DIFFUSION_COMPLETE') return 'success';
  return 'info';
}

function getNotificationTitle(type: NotificationType): string {
  switch (type) {
    case 'BOTTLENECK_CRITICAL':
      return '긴급 병목 발생';
    case 'BOTTLENECK_HIGH':
      return '병목 위험 감지';
    case 'DIFFUSION_COMPLETE':
      return '확산 분석 완료';
    case 'QTIME_EXCEEDED':
      return 'Q-time 초과';
    case 'HITL_PENDING':
      return '대응안 승인 대기';
    case 'MODEL_RETRAIN':
      return '모델 재학습';
    default:
      return '알림';
  }
}

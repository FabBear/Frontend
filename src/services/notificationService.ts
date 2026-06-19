import api from '@/services/api';

import { DEMO_NOTIFICATION_LIST, getDemoNotifications } from '@/constants/mockData/demoAlert';
import { shouldUsePresentationScenario } from '@/constants/scenarioMode';

import { formatNumber, formatRatioPercent, formatRiskScore } from '@/utils/format';

import type { BncAlertMetrics } from '@/types/bnc';
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
  if (shouldUsePresentationScenario()) return getDemoNotifications();

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
  } catch (e) {
    if (shouldUsePresentationScenario()) return DEMO_NOTIFICATION_LIST;
    throw e;
  }
}

export async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  if (shouldUsePresentationScenario()) return;
  await api.put('/v1/notifications/read', { notificationIds, readAll: false });
}

export async function markAllNotificationsRead(): Promise<void> {
  if (shouldUsePresentationScenario()) return;
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
    detailItems: buildNotificationDetailItems(item.alertMetrics),
  };
}

// 알림 패널에 케이스 지표를 노출한다. BncAlertCard와 동일하게 위험 점수·영향·위험 Lot을 보여주되,
// 값이 없는 항목은 건너뛰고, 하나도 없으면 표시하지 않는다.
function buildNotificationDetailItems(
  metrics: BncAlertMetrics | null | undefined
): Array<{ label: string; value: string }> | undefined {
  if (!metrics) return undefined;
  const items: Array<{ label: string; value: string }> = [];
  if (metrics.compositeScore !== null) {
    items.push({ label: '위험 점수', value: formatRiskScore(metrics.compositeScore) });
  }
  if (metrics.impactScore !== null) {
    items.push({ label: '영향', value: formatRatioPercent(metrics.impactScore) });
  } else if (metrics.affectedCount !== null) {
    items.push({ label: '후속 TG', value: `${formatNumber(metrics.affectedCount)}개` });
  }
  if (metrics.atRiskLots !== null) {
    items.push({ label: '위험 Lot', value: formatNumber(metrics.atRiskLots) });
  }
  return items.length ? items : undefined;
}

function getNotificationLevel(type: NotificationType, riskGrade: 'HIGH' | 'CRITICAL' | null): NotificationLevel {
  // 타입을 우선 판정한다. HITL_PENDING은 케이스 risk_grade(CRITICAL 등)를 그대로 싣고 오므로
  // riskGrade를 먼저 보면 '승인 대기'가 '위험'으로 오표시된다.
  if (type === 'HITL_PENDING' || type === 'MODEL_RETRAIN') return 'warning';
  if (type === 'BOTTLENECK_CRITICAL' || riskGrade === 'CRITICAL') return 'critical';
  return 'info';
}

function getNotificationTitle(type: NotificationType): string {
  switch (type) {
    case 'BOTTLENECK_CRITICAL':
      return '긴급 병목 발생';
    case 'HITL_PENDING':
      return '대응안 승인 대기';
    case 'MODEL_RETRAIN':
      return '모델 재학습';
    default:
      return '알림';
  }
}

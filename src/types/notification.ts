import type { BncAlertMetrics } from '@/types/bnc';

export type NotificationLevel = 'critical' | 'warning' | 'info' | 'success';
export type NotificationType =
  | 'BOTTLENECK_CRITICAL'
  | 'HITL_PENDING'
  | 'MODEL_RETRAIN';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  level: NotificationLevel;
  title: string;
  message: string;
  refCaseId: string | null;
  createdAt: string;
  unread: boolean;
  detailItems?: Array<{ label: string; value: string }>;
}

export interface NotificationListData {
  totalUnreadCount: number;
  items: NotificationItem[];
}

export interface NotificationItemResponse {
  notificationId: string;
  notificationType: NotificationType;
  riskGrade: 'HIGH' | 'CRITICAL' | null;
  message: string;
  refCaseId: string | null;
  refEntityType: string | null;
  refEntityId: string | null;
  isRead: boolean;
  createdAt: string;
  expiresAt: string;
  /** refCaseId 케이스의 위험 점수·영향·위험 Lot 등 지표. 없으면 null. */
  alertMetrics: BncAlertMetrics | null;
}

export interface NotificationListResponse {
  totalUnreadCount: number;
  items: NotificationItemResponse[];
}

export interface NotificationStreamEvent {
  notificationId: string;
  notificationType: NotificationType;
  riskGrade: 'HIGH' | 'CRITICAL' | null;
  message: string;
  refCaseId: string | null;
  unreadCount: number | null;
  createdAt: string;
}

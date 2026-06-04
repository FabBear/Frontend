export type NotificationLevel = 'critical' | 'warning' | 'info' | 'success';
export type NotificationType =
  | 'BOTTLENECK_HIGH'
  | 'BOTTLENECK_CRITICAL'
  | 'DIFFUSION_COMPLETE'
  | 'QTIME_EXCEEDED'
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

export type NotificationLevel = 'critical' | 'warning' | 'info' | 'success';

export interface NotificationItem {
  id: string;
  level: NotificationLevel;
  title: string;
  message: string;
  createdAt: string;
  unread: boolean;
}

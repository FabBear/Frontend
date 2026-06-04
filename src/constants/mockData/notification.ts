import type { NotificationItem } from '@/types/notification';

export type { NotificationItem };

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'noti-001',
    type: 'BOTTLENECK_CRITICAL',
    level: 'critical',
    title: 'PHOTO-12 병목 위험',
    message: 'WIP가 임계값을 초과해 대응 검토가 필요합니다.',
    refCaseId: null,
    createdAt: '5분 전',
    unread: true,
  },
  {
    id: 'noti-002',
    type: 'BOTTLENECK_HIGH',
    level: 'warning',
    title: 'ETCH-04 대기 Lot 증가',
    message: '최근 1시간 대기 Lot이 기준 대비 빠르게 증가했습니다.',
    refCaseId: null,
    createdAt: '18분 전',
    unread: true,
  },
  {
    id: 'noti-003',
    type: 'DIFFUSION_COMPLETE',
    level: 'info',
    title: 'MES 수집 완료',
    message: '이천 Fab 실시간 데이터 동기화가 정상 완료되었습니다.',
    refCaseId: null,
    createdAt: '42분 전',
    unread: false,
  },
  {
    id: 'noti-004',
    type: 'HITL_PENDING',
    level: 'success',
    title: '대응안 승인 완료',
    message: 'CMP-07 우선순위 조정안이 승인되었습니다.',
    refCaseId: null,
    createdAt: '1시간 전',
    unread: false,
  },
];

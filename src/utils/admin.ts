import type { AdminResourceItem, AdminResourceKey, AdminResourceMeta, AdminStatus } from '@/types/admin';

export function getAdminStatusVariant(status: AdminStatus) {
  if (status === 'ERROR') return 'danger';
  if (status === 'WARNING') return 'warning';
  if (status === 'DISABLED') return 'info';
  return 'success';
}

export function getAdminStatusLabel(status: AdminStatus) {
  const labels: Record<AdminStatus, string> = {
    NORMAL: '정상',
    WARNING: '주의',
    ERROR: '오류',
    DISABLED: '비활성',
  };
  return labels[status];
}

export function getAdminResourceActionLabel(resourceKey: AdminResourceKey) {
  const labels: Record<AdminResourceKey, string> = {
    labelingRules: '라벨링 기준 변경은 저장 시 이력에 남습니다.',
    access: '사용자 역할과 접근 범위를 확인하고 필요한 경우 편집합니다.',
    mlflow: '모델 성능과 버전 상태를 확인합니다.',
    mesInterface: 'MES 원천 필드와 내부 표준 필드 매핑을 관리합니다.',
    prompts: '활성 프롬프트 버전과 운영 문구를 관리합니다.',
    ingestion: '수집 잡 상태와 주기를 점검하고 운영 설정을 관리합니다.',
    logs: '운영 변경과 접근 이력을 추적합니다.',
  };
  return labels[resourceKey];
}

export function filterAdminItems(items: AdminResourceItem[], keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) return items;
  return items.filter((item) => {
    const metricText = item.metrics.map((metric) => `${metric.label} ${metric.value}`).join(' ');
    return `${item.primary} ${item.secondary} ${item.category} ${item.owner} ${metricText}`
      .toLowerCase()
      .includes(normalizedKeyword);
  });
}

export function filterAdminItemsByStatus(items: AdminResourceItem[], status: AdminStatus | 'ALL') {
  if (status === 'ALL') return items;
  return items.filter((item) => item.status === status);
}

export function createAdminItem(resourceKey: AdminResourceKey, meta: AdminResourceMeta): AdminResourceItem {
  const now = new Date().toISOString();
  return {
    id: `${resourceKey}-${Date.now()}`,
    resourceKey,
    primary: '',
    secondary: '',
    category: meta.key === 'access' ? 'USER' : meta.title,
    status: 'NORMAL',
    owner: 'admin',
    updatedAt: now,
    metrics: [
      { label: '상태값', value: '' },
      { label: '비고', value: '' },
    ],
  };
}

export function upsertAdminItem(items: AdminResourceItem[], nextItem: AdminResourceItem) {
  if (items.some((item) => item.id === nextItem.id)) {
    return items.map((item) => (item.id === nextItem.id ? nextItem : item));
  }
  return [nextItem, ...items];
}

export function normalizeAdminItem(nextItem: AdminResourceItem) {
  return { ...nextItem, updatedAt: new Date().toISOString() };
}

export function removeAdminItem(items: AdminResourceItem[], itemId: string) {
  return items.filter((item) => item.id !== itemId);
}

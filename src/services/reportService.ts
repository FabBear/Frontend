import api from '@/services/api';

import type {
  ActionHistoryDetail,
  ActionHistoryFilters,
  ActionHistoryItem,
  ActionHistoryListData,
} from '@/types/report';

interface FetchActionHistoryParams extends Partial<ActionHistoryFilters> {
  page?: number;
  size?: number;
}

type BackendHistoryListData = {
  items: BackendHistoryItem[];
  pageInfo: ActionHistoryListData['pageInfo'];
};

type BackendHistoryItem = Omit<
  ActionHistoryItem,
  'decidedBy' | 'displayDay' | 'reportTypes' | 'riskGrade' | 'targetTgText'
> & {
  riskGrade: string;
  decidedBy: ActionHistoryItem['decidedBy'] | null;
};

type BackendHistoryDetail = Omit<
  ActionHistoryDetail,
  'actionPlans' | 'baseline' | 'displayDay' | 'hitlDecision' | 'riskGrade' | 'targetTgText'
> & {
  riskGrade: string;
  hitlDecision: ActionHistoryDetail['hitlDecision'] | null;
  baseline: Partial<ActionHistoryDetail['baseline']> | null;
  actionPlans: Array<Partial<ActionHistoryDetail['actionPlans'][number]>>;
};

const DEFAULT_PAGE_SIZE = 10;
const UNSUPPORTED_FILTER_FETCH_SIZE = 100;

function toNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function toDisplayDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' });
}

function toDateTimeBoundary(date: string | undefined, endOfDay = false): string | undefined {
  if (!date) return undefined;
  return `${date}T${endOfDay ? '23:59:59' : '00:00:00'}+09:00`;
}

function toSort(sortOrder: ActionHistoryFilters['sortOrder'] | undefined): string {
  return sortOrder === 'DECIDED_ASC' ? 'decidedAt,asc' : 'decidedAt,desc';
}

function targetTgText(tgName: string, areaName: string): string {
  return areaName ? `${tgName} · ${areaName}` : tgName;
}

function mapHistoryItem(item: BackendHistoryItem): ActionHistoryItem {
  return {
    ...item,
    riskGrade: item.riskGrade as ActionHistoryItem['riskGrade'],
    displayDay: toDisplayDay(item.decidedAt ?? item.detectedAt),
    targetTgText: targetTgText(item.tgName, item.areaName),
    decidedBy: item.decidedBy ?? { userId: 'unknown', userName: '-' },
    reportTypes: item.hasReport ? ['ACTION'] : [],
  };
}

function mapHistoryDetail(detail: BackendHistoryDetail): ActionHistoryDetail {
  const detectedAt = detail.detectedAt;

  return {
    ...detail,
    riskGrade: detail.riskGrade as ActionHistoryDetail['riskGrade'],
    displayDay: toDisplayDay(detail.hitlDecision?.decidedAt ?? detectedAt),
    targetTgText: targetTgText(detail.tgName, detail.areaName),
    hitlDecision: detail.hitlDecision ?? {
      decisionId: 'unknown',
      decision: 'REJECTED',
      selectedPlanTitle: '-',
      comment: '-',
      decidedBy: { userId: 'unknown', userName: '-' },
      decidedAt: detectedAt,
    },
    baseline: {
      throughput: toNumber(detail.baseline?.throughput),
      avgWaitDay: toNumber(detail.baseline?.avgWaitDay),
      deliveryCompliance: toNumber(detail.baseline?.deliveryCompliance),
    },
    actionPlans: detail.actionPlans.map((plan, index) => ({
      planSeq: plan.planSeq ?? index + 1,
      planTitle: plan.planTitle ?? `대응안 ${index + 1}`,
      planType: plan.planType ?? '-',
      estThroughputDelta: toNumber(plan.estThroughputDelta),
      estAvgWaitDelta: toNumber(plan.estAvgWaitDelta),
      estDeliveryComplianceDelta: toNumber(plan.estDeliveryComplianceDelta),
      estDelayDelta: toNumber(plan.estDelayDelta),
      isSelected: Boolean(plan.isSelected),
    })),
  };
}

function needsClientSideFiltering(params: FetchActionHistoryParams): boolean {
  return Boolean(params.reportType || params.decision || params.pdf);
}

function applyUnsupportedFilters(items: ActionHistoryItem[], params: FetchActionHistoryParams): ActionHistoryItem[] {
  return items.filter((item) => {
    if (params.reportType && !item.reportTypes.includes(params.reportType)) return false;
    if (params.decision && item.decision !== params.decision) return false;
    if (params.pdf === 'AVAILABLE' && !item.hasReport) return false;
    if (params.pdf === 'NONE' && item.hasReport) return false;
    return true;
  });
}

export async function fetchActionHistory(params: FetchActionHistoryParams = {}): Promise<ActionHistoryListData> {
  const page = params.page ?? 0;
  const size = params.size ?? DEFAULT_PAGE_SIZE;
  const clientFilterMode = needsClientSideFiltering(params);
  const requestSize = clientFilterMode ? UNSUPPORTED_FILTER_FETCH_SIZE : size;

  const { data } = await api.get<BackendHistoryListData>('/v1/history', {
    params: {
      page: clientFilterMode ? 0 : page,
      size: requestSize,
      sort: toSort(params.sortOrder),
      from: toDateTimeBoundary(params.startDate),
      to: toDateTimeBoundary(params.endDate, true),
      riskGrade: params.riskGrade || undefined,
      status: params.status || undefined,
      keyword: params.keyword?.trim() || undefined,
    },
  });

  const mappedItems = data.items.map(mapHistoryItem);

  if (!clientFilterMode) {
    return { items: mappedItems, pageInfo: data.pageInfo };
  }

  const filteredItems = applyUnsupportedFilters(mappedItems, params);
  const start = page * size;

  return {
    items: filteredItems.slice(start, start + size),
    pageInfo: {
      page,
      size,
      totalElements: filteredItems.length,
      totalPages: Math.ceil(filteredItems.length / size),
      sort: data.pageInfo.sort,
    },
  };
}

export async function fetchActionHistoryDetail(caseId: string): Promise<ActionHistoryDetail> {
  const { data } = await api.get<BackendHistoryDetail>(`/v1/history/${caseId}`);
  return mapHistoryDetail(data);
}

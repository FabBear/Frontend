import api from '@/services/api';

import { MOCK_ACTION_HISTORY_DETAILS, MOCK_ACTION_HISTORY_ITEMS } from '@/constants/mockData/report';
import { cloneScenarioData, shouldUsePresentationScenario } from '@/constants/scenarioMode';

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
  | 'decidedBy'
  | 'displayDay'
  | 'estAvgWaitDelta'
  | 'estDeliveryComplianceDelta'
  | 'reportTypes'
  | 'riskGrade'
  | 'targetTgText'
> & {
  riskGrade: string;
  decidedBy: ActionHistoryItem['decidedBy'] | null;
  estQTimeDelta: number | null;
  estAvgWaitDelta?: number | null;
  estDeliveryComplianceDelta?: number | null;
};

type BackendHistoryDetail = Omit<
  ActionHistoryDetail,
  'actionPlans' | 'baseline' | 'displayDay' | 'hitlDecision' | 'riskGrade' | 'targetTgText'
> & {
  riskGrade: string;
  hitlDecision: ActionHistoryDetail['hitlDecision'] | null;
  baseline: Partial<ActionHistoryDetail['baseline']> | null;
  actionPlans: Array<
    Partial<ActionHistoryDetail['actionPlans'][number]> & {
      estUtilDelta?: number | null;
      estQTimeDelta?: number | null;
      estWipDelta?: number | null;
      estWaitRatioDelta?: number | null;
    }
  >;
};

const DEFAULT_PAGE_SIZE = 10;
const UNSUPPORTED_FILTER_FETCH_SIZE = 100;

function toNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function minutesToDays(value: number | null | undefined): number {
  return toNumber(value) / 1440;
}

function toDisplayDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit' });
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
    estAvgWaitDelta: item.estAvgWaitDelta ?? minutesToDays(item.estQTimeDelta),
    estDeliveryComplianceDelta: item.estDeliveryComplianceDelta ?? 0,
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
      estThroughputDelta: toNumber(plan.estThroughputDelta ?? plan.estUtilDelta),
      estAvgWaitDelta: plan.estAvgWaitDelta ?? minutesToDays(plan.estQTimeDelta),
      estDeliveryComplianceDelta: toNumber(plan.estDeliveryComplianceDelta ?? plan.estWaitRatioDelta),
      estDelayDelta: toNumber(plan.estDelayDelta ?? plan.estWipDelta),
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
  if (shouldUsePresentationScenario()) return getMockActionHistory(params, page, size);

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
  if (shouldUsePresentationScenario()) {
    return cloneScenarioData(
      MOCK_ACTION_HISTORY_DETAILS[caseId] ?? MOCK_ACTION_HISTORY_DETAILS[MOCK_ACTION_HISTORY_ITEMS[0].caseId]
    );
  }

  const { data } = await api.get<BackendHistoryDetail>(`/v1/history/${caseId}`);
  return mapHistoryDetail(data);
}

function getMockActionHistory(params: FetchActionHistoryParams, page: number, size: number): ActionHistoryListData {
  let items = cloneScenarioData(MOCK_ACTION_HISTORY_ITEMS);

  if (params.riskGrade) items = items.filter((item) => item.riskGrade === params.riskGrade);
  if (params.status) items = items.filter((item) => item.status === params.status);
  if (params.keyword?.trim()) {
    const keyword = params.keyword.trim().toLowerCase();
    items = items.filter((item) =>
      [item.tgName, item.areaName, item.selectedPlanTitle, item.targetTgText].some((value) =>
        value.toLowerCase().includes(keyword)
      )
    );
  }

  items = applyUnsupportedFilters(items, params);
  items.sort((a, b) =>
    params.sortOrder === 'DECIDED_ASC'
      ? (a.decidedAt ?? a.detectedAt).localeCompare(b.decidedAt ?? b.detectedAt)
      : (b.decidedAt ?? b.detectedAt).localeCompare(a.decidedAt ?? a.detectedAt)
  );

  const start = page * size;
  return {
    items: items.slice(start, start + size),
    pageInfo: {
      page,
      size,
      totalElements: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / size)),
      sort: toSort(params.sortOrder),
    },
  };
}

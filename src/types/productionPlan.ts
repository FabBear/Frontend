export type ReleasePlanRange = '24h' | '7d' | '30d' | 'all';

export interface ReleasePlanSummary {
  anchorMeasuredAt: string;
  anchorTimeStep: number;
  plannedLots24h: number;
  nextReleaseInMin: number | null;
  priorityLots24h: number;
  dueLots7d: number;
  sourceRunId: string | null;
}

export interface ReleasePlanResponse {
  range: ReleasePlanRange;
  anchorMeasuredAt: string;
  anchorTimeStep: number;
  sourceRunId: string | null;
  summary: ReleasePlanDetailSummary;
  releaseBuckets: ReleasePlanBucket[];
  productMix: ReleasePlanMixItem[];
  routeMix: ReleasePlanMixItem[];
  lotTypeMix: ReleasePlanMixItem[];
  productSlack: ReleasePlanProductSlack[];
  upcomingLots: ReleasePlanLot[];
}

export interface ReleasePlanHotLotsResponse {
  range: ReleasePlanRange;
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  lots: ReleasePlanLot[];
}

export interface ReleasePlanProductSlack {
  productName: string;
  avgSlackMin: number | null;
  lots: number;
}

export interface ReleasePlanDetailSummary {
  plannedLots: number;
  plannedWafers: number;
  priorityLots: number;
  superHotLots: number;
  dueLots: number;
  nextReleaseInMin: number | null;
  avgDueSlackMin: number | null;
}

export interface ReleasePlanBucket {
  bucketIndex: number;
  fromMin: number;
  toMin: number;
  label: string;
  totalLots: number;
  priorityLots: number;
  products: ReleasePlanProductCount[];
}

export interface ReleasePlanProductCount {
  productName: string;
  lots: number;
}

export interface ReleasePlanMixItem {
  name: string;
  lots: number;
  ratio: number;
}

export interface ReleasePlanLot {
  lotId: string;
  productName: string | null;
  routeName: string | null;
  lotType: string | null;
  priority: number | null;
  superHot: boolean;
  wafersPerLot: number | null;
  releaseInMin: number | null;
  dueInMin: number | null;
}

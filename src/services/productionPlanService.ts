import api from '@/services/api';

import {
  MOCK_RELEASE_PLAN_SUMMARY,
  getMockReleasePlan,
  getMockReleasePlanHotLots,
} from '@/constants/mockData/productionPlan';
import { shouldUsePresentationScenario } from '@/constants/scenarioMode';

import type {
  ReleasePlanHotLotsResponse,
  ReleasePlanRange,
  ReleasePlanResponse,
  ReleasePlanSummary,
} from '@/types/productionPlan';

export async function fetchReleasePlanSummary(): Promise<ReleasePlanSummary> {
  try {
    const { data } = await api.get<ReleasePlanSummary>('/v1/dashboard/release-plan-summary');
    return data;
  } catch (e) {
    if (shouldUsePresentationScenario()) return { ...MOCK_RELEASE_PLAN_SUMMARY };
    throw e;
  }
}

export async function fetchReleasePlan(range: ReleasePlanRange): Promise<ReleasePlanResponse> {
  try {
    const { data } = await api.get<ReleasePlanResponse>('/v1/production-plan/release-plan', {
      params: { range },
    });
    return data;
  } catch (e) {
    if (shouldUsePresentationScenario()) return getMockReleasePlan(range);
    throw e;
  }
}

export async function fetchReleasePlanHotLots(
  range: ReleasePlanRange,
  page: number,
  size: number
): Promise<ReleasePlanHotLotsResponse> {
  try {
    const { data } = await api.get<ReleasePlanHotLotsResponse>('/v1/production-plan/release-plan/hot-lots', {
      params: { range, page, size },
    });
    return data;
  } catch (e) {
    if (shouldUsePresentationScenario()) return getMockReleasePlanHotLots(range, page, size);
    throw e;
  }
}

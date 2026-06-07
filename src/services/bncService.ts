import axios from 'axios';

import api from '@/services/api';

import { MOCK_BNC_CASE_LIST } from '@/constants/mockData/bnc';

import type { BncCaseListData } from '@/types/bnc';

export interface FetchBncCasesParams {
  status?: string | null;
  riskGrade?: string | null;
  page?: number;
  size?: number;
}

export async function fetchBncCases(params: FetchBncCasesParams = {}): Promise<BncCaseListData> {
  try {
    const { data } = await api.get<BncCaseListData>('/v1/response-center/cases', {
      params: {
        page: params.page ?? 0,
        size: params.size ?? 20,
        sort: 'detectedAt,desc',
        ...(params.status ? { status: params.status } : {}),
        ...(params.riskGrade ? { riskGrade: params.riskGrade } : {}),
      },
    });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return MOCK_BNC_CASE_LIST;
    }
    throw error;
  }
}

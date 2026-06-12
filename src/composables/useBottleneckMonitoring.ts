import { computed, ref, shallowRef } from 'vue';

import axios from 'axios';

import {
  fetchBottleneckProcessMap,
  fetchBottleneckRankings,
  fetchBottleneckSnapshot,
  fetchBottleneckToolGroupDetail,
} from '@/services/bottleneckMonitoringService';
import {
  mapBottleneckRankings,
  mapBottleneckToolGroupsToDashboardAreas,
  normalizeBottleneckRiskSummary,
} from '@/services/mappers/bottleneckMonitoringMapper';

import { getProcessAreaNameKo } from '@/constants/processArea';
import { RISK_LEVEL_META, riskGradeToLevel } from '@/constants/riskLevel';
import type { RiskLevel } from '@/constants/riskLevel';

import type {
  AreaFilterOption,
  BottleneckAreaSummary,
  BottleneckRiskGrade,
  BottleneckSnapshot,
  BottleneckToolGroupDetail,
  BottleneckToolGroupItem,
} from '@/types/bottleneckMonitoring';
import type { DashboardProcessAreaData } from '@/types/dashboard';

const RISK_GRADES: BottleneckRiskGrade[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export function toRiskLevel(riskGrade: BottleneckRiskGrade): RiskLevel {
  return riskGradeToLevel(riskGrade);
}

function getMaxRiskLevel(summary: Record<BottleneckRiskGrade, number>): RiskLevel {
  for (const riskGrade of RISK_GRADES) {
    if (summary[riskGrade] > 0) return toRiskLevel(riskGrade);
  }

  return 'low';
}

function createAreaSummaries(processAreas: DashboardProcessAreaData[]): BottleneckAreaSummary[] {
  return processAreas.map((area) => ({
    areaId: area.areaId,
    areaCode: area.areaCode,
    areaName: area.areaName,
    totalTgCount: area.totalTgCount,
    bottleneckTgCount: area.bottleneckTgCount,
    tgSummary: normalizeBottleneckRiskSummary(area.tgSummary),
  }));
}

function createAreaFilters(processAreas: DashboardProcessAreaData[]): AreaFilterOption[] {
  return processAreas.map((area) => {
    const riskSummary = normalizeBottleneckRiskSummary(area.tgSummary);

    return {
      areaCode: area.areaCode,
      areaName: area.areaName,
      areaNameKo: getProcessAreaNameKo(area.areaCode),
      totalTgCount: area.totalTgCount,
      bottleneckTgCount: area.bottleneckTgCount,
      maxRiskLevel: getMaxRiskLevel(riskSummary),
      riskSummary,
    };
  });
}

function filterToolGroups(toolGroups: BottleneckToolGroupItem[], areaCode: string | null): BottleneckToolGroupItem[] {
  const filtered = areaCode ? toolGroups.filter((toolGroup) => toolGroup.areaCode === areaCode) : toolGroups;

  return [...filtered].sort((a, b) => {
    const riskDiff =
      RISK_LEVEL_META[toRiskLevel(a.riskGrade)].sortOrder - RISK_LEVEL_META[toRiskLevel(b.riskGrade)].sortOrder;
    if (riskDiff !== 0) return riskDiff;
    return b.bottleneckProb - a.bottleneckProb || b.utilizationRate - a.utilizationRate;
  });
}

function mapDetailFromToolGroup(toolGroup: BottleneckToolGroupItem): BottleneckToolGroupDetail {
  return {
    tgId: toolGroup.tgId,
    tgCode: toolGroup.tgCode,
    tgName: toolGroup.tgName,
    areaName: toolGroup.areaName,
    measuredAt: toolGroup.measuredAt,
    utilizationRate: toolGroup.utilizationRate,
    availableToolRatio: toolGroup.availableToolRatio,
    wipCount: toolGroup.wipCount,
    avgQtimeMin: toolGroup.avgQtimeMin,
    setupRatio: toolGroup.setupRatio,
    waitRatio: toolGroup.waitRatio,
    bottleneckProb: toolGroup.bottleneckProb,
    riskGrade: toolGroup.riskGrade,
    relatedCaseId: null,
  };
}

function mergeDetail(base: BottleneckToolGroupDetail, detail: BottleneckToolGroupDetail): BottleneckToolGroupDetail {
  const shouldUseDetailRisk = detail.bottleneckProb > 0 || detail.riskGrade !== 'LOW';

  return {
    ...base,
    ...detail,
    relatedCaseId: detail.relatedCaseId ?? base.relatedCaseId,
    bottleneckProb: shouldUseDetailRisk ? detail.bottleneckProb : base.bottleneckProb,
    riskGrade: shouldUseDetailRisk ? detail.riskGrade : base.riskGrade,
  };
}

function getBottleneckErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error?.message ?? '병목 모니터링 데이터를 불러오지 못했습니다.';
  }

  return '병목 모니터링 데이터를 불러오지 못했습니다.';
}

function isNoSnapshotError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.data?.error?.code === 'E-BN-001';
}

export function useBottleneckMonitoring() {
  const snapshot = shallowRef<BottleneckSnapshot | null>(null);
  const areas = shallowRef<BottleneckAreaSummary[]>([]);
  const areaFilters = shallowRef<AreaFilterOption[]>([]);
  const processMapAreas = shallowRef<DashboardProcessAreaData[]>([]);
  const allToolGroups = shallowRef<BottleneckToolGroupItem[]>([]);
  const toolGroups = shallowRef<BottleneckToolGroupItem[]>([]);
  const selectedAreaCode = ref<string | null>(null);
  const selectedToolGroupId = ref<string | null>(null);
  const selectedToolGroupDetail = shallowRef<BottleneckToolGroupDetail | null>(null);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);
  const toolGroupErrorMessage = ref<string | null>(null);
  const detailErrorMessage = ref<string | null>(null);

  const selectedArea = computed(
    () => areaFilters.value.find((area) => area.areaCode === selectedAreaCode.value) ?? null
  );

  function applyAreaFilter(areaCode: string | null) {
    selectedAreaCode.value = areaFilters.value.some((area) => area.areaCode === areaCode) ? areaCode : null;
    toolGroups.value = filterToolGroups(allToolGroups.value, selectedAreaCode.value);
    selectedToolGroupId.value = null;
    selectedToolGroupDetail.value = null;
    detailErrorMessage.value = null;
  }

  function applyToolGroups(nextToolGroups: BottleneckToolGroupItem[], initialAreaCode: string | null) {
    const nextProcessMapAreas = mapBottleneckToolGroupsToDashboardAreas(nextToolGroups);

    allToolGroups.value = nextToolGroups;
    processMapAreas.value = nextProcessMapAreas;
    areas.value = createAreaSummaries(nextProcessMapAreas);
    areaFilters.value = createAreaFilters(nextProcessMapAreas);
    applyAreaFilter(initialAreaCode);
  }

  function clearMonitoringData() {
    snapshot.value = null;
    allToolGroups.value = [];
    toolGroups.value = [];
    processMapAreas.value = [];
    areas.value = [];
    areaFilters.value = [];
    selectedAreaCode.value = null;
    selectedToolGroupId.value = null;
    selectedToolGroupDetail.value = null;
  }

  async function loadMonitoringData(initialAreaCode: string | null = null, caseId: string | null = null) {
    isLoading.value = true;
    errorMessage.value = null;
    toolGroupErrorMessage.value = null;
    detailErrorMessage.value = null;

    try {
      const snapshotData = await fetchBottleneckSnapshot(caseId);

      // processMap과 rankings는 모두 snapshotId만 필요 → 병렬 호출
      const [processMapData, rankingsRaw] = await Promise.all([
        fetchBottleneckProcessMap(snapshotData.snapshotId),
        fetchBottleneckRankings(snapshotData.snapshotId),
      ]);
      const rankings = mapBottleneckRankings(rankingsRaw, processMapData.areas);

      snapshot.value = snapshotData;
      applyToolGroups(rankings, initialAreaCode);
    } catch (error) {
      if (isNoSnapshotError(error)) {
        clearMonitoringData();
      } else {
        errorMessage.value = getBottleneckErrorMessage(error);
        clearMonitoringData();
      }
    } finally {
      isLoading.value = false;
    }
  }

  function selectArea(areaCode: string | null) {
    // 초기 로딩 시 전체 TG를 allToolGroups에 저장하므로 API 재호출 없이 클라이언트 필터 적용
    applyAreaFilter(areaCode);
  }

  async function selectToolGroup(tgId: string) {
    const baseToolGroup =
      allToolGroups.value.find((toolGroup) => toolGroup.tgId === tgId) ??
      toolGroups.value.find((toolGroup) => toolGroup.tgId === tgId);

    selectedToolGroupId.value = tgId;
    selectedToolGroupDetail.value = baseToolGroup ? mapDetailFromToolGroup(baseToolGroup) : null;
    detailErrorMessage.value = null;

    try {
      const detail = await fetchBottleneckToolGroupDetail(tgId, snapshot.value?.snapshotId);
      selectedToolGroupDetail.value = selectedToolGroupDetail.value
        ? mergeDetail(selectedToolGroupDetail.value, detail)
        : detail;
    } catch (error) {
      if (!baseToolGroup) {
        detailErrorMessage.value = getBottleneckErrorMessage(error);
      }
    }
  }

  return {
    snapshot,
    areas,
    areaFilters,
    processMapAreas,
    selectedArea,
    selectedAreaCode,
    toolGroups,
    selectedToolGroupId,
    selectedToolGroupDetail,
    isLoading,
    errorMessage,
    toolGroupErrorMessage,
    detailErrorMessage,
    loadMonitoringData,
    selectArea,
    selectToolGroup,
  };
}

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
import { riskGradeToLevel } from '@/constants/riskLevel';
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

import { compareBottleneckRisk } from '@/utils/bottleneckRisk';

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

  return [...filtered].sort(compareBottleneckRisk);
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
    riskScore: toolGroup.riskScore,
    riskGrade: toolGroup.riskGrade,
    relatedCaseId: null,
  };
}

function mergeDetail(base: BottleneckToolGroupDetail, detail: BottleneckToolGroupDetail): BottleneckToolGroupDetail {
  const shouldUseDetailRisk = detail.riskScore !== null || detail.riskGrade !== 'LOW';

  return {
    ...base,
    ...detail,
    relatedCaseId: detail.relatedCaseId ?? base.relatedCaseId,
    bottleneckProb: shouldUseDetailRisk ? detail.bottleneckProb : base.bottleneckProb,
    riskScore: shouldUseDetailRisk ? detail.riskScore : base.riskScore,
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

  function applyToolGroups(
    nextToolGroups: BottleneckToolGroupItem[],
    initialAreaCode: string | null,
    processAreas: BottleneckAreaSummary[] = []
  ) {
    const nextProcessMapAreas = mapBottleneckToolGroupsToDashboardAreas(nextToolGroups, processAreas);

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
      // 1) 케이스 기준 스냅샷 조회. 케이스에 연결된 스냅샷이 없으면(E-BN-001) 최신 스냅샷으로 폴백한다.
      let snapshotData: BottleneckSnapshot;
      try {
        snapshotData = await fetchBottleneckSnapshot(caseId);
      } catch (snapshotError) {
        if (caseId && isNoSnapshotError(snapshotError)) {
          snapshotData = await fetchBottleneckSnapshot(null);
        } else {
          throw snapshotError;
        }
      }

      // 2) 스냅샷 시각 기준 공정맵/랭킹 (snapshotId만 필요 → 병렬)
      let [processMapData, rankingsRaw] = await Promise.all([
        fetchBottleneckProcessMap(snapshotData.snapshotId),
        fetchBottleneckRankings(snapshotData.snapshotId),
      ]);
      let rankings = mapBottleneckRankings(rankingsRaw, processMapData.areas);

      // 3) 스냅샷 capturedAt 시각에 적재된 tg_metrics가 없어 결과가 비면(메트릭 적재 시각과
      //    스냅샷 시각 어긋남) 빈 화면 대신 최신 메트릭 기준으로 폴백해 현황을 보여준다.
      //    snapshot.value는 케이스 스냅샷을 유지하므로 스냅샷 카드의 감지 시각/대상 TG는 그대로다.
      if (rankings.length === 0 && processMapData.areas.length === 0) {
        [processMapData, rankingsRaw] = await Promise.all([
          fetchBottleneckProcessMap(null),
          fetchBottleneckRankings(null),
        ]);
        rankings = mapBottleneckRankings(rankingsRaw, processMapData.areas);
      }

      snapshot.value = snapshotData;
      applyToolGroups(rankings, initialAreaCode, processMapData.areas);
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

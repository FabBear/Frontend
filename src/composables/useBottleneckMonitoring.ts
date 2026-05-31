import { computed, ref, shallowRef } from 'vue';

import {
  fetchBottleneckProcessAreas,
  fetchBottleneckProcessMap,
  fetchBottleneckSnapshot,
  fetchBottleneckToolGroupDetail,
  fetchBottleneckToolGroups,
} from '@/services/bottleneckMonitoringService';

import { getProcessAreaNameKo } from '@/constants/processArea';
import type { RiskLevel } from '@/constants/riskLevel';

import type {
  AreaFilterOption,
  BottleneckAreaSummary,
  BottleneckRiskGrade,
  BottleneckSnapshot,
  BottleneckToolGroupDetail,
  BottleneckToolGroupItem,
} from '@/types/bottleneckMonitoring';
import type { ProcessAreaData } from '@/types/dashboard';

const RISK_GRADE_TO_LEVEL: Record<BottleneckRiskGrade, RiskLevel> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export function toRiskLevel(riskGrade: BottleneckRiskGrade): RiskLevel {
  return RISK_GRADE_TO_LEVEL[riskGrade];
}

function getMaxRiskLevel(area: BottleneckAreaSummary): RiskLevel {
  if (area.tgSummary.CRITICAL > 0) return 'critical';
  if (area.tgSummary.HIGH > 0) return 'high';
  if (area.tgSummary.MEDIUM > 0) return 'medium';
  return 'low';
}

export function useBottleneckMonitoring() {
  const snapshot = shallowRef<BottleneckSnapshot | null>(null);
  const areas = shallowRef<BottleneckAreaSummary[]>([]);
  const processMapAreas = shallowRef<ProcessAreaData[]>([]);
  const toolGroups = shallowRef<BottleneckToolGroupItem[]>([]);
  const selectedAreaCode = ref<string | null>(null);
  const selectedToolGroupId = ref<string | null>(null);
  const selectedToolGroupDetail = shallowRef<BottleneckToolGroupDetail | null>(null);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  const areaOptions = computed<AreaFilterOption[]>(() =>
    areas.value.map((area) => ({
      areaCode: area.areaCode,
      areaName: area.areaName,
      areaNameKo: getProcessAreaNameKo(area.areaCode),
      totalTgCount: area.totalTgCount,
      bottleneckTgCount: area.bottleneckTgCount,
      maxRiskLevel: getMaxRiskLevel(area),
      riskSummary: { ...area.tgSummary },
    }))
  );

  const selectedArea = computed(
    () => areaOptions.value.find((area) => area.areaCode === selectedAreaCode.value) ?? null
  );

  async function loadToolGroups(areaCode: string | null) {
    const data = await fetchBottleneckToolGroups(areaCode);
    toolGroups.value = data.items;
    selectedToolGroupId.value = null;
    selectedToolGroupDetail.value = null;
  }

  async function loadMonitoringData(initialAreaCode: string | null) {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      const [snapshotData, processMapData, processAreasData] = await Promise.all([
        fetchBottleneckSnapshot(),
        fetchBottleneckProcessMap(),
        fetchBottleneckProcessAreas(),
      ]);
      snapshot.value = snapshotData;
      areas.value = processMapData.areas;
      processMapAreas.value = processAreasData;
      selectedAreaCode.value = areaOptions.value.some((area) => area.areaCode === initialAreaCode)
        ? initialAreaCode
        : null;
      // null 전달 시 전체 TG를 로드한다. 직접 진입해도 빈 테이블로 시작하지 않도록 항상 호출한다.
      await loadToolGroups(selectedAreaCode.value);
    } catch {
      errorMessage.value = '병목 모니터링 데이터를 불러오지 못했습니다.';
    } finally {
      isLoading.value = false;
    }
  }

  async function selectArea(areaCode: string | null) {
    selectedAreaCode.value = areaCode;
    await loadToolGroups(areaCode);
  }

  async function selectToolGroup(tgId: string) {
    selectedToolGroupId.value = tgId;
    selectedToolGroupDetail.value = await fetchBottleneckToolGroupDetail(tgId);
  }

  return {
    snapshot,
    areaOptions,
    processMapAreas,
    selectedArea,
    selectedAreaCode,
    toolGroups,
    selectedToolGroupId,
    selectedToolGroupDetail,
    isLoading,
    errorMessage,
    loadMonitoringData,
    selectArea,
    selectToolGroup,
    toRiskLevel,
  };
}

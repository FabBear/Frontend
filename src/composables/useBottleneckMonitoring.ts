import { computed, ref, shallowRef } from 'vue';

import {
  fetchBottleneckProcessAreas,
  fetchBottleneckProcessMap,
  fetchBottleneckSnapshot,
  fetchBottleneckToolGroupDetail,
  fetchBottleneckToolGroups,
} from '@/services/bottleneckMonitoringService';

import { getProcessAreaNameKo } from '@/constants/processArea';
import { getRiskLevelByUtilization } from '@/constants/processRisk';
import type { RiskLevel } from '@/constants/riskLevel';

import type {
  AreaFilterOption,
  BottleneckAreaSummary,
  BottleneckRiskGrade,
  BottleneckSnapshot,
  BottleneckToolGroupDetail,
  BottleneckToolGroupItem,
} from '@/types/bottleneckMonitoring';
import type {
  DashboardProcessAreaData,
  DashboardProcessToolGroupData,
  ProcessAreaData,
  ProcessToolGroup,
} from '@/types/dashboard';

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
  const processMapAreas = shallowRef<DashboardProcessAreaData[]>([]);
  const toolGroups = shallowRef<BottleneckToolGroupItem[]>([]);
  const selectedAreaCode = ref<string | null>(null);
  const selectedToolGroupId = ref<string | null>(null);
  const selectedToolGroupDetail = shallowRef<BottleneckToolGroupDetail | null>(null);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);
  const detailErrorMessage = ref<string | null>(null);

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
    detailErrorMessage.value = null;
  }

  async function loadMonitoringData(initialAreaCode: string | null) {
    isLoading.value = true;
    errorMessage.value = null;
    detailErrorMessage.value = null;
    try {
      const [snapshotData, processMapData, processAreasData] = await Promise.all([
        fetchBottleneckSnapshot(),
        fetchBottleneckProcessMap(),
        fetchBottleneckProcessAreas(),
      ]);
      snapshot.value = snapshotData;
      areas.value = processMapData.areas;
      processMapAreas.value = processAreasData.map(mapProcessAreaToDashboardArea);
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
    isLoading.value = true;
    errorMessage.value = null;
    detailErrorMessage.value = null;
    try {
      selectedAreaCode.value = areaCode;
      await loadToolGroups(areaCode);
    } catch {
      errorMessage.value = '공정별 Tool Group 데이터를 불러오지 못했습니다.';
    } finally {
      isLoading.value = false;
    }
  }

  async function selectToolGroup(tgId: string) {
    detailErrorMessage.value = null;
    try {
      selectedToolGroupId.value = tgId;
      selectedToolGroupDetail.value = await fetchBottleneckToolGroupDetail(tgId);
    } catch {
      selectedToolGroupDetail.value = null;
      detailErrorMessage.value = 'Tool Group 상세 정보를 불러오지 못했습니다.';
    }
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
    detailErrorMessage,
    isLoading,
    errorMessage,
    loadMonitoringData,
    selectArea,
    selectToolGroup,
    toRiskLevel,
  };
}

function mapProcessAreaToDashboardArea(area: ProcessAreaData): DashboardProcessAreaData {
  const toolGroups = [...area.gFE, ...area.gBE].map((toolGroup) => mapProcessToolGroup(area.name, toolGroup));
  const riskSummary = toolGroups.reduce(
    (summary, toolGroup) => {
      summary[toolGroup.riskGrade] = (summary[toolGroup.riskGrade] ?? 0) + 1;
      return summary;
    },
    { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 } as Record<string, number>
  );

  return {
    areaId: area.name,
    areaCode: area.name,
    areaName: area.name,
    totalTgCount: toolGroups.length,
    bottleneckTgCount: toolGroups.filter(
      (toolGroup) => toolGroup.riskGrade === 'CRITICAL' || toolGroup.riskGrade === 'HIGH'
    ).length,
    tgSummary: riskSummary,
    toolGroups,
  };
}

function mapProcessToolGroup(areaName: string, toolGroup: ProcessToolGroup): DashboardProcessToolGroupData {
  const riskLevel = getRiskLevelByUtilization(toolGroup.util);

  return {
    tgId: `${areaName}-${toolGroup.name}`,
    tgCode: toolGroup.name,
    tgName: toolGroup.name,
    riskGrade: riskLevel.toUpperCase(),
    riskLevel,
    utilizationRate: toolGroup.util,
    bottleneckProb: toolGroup.util,
    wipCount: toolGroup.wipCount,
  };
}

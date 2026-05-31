import { computed, ref, shallowRef } from 'vue';

import { fetchMesMonitoringData, fetchMesToolsByToolGroup } from '@/services/mesService';

import type { RiskLevel } from '@/constants/riskLevel';

import type {
  MesKpiCard,
  MesMonitoringData,
  MesRiskGrade,
  MesToolMetric,
  MesToolViewMode,
  MesViewMode,
} from '@/types/mes';

import { formatNumber, formatRatioPercent } from '@/utils/format';
import { average, calculateMesOeeEstimate } from '@/utils/mesMetrics';

const RISK_GRADE_TO_LEVEL: Record<MesRiskGrade, RiskLevel> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};

export function toMesRiskLevel(riskGrade: MesRiskGrade): RiskLevel {
  return RISK_GRADE_TO_LEVEL[riskGrade];
}

export function useMesMonitoring() {
  const data = shallowRef<MesMonitoringData | null>(null);
  const activeTab = ref<MesViewMode>('all');
  const toolGroupSearch = ref('');
  const toolGroupRiskFilter = ref<MesRiskGrade | 'ALL'>('ALL');
  const selectedToolGroupId = ref<string | null>(null);
  const selectedTools = shallowRef<MesToolMetric[]>([]);
  const toolViewMode = ref<MesToolViewMode>('card');
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);
  const detailErrorMessage = ref<string | null>(null);

  const toolGroups = computed(() => data.value?.toolGroups ?? []);
  const selectedToolGroup = computed(
    () => toolGroups.value.find((toolGroup) => toolGroup.tgId === selectedToolGroupId.value) ?? null
  );
  const toolSummaryCards = computed<MesKpiCard[]>(() => {
    const tools = data.value?.tools ?? [];
    const totalToolCount = tools.length;
    const dangerToolCount = tools.filter((tool) => tool.utilizationRate >= 0.85).length;
    const warningToolCount = tools.filter((tool) => tool.utilizationRate >= 0.7 && tool.utilizationRate < 0.85).length;
    const avgUtilization = average(tools.map((tool) => tool.utilizationRate));
    const avgOee = average(tools.map((tool) => calculateMesOeeEstimate(tool.utilizationRate, tool.setupRatio)));

    return [
      {
        key: 'tool-total',
        title: '전체 Tool 수',
        value: `${formatNumber(totalToolCount)}대`,
        subtitle: 'MES 수집 장비 합계',
        tone: 'info',
      },
      {
        key: 'tool-danger',
        title: '위험 장비',
        value: `${formatNumber(dangerToolCount)}대`,
        subtitle: '가동률 85% 이상',
        tone: 'danger',
      },
      {
        key: 'tool-warning',
        title: '주의 장비',
        value: `${formatNumber(warningToolCount)}대`,
        subtitle: '가동률 70~85%',
        tone: 'warning',
      },
      {
        key: 'tool-avg-util',
        title: '평균 가동률',
        value: formatRatioPercent(avgUtilization),
        subtitle: '전체 장비 평균',
      },
      {
        key: 'tool-avg-oee',
        title: '평균 OEE',
        value: formatRatioPercent(avgOee),
        subtitle: '추정 OEE',
        tone: 'success',
      },
    ];
  });

  const filteredToolGroups = computed(() => {
    const search = toolGroupSearch.value.trim().toLowerCase();

    return toolGroups.value.filter((toolGroup) => {
      if (search && !toolGroup.tgName.toLowerCase().includes(search)) return false;
      if (toolGroupRiskFilter.value !== 'ALL' && toolGroup.riskGrade !== toolGroupRiskFilter.value) return false;
      return true;
    });
  });

  async function loadMesMonitoringData() {
    isLoading.value = true;
    errorMessage.value = null;
    detailErrorMessage.value = null;
    try {
      data.value = await fetchMesMonitoringData();
    } catch {
      errorMessage.value = 'MES 모니터링 데이터를 불러오지 못했습니다.';
    } finally {
      isLoading.value = false;
    }
  }

  async function selectToolGroup(tgId: string) {
    selectedToolGroupId.value = tgId;
    detailErrorMessage.value = null;
    try {
      selectedTools.value = await fetchMesToolsByToolGroup(tgId);
    } catch {
      selectedTools.value = [];
      detailErrorMessage.value = 'Tool 상세 데이터를 불러오지 못했습니다.';
    }
  }

  function setActiveTab(tab: MesViewMode) {
    activeTab.value = tab;
  }

  return {
    data,
    activeTab,
    toolGroupSearch,
    toolGroupRiskFilter,
    selectedToolGroupId,
    selectedToolGroup,
    selectedTools,
    toolSummaryCards,
    toolViewMode,
    isLoading,
    errorMessage,
    detailErrorMessage,
    filteredToolGroups,
    loadMesMonitoringData,
    selectToolGroup,
    setActiveTab,
  };
}

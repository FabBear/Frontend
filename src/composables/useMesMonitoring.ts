import { computed, ref, shallowRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { fetchMesMonitoringData, fetchMesToolsByToolGroup } from '@/services/mesService';

import type { RiskLevel } from '@/constants/riskLevel';

import type { MesMonitoringData, MesRiskGrade, MesToolMetric, MesToolViewMode, MesViewMode } from '@/types/mes';

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
  const route = useRoute();
  const router = useRouter();

  const data = shallowRef<MesMonitoringData | null>(null);
  const selectedTools = shallowRef<MesToolMetric[]>([]);
  const toolViewMode = ref<MesToolViewMode>('card');
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);
  const detailErrorMessage = ref<string | null>(null);

  const activeTab = computed<MesViewMode>({
    get() {
      const tab = route.query.tab as string;
      return tab === 'process' || tab === 'toolGroup' ? tab : 'all';
    },
    set(tab: MesViewMode) {
      router.push({ query: { ...route.query, tab: tab === 'all' ? undefined : tab } });
    },
  });

  const tgAreaFilter = computed<string>({
    get() {
      return (route.query.area as string) || 'ALL';
    },
    set(area: string) {
      router.replace({ query: { ...route.query, area: area === 'ALL' ? undefined : area } });
    },
  });

  const selectedToolGroupId = computed<string | null>({
    get() {
      return (route.query.tg as string) || null;
    },
    set(tgId: string | null) {
      router.replace({ query: { ...route.query, tg: tgId ?? undefined } });
    },
  });

  const toolGroups = computed(() => data.value?.toolGroups ?? []);
  const selectedToolGroup = computed(
    () => toolGroups.value.find((tg) => tg.tgId === selectedToolGroupId.value) ?? null
  );

  watch(
    selectedToolGroupId,
    async (tgId) => {
      if (!tgId) {
        selectedTools.value = [];
        return;
      }
      detailErrorMessage.value = null;
      try {
        const tools = await fetchMesToolsByToolGroup(tgId);
        if (selectedToolGroupId.value === tgId) selectedTools.value = tools;
      } catch {
        if (selectedToolGroupId.value === tgId) {
          selectedTools.value = [];
          detailErrorMessage.value = 'Tool 상세 데이터를 불러오지 못했습니다.';
        }
      }
    },
    { immediate: true }
  );

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

  function selectToolGroup(tgId: string) {
    selectedToolGroupId.value = tgId;
  }

  function setActiveTab(tab: MesViewMode) {
    activeTab.value = tab;
  }

  function navigateToProcess(areaCode: string) {
    const firstTg = [...(data.value?.toolGroups ?? [])]
      .filter((tg) => tg.areaCode === areaCode)
      .sort((a, b) => b.utilizationRate - a.utilizationRate)[0];
    router.push({
      query: {
        tab: 'toolGroup',
        area: areaCode,
        ...(firstTg ? { tg: firstTg.tgId } : {}),
      },
    });
  }

  return {
    data,
    activeTab,
    tgAreaFilter,
    selectedToolGroupId,
    selectedToolGroup,
    selectedTools,
    toolViewMode,
    isLoading,
    errorMessage,
    detailErrorMessage,
    loadMesMonitoringData,
    selectToolGroup,
    setActiveTab,
    navigateToProcess,
  };
}

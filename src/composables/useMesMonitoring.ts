import { computed, ref, shallowRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { createMesMonitoringEventSource, fetchMesMonitoringData, mapMesPayload } from '@/services/mesService';

import type { RiskLevel } from '@/constants/riskLevel';

import type {
  MesMonitoringData,
  MesRealtimePayload,
  MesRiskGrade,
  MesToolMetric,
  MesToolViewMode,
  MesViewMode,
} from '@/types/mes';

const RISK_GRADE_TO_LEVEL: Record<MesRiskGrade, RiskLevel> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
};
const MES_RISK_GRADES: MesRiskGrade[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
type MesRiskFilter = MesRiskGrade | 'ALL';

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
  const isStreamConnected = ref(false);
  let eventSource: EventSource | null = null;

  const activeTab = computed<MesViewMode>({
    get() {
      const tab = route.query.tab as string;
      return tab === 'process' || tab === 'toolGroup' ? tab : 'all';
    },
    set(tab: MesViewMode) {
      const rest = { ...route.query };
      delete rest.toolStatus;
      delete rest.riskFilter;
      const base = tab === 'toolGroup' ? route.query : rest;
      router.push({ query: { ...base, tab: tab === 'all' ? undefined : tab } });
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

  const tgRiskFilter = computed<MesRiskFilter>({
    get() {
      const riskFilter = route.query.riskFilter;
      return typeof riskFilter === 'string' && MES_RISK_GRADES.includes(riskFilter as MesRiskGrade)
        ? (riskFilter as MesRiskGrade)
        : 'ALL';
    },
    set(grade: MesRiskFilter) {
      router.replace({ query: { ...route.query, riskFilter: grade === 'ALL' ? undefined : grade } });
    },
  });

  const tgToolStatusFilter = computed<string>({
    get() {
      return (route.query.toolStatus as string) || 'ALL';
    },
    set(status: string) {
      router.replace({ query: { ...route.query, toolStatus: status === 'ALL' ? undefined : status } });
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
    [selectedToolGroupId, () => data.value?.tools],
    ([tgId]) => {
      detailErrorMessage.value = null;
      selectedTools.value = tgId ? (data.value?.tools ?? []).filter((tool) => tool.tgId === tgId) : [];
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

  function applyMesPayload(payload: MesRealtimePayload, isConnected = true) {
    data.value = mapMesPayload(payload, isConnected);
    isStreamConnected.value = isConnected;
    errorMessage.value = null;
  }

  function connectMesStream() {
    disconnectMesStream();

    eventSource = createMesMonitoringEventSource();

    eventSource.addEventListener('open', () => {
      isStreamConnected.value = true;
      if (data.value) {
        data.value = { ...data.value, snapshot: { ...data.value.snapshot, isConnected: true } };
      }
    });

    eventSource.addEventListener('mes-update', (event) => {
      try {
        applyMesPayload(JSON.parse(event.data) as MesRealtimePayload, true);
      } catch {
        errorMessage.value = 'MES 실시간 데이터를 해석하지 못했습니다.';
      }
    });

    eventSource.addEventListener('ping', () => {
      isStreamConnected.value = true;
    });

    eventSource.addEventListener('error', () => {
      isStreamConnected.value = false;
      if (data.value) {
        data.value = { ...data.value, snapshot: { ...data.value.snapshot, isConnected: false } };
      }
    });
  }

  function disconnectMesStream() {
    eventSource?.close();
    eventSource = null;
    isStreamConnected.value = false;
  }

  async function startMesMonitoring() {
    await loadMesMonitoringData();
    connectMesStream();
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

  function navigateToToolGroup(tgId: string) {
    const tg = data.value?.toolGroups.find((t) => t.tgId === tgId);
    router.push({
      query: {
        tab: 'toolGroup',
        ...(tg ? { area: tg.areaCode } : {}),
        tg: tgId,
      },
    });
  }

  function navigateToDownTools() {
    router.push({ query: { tab: 'toolGroup', toolStatus: 'DOWN' } });
  }

  function navigateToCriticalTgs() {
    router.push({ query: { tab: 'toolGroup', riskFilter: 'CRITICAL' } });
  }

  function navigateToHighTgs() {
    router.push({ query: { tab: 'toolGroup', riskFilter: 'HIGH' } });
  }

  return {
    data,
    activeTab,
    tgAreaFilter,
    tgRiskFilter,
    tgToolStatusFilter,
    selectedToolGroupId,
    selectedToolGroup,
    selectedTools,
    toolViewMode,
    isLoading,
    isStreamConnected,
    errorMessage,
    detailErrorMessage,
    loadMesMonitoringData,
    startMesMonitoring,
    connectMesStream,
    disconnectMesStream,
    selectToolGroup,
    setActiveTab,
    navigateToProcess,
    navigateToToolGroup,
    navigateToDownTools,
    navigateToCriticalTgs,
    navigateToHighTgs,
  };
}

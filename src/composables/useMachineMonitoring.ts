import { computed, ref, shallowRef } from 'vue';

import { fetchMachineMonitoringData } from '@/services/machineService';

import type {
  MachineAnalysisSeries,
  MachineAnalysisTargetType,
  MachineComparisonTarget,
  MachineEquipmentStatusFilter,
  MachineMetricKey,
  MachineMonitoringData,
  MachinePageTab,
  MachinePeriodPreset,
} from '@/types/machine';

export const MACHINE_TREND_LABELS = ['T-8', 'T-7', 'T-6', 'T-5', 'T-4', 'T-3', 'T-2', 'T-1', '현재'];

function includesKeyword(values: string[], keyword: string) {
  if (!keyword) return true;
  const lower = keyword.toLowerCase();
  return values.some((v) => v.toLowerCase().includes(lower));
}

function avg(vals: number[]): number {
  return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function useMachineMonitoring() {
  // ── 핵심 데이터 ────────────────────────────────────────────────────────
  const data = shallowRef<MachineMonitoringData | null>(null);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  // ── 탭 ────────────────────────────────────────────────────────────────
  const activeTab = ref<MachinePageTab>('overview');

  // ── 현황 탭 필터 ──────────────────────────────────────────────────────
  const overviewTgFilter = ref('ALL');
  const overviewStatusFilter = ref<MachineEquipmentStatusFilter>('ALL');
  const overviewAreaFilter = ref('ALL');
  const overviewSearch = ref('');

  // ── 분석 탭 설정 ──────────────────────────────────────────────────────
  const analysisTargetType = ref<MachineAnalysisTargetType>('toolGroup');
  const selectedMetricKeys = ref<MachineMetricKey[]>(['utilizationRate', 'oeeEstimate']);
  const selectedCompareToolGroupIds = ref<string[]>([]);
  const selectedCompareToolIds = ref<string[]>([]);
  const periodPreset = ref<MachinePeriodPreset>('24H');

  // ── 기초 computed ──────────────────────────────────────────────────────
  const toolGroups = computed(() => data.value?.toolGroups ?? []);
  const equipments = computed(() => data.value?.equipments ?? []);
  const metricDefinitions = computed(() => data.value?.metricDefinitions ?? []);
  const trendsByToolId = computed(() => data.value?.trendsByToolId ?? {});

  // ── 현황 탭: 필터 옵션 ────────────────────────────────────────────────
  const tgFilterOptions = computed(() =>
    toolGroups.value.map((tg) => ({ id: tg.tgId, code: tg.tgCode, label: tg.areaNameKo }))
  );

  const areaOptions = computed(() => {
    const areas = new Map<string, string>();
    toolGroups.value.forEach((tg) => areas.set(tg.areaCode, tg.areaNameKo));
    return [...areas.entries()].map(([code, label]) => ({ code, label }));
  });

  // ── 현황 탭: 필터 적용 장비 목록 ──────────────────────────────────────
  const overviewEquipments = computed(() =>
    equipments.value
      .filter((eq) => {
        if (overviewTgFilter.value !== 'ALL' && eq.tgId !== overviewTgFilter.value) return false;
        if (overviewStatusFilter.value !== 'ALL' && eq.status !== overviewStatusFilter.value) return false;
        if (overviewAreaFilter.value !== 'ALL' && eq.areaCode !== overviewAreaFilter.value) return false;
        return includesKeyword([eq.toolCode, eq.toolName, eq.tgCode, eq.areaNameKo], overviewSearch.value);
      })
      .sort((a, b) => b.anomalyScore - a.anomalyScore)
  );

  // ── 분석 탭: 선택 대상 옵션 ───────────────────────────────────────────
  const toolGroupTargets = computed<MachineComparisonTarget[]>(() =>
    toolGroups.value.map((tg) => ({
      id: tg.tgId,
      code: tg.tgCode,
      label: tg.tgName,
      groupLabel: `${tg.roleCode} · ${tg.areaNameKo}`,
    }))
  );

  const toolTargets = computed<MachineComparisonTarget[]>(() =>
    equipments.value.map((eq) => ({
      id: eq.toolId,
      code: eq.toolCode,
      label: eq.toolName,
      groupLabel: eq.tgCode,
    }))
  );

  // ── 분석 탭: 선택 대상별 시계열 series ────────────────────────────────
  const METRIC_KEYS: MachineMetricKey[] = ['utilizationRate', 'oeeEstimate', 'queueLotCount', 'downRatio'];

  const analysisSeries = computed<MachineAnalysisSeries[]>(() => {
    const ids =
      analysisTargetType.value === 'toolGroup' ? selectedCompareToolGroupIds.value : selectedCompareToolIds.value;

    return ids.map((id) => {
      if (analysisTargetType.value === 'toolGroup') {
        const tgEquipments = equipments.value.filter((eq) => eq.tgId === id);
        const tg = toolGroups.value.find((t) => t.tgId === id);

        const values = Object.fromEntries(
          METRIC_KEYS.map((key) => [
            key,
            Array.from({ length: 9 }, (_, i) => {
              const vals = tgEquipments
                .map((eq) => {
                  const point = trendsByToolId.value[eq.toolId]?.[i];
                  const v = point?.[key];
                  return typeof v === 'number' ? v : null;
                })
                .filter((v): v is number => v !== null);
              return vals.length > 0 ? avg(vals) : 0;
            }),
          ])
        ) as Record<MachineMetricKey, number[]>;

        return { id, label: tg?.tgCode ?? id, groupLabel: tg?.areaNameKo ?? '', values };
      } else {
        const trends = trendsByToolId.value[id] ?? [];
        const eq = equipments.value.find((e) => e.toolId === id);

        const values: Record<MachineMetricKey, number[]> = {
          utilizationRate: trends.map((t) => t.utilizationRate),
          oeeEstimate: trends.map((t) => t.oeeEstimate ?? 0),
          queueLotCount: trends.map((t) => t.queueLotCount),
          downRatio: trends.map((t) => t.downRatio),
        };

        return { id, label: eq?.toolCode ?? id, groupLabel: eq?.tgCode ?? '', values };
      }
    });
  });

  // ── 액션 ──────────────────────────────────────────────────────────────
  async function loadMachineMonitoringData() {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      data.value = await fetchMachineMonitoringData();

      if (selectedCompareToolGroupIds.value.length === 0) {
        selectedCompareToolGroupIds.value = [...toolGroups.value]
          .sort((a, b) => b.utilizationRate - a.utilizationRate)
          .slice(0, 4)
          .map((tg) => tg.tgId);
      }
      if (selectedCompareToolIds.value.length === 0) {
        selectedCompareToolIds.value = [...equipments.value]
          .sort((a, b) => b.anomalyScore - a.anomalyScore)
          .slice(0, 4)
          .map((eq) => eq.toolId);
      }
    } catch {
      errorMessage.value = '장비 모니터링 데이터를 불러오지 못했습니다.';
    } finally {
      isLoading.value = false;
    }
  }

  function setActiveTab(tab: MachinePageTab) {
    activeTab.value = tab;
  }

  function toggleMetric(key: MachineMetricKey) {
    if (selectedMetricKeys.value.includes(key)) {
      if (selectedMetricKeys.value.length === 1) return;
      selectedMetricKeys.value = selectedMetricKeys.value.filter((k) => k !== key);
    } else {
      selectedMetricKeys.value = [...selectedMetricKeys.value, key];
    }
  }

  function toggleCompareToolGroup(tgId: string) {
    selectedCompareToolGroupIds.value = selectedCompareToolGroupIds.value.includes(tgId)
      ? selectedCompareToolGroupIds.value.filter((id) => id !== tgId)
      : [...selectedCompareToolGroupIds.value, tgId];
  }

  function toggleCompareTool(toolId: string) {
    selectedCompareToolIds.value = selectedCompareToolIds.value.includes(toolId)
      ? selectedCompareToolIds.value.filter((id) => id !== toolId)
      : [...selectedCompareToolIds.value, toolId];
  }

  return {
    data,
    isLoading,
    errorMessage,
    activeTab,
    // 현황 탭
    toolGroups,
    overviewTgFilter,
    overviewStatusFilter,
    overviewAreaFilter,
    overviewSearch,
    tgFilterOptions,
    areaOptions,
    overviewEquipments,
    trendsByToolId,
    // 분석 탭
    analysisTargetType,
    selectedMetricKeys,
    selectedCompareToolGroupIds,
    selectedCompareToolIds,
    periodPreset,
    metricDefinitions,
    toolGroupTargets,
    toolTargets,
    analysisSeries,
    // 액션
    loadMachineMonitoringData,
    setActiveTab,
    toggleMetric,
    toggleCompareToolGroup,
    toggleCompareTool,
  };
}

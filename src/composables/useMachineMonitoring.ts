import { computed, ref, shallowRef, watch } from 'vue';

import { fetchEquipmentTrends, fetchMachineMonitoringData } from '@/services/machineService';

import {
  MACHINE_TG_METRIC_DEFINITIONS,
  MACHINE_TOOL_METRIC_DEFINITIONS,
  type MockTrendMeta,
  generateMockEquipmentTrends,
} from '@/constants/mockData/machine';

import type {
  MachineAnalysisPreset,
  MachineAnalysisSeries,
  MachineAnalysisTargetType,
  MachineComparisonTarget,
  MachineEquipmentStatusFilter,
  MachineEquipmentTrendsPayload,
  MachineMetricDefinition,
  MachineMetricKey,
  MachineMonitoringData,
  MachinePageTab,
  MachinePeriodPreset,
} from '@/types/machine';

import { formatNumber, formatRatioPercent } from '@/utils/format';

function includesKeyword(values: string[], keyword: string) {
  if (!keyword) return true;
  const lower = keyword.toLowerCase();
  return values.some((v) => v.toLowerCase().includes(lower));
}

function formatTrendLabel(isoOrLabel: string): string {
  const d = new Date(isoOrLabel);
  if (isNaN(d.getTime())) return isoOrLabel; // 'T-N' 같은 mock 레이블 그대로
  return d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatMetricForInsight(metric: MachineMetricDefinition, value: number | null): string {
  if (value === null) return '-';
  return metric.valueFormat === 'ratio' ? formatRatioPercent(value) : formatNumber(Math.round(value));
}

function takeIds<T extends { id: string }>(items: T[], limit: number) {
  return items.slice(0, limit).map((item) => item.id);
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
  const selectedCompareToolGroupIds = ref<string[]>([]);
  const selectedCompareToolIds = ref<string[]>([]);
  const periodPreset = ref<MachinePeriodPreset>('24H');

  // 선택 타입별 기본 지표
  const MAX_COMPARE = 5;
  const DEFAULT_TG_METRICS: MachineMetricKey[] = ['utilizationRate', 'wipCount'];
  const DEFAULT_TOOL_METRICS: MachineMetricKey[] = ['utilizationRate', 'oeeEstimate'];
  const selectedMetricKeys = ref<MachineMetricKey[]>(DEFAULT_TG_METRICS);
  const selectedAnalysisPresetKey = ref<string | null>(null);

  // ── 분석 탭: 활성 지표 정의 (TG/Tool 전환 시 변경) ───────────────────
  const activeMetricDefinitions = computed(() =>
    analysisTargetType.value === 'toolGroup' ? MACHINE_TG_METRIC_DEFINITIONS : MACHINE_TOOL_METRIC_DEFINITIONS
  );

  // ── 분석 탭: 트렌드 API 응답 ──────────────────────────────────────────
  const trendsData = shallowRef<MachineEquipmentTrendsPayload | null>(null);
  const isTrendsLoading = ref(false);

  // ── 기초 computed ──────────────────────────────────────────────────────
  const toolGroups = computed(() => data.value?.toolGroups ?? []);
  const equipments = computed(() => data.value?.equipments ?? []);
  const trendsByToolId = computed(() => data.value?.trendsByToolId ?? {});

  // ── 현황 탭: 필터 옵션 ────────────────────────────────────────────────
  const areaOptions = computed(() => {
    const areas = new Map<string, string>();
    toolGroups.value.forEach((tg) => areas.set(tg.areaCode, tg.areaNameKo));
    return [...areas.entries()].map(([code, label]) => ({ code, label }));
  });

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

  // ── 분석 탭: 트렌드 레이블 ────────────────────────────────────────────
  const trendLabels = computed<string[]>(() => {
    const firstSeries = trendsData.value?.series?.[0];
    if (!firstSeries?.points?.length) {
      return ['T-8', 'T-7', 'T-6', 'T-5', 'T-4', 'T-3', 'T-2', 'T-1', '현재'];
    }
    return firstSeries.points.map((p) => formatTrendLabel(p.measuredAt));
  });

  // ── 분석 탭: analysisSeries (API 응답 → MachineAnalysisSeries 변환) ───
  const analysisSeries = computed<MachineAnalysisSeries[]>(() => {
    if (!trendsData.value?.series?.length) return [];

    const metricKeys = activeMetricDefinitions.value.map((d) => d.key);

    return trendsData.value.series.map((s) => {
      const values = Object.fromEntries(
        metricKeys.map((key) => [
          key,
          s.points.map((p) => {
            const v = (p as unknown as Record<string, unknown>)[key];
            return typeof v === 'number' ? v : 0;
          }),
        ])
      ) as Record<MachineMetricKey, number[]>;

      return { id: s.id, label: s.code, groupLabel: s.groupLabel, values };
    });
  });

  const analysisPresets = computed<MachineAnalysisPreset[]>(() => {
    const limit = MAX_COMPARE;

    const tgByWip = [...toolGroups.value]
      .sort((a, b) => b.queueLotCount - a.queueLotCount)
      .map((tg) => ({ id: tg.tgId }));
    const tgByBottleneck = [...toolGroups.value]
      .sort((a, b) => b.bottleneckProb - a.bottleneckProb)
      .map((tg) => ({ id: tg.tgId }));
    const toolByQueue = [...equipments.value]
      .sort((a, b) => b.queueLotCount - a.queueLotCount)
      .map((eq) => ({ id: eq.toolId }));
    const toolByDown = [...equipments.value].sort((a, b) => b.downRatio - a.downRatio).map((eq) => ({ id: eq.toolId }));
    const toolByLowOee = [...equipments.value]
      .filter((eq) => eq.oeeEstimate !== null)
      .sort((a, b) => (a.oeeEstimate ?? 1) - (b.oeeEstimate ?? 1))
      .map((eq) => ({ id: eq.toolId }));

    const presets: MachineAnalysisPreset[] = [
      {
        key: 'tg-wip-top',
        label: 'WIP 누적 TG',
        description: '대기 Lot이 많은 Tool Group을 비교합니다.',
        targetType: 'toolGroup',
        targetIds: takeIds(tgByWip, limit),
        metricKeys: ['wipCount', 'utilizationRate', 'bottleneckProb'],
        severity: 'warning',
      },
      {
        key: 'tg-bottleneck-top',
        label: '병목 우려 TG',
        description: '병목 확률이 높은 Tool Group을 먼저 봅니다.',
        targetType: 'toolGroup',
        targetIds: takeIds(tgByBottleneck, limit),
        metricKeys: ['bottleneckProb', 'wipCount', 'utilizationRate'],
        severity: 'warning',
      },
      {
        key: 'tool-queue-top',
        label: 'Queue 누적 Tool',
        description: '같은 기간에 대기 Lot이 쌓인 장비를 비교합니다.',
        targetType: 'tool',
        targetIds: takeIds(toolByQueue, limit),
        metricKeys: ['queueLotCount', 'utilizationRate', 'oeeEstimate'],
        severity: 'warning',
      },
      {
        key: 'tool-down-top',
        label: 'Down 영향 Tool',
        description: 'Down 비율이 높은 장비의 생산 손실을 확인합니다.',
        targetType: 'tool',
        targetIds: takeIds(toolByDown, limit),
        metricKeys: ['downRatio', 'utilizationRate', 'oeeEstimate'],
        severity: 'warning',
      },
      {
        key: 'tool-low-oee',
        label: 'OEE 저하 Tool',
        description: 'OEE가 낮은 장비를 모아 원인 지표를 같이 봅니다.',
        targetType: 'tool',
        targetIds: takeIds(toolByLowOee, limit),
        metricKeys: ['oeeEstimate', 'utilizationRate', 'queueLotCount'],
        severity: 'info',
      },
    ];

    return presets.filter((preset) => preset.targetIds.length > 0);
  });

  const analysisInsight = computed(() => {
    const metric = activeMetricDefinitions.value.find((definition) =>
      selectedMetricKeys.value.includes(definition.key)
    );
    if (!metric || analysisSeries.value.length < 2) return null;

    const rows = analysisSeries.value
      .map((series) => {
        const values = series.values[metric.key] ?? [];
        const latest = values.at(-1);
        return {
          label: series.label,
          groupLabel: series.groupLabel,
          latest: typeof latest === 'number' ? latest : null,
        };
      })
      .filter((row) => row.latest !== null);

    if (rows.length < 2) return null;

    const sorted = [...rows].sort((a, b) =>
      metric.positiveGood ? (a.latest ?? 0) - (b.latest ?? 0) : (b.latest ?? 0) - (a.latest ?? 0)
    );
    const attention = sorted[0];
    const best = sorted.at(-1);

    if (!attention || !best) return null;

    const direction = metric.positiveGood ? '가장 낮습니다' : '가장 높습니다';
    const comparison = metric.positiveGood ? '상대적으로 양호한 대상' : '가장 낮은 대상';

    return `${metric.label} 기준 ${attention.label}(${attention.groupLabel})이 ${formatMetricForInsight(metric, attention.latest)}로 ${direction}. ${comparison}은 ${best.label}입니다.`;
  });

  // ── 트렌드 API 호출 ───────────────────────────────────────────────────
  async function loadAnalysisTrends() {
    const ids =
      analysisTargetType.value === 'toolGroup' ? selectedCompareToolGroupIds.value : selectedCompareToolIds.value;

    if (ids.length === 0) {
      trendsData.value = null;
      return;
    }

    isTrendsLoading.value = true;
    try {
      trendsData.value = await fetchEquipmentTrends(analysisTargetType.value, ids, periodPreset.value);
    } catch {
      // 백엔드 엔드포인트 미구현 시 실제 TG/Tool 메타데이터 기반 mock으로 폴백
      const targets: MockTrendMeta[] = ids.map((id) => {
        if (analysisTargetType.value === 'toolGroup') {
          const tg = toolGroups.value.find((t) => t.tgId === id);
          return {
            id,
            code: tg?.tgCode ?? id,
            groupLabel: tg?.areaNameKo ?? '',
            baseUtil: tg?.utilizationRate,
            baseWip: tg?.queueLotCount,
            baseAvailRatio: tg?.availableToolRatio,
            baseBottleneckProb: tg?.bottleneckProb,
          };
        } else {
          const eq = equipments.value.find((e) => e.toolId === id);
          return {
            id,
            code: eq?.toolCode ?? id,
            groupLabel: eq?.tgCode ?? '',
            baseUtil: eq?.utilizationRate,
            baseOee: eq?.oeeEstimate,
            baseQueue: eq?.queueLotCount,
            isDown: eq?.status === 'DOWN',
          };
        }
      });
      trendsData.value = generateMockEquipmentTrends(analysisTargetType.value, targets, periodPreset.value);
    } finally {
      isTrendsLoading.value = false;
    }
  }

  // 선택 변경 시 자동 리로드
  watch(
    [selectedCompareToolGroupIds, selectedCompareToolIds, periodPreset],
    () => {
      void loadAnalysisTrends();
    },
    { deep: true }
  );

  // ── 액션 ──────────────────────────────────────────────────────────────
  async function loadMachineMonitoringData() {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      data.value = await fetchMachineMonitoringData();

      if (selectedCompareToolGroupIds.value.length === 0) {
        selectedCompareToolGroupIds.value = [...toolGroups.value]
          .sort((a, b) => b.utilizationRate - a.utilizationRate)
          .slice(0, 3)
          .map((tg) => tg.tgId);
      }
      if (selectedCompareToolIds.value.length === 0) {
        selectedCompareToolIds.value = [...equipments.value]
          .sort((a, b) => b.anomalyScore - a.anomalyScore)
          .slice(0, 3)
          .map((eq) => eq.toolId);
      }

      // 초기 트렌드 로드
      void loadAnalysisTrends();
    } catch {
      errorMessage.value = '장비 모니터링 데이터를 불러오지 못했습니다.';
    } finally {
      isLoading.value = false;
    }
  }

  function setActiveTab(tab: MachinePageTab) {
    activeTab.value = tab;
    // 분석 탭으로 전환할 때 트렌드 로드
    if (tab === 'analysis') void loadAnalysisTrends();
  }

  function setAnalysisTargetType(type: MachineAnalysisTargetType) {
    selectedAnalysisPresetKey.value = null;
    analysisTargetType.value = type;
    // 타입 전환 시 지표 기본값 초기화
    selectedMetricKeys.value = type === 'toolGroup' ? DEFAULT_TG_METRICS : DEFAULT_TOOL_METRICS;
    void loadAnalysisTrends();
  }

  function toggleMetric(key: MachineMetricKey) {
    selectedAnalysisPresetKey.value = null;
    if (selectedMetricKeys.value.includes(key)) {
      if (selectedMetricKeys.value.length === 1) return;
      selectedMetricKeys.value = selectedMetricKeys.value.filter((k) => k !== key);
    } else {
      selectedMetricKeys.value = [...selectedMetricKeys.value, key];
    }
  }

  function toggleCompareToolGroup(tgId: string) {
    selectedAnalysisPresetKey.value = null;
    if (selectedCompareToolGroupIds.value.includes(tgId)) {
      selectedCompareToolGroupIds.value = selectedCompareToolGroupIds.value.filter((id) => id !== tgId);
    } else if (selectedCompareToolGroupIds.value.length < MAX_COMPARE) {
      selectedCompareToolGroupIds.value = [...selectedCompareToolGroupIds.value, tgId];
    }
  }

  function toggleCompareTool(toolId: string) {
    selectedAnalysisPresetKey.value = null;
    if (selectedCompareToolIds.value.includes(toolId)) {
      selectedCompareToolIds.value = selectedCompareToolIds.value.filter((id) => id !== toolId);
    } else if (selectedCompareToolIds.value.length < MAX_COMPARE) {
      selectedCompareToolIds.value = [...selectedCompareToolIds.value, toolId];
    }
  }

  function clearCompareTargets() {
    selectedAnalysisPresetKey.value = null;
    if (analysisTargetType.value === 'toolGroup') {
      selectedCompareToolGroupIds.value = [];
    } else {
      selectedCompareToolIds.value = [];
    }
  }

  function applyAnalysisPreset(key: string) {
    const preset = analysisPresets.value.find((item) => item.key === key);
    if (!preset) return;

    selectedAnalysisPresetKey.value = preset.key;
    analysisTargetType.value = preset.targetType;
    selectedMetricKeys.value = preset.metricKeys;

    if (preset.targetType === 'toolGroup') {
      selectedCompareToolGroupIds.value = preset.targetIds;
    } else {
      selectedCompareToolIds.value = preset.targetIds;
    }

    void loadAnalysisTrends();
  }

  function resetAnalysisPreset() {
    selectedAnalysisPresetKey.value = null;
    analysisTargetType.value = 'toolGroup';
    selectedMetricKeys.value = DEFAULT_TG_METRICS;
    selectedCompareToolGroupIds.value = [...toolGroups.value]
      .sort((a, b) => b.utilizationRate - a.utilizationRate)
      .slice(0, 3)
      .map((tg) => tg.tgId);

    void loadAnalysisTrends();
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
    areaOptions,
    overviewEquipments,
    trendsByToolId,
    // 분석 탭
    analysisTargetType,
    selectedMetricKeys,
    selectedCompareToolGroupIds,
    selectedCompareToolIds,
    periodPreset,
    isTrendsLoading,
    activeMetricDefinitions,
    toolGroupTargets,
    toolTargets,
    analysisSeries,
    trendLabels,
    analysisPresets,
    selectedAnalysisPresetKey,
    analysisInsight,
    MAX_COMPARE,
    // 액션
    loadMachineMonitoringData,
    setActiveTab,
    setAnalysisTargetType,
    toggleMetric,
    toggleCompareToolGroup,
    toggleCompareTool,
    clearCompareTargets,
    applyAnalysisPreset,
    resetAnalysisPreset,
  };
}

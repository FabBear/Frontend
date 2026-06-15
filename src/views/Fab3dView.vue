<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { ChevronDown, ChevronUp, MessageCircle, Sparkles } from '@lucide/vue';

import { buildFabSnapshotContext } from '@/services/agentContextBuilders';
import {
  type AgentRunListItem,
  deleteFabBriefing,
  fetchAgentTask,
  listFabBriefings,
} from '@/services/agentTaskService';
import { fetchFab3dMonitoringData, fetchTgRouteSteps, fetchToolActivity } from '@/services/fab3dService';

import { useAgentTask } from '@/composables/useAgentTask';
import { useChatDrawer } from '@/composables/useChatDrawer';
import { useTheme } from '@/composables/useTheme';

import { getProcessAreaDisplayCode, getProcessAreaNameKo } from '@/constants/processArea';

import type { AgentTaskResponse } from '@/types/agentTask';
import type {
  Fab3dArea,
  Fab3dToolDetail,
  Fab3dToolGroup,
  Fab3dVirtualAsset,
  TgRouteStep,
  ToolActivity,
} from '@/types/fab3d';

import AgentRunHistoryList from '@/components/agent/AgentRunHistoryList.vue';
import ChatStatusIndicator from '@/components/chatbot/ChatStatusIndicator.vue';
import Fab3dScene from '@/components/fab3d/Fab3dScene.vue';
import { ZONE_BANDS, hexToCss } from '@/components/fab3d/fab3dLayoutConfig';

import { formatNumber, formatRatioPercent } from '@/utils/format';

const { isDark } = useTheme();
const { runAgentTask, isAgentTaskRunning, agentTaskError } = useAgentTask();
const { openWithAgentTask } = useChatDrawer();
const route = useRoute();
const sceneRef = ref<InstanceType<typeof Fab3dScene> | null>(null);
const selectedTg = ref<Fab3dToolGroup | null>(null);
const selectedAsset = ref<Fab3dVirtualAsset | null>(null);
const selectedTool = ref<Fab3dToolDetail | null>(null);
const toolActivity = ref<ToolActivity | null>(null);
const isLoadingActivity = ref(false);
const activityLoadError = ref(false);
const tgRouteSteps = ref<TgRouteStep[]>([]);
const isLoadingRouteSteps = ref(false);
const isHeatmapCollapsed = ref(false);
const showLegendInfo = ref(false);
const areas = ref<Fab3dArea[]>([]);
const toolDetails = ref<Fab3dToolDetail[]>([]);
const dataSource = ref<'current' | 'mock'>('current');
const measuredAt = ref<string | null>(null);
const isLoadingCurrent = ref(false);
const toolStatusFilter = ref<'ALL' | Fab3dToolDetail['status']>('ALL');
const fabAgentTask = ref<AgentTaskResponse | null>(null);
const isAgentCardCollapsed = ref(false);
const briefingHistory = ref<AgentRunListItem[]>([]);
const briefingHistoryLoading = ref(false);
// 브리핑 요청 시점의 sim 시각을 동결(폴링되는 measuredAt 대신 카드에 표시).
const briefingBasisAt = ref<string | null>(null);
// 우측 패널 탭: 현장(선택객체/FAB 현황) vs AI 분석(브리핑 결과/지난 브리핑).
const agentPanelTab = ref<'site' | 'ai'>('site');
const toolStatuses: Fab3dToolDetail['status'][] = ['RUN', 'IDLE', 'SETUP', 'DOWN'];
type UtilizationGrade = 'critical' | 'high' | 'medium' | 'low';

interface GradeDistributionItem {
  key: UtilizationGrade;
  label: string;
  shortLabel: string;
  count: number;
  color: string;
}

const GRADE_META: Array<Omit<GradeDistributionItem, 'count'>> = [
  { key: 'critical', label: 'Critical', shortLabel: 'C', color: 'var(--color-risk-critical)' },
  { key: 'high', label: 'High', shortLabel: 'H', color: 'var(--color-risk-high)' },
  { key: 'medium', label: 'Medium', shortLabel: 'M', color: 'var(--color-risk-medium)' },
  { key: 'low', label: 'Low', shortLabel: 'L', color: 'var(--color-risk-low)' },
];

const allTgs = computed(() => areas.value.flatMap((a) => a.toolGroups));

const summary = computed(() => {
  const all = allTgs.value;
  return {
    total: all.length,
    critical: all.filter((t) => t.utilizationRate >= 0.9).length,
    high: all.filter((t) => t.utilizationRate >= 0.85 && t.utilizationRate < 0.9).length,
    medium: all.filter((t) => t.utilizationRate >= 0.7 && t.utilizationRate < 0.85).length,
    low: all.filter((t) => t.utilizationRate < 0.7).length,
  };
});
const summaryItems = computed<GradeDistributionItem[]>(() =>
  GRADE_META.map((item) => ({ ...item, count: summary.value[item.key] })).filter((item) => item.count > 0)
);
// 현황 브리핑(FAB_SNAPSHOT_BRIEFING)은 병목 진단이 아니라 전체 현황 요약 → 카드 섹션 라벨도 현황용으로.
const isBriefingResult = computed(() => fabAgentTask.value?.taskType === 'FAB_SNAPSHOT_BRIEFING');
const agentEvidenceLabel = computed(() => (isBriefingResult.value ? '현황 지표' : '판단 근거'));
const agentDirectionsLabel = computed(() => (isBriefingResult.value ? '현장 확인 포인트' : '대응 방향'));
function watchSeverityColor(severity: string): string {
  if (severity === 'critical') return 'var(--color-risk-critical)';
  if (severity === 'warning') return 'var(--color-status-warning)';
  return 'var(--color-action-primary)';
}
// 공정 흐름: TG가 여러 라우트에 걸쳐 다른 이웃을 가지므로 TG 단위로는 수십 개가 된다.
// → 구역(area) 단위로 중복 제거해 몇 개의 칩으로 축약. 실제 렌더된 TG가 있는 구역만 노출.
const renderedTgIds = computed(() => new Set(allTgs.value.map((t) => t.tgId)));
function collectNeighborAreas(pick: 'prev' | 'next'): string[] {
  const set = new Set<string>();
  for (const s of tgRouteSteps.value) {
    const tgId = pick === 'prev' ? s.prevTgId : s.nextTgId;
    const areaCode = pick === 'prev' ? s.prevAreaCode : s.nextAreaCode;
    if (tgId && areaCode && renderedTgIds.value.has(tgId)) set.add(areaCode);
  }
  return [...set];
}
const prevProcessAreas = computed(() => collectNeighborAreas('prev'));
const nextProcessAreas = computed(() => collectNeighborAreas('next'));
const hasProcessFlow = computed(() => prevProcessAreas.value.length > 0 || nextProcessAreas.value.length > 0);

const selectedTgIsBuffer = computed(() => {
  const tg = selectedTg.value;
  return Boolean(tg && (tg.areaCode === 'OTHER' || tg.tgName.startsWith('Delay_')));
});

const zoneBandLegend = computed(() =>
  ZONE_BANDS.map((band) => ({
    type: band.type,
    label: band.label,
    color: hexToCss(isDark.value ? band.dark : band.light),
  }))
);

function uHex(u: number) {
  if (u >= 0.9) return 'var(--color-risk-critical)';
  if (u >= 0.85) return 'var(--color-risk-high)';
  if (u >= 0.7) return 'var(--color-risk-medium)';
  return 'var(--color-risk-low)';
}
function uLabel(u: number) {
  if (u >= 0.9) return 'Critical';
  if (u >= 0.85) return 'High';
  if (u >= 0.7) return 'Medium';
  return 'Low';
}
function utilizationGrade(u: number): UtilizationGrade {
  if (u >= 0.9) return 'critical';
  if (u >= 0.85) return 'high';
  if (u >= 0.7) return 'medium';
  return 'low';
}
function toolNumber(tool: Fab3dToolDetail): number {
  const match = tool.toolCode.match(/#?(\d+)$/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}
function byToolNumber(a: Fab3dToolDetail, b: Fab3dToolDetail): number {
  const numberDiff = toolNumber(a) - toolNumber(b);
  return numberDiff !== 0 ? numberDiff : a.toolCode.localeCompare(b.toolCode);
}
function filterToolsByStatus(tools: Fab3dToolDetail[]): Fab3dToolDetail[] {
  return toolStatusFilter.value === 'ALL' ? tools : tools.filter((tool) => tool.status === toolStatusFilter.value);
}
// 설비 보드 정렬: 문제 설비(DOWN→SETUP→…)를 앞에 노출, 동급은 설비번호 순.
const selectedTgHeatmapTools = computed(() => {
  const tg = selectedTg.value;
  if (!tg || selectedTgIsBuffer.value) return [];
  const statusOrder: Record<Fab3dToolDetail['status'], number> = { DOWN: 0, SETUP: 1, RUN: 2, IDLE: 3 };
  const tools = toolDetails.value
    .filter((tool) => tool.tgId === tg.tgId || tool.tgCode === tg.tgName)
    .sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      return statusDiff !== 0 ? statusDiff : byToolNumber(a, b);
    });
  return filterToolsByStatus(tools);
});
const selectedTgAllTools = computed(() => {
  const tg = selectedTg.value;
  if (!tg) return [];
  return toolDetails.value.filter((tool) => tool.tgId === tg.tgId || tool.tgCode === tg.tgName);
});
const selectedToolStatusSummary = computed(() =>
  selectedTgAllTools.value.reduce<Record<Fab3dToolDetail['status'], number>>(
    (acc, tool) => {
      acc[tool.status] += 1;
      return acc;
    },
    { RUN: 0, IDLE: 0, SETUP: 0, DOWN: 0 }
  )
);
const selectedToolStatusTotal = computed(() => Math.max(1, selectedTgAllTools.value.length));
const visibleToolStatuses = computed(() =>
  toolStatuses.filter((status) => selectedToolStatusSummary.value[status] > 0)
);
const sceneKey = computed(() => `${dataSource.value}-${areas.value.length}-${allTgs.value.length}`);
const requestedTgName = computed(() => {
  const value = route.query.tg;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
});
let lastFocusedRouteKey = '';

function normalizeTgName(name: string | null | undefined): string {
  return (name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function focusRequestedTg(force = false) {
  const requested = requestedTgName.value;
  if (!requested || !areas.value.length) return;

  const normalized = normalizeTgName(requested);
  const tg = allTgs.value.find((candidate) => normalizeTgName(candidate.tgName) === normalized);
  if (!tg) return;

  const focusKey = `${requested}:${tg.tgId}:${sceneKey.value}`;
  if (!force && lastFocusedRouteKey === focusKey) return;
  lastFocusedRouteKey = focusKey;

  await nextTick();
  sceneRef.value?.focusToolGroup(tg, { zoom: true });
  await handleSelectTg(tg);
}

// 설비 보드 셀 색 = 가동률(앱 전체 위험도 팔레트와 동일 의미) → '구역별 현황' 색과 충돌 제거.
// RUN만 가동률 색(Low초록→Med노랑→High주황→Crit빨강). 미가동(대기/셋업/비가동)은 가동률이
// 의미 없으므로 회색. 상태 자체는 색이 아닌 아이콘(statusIcon)으로 표시한다.
function cellColor(tool: Fab3dToolDetail): string {
  if (tool.status !== 'RUN') {
    return isDark.value ? 'rgba(82,92,108,0.68)' : 'rgba(150,160,175,0.6)';
  }
  const u = tool.utilizationRate;
  if (u >= 0.9) return 'var(--color-risk-critical)';
  if (u >= 0.85) return 'var(--color-risk-high)';
  if (u >= 0.7) return 'var(--color-risk-medium)';
  return 'var(--color-risk-low)';
}
// 상태 아이콘 — 색과 분리된 채널로 상태를 명확히.
function statusIcon(status: Fab3dToolDetail['status']): string {
  switch (status) {
    case 'RUN':
      return '▶';
    case 'SETUP':
      return '⚙';
    case 'DOWN':
      return '✕';
    case 'IDLE':
    default:
      return '⏸';
  }
}
function statusLabel(status: Fab3dToolDetail['status']) {
  switch (status) {
    case 'RUN':
      return '가동';
    case 'IDLE':
      return '대기';
    case 'SETUP':
      return '셋업';
    case 'DOWN':
      return '비가동';
    default:
      return status;
  }
}
function statusColor(status: Fab3dToolDetail['status']) {
  switch (status) {
    case 'RUN':
      return 'var(--color-status-success)';
    case 'IDLE':
      return 'var(--color-fg-muted)';
    case 'SETUP':
      return 'var(--color-status-warning)';
    case 'DOWN':
      return 'var(--color-status-danger)';
    default:
      return 'var(--color-fg-muted)';
  }
}
function formatAreaDisplay(areaCode: string): string {
  return `${getProcessAreaDisplayCode(areaCode)} · ${getProcessAreaNameKo(areaCode)}`;
}
function areaGradeDistribution(area: Fab3dArea): GradeDistributionItem[] {
  const counts: Record<UtilizationGrade, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  area.toolGroups.forEach((tg) => {
    counts[utilizationGrade(tg.utilizationRate)] += 1;
  });

  return GRADE_META.map((item) => ({ ...item, count: counts[item.key] })).filter((item) => item.count > 0);
}
function formatFabNumber(value: number): string {
  return formatNumber(value);
}
function assetTypeLabel(type: Fab3dVirtualAsset['assetType']): string {
  switch (type) {
    case 'AMR':
      return '바닥 AMR';
    case 'OHT':
      return '천장 OHT';
    case 'STOCKER':
      return 'Stocker';
    case 'UTILITY':
      return '유틸리티';
    default:
      return type;
  }
}
function formatDuration(min: number | null): string {
  if (min === null || min === undefined) return '-';
  if (min < 1) return '방금';
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
}

function downStateLabel(rawState: string): string {
  if (rawState === 'DOWN_PM') return 'PM (예방정비)';
  if (rawState === 'DOWN_BM') return 'BM (돌발고장)';
  return '비가동';
}

function downStateColor(rawState: string): string {
  if (rawState === 'DOWN_BM') return 'var(--color-status-danger)';
  return 'var(--color-status-warning)';
}

function isLongDown(min: number | null): boolean {
  return min !== null && min >= 240;
}

function formatEventTime(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function eventTypeColor(type: string): string {
  switch (type) {
    case 'LOADING':
    case 'BATCH_START':
    case 'BATCH_MEMBER_START':
      return 'var(--color-status-success)';
    case 'FINISH':
    case 'BATCH_MEMBER_FINISH':
      return 'var(--f-muted)';
    case 'CQT_START':
    case 'CQT_END':
      return 'var(--color-action-primary)';
    case 'ARRIVAL':
      return 'var(--f-text)';
    case 'REWORK':
      return 'var(--color-status-warning)';
    case 'SCRAP':
      return 'var(--color-status-danger)';
    default:
      return 'var(--f-text)';
  }
}

function eventTypeLabel(type: string): string {
  switch (type) {
    case 'LOADING':
      return '투입';
    case 'BATCH_START':
      return '배치 시작';
    case 'BATCH_MEMBER_START':
      return '배치 투입';
    case 'FINISH':
      return '완료';
    case 'BATCH_MEMBER_FINISH':
      return '배치 완료';
    case 'CQT_START':
      return 'CQT 시작';
    case 'CQT_END':
      return 'CQT 완료';
    case 'ARRIVAL':
      return '도착';
    case 'REWORK':
      return '재작업';
    case 'SCRAP':
      return '폐기';
    default:
      return type.replaceAll('_', ' ');
  }
}

function closeDetail() {
  selectedTg.value = null;
  selectedAsset.value = null;
  selectedTool.value = null;
  toolActivity.value = null;
  activityLoadError.value = false;
  tgRouteSteps.value = [];
  sceneRef.value?.clearSelection();
}
async function handleSelectTg(tg: Fab3dToolGroup) {
  selectedTg.value = tg;
  selectedAsset.value = null;
  selectedTool.value = null;
  toolStatusFilter.value = 'ALL';
  tgRouteSteps.value = [];
  isHeatmapCollapsed.value = false;
  isLoadingRouteSteps.value = true;
  try {
    tgRouteSteps.value = await fetchTgRouteSteps(tg.tgId);
    const first = tgRouteSteps.value[0];
    if (first) {
      sceneRef.value?.highlightNeighborTgs(first.prevTgId, first.nextTgId);
      sceneRef.value?.updateHighlightToNextTg(first.nextTgId, first.nextAreaCode);
    }
  } finally {
    isLoadingRouteSteps.value = false;
  }
}
// '공정 흐름 한눈에 보기' — 선택은 유지한 채 카메라만 줌아웃해서
// 현재 TG + 이전(파랑)/다음(주황) 위치 + 골드라인을 한 화면에 담는다. (이동/선택변경 ❌)
function showProcessFlow() {
  sceneRef.value?.frameProcessFlow();
}
function handleSelectAsset(asset: Fab3dVirtualAsset) {
  selectedAsset.value = asset;
  selectedTg.value = null;
  selectedTool.value = null;
}
async function handleSelectTool(tool: Fab3dToolDetail) {
  const isSame = selectedTool.value?.toolId === tool.toolId;
  selectedTool.value = isSame ? null : tool;
  toolActivity.value = null;
  activityLoadError.value = false;
  if (selectedTool.value && selectedTg.value) {
    sceneRef.value?.focusToolGroup(selectedTg.value);
  } else {
    sceneRef.value?.clearSelection();
  }
  if (selectedTool.value && dataSource.value === 'current') {
    isLoadingActivity.value = true;
    try {
      toolActivity.value = await fetchToolActivity(selectedTool.value.toolId);
      if (!toolActivity.value) activityLoadError.value = true;
    } catch {
      activityLoadError.value = true;
    } finally {
      isLoadingActivity.value = false;
    }
  }
}
function handleToolStatusFilter(status: Fab3dToolDetail['status']) {
  toolStatusFilter.value = toolStatusFilter.value === status ? 'ALL' : status;
  selectedTool.value = null;
  toolActivity.value = null;
  activityLoadError.value = false;
  sceneRef.value?.clearSelection();
}
function handleZoomToArea(areaCode: string) {
  closeDetail();
  sceneRef.value?.zoomToArea(areaCode);
}

async function handleFabBriefing() {
  briefingBasisAt.value = measuredAt.value; // 요청 시점 sim 시각 동결
  agentPanelTab.value = 'ai';
  const task = await runAgentTask({
    taskType: 'FAB_SNAPSHOT_BRIEFING',
    sourcePage: 'FAB3D',
    context: buildFabSnapshotContext({
      areas: areas.value,
      tools: toolDetails.value,
      measuredAt: measuredAt.value,
      source: dataSource.value,
    }),
    params: {
      horizon: '현재~2시간',
      output: 'briefing',
      useLlm: true,
      llmModel: 'gpt-4o-mini',
    },
  });
  if (task) {
    fabAgentTask.value = task;
    if (task.status === 'SUCCEEDED') isAgentCardCollapsed.value = false;
    void loadBriefingHistory();
  }
}

async function loadBriefingHistory() {
  briefingHistoryLoading.value = true;
  try {
    const result = await listFabBriefings(0, 20);
    briefingHistory.value = result.items;
  } catch {
    briefingHistory.value = [];
  } finally {
    briefingHistoryLoading.value = false;
  }
}

async function openBriefingFromHistory(item: AgentRunListItem) {
  try {
    fabAgentTask.value = await fetchAgentTask(item.id, 'FAB_SNAPSHOT_BRIEFING');
    briefingBasisAt.value = null; // 과거 브리핑은 sim 기준시각 미저장 → 카드에 기준시각 생략
    isAgentCardCollapsed.value = false;
    agentPanelTab.value = 'ai';
  } catch {
    // 미리보기 로드 실패 시 기존 상태 유지
  }
}

async function handleDeleteBriefing(item: AgentRunListItem) {
  if (!window.confirm('이 브리핑 이력을 삭제할까요?\n삭제하면 되돌릴 수 없습니다.')) return;
  try {
    await deleteFabBriefing(item.id);
    await loadBriefingHistory();
  } catch {
    // 삭제 실패 시 목록 유지
  }
}

function focusAgentToolGroup(tgNameOrId: string) {
  const normalized = normalizeTgName(tgNameOrId);
  const tg = allTgs.value.find(
    (candidate) => candidate.tgId === tgNameOrId || normalizeTgName(candidate.tgName) === normalized
  );
  if (!tg) return;
  sceneRef.value?.focusToolGroup(tg, { zoom: true });
  void handleSelectTg(tg);
}

const REFRESH_MS = 8000;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

async function loadFab3dData(background = false) {
  if (!background) isLoadingCurrent.value = true;
  const data = await fetchFab3dMonitoringData();
  areas.value = data.areas;
  toolDetails.value = data.tools;
  dataSource.value = data.source;
  measuredAt.value = data.measuredAt;
  // 선택 상태 유지: 새 스냅샷의 동일 tgId/toolId 객체로 재바인딩해 패널 지표를 최신으로.
  if (selectedTg.value) {
    selectedTg.value = allTgs.value.find((t) => t.tgId === selectedTg.value!.tgId) ?? null;
  }
  if (selectedTool.value) {
    selectedTool.value = toolDetails.value.find((t) => t.toolId === selectedTool.value!.toolId) ?? selectedTool.value;
  }
  if (!background) isLoadingCurrent.value = false;
  if (!background) void focusRequestedTg();
}

onMounted(() => {
  void loadFab3dData();
  void loadBriefingHistory();
  const poll = async () => {
    await loadFab3dData(true);
    refreshTimer = setTimeout(poll, REFRESH_MS);
  };
  refreshTimer = setTimeout(poll, REFRESH_MS);
});
onBeforeUnmount(() => {
  if (refreshTimer) clearTimeout(refreshTimer);
});

watch(sceneKey, () => {
  selectedTg.value = null;
  selectedAsset.value = null;
  selectedTool.value = null;
  toolStatusFilter.value = 'ALL';
  void nextTick(() => focusRequestedTg(true));
});

watch(requestedTgName, () => {
  lastFocusedRouteKey = '';
  void focusRequestedTg(true);
});
</script>

<template>
  <div class="fab3d" :class="{ 'fab3d--dark': isDark }">
    <div class="fab3d__canvas">
      <Fab3dScene
        :key="sceneKey"
        ref="sceneRef"
        :areas="areas"
        @select-tg="handleSelectTg"
        @select-asset="handleSelectAsset"
      />

      <!-- 설비 상태 보드 (tool fleet grid) -->
      <Transition name="hm">
        <div
          v-if="selectedTg && selectedTgAllTools.length"
          class="fab3d__board"
          :class="{ 'fab3d__board--collapsed': isHeatmapCollapsed }"
        >
          <div class="fab3d__hm-hd">
            <div>
              <div class="fab3d__hm-name">{{ selectedTg.tgName }} · 설비 {{ selectedTgAllTools.length }}대</div>
              <div class="fab3d__hm-sub">
                {{ dataSource === 'current' ? '실시간' : '데모' }} · 셀 클릭 시 우측 패널에 상세 표시
              </div>
            </div>
            <div class="fab3d__hm-actions">
              <button
                class="fab3d__hm-close"
                :title="isHeatmapCollapsed ? '펼치기' : '접기'"
                @click="isHeatmapCollapsed = !isHeatmapCollapsed"
              >
                {{ isHeatmapCollapsed ? '+' : '−' }}
              </button>
              <button class="fab3d__hm-close" title="닫기" @click="closeDetail">✕</button>
            </div>
          </div>

          <!-- 상태 필터칩 -->
          <div v-show="!isHeatmapCollapsed" class="fab3d__board-filters">
            <button
              v-for="status in visibleToolStatuses"
              :key="status"
              type="button"
              class="fab3d__board-chip"
              :class="{ 'fab3d__board-chip--active': toolStatusFilter === status }"
              @click="handleToolStatusFilter(status)"
            >
              <span class="fab3d__board-chip-ic">{{ statusIcon(status) }}</span>
              <span>{{ statusLabel(status) }}</span>
              <strong>{{ selectedToolStatusSummary[status] }}</strong>
            </button>
          </div>

          <div v-show="!isHeatmapCollapsed" class="fab3d__board-grid">
            <button
              v-for="t in selectedTgHeatmapTools"
              :key="t.toolId"
              class="fab3d__hm-cell"
              :class="{ 'fab3d__hm-cell--active': selectedTool?.toolId === t.toolId }"
              type="button"
              :style="{ background: cellColor(t) }"
              :title="`${t.toolCode} · ${statusLabel(t.status)} · 가동률 ${(t.utilizationRate * 100).toFixed(0)}%`"
              @click="handleSelectTool(t)"
            >
              <span class="fab3d__hm-cell-top">
                <span class="fab3d__hm-cell-st">{{ statusIcon(t.status) }}</span>
                <span class="fab3d__hm-cell-id">{{ t.toolCode.split('#').at(-1) ?? t.toolCode }}</span>
              </span>
              <span class="fab3d__hm-cell-pct">{{ (t.utilizationRate * 100).toFixed(0) }}%</span>
            </button>
            <p v-if="!selectedTgHeatmapTools.length" class="fab3d__board-empty">
              <strong>{{ statusLabel(toolStatusFilter as Fab3dToolDetail['status']) }}</strong> 상태 설비가 없습니다
            </p>
          </div>

          <div v-show="!isHeatmapCollapsed" class="fab3d__board-note">
            셀 색 = 가동률(초록 낮음 → 빨강 높음, 구역별 현황과 동일 기준) · 아이콘 = 상태 · 숫자 = 가동률%
          </div>
        </div>
      </Transition>

      <!-- Top-left overlay -->
      <div class="fab3d__ov fab3d__ov--tl">
        <span class="fab3d__ov-title">3D FAB 뷰</span>
        <button class="fab3d__btn" @click="sceneRef?.resetCamera()">카메라 초기화</button>
        <button class="fab3d__btn fab3d__btn--agent" :disabled="isAgentTaskRunning" @click="handleFabBriefing">
          <Sparkles :size="14" aria-hidden="true" />
          {{ isAgentTaskRunning ? 'AI 분석 중…' : 'AI 현황 브리핑' }}
        </button>
        <span class="fab3d__source" :class="{ 'fab3d__source--live': dataSource === 'current' }">
          {{ isLoadingCurrent ? '연결 중…' : dataSource === 'current' ? '실시간' : '데모' }}
        </span>
        <button
          class="fab3d__info-btn"
          type="button"
          :aria-expanded="showLegendInfo"
          aria-label="가동률 기준 보기"
          @click="showLegendInfo = !showLegendInfo"
        >
          i
        </button>
        <div v-if="showLegendInfo" class="fab3d__legend-popover">
          <div class="fab3d__legend-hd">가동률 기준</div>
          <div class="fab3d__legend-row">
            <span class="fab3d__dot" style="background: var(--color-risk-critical)" />Critical ≥ 90%
          </div>
          <div class="fab3d__legend-row">
            <span class="fab3d__dot" style="background: var(--color-risk-high)" />High ≥ 85%
          </div>
          <div class="fab3d__legend-row">
            <span class="fab3d__dot" style="background: var(--color-risk-medium)" />Medium ≥ 70%
          </div>
          <div class="fab3d__legend-row">
            <span class="fab3d__dot" style="background: var(--color-risk-low)" />Low &lt; 70%
          </div>
          <div class="fab3d__legend-hd fab3d__legend-hd--spaced">구역 바닥색</div>
          <div v-for="band in zoneBandLegend" :key="band.type" class="fab3d__legend-row">
            <span class="fab3d__dot fab3d__dot--sq" :style="{ background: band.color }" />{{ band.label }}
          </div>
          <div class="fab3d__legend-hd fab3d__legend-hd--spaced">조작</div>
          <div class="fab3d__legend-hint">드래그: 회전 · 스크롤: 줌 · 화살표: 이동 · 클릭: 선택</div>
        </div>
      </div>
    </div>

    <!-- Right panel -->
    <aside class="fab3d__panel">
      <div class="fab3d__panel-tabs" role="tablist">
        <button
          type="button"
          class="fab3d__panel-tab"
          :class="{ 'fab3d__panel-tab--active': agentPanelTab === 'site' }"
          @click="agentPanelTab = 'site'"
        >
          Fab 현황
        </button>
        <button
          type="button"
          class="fab3d__panel-tab"
          :class="{ 'fab3d__panel-tab--active': agentPanelTab === 'ai' }"
          @click="agentPanelTab = 'ai'"
        >
          지난 현황 브리핑
        </button>
      </div>

      <!-- Selected object -->
      <div
        v-show="agentPanelTab === 'site'"
        class="fab3d__ps"
        :class="{ 'fab3d__ps--selected-tg': selectedTg }"
        :style="
          selectedTg
            ? { borderLeftColor: uHex(selectedTg.utilizationRate) }
            : selectedAsset
              ? { borderLeft: '3px solid var(--color-action-primary)' }
              : undefined
        "
      >
        <div class="fab3d__ps-title fab3d__ps-title--row">
          <span>선택된 객체</span>
          <button
            v-if="selectedTg || selectedAsset || selectedTool"
            type="button"
            class="fab3d__deselect-btn"
            @click="closeDetail"
          >
            선택 해제
          </button>
        </div>
        <template v-if="selectedAsset">
          <div class="fab3d__ps-name">{{ selectedAsset.assetName }}</div>
          <div class="fab3d__ps-area">{{ assetTypeLabel(selectedAsset.assetType) }} · {{ selectedAsset.location }}</div>
          <div class="fab3d__ps-risk" style="color: var(--color-action-primary)">● {{ selectedAsset.status }}</div>
          <dl class="fab3d__ps-kpis">
            <div>
              <dt>분류</dt>
              <dd>{{ assetTypeLabel(selectedAsset.assetType) }}</dd>
            </div>
            <div>
              <dt>적재</dt>
              <dd>{{ selectedAsset.load }}</dd>
            </div>
            <div>
              <dt>ETA</dt>
              <dd>{{ selectedAsset.eta }}</dd>
            </div>
            <div>
              <dt>경로</dt>
              <dd>{{ selectedAsset.route }}</dd>
            </div>
          </dl>
          <p class="fab3d__ps-desc">{{ selectedAsset.description }}</p>
        </template>
        <template v-else-if="selectedTg">
          <div class="fab3d__ps-name">{{ selectedTg.tgName }}</div>
          <div class="fab3d__ps-area">{{ formatAreaDisplay(selectedTg.areaCode) }}</div>
          <div class="fab3d__ps-risk" :style="{ color: uHex(selectedTg.utilizationRate) }">
            ● {{ uLabel(selectedTg.utilizationRate) }}
          </div>
          <dl class="fab3d__ps-kpis">
            <div>
              <dt>가동률</dt>
              <dd>{{ formatRatioPercent(selectedTg.utilizationRate) }}</dd>
            </div>
            <div>
              <dt>병목 확률</dt>
              <dd>{{ formatRatioPercent(selectedTg.bottleneckProb) }}</dd>
            </div>
            <div>
              <dt>WIP</dt>
              <dd>{{ formatFabNumber(selectedTg.wipCount) }} Lot</dd>
            </div>
            <div>
              <dt>대기 Lot</dt>
              <dd>{{ formatFabNumber(selectedTg.waitingLots) }}</dd>
            </div>
            <div>
              <dt>{{ selectedTgIsBuffer ? '버퍼 슬롯' : '설비 수' }}</dt>
              <dd>{{ selectedTg.toolCount }}{{ selectedTgIsBuffer ? '개' : '대' }}</dd>
            </div>
          </dl>
          <div class="fab3d__bar-lbl">
            <span>가동률</span><span>{{ formatRatioPercent(selectedTg.utilizationRate) }}</span>
          </div>
          <div class="fab3d__bar-track">
            <div
              class="fab3d__bar-fill"
              :style="{
                width: `${(selectedTg.utilizationRate * 100).toFixed(1)}%`,
                background: uHex(selectedTg.utilizationRate),
              }"
            />
          </div>

          <!-- 공정 흐름: 이전/다음 공정으로 카메라 이동 -->
          <section v-if="!selectedTgIsBuffer" class="fab3d__flow-ctx">
            <div class="fab3d__ps-title">공정 흐름</div>
            <div v-if="isLoadingRouteSteps" class="fab3d__flow-loading">조회 중…</div>
            <template v-else>
              <div v-if="prevProcessAreas.length" class="fab3d__flow-row">
                <span class="fab3d__flow-label fab3d__flow-label--prev">이전</span>
                <span class="fab3d__flow-chips">
                  <span v-for="a in prevProcessAreas" :key="a" class="fab3d__flow-chip fab3d__flow-chip--prev">
                    {{ formatAreaDisplay(a) }}
                  </span>
                </span>
              </div>
              <div class="fab3d__flow-row">
                <span class="fab3d__flow-label fab3d__flow-label--cur">현재</span>
                <span class="fab3d__flow-chips">
                  <span class="fab3d__flow-chip fab3d__flow-chip--cur">{{
                    formatAreaDisplay(selectedTg.areaCode)
                  }}</span>
                </span>
              </div>
              <div v-if="nextProcessAreas.length" class="fab3d__flow-row">
                <span class="fab3d__flow-label fab3d__flow-label--next">다음</span>
                <span class="fab3d__flow-chips">
                  <span v-for="a in nextProcessAreas" :key="a" class="fab3d__flow-chip fab3d__flow-chip--next">
                    {{ formatAreaDisplay(a) }}
                  </span>
                </span>
              </div>
              <button v-if="hasProcessFlow" type="button" class="fab3d__flow-view-btn" @click="showProcessFlow">
                공정 흐름 한눈에 보기
              </button>
              <p v-else class="fab3d__flow-loading">연결된 공정 정보가 없습니다</p>
            </template>
          </section>

          <section v-if="selectedTgIsBuffer" class="fab3d__buffer-panel">
            <div class="fab3d__ps-title">버퍼 상태 요약</div>
            <dl class="fab3d__buffer-kpis">
              <div>
                <dt>활성 슬롯</dt>
                <dd>{{ selectedToolStatusSummary.RUN }}</dd>
              </div>
              <div>
                <dt>대기 슬롯</dt>
                <dd>{{ selectedToolStatusSummary.IDLE }}</dd>
              </div>
              <div>
                <dt>총 슬롯</dt>
                <dd>{{ selectedTg.toolCount }}</dd>
              </div>
              <div>
                <dt>대기 Lot</dt>
                <dd>{{ formatFabNumber(selectedTg.waitingLots) }}</dd>
              </div>
            </dl>
            <div class="fab3d__tool-dist" aria-hidden="true">
              <span
                v-for="status in visibleToolStatuses"
                :key="status"
                :style="{
                  width: `${((selectedToolStatusSummary[status] / selectedToolStatusTotal) * 100).toFixed(1)}%`,
                  background: statusColor(status),
                }"
              />
            </div>
          </section>

          <section v-else class="fab3d__tool-panel">
            <div class="fab3d__ps-title">선택 설비</div>
            <div v-if="selectedTool" class="fab3d__selected-tool">
              <div class="fab3d__selected-tool-hd">
                <strong>{{ selectedTool.toolCode }}</strong>
                <span :style="{ color: statusColor(selectedTool.status) }">{{ statusLabel(selectedTool.status) }}</span>
              </div>

              <div v-if="isLoadingActivity" class="fab3d__act-loading">불러오는 중…</div>

              <div v-else-if="activityLoadError" class="fab3d__act-error">활동 정보를 불러오지 못했습니다</div>

              <template v-else-if="toolActivity">
                <!-- DOWN 구분: PM vs BM -->
                <div
                  v-if="toolActivity.currentState === 'DOWN'"
                  class="fab3d__act-down-badge"
                  :class="{ 'fab3d__act-down-badge--bm': toolActivity.rawState === 'DOWN_BM' }"
                >
                  <span class="fab3d__act-down-type" :style="{ color: downStateColor(toolActivity.rawState) }">
                    {{ downStateLabel(toolActivity.rawState) }}
                  </span>
                  <span
                    class="fab3d__act-duration"
                    :class="{ 'fab3d__act-duration--alarm': isLongDown(toolActivity.stateDurationMin) }"
                  >
                    {{ formatDuration(toolActivity.stateDurationMin) }} 경과
                  </span>
                </div>
                <div v-else class="fab3d__act-duration" :style="{ color: statusColor(selectedTool.status) }">
                  {{ formatDuration(toolActivity.stateDurationMin) }} 지속
                </div>

                <!-- DOWN 시작 시각 -->
                <div v-if="toolActivity.currentState === 'DOWN' && toolActivity.stateChangedAt" class="fab3d__act-row">
                  <span class="fab3d__act-label">발생 시각</span>
                  <span>{{ formatEventTime(toolActivity.stateChangedAt) }}</span>
                </div>

                <div v-if="toolActivity.currentState === 'DOWN' && toolActivity.reason" class="fab3d__act-row">
                  <span class="fab3d__act-label">사유</span>
                  <span>{{ toolActivity.reason }}</span>
                </div>

                <div v-if="toolActivity.setupName" class="fab3d__act-row">
                  <span class="fab3d__act-label">공정 레시피</span>
                  <span>{{ toolActivity.setupName }}</span>
                </div>

                <!-- RUN 중이면 현재 Lot, 아니면 마지막 처리 Lot -->
                <div class="fab3d__act-row">
                  <span class="fab3d__act-label">
                    {{ toolActivity.currentState === 'RUN' ? '처리 중 Lot' : '마지막 처리 Lot' }}
                  </span>
                  <span>
                    {{ toolActivity.currentLotId ?? toolActivity.lastDispatchLotId ?? '없음' }}
                    <em
                      v-if="toolActivity.currentState !== 'RUN' && toolActivity.lastDispatchAt"
                      class="fab3d__act-lot-time"
                    >
                      {{ formatEventTime(toolActivity.lastDispatchAt) }} 투입
                    </em>
                  </span>
                </div>

                <div class="fab3d__act-metrics">
                  <span
                    >대기 Lot <strong>{{ toolActivity.queueLotCount ?? selectedTool.queueLotCount }}</strong></span
                  >
                  <span
                    >가동률 <strong>{{ formatRatioPercent(selectedTool.utilizationRate) }}</strong></span
                  >
                  <span v-if="selectedTool.downRatio > 0"
                    >비가동 <strong>{{ formatRatioPercent(selectedTool.downRatio) }}</strong></span
                  >
                  <span v-if="selectedTool.setupRatio > 0"
                    >셋업 <strong>{{ formatRatioPercent(selectedTool.setupRatio) }}</strong></span
                  >
                </div>

                <div v-if="toolActivity.recentEvents.length" class="fab3d__act-events">
                  <div class="fab3d__act-label">최근 이벤트</div>
                  <div
                    v-for="ev in toolActivity.recentEvents.slice(0, 5)"
                    :key="ev.eventTime + ev.eventType + (ev.lotId ?? '')"
                    class="fab3d__act-event-row"
                  >
                    <span class="fab3d__act-event-time">{{ formatEventTime(ev.eventTime) }}</span>
                    <span class="fab3d__act-event-type" :style="{ color: eventTypeColor(ev.eventType) }">{{
                      eventTypeLabel(ev.eventType)
                    }}</span>
                    <span class="fab3d__act-event-lot">{{ ev.lotId }}</span>
                  </div>
                </div>
              </template>

              <template v-else>
                <dl class="fab3d__tool-kpis">
                  <div>
                    <dt>가동률</dt>
                    <dd>{{ formatRatioPercent(selectedTool.utilizationRate) }}</dd>
                  </div>
                  <div v-if="selectedTool.queueLotCount > 0">
                    <dt>대기 Lot</dt>
                    <dd>{{ selectedTool.queueLotCount }}</dd>
                  </div>
                  <div v-if="selectedTool.setupRatio > 0">
                    <dt>셋업</dt>
                    <dd>{{ formatRatioPercent(selectedTool.setupRatio) }}</dd>
                  </div>
                  <div v-if="selectedTool.downRatio > 0">
                    <dt>비가동</dt>
                    <dd>{{ formatRatioPercent(selectedTool.downRatio) }}</dd>
                  </div>
                </dl>
              </template>
            </div>
            <p v-else-if="!selectedTgAllTools.length" class="fab3d__empty-tool">
              해당 TG의 설비 상세 데이터가 없습니다.
            </p>
            <p v-else class="fab3d__tool-hint">
              아래 <strong>설비 보드</strong>에서 설비를 선택하면 상세가 표시됩니다.
            </p>
          </section>
        </template>
        <p v-else class="fab3d__ps-hint">Tool Group, AMR, OHT, Stocker를 클릭하면<br />상세 정보가 표시됩니다</p>
      </div>

      <!-- 현재/선택 브리핑 결과 -->
      <div
        v-if="agentPanelTab === 'ai' && (isAgentTaskRunning || fabAgentTask || agentTaskError)"
        class="fab3d__ps fab3d__agent-card"
      >
        <button
          class="fab3d__agent-card-head"
          type="button"
          :aria-expanded="!isAgentCardCollapsed"
          @click="isAgentCardCollapsed = !isAgentCardCollapsed"
        >
          <div class="fab3d__agent-head-text">
            <div class="fab3d__ps-title">현황 브리핑 결과</div>
            <strong>{{
              fabAgentTask?.result?.artifacts?.[0]?.title ?? (isAgentTaskRunning ? '현황 분석 중' : '분석 결과')
            }}</strong>
            <div v-if="briefingBasisAt" class="fab3d__agent-time">
              기준 시각 · {{ formatEventTime(briefingBasisAt) }}
            </div>
          </div>
          <span class="fab3d__agent-toggle" aria-hidden="true">
            <ChevronUp v-if="!isAgentCardCollapsed" :size="18" />
            <ChevronDown v-else :size="18" />
          </span>
        </button>

        <div v-show="!isAgentCardCollapsed" class="fab3d__agent-card-body">
          <ChatStatusIndicator v-if="isAgentTaskRunning" label="현황 분석 생성 중…" />
          <p v-else-if="agentTaskError" class="fab3d__agent-error">{{ agentTaskError }}</p>
          <template v-else-if="fabAgentTask?.result">
            <p class="fab3d__agent-summary">{{ fabAgentTask.result.summary }}</p>

            <section v-if="fabAgentTask.result.evidence?.length" class="fab3d__agent-section">
              <h4 class="fab3d__agent-section-title">{{ agentEvidenceLabel }}</h4>
              <ul class="fab3d__agent-evidence">
                <li v-for="item in fabAgentTask.result.evidence.slice(0, 6)" :key="`${item.label}-${item.value}`">
                  <span class="fab3d__ev-label">{{ item.label }}</span>
                  <b class="fab3d__ev-value">{{ item.value }}</b>
                </li>
              </ul>
            </section>

            <section v-if="fabAgentTask.result.watchToolGroups?.length" class="fab3d__agent-section">
              <h4 class="fab3d__agent-section-title">살펴볼 TG</h4>
              <div class="fab3d__watch-list">
                <button
                  v-for="w in fabAgentTask.result.watchToolGroups"
                  :key="w.tgName"
                  type="button"
                  class="fab3d__watch-chip"
                  :style="{ '--watch-color': watchSeverityColor(w.severity) }"
                  :title="`${w.tgName}${w.areaName ? ' · ' + w.areaName : ''} — ${w.reason} (클릭 시 줌인)`"
                  @click="focusAgentToolGroup(w.tgName)"
                >
                  <span class="fab3d__watch-name">{{ w.tgName }}</span>
                  <span class="fab3d__watch-reason">{{ w.reason }}</span>
                </button>
              </div>
            </section>

            <section v-if="fabAgentTask.result.responseDirections?.length" class="fab3d__agent-section">
              <h4 class="fab3d__agent-section-title">{{ agentDirectionsLabel }}</h4>
              <ul class="fab3d__agent-directions">
                <li v-for="direction in fabAgentTask.result.responseDirections.slice(0, 4)" :key="direction.title">
                  <strong>{{ direction.title }}</strong>
                  <span>{{ direction.description }}</span>
                </li>
              </ul>
            </section>

            <button
              v-if="fabAgentTask.status === 'SUCCEEDED'"
              class="fab3d__agent-ask"
              type="button"
              @click="openWithAgentTask(fabAgentTask)"
            >
              <MessageCircle :size="14" aria-hidden="true" />
              대화에서 더 물어보기
            </button>
          </template>
          <p v-else class="fab3d__agent-summary">AI Agent 작업을 준비 중입니다.</p>
        </div>
      </div>

      <!-- 지난 현황 브리핑 이력 -->
      <div v-if="agentPanelTab === 'ai'" class="fab3d__ps">
        <AgentRunHistoryList
          title="지난 현황 브리핑"
          :items="briefingHistory"
          :loading="briefingHistoryLoading"
          deletable
          @select="openBriefingFromHistory"
          @delete="handleDeleteBriefing"
        />
      </div>

      <!-- FAB 현황 -->
      <div v-if="agentPanelTab === 'site' && !selectedTg && !selectedAsset" class="fab3d__ps">
        <div class="fab3d__ps-title">FAB 현황 · TG {{ summary.total }}개</div>
        <div v-for="item in summaryItems" :key="item.key" class="fab3d__sum-row">
          <span><i class="fab3d__risk-dot" :style="{ background: item.color }" />{{ item.label }}</span>
          <strong :style="{ color: item.color }">{{ item.count }}개</strong>
        </div>
      </div>

      <!-- Area 별 현황 -->
      <div v-if="agentPanelTab === 'site' && !selectedTg && !selectedAsset" class="fab3d__ps fab3d__ps--grow">
        <div class="fab3d__ps-title">구역별 현황</div>
        <button
          v-for="area in areas"
          :key="area.areaCode"
          class="fab3d__area-row"
          type="button"
          @click="handleZoomToArea(area.areaCode)"
        >
          <span class="fab3d__area-hd">
            <span class="fab3d__area-name">{{ formatAreaDisplay(area.areaCode) }}</span>
            <span class="fab3d__area-count">{{ area.toolGroups.length }} TG</span>
          </span>
          <span class="fab3d__area-dist">
            <span
              v-for="item in areaGradeDistribution(area)"
              :key="item.key"
              class="fab3d__area-chip"
              :style="{ color: item.color }"
            >
              {{ item.shortLabel }}{{ item.count }}
            </span>
          </span>
          <span class="fab3d__area-bar-track" aria-hidden="true">
            <span
              v-for="item in areaGradeDistribution(area)"
              :key="item.key"
              class="fab3d__area-bar-fill"
              :style="{
                width: `${((item.count / Math.max(area.toolGroups.length, 1)) * 100).toFixed(1)}%`,
                background: item.color,
              }"
            />
          </span>
        </button>
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* ── Light mode tokens (default) ─────────────────────────────────── */
.fab3d {
  --f-bg: #f0f2f5;
  --f-panel-bg: #f8f9fb;
  --f-panel-bdr: rgba(100, 120, 140, 0.18);
  --f-section-bdr: rgba(100, 120, 140, 0.14);
  --f-ov-bg: rgba(240, 242, 245, 0.93);
  --f-ov-bdr: rgba(60, 100, 160, 0.22);
  --f-text: #1a2a3a;
  --f-text-strong: #0e1a28;
  --f-muted: #5a6e82;
  --f-hint: #8a9eb0;
  --f-title-label: #4a6070;
  --f-bar-track: rgba(80, 110, 140, 0.15);
}

/* ── Dark mode overrides ─────────────────────────────────────────── */
.fab3d--dark {
  --f-bg: #060c18;
  --f-panel-bg: #0a1020;
  --f-panel-bdr: rgba(0, 100, 180, 0.3);
  --f-section-bdr: rgba(0, 80, 160, 0.25);
  --f-ov-bg: rgba(6, 10, 24, 0.9);
  --f-ov-bdr: rgba(0, 180, 255, 0.25);
  --f-text: #c8dff0;
  --f-text-strong: #e6edf3;
  --f-muted: #7a9ab8;
  --f-hint: #364a60;
  --f-title-label: #4a7090;
  --f-bar-track: rgba(0, 60, 120, 0.4);
}

.fab3d {
  display: flex;
  height: 100%; /* 컨테이너(.app-layout__content) 높이에 정확히 맞춤 → 바깥 스크롤(두 번 움직임) 제거 */
  min-height: 0;
  overflow: hidden;
  background: var(--f-bg);
  transition: background 0.2s;
}

.fab3d__canvas {
  flex: 1;
  position: relative;
  min-width: 0;
}

/* Overlays */
.fab3d__ov {
  position: absolute;
  z-index: 10;
  background: var(--f-ov-bg);
  border: 1px solid var(--f-ov-bdr);
  border-radius: 8px;
  padding: 8px 12px;
  backdrop-filter: blur(4px);
}
.fab3d__ov--tl {
  top: 14px;
  left: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.fab3d__ov-title {
  color: var(--f-text-strong);
  font-size: var(--font-size-sm);
  font-weight: 700;
}
.fab3d__btn {
  padding: 5px 12px;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--f-muted);
  background: transparent;
  border: 1px solid var(--f-ov-bdr);
  border-radius: 6px;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}
.fab3d__btn:hover {
  background: var(--f-bar-track);
  color: var(--f-text-strong);
}
.fab3d__btn--agent {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  border-color: color-mix(in srgb, var(--color-gold) 42%, var(--f-border));
  background: color-mix(in srgb, var(--color-gold) 12%, var(--f-surface));
  color: var(--color-action-primary);
  font-weight: var(--font-weight-bold);
}

.fab3d__btn:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}
.fab3d__source {
  padding: 3px 8px;
  color: var(--f-muted);
  background: var(--f-bar-track);
  border-radius: 5px;
  font-size: var(--font-size-xs);
  font-weight: 600;
}
.fab3d__source--live {
  color: var(--color-status-success);
}
.fab3d__measured-at {
  font-size: var(--font-size-xs);
  color: var(--f-hint);
}
.fab3d__info-btn {
  width: 24px;
  height: 24px;
  border: 1px solid var(--f-ov-bdr);
  border-radius: 50%;
  background: transparent;
  color: var(--f-muted);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}
.fab3d__info-btn:hover,
.fab3d__info-btn[aria-expanded='true'] {
  background: var(--f-bar-track);
  color: var(--f-text-strong);
}
.fab3d__legend-popover {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: min(260px, calc(100vw - 300px));
  min-width: 210px;
  padding: 10px 12px;
  background: var(--f-ov-bg);
  border: 1px solid var(--f-ov-bdr);
  border-radius: 8px;
  color: var(--f-muted);
  font-size: var(--font-size-xs);
  line-height: 1.8;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.14);
}
.fab3d__legend-hd--spaced {
  margin-top: 8px;
}

.fab3d__legend-hd {
  font-weight: 700;
  color: var(--f-text-strong);
  margin-bottom: 4px;
  font-size: var(--font-size-xs);
}
.fab3d__legend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-xs);
  color: var(--f-text);
}
.fab3d__dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}
.fab3d__dot--sq {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid rgba(127, 127, 127, 0.35);
}
.fab3d__legend-hint {
  margin-top: 6px;
  font-size: var(--font-size-xs);
  color: var(--f-hint);
}

/* Right panel — 전역 디자인 토큰으로 통일 (다른 탭과 동일 룩) */
.fab3d__panel {
  /* 패널 한정: --f-* 를 전역 토큰으로 alias → 자식 셀렉터가 전역 시스템을 따른다.
     캔버스 오버레이(.fab3d__ov/.fab3d__legend/.fab3d__heatmap)는 .fab3d 루트 정의를 유지(글래스 룩). */
  --f-panel-bg: var(--color-bg-surface);
  --f-panel-bdr: var(--color-border-default);
  --f-section-bdr: var(--color-border-subtle);
  --f-text: var(--color-text);
  --f-text-strong: var(--color-text-strong);
  --f-muted: var(--color-muted);
  --f-hint: var(--color-muted);
  --f-title-label: var(--color-muted);
  --f-bar-track: var(--color-border-subtle);

  width: 360px;
  flex-shrink: 0;
  background: var(--color-bg-surface);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  transition:
    background 0.2s,
    border-color 0.2s;
}

.fab3d__panel-tabs {
  display: flex;
  position: sticky;
  top: 0;
  z-index: 1;
  border-bottom: 1px solid var(--color-border-default);
  background: var(--color-bg-surface);
}
.fab3d__panel-tab {
  flex: 1;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  padding: var(--space-2) var(--space-3);
  color: var(--color-muted);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.fab3d__panel-tab:hover {
  color: var(--color-text);
}
.fab3d__panel-tab--active {
  border-bottom-color: var(--color-action-primary);
  color: var(--color-action-primary);
}

.fab3d__ps-title--row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}
.fab3d__deselect-btn {
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: transparent;
  padding: 2px 8px;
  color: var(--color-muted);
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-transform: none;
  letter-spacing: normal;
}
.fab3d__deselect-btn:hover {
  border-color: var(--color-action-primary-border);
  color: var(--color-action-primary);
}

.fab3d__ps {
  padding: var(--space-4) var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
}
.fab3d__ps--grow {
  flex: 1;
}
.fab3d__ps--selected-tg {
  /* 전체 패널(.fab3d__panel)이 스크롤되도록 — 내부 overflow:hidden 제거.
     하단 tool 지표까지 모두 스크롤로 접근 가능. */
  display: flex;
  flex-direction: column;
}

.fab3d__ps-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 11px;
}
.fab3d__ps-name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-strong);
  margin-bottom: 3px;
  line-height: 1.25;
}
.fab3d__ps-area {
  font-size: var(--font-size-sm);
  color: var(--color-muted);
  margin-bottom: 6px;
  line-height: 1.4;
}
.fab3d__ps-risk {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  margin-bottom: 12px;
}

.fab3d__ps-kpis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  margin: 0 0 var(--space-3);
}
.fab3d__ps-kpis div {
  min-width: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
}
.fab3d__ps-kpis dt {
  font-size: var(--font-size-xs);
  color: var(--color-muted);
  margin-bottom: 4px;
}
.fab3d__ps-kpis dd {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-strong);
  overflow-wrap: anywhere;
  line-height: 1.2;
}
.fab3d__ps-desc {
  margin: 10px 0 0;
  font-size: var(--font-size-sm);
  line-height: 1.55;
  color: var(--color-muted);
}

.fab3d__agent-chips button {
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-login-panel-bg);
  color: var(--color-fg);
  cursor: pointer;
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.fab3d__agent-card {
  display: grid;
  gap: var(--space-3);
  border: var(--border-width-default) solid color-mix(in srgb, var(--color-gold) 36%, var(--color-border-default));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-gold) 5%, transparent);
  padding: var(--space-3);
}

.fab3d__agent-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  gap: var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: var(--space-1);
  text-align: left;
}

.fab3d__agent-card-head:hover {
  background: var(--color-state-hover);
}

.fab3d__agent-card-head:focus-visible {
  outline: 2px solid var(--color-action-primary-border);
  outline-offset: 2px;
}

.fab3d__agent-card-head strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}

.fab3d__agent-toggle {
  display: inline-grid;
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-login-panel-bg);
  color: var(--color-action-primary);
}

.fab3d__agent-time {
  margin-top: 3px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.fab3d__agent-card-body {
  display: grid;
  gap: var(--space-3);
}

.fab3d__agent-ask {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  min-height: 34px;
  margin-top: var(--space-1);
  border: 1px solid var(--color-action-primary-border);
  border-radius: var(--radius-md);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
  cursor: pointer;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.fab3d__agent-ask:hover {
  background: color-mix(in srgb, var(--color-action-primary) 16%, var(--color-bg-surface));
}

/* 쉐브론 토글 (헤더 버튼 기본 규칙보다 우선) */
.fab3d__agent-card-head .fab3d__agent-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px;
  padding: 2px;
  border: none;
  background: transparent;
  color: var(--color-fg-muted);
  cursor: pointer;
}
.fab3d__agent-card-head .fab3d__agent-toggle:hover {
  color: var(--color-fg-strong);
}

/* 살펴볼 TG 칩 (클릭 시 줌인, severity 색) */
.fab3d__watch-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.fab3d__watch-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  max-width: 100%;
  padding: 5px var(--space-2);
  border: 1px solid color-mix(in srgb, var(--watch-color) 45%, var(--color-border-default));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--watch-color) 9%, var(--color-bg-surface));
  color: var(--color-fg);
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.fab3d__watch-chip:hover {
  background: color-mix(in srgb, var(--watch-color) 18%, var(--color-bg-surface));
}
.fab3d__watch-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-fg-strong);
}
.fab3d__watch-reason {
  font-size: var(--font-size-xs);
  color: var(--color-fg-muted);
}

.fab3d__agent-summary,
.fab3d__agent-error {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.55;
}

.fab3d__agent-error {
  color: var(--color-status-danger);
}

.fab3d__agent-section {
  display: grid;
  gap: var(--space-2);
  border-top: 1px solid var(--color-border-subtle);
  padding-top: var(--space-3);
}

.fab3d__agent-section > span {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.fab3d__agent-section dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
}

.fab3d__agent-section dl div {
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  padding: var(--space-2);
}

.fab3d__agent-section dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.fab3d__agent-section dd {
  margin: 2px 0 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.fab3d__agent-section p,
.fab3d__agent-section li {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

.fab3d__agent-section ul {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding-left: 16px;
}

.fab3d__agent-section li strong {
  display: block;
  color: var(--color-fg);
}

.fab3d__agent-head-text {
  min-width: 0;
}
.fab3d__agent-section-title {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}
.fab3d__agent-section ul.fab3d__agent-evidence,
.fab3d__agent-section ul.fab3d__agent-directions {
  padding-left: 0;
  list-style: none;
}
.fab3d__agent-evidence li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  padding: 6px var(--space-2);
}
.fab3d__ev-label {
  min-width: 0;
  overflow: hidden;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fab3d__ev-value {
  flex-shrink: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}
.fab3d__agent-directions li {
  display: grid;
  gap: 2px;
  padding: 0 0 0 10px;
  border-left: 2px solid var(--color-border-default);
}
.fab3d__agent-directions li strong {
  display: block;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
}
.fab3d__agent-directions li span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.fab3d__agent-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.fab3d__agent-chips button {
  min-height: 24px;
  padding: 0 var(--space-2);
}

.fab3d__bar-lbl {
  display: flex;
  justify-content: space-between;
  font-size: var(--font-size-xs);
  color: var(--color-muted);
  margin-bottom: 4px;
}
.fab3d__bar-track {
  height: 6px;
  background: var(--f-bar-track);
  border-radius: 3px;
  overflow: hidden;
}
.fab3d__bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}
.fab3d__tool-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.fab3d__buffer-panel {
  display: grid;
  gap: 9px;
  margin-top: 12px;
}
.fab3d__buffer-kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}
.fab3d__buffer-kpis div {
  min-width: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
}
.fab3d__buffer-kpis dt {
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  margin-bottom: 4px;
}
.fab3d__buffer-kpis dd {
  margin: 0;
  color: var(--color-text-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
}
.fab3d__tool-dist {
  display: flex;
  height: 8px;
  overflow: hidden;
  background: var(--f-bar-track);
  border-radius: 4px;
}
.fab3d__selected-tool {
  display: grid;
  gap: 8px;
  padding: var(--space-3);
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 26%, var(--color-border-default));
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
}
.fab3d__selected-tool-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.fab3d__selected-tool-hd strong {
  color: var(--color-text-strong);
  font-size: var(--font-size-sm);
  font-weight: 800;
  overflow-wrap: anywhere;
}
.fab3d__selected-tool-hd span {
  font-size: var(--font-size-sm);
  font-weight: 800;
}
.fab3d__tool-kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin: 0;
}
.fab3d__tool-kpis dt {
  color: var(--color-muted);
  font-size: var(--font-size-xs);
}
.fab3d__tool-kpis dd {
  margin: 0;
  color: var(--color-text-strong);
  font-size: var(--font-size-md);
  font-weight: 800;
}
/* ── Tool Activity card ──────────────────────────────────────────── */
.fab3d__act-loading {
  font-size: var(--font-size-xs);
  color: var(--color-muted);
  padding: 4px 0;
}
.fab3d__act-error {
  font-size: var(--font-size-xs);
  color: var(--color-status-danger);
  padding: 4px 0;
}
.fab3d__act-down-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--color-status-warning) 10%, var(--f-bar-track));
  border: 1px solid color-mix(in srgb, var(--color-status-warning) 30%, transparent);
}
.fab3d__act-down-badge--bm {
  background: color-mix(in srgb, var(--color-status-danger) 10%, var(--f-bar-track));
  border-color: color-mix(in srgb, var(--color-status-danger) 30%, transparent);
}
.fab3d__act-down-type {
  font-size: var(--font-size-sm);
  font-weight: 800;
}
.fab3d__act-duration {
  font-size: var(--font-size-sm);
  font-weight: 800;
  margin-bottom: 2px;
}
.fab3d__act-duration--alarm {
  color: var(--color-status-danger) !important;
  animation: act-blink 1.6s ease-in-out infinite;
}
@keyframes act-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
.fab3d__act-row {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 6px 8px;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  line-height: 1.5;
}
.fab3d__act-label {
  color: var(--color-muted);
  min-width: 0;
  font-size: var(--font-size-sm);
  font-weight: 700;
  padding-top: 1px;
}
.fab3d__act-row > span:last-child {
  min-width: 0;
  overflow-wrap: anywhere;
}
.fab3d__act-dispatch em,
.fab3d__act-lot-time {
  display: block;
  font-style: normal;
  color: var(--color-muted);
  font-size: var(--font-size-xs);
}
.fab3d__act-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  font-size: var(--font-size-xs);
  color: var(--color-muted);
  padding: 4px 0 2px;
}
.fab3d__act-metrics span {
  min-width: 0;
  padding: 6px 9px;
  border: 1px solid var(--color-border-default);
  border-radius: 999px;
  background: var(--color-bg-card);
  white-space: nowrap;
}
.fab3d__act-metrics strong {
  color: var(--color-text-strong);
  font-weight: 800;
}
.fab3d__act-events {
  display: grid;
  gap: 3px;
  padding-top: 4px;
  border-top: 1px solid var(--color-border-subtle);
}
.fab3d__act-event-row {
  display: grid;
  grid-template-columns: minmax(64px, 0.8fr) minmax(58px, 0.75fr) minmax(0, 1.4fr);
  gap: 6px;
  font-size: var(--font-size-xs);
  color: var(--color-text);
  overflow: hidden;
}
.fab3d__act-event-time {
  color: var(--color-muted);
}
.fab3d__act-event-type {
  min-width: 0;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fab3d__act-event-lot {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--f-muted);
}

.fab3d__empty-tool {
  margin: 0;
  color: var(--color-muted);
  font-size: var(--font-size-sm);
  line-height: 1.45;
}

.fab3d__ps-hint {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-muted);
  line-height: 1.6;
  text-align: center;
  padding: 12px 0;
}

.fab3d__sum-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  line-height: 2.1;
}
.fab3d__sum-row span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.fab3d__sum-row strong {
  font-weight: 700;
}
.fab3d__risk-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 12%, transparent);
}

/* Area rows */
.fab3d__area-row {
  display: grid;
  width: 100%;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 5px 7px;
  border: 0;
  border-radius: 8px;
  margin: 0 0 9px;
  padding: 6px 7px;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.fab3d__area-row:hover,
.fab3d__area-row:focus-visible {
  background: var(--f-bar-track);
  outline: none;
}
.fab3d__area-hd {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 7px;
}
.fab3d__area-name {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-strong);
  line-height: 1.3;
}
.fab3d__area-count {
  font-size: var(--font-size-xs);
  color: var(--color-muted);
  white-space: nowrap;
}
.fab3d__area-dist {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.fab3d__area-chip {
  display: inline-flex;
  align-items: center;
  min-height: 18px;
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--color-border-subtle);
  font-size: var(--font-size-xs);
  font-weight: 800;
  line-height: 1;
}
.fab3d__area-bar-track {
  grid-column: 1 / -1;
  display: flex;
  width: 100%;
  height: 7px;
  background: var(--f-bar-track);
  border-radius: 999px;
  overflow: hidden;
}
.fab3d__area-bar-fill {
  height: 100%;
  min-width: 2px;
}

/* 설비 상태 보드 (tool fleet grid) — 넓게 펼친 하단 보드 */
.fab3d__board {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 15;
  width: min(72%, 760px);
  max-height: 46%;
  display: flex;
  flex-direction: column;
  background: var(--f-ov-bg);
  border: 1px solid var(--f-ov-bdr);
  border-radius: 12px;
  padding: 14px 16px 12px;
  backdrop-filter: blur(8px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.16);
  color: var(--f-text);
}
.fab3d--dark .fab3d__board {
  box-shadow: 0 10px 36px rgba(0, 0, 0, 0.52);
}
.fab3d__board--collapsed {
  width: min(56%, 460px);
  padding-bottom: 14px;
}
.fab3d__hm-hd {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.fab3d__board--collapsed .fab3d__hm-hd {
  margin-bottom: 0;
}
.fab3d__board-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.fab3d__board-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border: 1px solid var(--f-ov-bdr);
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--f-text);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}
.fab3d__board-chip:hover {
  background: var(--f-bar-track);
}
.fab3d__board-chip--active {
  border-color: var(--color-action-primary);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
}
.fab3d__board-chip-ic {
  font-size: 11px;
  line-height: 1;
  color: var(--f-muted);
  flex-shrink: 0;
}
.fab3d__board-chip--active .fab3d__board-chip-ic {
  color: var(--color-action-primary);
}
.fab3d__board-chip strong {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  padding: 0 6px;
  height: 18px;
  border-radius: var(--radius-pill);
  background: var(--f-bar-track);
  color: var(--f-text-strong);
  font-size: var(--font-size-xs);
  font-weight: 900;
}
.fab3d__board-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 10px;
  overflow-y: auto;
  overscroll-behavior: contain;
  align-content: flex-start;
}
.fab3d__board-empty {
  margin: 6px 2px;
  font-size: var(--font-size-sm);
  color: var(--f-muted);
}
.fab3d__board-empty strong {
  color: var(--f-text-strong);
}
.fab3d__hm-name {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--f-text-strong);
  line-height: 1.3;
}
.fab3d__hm-sub {
  font-size: var(--font-size-xs);
  color: var(--f-muted);
  margin-top: 2px;
}
.fab3d__hm-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.fab3d__hm-close {
  background: none;
  border: none;
  color: var(--f-hint);
  cursor: pointer;
  font-size: 17px;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.15s;
}
.fab3d__hm-close:hover {
  color: var(--f-text-strong);
}
.fab3d__hm-cell {
  width: 60px;
  height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: 4px 5px;
  border-radius: 5px;
  cursor: pointer;
  border: 1px solid rgba(0, 0, 0, 0.1);
  transition:
    filter 0.12s,
    outline-color 0.12s;
}
.fab3d--dark .fab3d__hm-cell {
  border-color: rgba(255, 255, 255, 0.07);
}
.fab3d__hm-cell:hover,
.fab3d__hm-cell:focus-visible,
.fab3d__hm-cell--active {
  /* scale 변형 제거 — 셀이 커지며 이웃/카드와 겹치던 문제 해결. 외곽선으로만 강조. */
  filter: brightness(1.12);
  z-index: 2;
  outline: 2px solid var(--color-action-primary);
  outline-offset: -1px;
}
.fab3d__hm-cell-top {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
.fab3d__hm-cell-st {
  font-size: 10px;
  line-height: 1;
}
.fab3d__hm-cell-id {
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}
.fab3d__hm-cell-pct {
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.fab3d__board-note {
  font-size: var(--font-size-xs);
  color: var(--f-muted);
  line-height: 1.4;
}

/* ── 공정 흐름 (이전/다음 공정 이동) ───────────────────────────── */
.fab3d__flow-ctx {
  padding-top: 12px;
  border-top: 1px solid var(--color-border-subtle);
  display: grid;
  gap: 8px;
}
.fab3d__flow-loading {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-muted);
}
.fab3d__flow-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}
.fab3d__flow-label {
  font-size: var(--font-size-xs);
  font-weight: 800;
  letter-spacing: 0.02em;
}
.fab3d__flow-label--prev {
  color: var(--color-chart-blue);
}
.fab3d__flow-label--cur {
  color: var(--color-action-primary);
}
.fab3d__flow-label--next {
  color: var(--color-risk-high);
}
.fab3d__flow-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  min-width: 0;
}
.fab3d__flow-chip {
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-weight: 600;
  white-space: nowrap;
}
.fab3d__flow-chip--prev {
  background: color-mix(in srgb, var(--color-chart-blue) 14%, transparent);
  color: var(--color-chart-blue);
}
.fab3d__flow-chip--cur {
  background: color-mix(in srgb, var(--color-action-primary) 15%, transparent);
  color: var(--color-action-primary);
  font-weight: 800;
}
.fab3d__flow-chip--next {
  background: color-mix(in srgb, var(--color-risk-high) 14%, transparent);
  color: var(--color-risk-high);
}
.fab3d__flow-view-btn {
  margin-top: 2px;
  padding: 9px 12px;
  border: 1px solid var(--color-action-primary);
  border-radius: var(--radius-md);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
  font-size: var(--font-size-sm);
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}
.fab3d__flow-view-btn:hover,
.fab3d__flow-view-btn:focus-visible {
  background: color-mix(in srgb, var(--color-action-primary) 22%, transparent);
  outline: none;
}
.fab3d__tool-hint {
  margin: 0;
  padding: 14px 12px;
  text-align: center;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  color: var(--color-muted);
  border: 1px dashed var(--color-border-default);
  border-radius: var(--radius-lg);
}
.fab3d__tool-hint strong {
  color: var(--color-text-strong);
}

/* Heatmap transition */
.hm-enter-active,
.hm-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}
.hm-enter-from,
.hm-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(14px);
}
</style>

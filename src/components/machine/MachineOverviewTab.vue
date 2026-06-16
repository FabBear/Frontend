<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';

import { fetchEquipmentOverview } from '@/services/machineService';

import { getProcessAreaDisplayCode, getProcessAreaNameKo } from '@/constants/processArea';
import { RISK_LEVEL_META, riskGradeToLevel } from '@/constants/riskLevel';

import type { EquipmentOverviewPayload, MachineEquipmentStatus, MachineSummary } from '@/types/machine';
import type { MesRiskGrade } from '@/types/mes';

import BaseBadge from '@/components/base/BaseBadge.vue';
import KpiCard from '@/components/base/KpiCard.vue';
import MesToolStatusBadge from '@/components/mes/MesToolStatusBadge.vue';

import { formatNumber, formatRatioPercent } from '@/utils/format';

interface Props {
  summary: MachineSummary;
}

const props = defineProps<Props>();

type OverviewRange = '6H' | '24H' | '7D' | '30D';

// 서버 /equipment/overview 집계를 그대로 소비. (클라이언트 단일 스냅샷 집계 제거)
interface ToolRow {
  toolId: string;
  toolCode: string;
  toolName: string;
  tgId: string;
  status: MachineEquipmentStatus;
  avgUtilizationRate: number;
  deltaUtilizationRate: number;
  avgOeeEstimate: number | null;
  avgQueueLotCount: number;
  maxQueueLotCount: number;
  avgDownRatio: number;
}

interface ToolGroupRow {
  tgId: string;
  tgCode: string;
  tgName: string;
  areaCode: string;
  areaNameKo: string;
  toolCount: number;
  runToolCount: number;
  idleToolCount: number;
  downToolCount: number;
  avgUtilizationRate: number;
  deltaUtilizationRate: number;
  avgWipCount: number;
  maxWipCount: number;
  riskGrade: MesRiskGrade;
}

interface ProcessRow {
  areaCode: string;
  areaNameKo: string;
  tgCount: number;
  toolCount: number;
  avgUtilizationRate: number;
  deltaUtilizationRate: number;
  avgWipCount: number;
  maxWipCount: number;
  riskTgCount: number;
  topBurdenToolGroupCode: string;
}

const overviewRange = ref<OverviewRange | 'CUSTOM'>('24H');

const rangeOptions: { value: OverviewRange; label: string }[] = [
  { value: '6H', label: '최근 6시간' },
  { value: '24H', label: '최근 24시간' },
  { value: '7D', label: '최근 7일' },
  { value: '30D', label: '최근 30일' },
];

function toDateTimeLocalValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function parseDateTimeLocal(value: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function getReferenceEndDate(): Date {
  const measuredAt = new Date(props.summary.measuredAt);
  return Number.isNaN(measuredAt.getTime()) ? new Date() : measuredAt;
}

function getRangeStartDate(range: OverviewRange, endDate: Date): Date {
  if (range === '6H') return addHours(endDate, -6);
  if (range === '7D') return addHours(endDate, -24 * 7);
  if (range === '30D') return addHours(endDate, -24 * 30);
  return addHours(endDate, -24);
}

function formatAppliedDateTime(value: string): string {
  const date = parseDateTimeLocal(value);
  if (!date) return '-';
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

const initialEndDate = getReferenceEndDate();
const initialStartDate = getRangeStartDate('24H', initialEndDate);

const draftFrom = ref(toDateTimeLocalValue(initialStartDate));
const draftTo = ref(toDateTimeLocalValue(initialEndDate));
const appliedFrom = ref(draftFrom.value);
const appliedTo = ref(draftTo.value);
const rangeErrorMessage = ref<string | null>(null);
const dataEndDate = computed(() => getReferenceEndDate());
const maxDateTimeValue = computed(() => toDateTimeLocalValue(dataEndDate.value));
const fromInputMax = computed(() => {
  const to = parseDateTimeLocal(draftTo.value);
  if (!to || to.getTime() > dataEndDate.value.getTime()) return maxDateTimeValue.value;
  return draftTo.value;
});

// ── 서버 기간 통계 (/equipment/overview) ─────────────────────────────
const overviewData = ref<EquipmentOverviewPayload | null>(null);
const isOverviewLoading = ref(false);
const overviewError = ref(false);

async function loadOverview() {
  const from = parseDateTimeLocal(appliedFrom.value);
  const to = parseDateTimeLocal(appliedTo.value);
  if (!from || !to) return;
  isOverviewLoading.value = true;
  overviewError.value = false;
  try {
    const rangeParam = overviewRange.value === 'CUSTOM' ? 'CUSTOM' : overviewRange.value;
    overviewData.value = await fetchEquipmentOverview(rangeParam, from.toISOString(), to.toISOString());
  } catch (error) {
    console.warn('[MachineOverview] /equipment/overview 조회 실패', error);
    overviewData.value = null;
    overviewError.value = true;
  } finally {
    isOverviewLoading.value = false;
  }
}

onMounted(() => {
  void loadOverview();
});

watch(
  () => props.summary.measuredAt,
  (newMeasuredAt) => {
    if (newMeasuredAt && overviewRange.value !== 'CUSTOM') {
      applyQuickRange(overviewRange.value);
    }
  }
);

const selectedRangeLabel = computed(() => {
  if (overviewRange.value === 'CUSTOM') return '직접 설정';
  return rangeOptions.find((option) => option.value === overviewRange.value)?.label ?? '최근 24시간';
});

const appliedRangeLabel = computed(
  () => `${formatAppliedDateTime(appliedFrom.value)} ~ ${formatAppliedDateTime(appliedTo.value)}`
);

function applyQuickRange(range: OverviewRange) {
  const endDate = getReferenceEndDate();
  const startDate = getRangeStartDate(range, endDate);
  overviewRange.value = range;
  draftFrom.value = toDateTimeLocalValue(startDate);
  draftTo.value = toDateTimeLocalValue(endDate);
  appliedFrom.value = draftFrom.value;
  appliedTo.value = draftTo.value;
  rangeErrorMessage.value = null;
  void loadOverview();
}

function applyCustomRange() {
  const from = parseDateTimeLocal(draftFrom.value);
  const to = parseDateTimeLocal(draftTo.value);

  if (!from || !to) {
    rangeErrorMessage.value = '시작일과 종료일을 모두 입력하세요.';
    return;
  }

  if (from.getTime() >= to.getTime()) {
    rangeErrorMessage.value = '종료일은 시작일 이후여야 합니다.';
    return;
  }

  if (from.getTime() > dataEndDate.value.getTime() || to.getTime() > dataEndDate.value.getTime()) {
    rangeErrorMessage.value = '데이터 기준 시각 이후는 선택할 수 없습니다.';
    return;
  }

  overviewRange.value = 'CUSTOM';
  appliedFrom.value = draftFrom.value;
  appliedTo.value = draftTo.value;
  rangeErrorMessage.value = null;
  void loadOverview();
}

// ── 네비게이션 상태 ──────────────────────────────────────────────────
const selectedProcessCode = ref<string | null>(null);
const selectedTgId = ref<string | null>(null);

const level = computed(() => {
  if (selectedTgId.value !== null) return 3;
  if (selectedProcessCode.value !== null) return 2;
  return 1;
});

function goRoot() {
  selectedProcessCode.value = null;
  selectedTgId.value = null;
}

function selectProcess(code: string) {
  selectedProcessCode.value = code;
  selectedTgId.value = null;
}

function goProcess() {
  selectedTgId.value = null;
}

function formatDeltaPercentPoint(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(1)}pp`;
}

const n = (v: number | null | undefined): number => (typeof v === 'number' ? v : 0);

function riskSortOrder(grade: MesRiskGrade | null | undefined): number {
  return RISK_LEVEL_META[riskGradeToLevel(grade)].sortOrder;
}

// ── 서버 /equipment/overview 집계 → 행 매핑 ──────────────────────────
const allToolRows = computed<ToolRow[]>(() =>
  (overviewData.value?.tools ?? []).map((t) => ({
    toolId: t.toolId,
    toolCode: t.toolCode,
    toolName: t.toolName,
    tgId: t.tgId,
    status: t.currentStatus,
    avgUtilizationRate: n(t.avgUtilizationRate),
    deltaUtilizationRate: n(t.deltaUtilizationRate),
    avgOeeEstimate: t.avgOeeEstimate,
    avgQueueLotCount: n(t.avgQueueLotCount),
    maxQueueLotCount: n(t.maxQueueLotCount),
    avgDownRatio: n(t.avgDownRatio),
  }))
);

const toolGroupRows = computed<ToolGroupRow[]>(() =>
  (overviewData.value?.toolGroups ?? []).map((tg) => ({
    tgId: tg.tgId,
    tgCode: tg.tgCode,
    tgName: tg.tgName,
    areaCode: tg.areaCode,
    areaNameKo: getProcessAreaNameKo(tg.areaCode),
    toolCount: tg.toolCount,
    runToolCount: tg.runToolCount,
    idleToolCount: tg.idleToolCount,
    downToolCount: tg.downToolCount,
    avgUtilizationRate: n(tg.avgUtilizationRate),
    deltaUtilizationRate: n(tg.deltaUtilizationRate),
    avgWipCount: n(tg.avgWipCount),
    maxWipCount: n(tg.maxWipCount),
    riskGrade: tg.riskGrade,
  }))
);

const overviewSummary = computed(() => {
  const s = overviewData.value?.summary;
  return {
    avgUtilizationRate: n(s?.avgUtilizationRate),
    avgWipCount: n(s?.avgWipCount),
    riskToolGroupCount: s?.riskToolGroupCount ?? 0,
  };
});

const processRows = computed<ProcessRow[]>(() =>
  (overviewData.value?.processes ?? [])
    .map((p) => ({
      areaCode: p.areaCode,
      areaNameKo: getProcessAreaNameKo(p.areaCode),
      tgCount: p.toolGroupCount,
      toolCount: p.toolCount,
      avgUtilizationRate: n(p.avgUtilizationRate),
      deltaUtilizationRate: n(p.deltaUtilizationRate),
      avgWipCount: n(p.avgWipCount),
      maxWipCount: n(p.maxWipCount),
      riskTgCount: p.riskToolGroupCount,
      topBurdenToolGroupCode: p.topBurdenToolGroupCode ?? '-',
    }))
    .sort(
      (a, b) =>
        b.riskTgCount - a.riskTgCount || b.avgWipCount - a.avgWipCount || b.avgUtilizationRate - a.avgUtilizationRate
    )
);

// ── Level 2: 선택 공정의 TG ───────────────────────────────────────────
const selectedProcess = computed(() => processRows.value.find((p) => p.areaCode === selectedProcessCode.value) ?? null);

const tgRows = computed(() =>
  toolGroupRows.value
    .filter((tg) => tg.areaCode === selectedProcessCode.value)
    .sort(
      (a, b) =>
        riskSortOrder(a.riskGrade) - riskSortOrder(b.riskGrade) ||
        b.avgWipCount - a.avgWipCount ||
        b.avgUtilizationRate - a.avgUtilizationRate
    )
);

// ── Level 3: 선택 TG의 장비 ──────────────────────────────────────────
const selectedTg = computed(() => toolGroupRows.value.find((tg) => tg.tgId === selectedTgId.value) ?? null);

// 정렬: 문제 설비 우선 — 다운율 desc → 최대 Queue desc (서버 지표만 사용)
const toolRows = computed(() =>
  allToolRows.value
    .filter((eq) => eq.tgId === selectedTgId.value)
    .sort((a, b) => b.avgDownRatio - a.avgDownRatio || b.maxQueueLotCount - a.maxQueueLotCount)
);

// ── 유틸 ──────────────────────────────────────────────────────────────
// 모든 공정을 "코드 · 한글명"으로 일관 표기 (예: DRY_ETCH · 식각, DEF_MET · 결함 계측).
function formatProcessLabel(areaCode: string, areaNameKo: string): string {
  return `${getProcessAreaDisplayCode(areaCode)} · ${areaNameKo}`;
}
</script>

<template>
  <div class="overview-tab">
    <section class="overview-tab__range-bar" aria-label="장비 현황 기간">
      <div class="overview-tab__range-copy">
        <strong>운영 현황 기준</strong>
        <span>선택한 기간의 평균·최대·현재 대비 지표로 장비 부담을 봅니다.</span>
      </div>
      <div class="overview-tab__range-controls">
        <div class="overview-tab__control-group">
          <div class="overview-tab__range-options" role="group" aria-label="빠른 기간 선택">
            <button
              v-for="option in rangeOptions"
              :key="option.value"
              type="button"
              class="overview-tab__range-btn"
              :class="{ 'overview-tab__range-btn--active': overviewRange === option.value }"
              @click="applyQuickRange(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <div class="overview-tab__control-group">
          <div class="overview-tab__custom-range" aria-label="직접 기간 선택">
            <label>
              <span>시작일</span>
              <input v-model="draftFrom" type="datetime-local" :max="fromInputMax" />
            </label>
            <label>
              <span>종료일</span>
              <input v-model="draftTo" type="datetime-local" :min="draftFrom" :max="maxDateTimeValue" />
            </label>
            <button type="button" class="overview-tab__apply-btn" @click="applyCustomRange">조회</button>
            <button type="button" class="overview-tab__reset-btn" @click="applyQuickRange('24H')">초기화</button>
          </div>
        </div>
      </div>
      <div class="overview-tab__range-status">
        <b>{{ selectedRangeLabel }}</b>
        <span>{{ appliedRangeLabel }} 적용 중</span>
        <small>1시간 단위 KPI 기준</small>
      </div>
      <p v-if="rangeErrorMessage" class="overview-tab__range-error">{{ rangeErrorMessage }}</p>
    </section>

    <!-- KPI 요약 -->
    <section class="overview-tab__kpi">
      <KpiCard
        title="전체 장비"
        :value="`${formatNumber(summary.toolCount)}대`"
        :subtitle="`${formatNumber(summary.toolGroupCount)}개 Tool Group`"
      />
      <KpiCard
        title="평균 가동률"
        :value="formatRatioPercent(overviewSummary.avgUtilizationRate)"
        :subtitle="`${selectedRangeLabel} 기간 평균`"
      />
      <KpiCard
        title="평균 WIP"
        :value="`${formatNumber(Math.round(overviewSummary.avgWipCount))} lot`"
        :subtitle="`${selectedRangeLabel} TG 평균`"
      />
      <KpiCard
        title="위험 TG"
        :value="`${formatNumber(overviewSummary.riskToolGroupCount)}개`"
        value-color="var(--color-status-danger)"
        :subtitle="`${selectedRangeLabel} 위험등급 TG`"
      />
    </section>

    <!-- 로딩/에러 상태 -->
    <p v-if="isOverviewLoading" class="overview-tab__status">기간 통계를 불러오는 중입니다…</p>
    <p v-else-if="overviewError" class="overview-tab__status overview-tab__status--error">
      기간 통계를 불러오지 못했습니다.
      <button type="button" class="overview-tab__retry" @click="loadOverview">다시 시도</button>
    </p>

    <!-- Breadcrumb -->
    <nav class="overview-tab__breadcrumb">
      <button
        type="button"
        class="overview-tab__bc-item"
        :class="{ 'overview-tab__bc-item--link': level > 1 }"
        @click="level > 1 && goRoot()"
      >
        전체
      </button>
      <template v-if="level >= 2">
        <span class="overview-tab__bc-sep">›</span>
        <button
          type="button"
          class="overview-tab__bc-item"
          :class="{ 'overview-tab__bc-item--link': level > 2 }"
          @click="level > 2 && goProcess()"
        >
          {{ selectedProcess ? formatProcessLabel(selectedProcess.areaCode, selectedProcess.areaNameKo) : '' }}
        </button>
      </template>
      <template v-if="level === 3">
        <span class="overview-tab__bc-sep">›</span>
        <span class="overview-tab__bc-item overview-tab__bc-item--current">{{ selectedTg?.tgCode }}</span>
      </template>
    </nav>

    <!-- ── Level 1: 공정 테이블 ── -->
    <div v-if="level === 1" class="overview-tab__table-wrap">
      <table class="overview-tab__table">
        <thead>
          <tr>
            <th>공정</th>
            <th>TG 수</th>
            <th>장비 수</th>
            <th>기간 평균 가동률</th>
            <th>현재 대비</th>
            <th>평균 WIP</th>
            <th>최대 WIP</th>
            <th>위험 TG</th>
            <th>부담 TG</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="processRows.length === 0">
            <td colspan="9" class="overview-tab__empty">데이터 없음</td>
          </tr>
          <tr
            v-for="p in processRows"
            v-else
            :key="p.areaCode"
            class="overview-tab__row overview-tab__row--clickable"
            @click="selectProcess(p.areaCode)"
          >
            <td>
              <strong>{{ formatProcessLabel(p.areaCode, p.areaNameKo) }}</strong>
            </td>
            <td>{{ formatNumber(p.tgCount) }}</td>
            <td>{{ formatNumber(p.toolCount) }}대</td>
            <td>
              <div class="overview-tab__util">
                <span>{{ formatRatioPercent(p.avgUtilizationRate) }}</span>
                <span class="overview-tab__util-bar"><i :style="{ width: `${p.avgUtilizationRate * 100}%` }" /></span>
              </div>
            </td>
            <td>
              <span class="overview-tab__delta" :class="p.deltaUtilizationRate >= 0 ? 'delta--pos' : 'delta--neg'">
                {{ formatDeltaPercentPoint(p.deltaUtilizationRate) }}
              </span>
            </td>
            <td>{{ formatNumber(Math.round(p.avgWipCount)) }}</td>
            <td>{{ formatNumber(p.maxWipCount) }}</td>
            <td>
              <span v-if="p.riskTgCount > 0" class="overview-tab__risk-count">{{ p.riskTgCount }}개</span>
              <span v-else class="overview-tab__ok">—</span>
            </td>
            <td>{{ p.topBurdenToolGroupCode }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Level 2: TG 테이블 ── -->
    <div v-else-if="level === 2" class="overview-tab__table-wrap">
      <table class="overview-tab__table">
        <thead>
          <tr>
            <th>Tool Group</th>
            <th>장비 수</th>
            <th>기간 평균 가동률</th>
            <th>현재 대비</th>
            <th>평균 WIP</th>
            <th>최대 WIP</th>
            <th>위험도</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="tgRows.length === 0">
            <td colspan="7" class="overview-tab__empty">TG 없음</td>
          </tr>
          <tr
            v-for="tg in tgRows"
            v-else
            :key="tg.tgId"
            class="overview-tab__row overview-tab__row--clickable"
            @click="selectedTgId = tg.tgId"
          >
            <td>
              <strong>{{ tg.tgCode }}</strong>
              <span>{{ tg.tgName }}</span>
            </td>
            <td>
              <b class="overview-tab__count">{{ formatNumber(tg.toolCount) }}대</b>
              <span class="overview-tab__breakdown">
                <i class="tc--run">{{ tg.runToolCount }}</i> / <i class="tc--idle">{{ tg.idleToolCount }}</i> /
                <i class="tc--down">{{ tg.downToolCount }}</i>
              </span>
            </td>
            <td>
              <div class="overview-tab__util">
                <span>{{ formatRatioPercent(tg.avgUtilizationRate) }}</span>
                <span class="overview-tab__util-bar"><i :style="{ width: `${tg.avgUtilizationRate * 100}%` }" /></span>
              </div>
            </td>
            <td>
              <span class="overview-tab__delta" :class="tg.deltaUtilizationRate >= 0 ? 'delta--pos' : 'delta--neg'">
                {{ formatDeltaPercentPoint(tg.deltaUtilizationRate) }}
              </span>
            </td>
            <td>{{ formatNumber(Math.round(tg.avgWipCount)) }}</td>
            <td>{{ formatNumber(tg.maxWipCount) }}</td>
            <td>
              <BaseBadge :variant="riskGradeToLevel(tg.riskGrade)">{{ tg.riskGrade ?? '—' }}</BaseBadge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Level 3: 장비 테이블 ── -->
    <div v-else class="overview-tab__table-wrap">
      <table class="overview-tab__table">
        <thead>
          <tr>
            <th>Tool</th>
            <th>상태</th>
            <th>기간 평균 가동률</th>
            <th>현재 대비</th>
            <th>평균 OEE</th>
            <th>평균 Queue</th>
            <th>최대 Queue</th>
            <th>평균 Down</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="toolRows.length === 0">
            <td colspan="8" class="overview-tab__empty">장비 없음</td>
          </tr>
          <tr
            v-for="eq in toolRows"
            v-else
            :key="eq.toolId"
            class="overview-tab__row"
            :class="`overview-tab__row--${(eq.status ?? 'unknown').toLowerCase()}`"
          >
            <td>
              <strong>{{ eq.toolCode }}</strong>
              <span>{{ eq.toolName }}</span>
            </td>
            <td>
              <MesToolStatusBadge :status="eq.status" />
            </td>
            <td>
              <div class="overview-tab__util">
                <span>{{ formatRatioPercent(eq.avgUtilizationRate) }}</span>
                <span class="overview-tab__util-bar"><i :style="{ width: `${eq.avgUtilizationRate * 100}%` }" /></span>
              </div>
            </td>
            <td>
              <span class="overview-tab__delta" :class="eq.deltaUtilizationRate >= 0 ? 'delta--pos' : 'delta--neg'">
                {{ formatDeltaPercentPoint(eq.deltaUtilizationRate) }}
              </span>
            </td>
            <td>{{ formatRatioPercent(eq.avgOeeEstimate) }}</td>
            <td>{{ formatNumber(Number(eq.avgQueueLotCount.toFixed(1))) }}</td>
            <td>{{ formatNumber(eq.maxQueueLotCount) }}</td>
            <td>{{ formatRatioPercent(eq.avgDownRatio) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.overview-tab {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  font-size: var(--font-size-base);
}

/* KPI */
.overview-tab__range-bar {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-3);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.overview-tab__range-copy {
  display: grid;
  align-content: start;
  gap: 4px;
}

.overview-tab__range-copy strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.overview-tab__range-copy span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  line-height: 1.4;
}

.overview-tab__range-controls {
  display: flex;
  align-items: end;
  gap: var(--space-2);
  justify-content: start;
  flex-wrap: wrap;
  min-width: 0;
}

.overview-tab__control-group {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.overview-tab__range-options {
  display: inline-flex;
  gap: 2px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: 2px;
  flex-shrink: 0;
}

.overview-tab__range-btn {
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  padding: 6px 12px;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  transition:
    background 0.1s,
    color 0.1s;
}

.overview-tab__range-btn:hover {
  background: var(--color-state-hover);
  color: var(--color-fg);
}

.overview-tab__range-btn--active {
  background: var(--color-action-primary);
  color: var(--color-text-inverse);
}

.overview-tab__custom-range {
  display: flex;
  align-items: end;
  gap: var(--space-2);
  min-width: 0;
}

.overview-tab__custom-range label {
  display: grid;
  gap: 3px;
  min-width: 180px;
}

.overview-tab__custom-range label span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.overview-tab__custom-range input {
  height: 34px;
  box-sizing: border-box;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: 0 var(--space-2);
  color: var(--color-fg);
  font-size: var(--font-size-base);
  outline: none;
  min-width: 0;
}

.overview-tab__custom-range input:focus {
  border-color: var(--color-action-primary);
}

.overview-tab__apply-btn {
  height: 34px;
  border: var(--border-width-default) solid var(--color-action-primary);
  border-radius: var(--radius-md);
  background: var(--color-action-primary);
  padding: 0 var(--space-3);
  color: var(--color-text-inverse);
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.overview-tab__reset-btn {
  height: 34px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: 0 var(--space-3);
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.overview-tab__reset-btn:hover {
  border-color: var(--color-border-strong);
  color: var(--color-fg);
}

.overview-tab__apply-btn:hover {
  filter: brightness(0.96);
}

.overview-tab__range-error {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--color-status-danger);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.overview-tab__range-status {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border-top: var(--border-width-default) solid var(--color-border-subtle);
  padding-top: var(--space-2);
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

.overview-tab__range-status b {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-pill);
  background: var(--color-bg-surface);
  padding: 2px 10px;
  color: var(--color-fg);
  font-weight: var(--font-weight-bold);
}

.overview-tab__range-status small {
  margin-left: auto;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  white-space: nowrap;
}

.overview-tab__kpi {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

/* Breadcrumb */
.overview-tab__breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.overview-tab__bc-item {
  border: 0;
  background: transparent;
  padding: 2px 4px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

.overview-tab__bc-item--link {
  color: var(--color-action-primary);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.overview-tab__bc-item--link:hover {
  opacity: 0.8;
}

.overview-tab__bc-item--current {
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-bold);
}

.overview-tab__bc-sep {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

/* 테이블 공통 */
.overview-tab__table-wrap {
  overflow: auto;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  min-height: 480px;
}

.overview-tab__table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-bg-card);
}

.overview-tab__table th,
.overview-tab__table td {
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
  padding: 11px var(--space-3);
  color: var(--color-fg);
  font-size: var(--font-size-base);
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
}

.overview-tab__table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--color-bg-surface);
  color: var(--color-fg-muted);
  font-weight: var(--font-weight-bold);
}

/* 행 */
.overview-tab__row--clickable {
  cursor: pointer;
  transition: background 0.1s;
}

.overview-tab__row--clickable:hover {
  background: var(--color-state-hover);
}

.overview-tab__row--down {
  background: color-mix(in srgb, var(--color-status-down-soft) 45%, transparent);
}

.overview-tab__row--idle {
  background: color-mix(in srgb, var(--color-status-warning-soft) 30%, transparent);
}

/* 장비 수 분류 */
.overview-tab__count {
  display: block;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}

.overview-tab__breakdown {
  display: block;
  font-size: var(--font-size-base);
  color: var(--color-fg-muted);
}

.tc--run {
  color: var(--color-status-success);
  font-style: normal;
}
.tc--idle {
  color: var(--color-status-warning);
  font-style: normal;
}
.tc--down {
  color: var(--color-status-down);
  font-style: normal;
}

/* TG 첫번째 열 */
.overview-tab__table td:first-child strong {
  display: block;
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-bold);
}

.overview-tab__table td:first-child span {
  display: block;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

/* 가동률 바 */
.overview-tab__util {
  display: grid;
  gap: 3px;
  min-width: 88px;
}

.overview-tab__util-bar {
  height: 4px;
  border-radius: var(--radius-pill);
  background: var(--color-border-subtle);
  overflow: hidden;
}

.overview-tab__util-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-action-primary);
}

/* 위험 TG 카운트 */
.overview-tab__risk-count {
  color: var(--color-status-danger);
  font-weight: var(--font-weight-bold);
}

.overview-tab__ok {
  color: var(--color-fg-muted);
}

/* delta */
.overview-tab__delta {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-base);
  font-variant-numeric: tabular-nums;
}

.delta--pos {
  color: var(--color-status-success);
}
.delta--neg {
  color: var(--color-status-down);
}

.overview-tab__status {
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: var(--space-2) var(--space-3);
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}
.overview-tab__status--error {
  border-color: var(--color-status-danger);
  color: var(--color-status-danger);
}
.overview-tab__retry {
  border: var(--border-width-default) solid currentColor;
  border-radius: var(--radius-sm);
  background: transparent;
  padding: 2px 10px;
  color: inherit;
  cursor: pointer;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.overview-tab__empty {
  padding: var(--space-4);
  color: var(--color-fg-muted);
  text-align: center;
}

@media (max-width: 1100px) {
  .overview-tab__range-bar {
    grid-template-columns: 1fr;
  }

  .overview-tab__range-controls {
    align-items: stretch;
    flex-direction: column;
    justify-content: stretch;
  }

  .overview-tab__range-options {
    width: 100%;
    overflow-x: auto;
  }

  .overview-tab__kpi {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .overview-tab__custom-range {
    align-items: stretch;
    flex-direction: column;
  }

  .overview-tab__custom-range label {
    min-width: 0;
  }

  .overview-tab__apply-btn,
  .overview-tab__reset-btn {
    width: 100%;
  }

  .overview-tab__range-status {
    align-items: flex-start;
    flex-direction: column;
  }

  .overview-tab__range-status small {
    margin-left: 0;
  }

  .overview-tab__kpi {
    grid-template-columns: 1fr;
  }
}
</style>

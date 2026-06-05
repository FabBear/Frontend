<script setup lang="ts">
import { computed, ref } from 'vue';

import type {
  MachineEquipmentItem,
  MachineEquipmentStatus,
  MachineSummary,
  MachineToolGroupItem,
  MachineTrendPoint,
} from '@/types/machine';

import KpiCard from '@/components/base/KpiCard.vue';

import { formatNumber, formatRatioPercent } from '@/utils/format';

interface Props {
  summary: MachineSummary;
  toolGroups: MachineToolGroupItem[];
  overviewEquipments: MachineEquipmentItem[];
  trendsByToolId: Record<string, MachineTrendPoint[]>;
}

const props = defineProps<Props>();

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

// ── Level 1: 공정별 집계 ──────────────────────────────────────────────
function avg(vals: number[]): number {
  return vals.length === 0 ? 0 : vals.reduce((a, b) => a + b, 0) / vals.length;
}

interface ProcessRow {
  areaCode: string;
  areaNameKo: string;
  tgCount: number;
  toolCount: number;
  runCount: number;
  idleCount: number;
  downCount: number;
  avgUtilizationRate: number;
  totalQueueLot: number;
  riskTgCount: number;
}

const processRows = computed<ProcessRow[]>(() => {
  const map = new Map<string, { label: string; tgs: MachineToolGroupItem[] }>();
  props.toolGroups.forEach((tg) => {
    if (!map.has(tg.areaCode)) map.set(tg.areaCode, { label: tg.areaNameKo, tgs: [] });
    map.get(tg.areaCode)!.tgs.push(tg);
  });
  return [...map.entries()]
    .map(([areaCode, { label, tgs }]) => ({
      areaCode,
      areaNameKo: label,
      tgCount: tgs.length,
      toolCount: tgs.reduce((s, t) => s + t.toolCount, 0),
      runCount: tgs.reduce((s, t) => s + t.runToolCount, 0),
      idleCount: tgs.reduce((s, t) => s + t.idleToolCount, 0),
      downCount: tgs.reduce((s, t) => s + t.downToolCount, 0),
      avgUtilizationRate: avg(tgs.map((t) => t.utilizationRate)),
      totalQueueLot: tgs.reduce((s, t) => s + t.queueLotCount, 0),
      riskTgCount: tgs.filter((t) => t.riskGrade === 'CRITICAL' || t.riskGrade === 'HIGH').length,
    }))
    .sort((a, b) => b.riskTgCount - a.riskTgCount || b.downCount - a.downCount);
});

// ── Level 2: 선택 공정의 TG ───────────────────────────────────────────
const selectedProcess = computed(() => processRows.value.find((p) => p.areaCode === selectedProcessCode.value) ?? null);

const tgRows = computed(() =>
  props.toolGroups
    .filter((tg) => tg.areaCode === selectedProcessCode.value)
    .sort((a, b) => b.utilizationRate - a.utilizationRate)
);

// ── Level 3: 선택 TG의 장비 ──────────────────────────────────────────
const selectedTg = computed(() => props.toolGroups.find((tg) => tg.tgId === selectedTgId.value) ?? null);

const toolRows = computed(() =>
  props.overviewEquipments
    .filter((eq) => eq.tgId === selectedTgId.value)
    .sort((a, b) => b.anomalyScore - a.anomalyScore)
);

const anomalyMax = computed(() => Math.max(...toolRows.value.map((e) => e.anomalyScore), 0.01));

// ── 유틸 ──────────────────────────────────────────────────────────────
const RISK_COLOR: Record<string, string> = {
  CRITICAL: 'var(--color-risk-critical)',
  HIGH: 'var(--color-risk-high)',
  MEDIUM: 'var(--color-risk-medium)',
  LOW: 'var(--color-risk-low)',
};

const STATUS_LABEL: Record<MachineEquipmentStatus, string> = {
  RUN: 'RUN',
  IDLE: 'IDLE',
  DOWN: '정비',
};

const STATUS_CLASS: Record<MachineEquipmentStatus, string> = {
  RUN: 'status--run',
  IDLE: 'status--idle',
  DOWN: 'status--down',
};

function sparkline(toolId: string): string {
  const trends = props.trendsByToolId[toolId] ?? [];
  if (trends.length < 2) return '';
  const W = 44,
    H = 12;
  const vals = trends.map((t) => t.utilizationRate);
  const min = Math.min(...vals);
  const range = Math.max(...vals) - min || 0.01;
  return vals
    .map((v, i) => `${((i / (vals.length - 1)) * W).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`)
    .join(' ');
}
</script>

<template>
  <div class="overview-tab">
    <!-- KPI 요약 -->
    <section class="overview-tab__kpi">
      <KpiCard
        title="전체 장비"
        :value="`${formatNumber(summary.toolCount)}대`"
        :subtitle="`${formatNumber(summary.toolGroupCount)}개 Tool Group`"
      />
      <KpiCard
        title="위험 TG"
        :value="`${formatNumber(summary.riskToolGroupCount)}개`"
        value-color="var(--color-status-danger)"
        subtitle="CRITICAL · HIGH 등급"
      />
      <KpiCard
        title="평균 가동률"
        :value="formatRatioPercent(summary.avgUtilizationRate)"
        subtitle="전체 TG 기간 평균"
      />
      <KpiCard
        title="정비 장비"
        :value="`${formatNumber(summary.downEquipmentCount)}대`"
        value-color="var(--color-status-down)"
        subtitle="현재 비가동 상태"
      />
    </section>

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
          {{ selectedProcess?.areaNameKo }}
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
            <th>평균 가동률</th>
            <th>Queue Lot</th>
            <th>위험 TG</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="processRows.length === 0">
            <td colspan="6" class="overview-tab__empty">데이터 없음</td>
          </tr>
          <tr
            v-for="p in processRows"
            v-else
            :key="p.areaCode"
            class="overview-tab__row overview-tab__row--clickable"
            :class="{ 'overview-tab__row--danger': p.downCount > 0 }"
            @click="selectProcess(p.areaCode)"
          >
            <td>
              <strong>{{ p.areaNameKo }}</strong>
            </td>
            <td>{{ formatNumber(p.tgCount) }}</td>
            <td>
              <b class="overview-tab__count">{{ formatNumber(p.toolCount) }}대</b>
              <span class="overview-tab__breakdown">
                <i class="tc--run">{{ p.runCount }}</i> / <i class="tc--idle">{{ p.idleCount }}</i> /
                <i class="tc--down">{{ p.downCount }}</i>
              </span>
            </td>
            <td>
              <div class="overview-tab__util">
                <span>{{ formatRatioPercent(p.avgUtilizationRate) }}</span>
                <span class="overview-tab__util-bar"><i :style="{ width: `${p.avgUtilizationRate * 100}%` }" /></span>
              </div>
            </td>
            <td>{{ formatNumber(p.totalQueueLot) }}</td>
            <td>
              <span v-if="p.riskTgCount > 0" class="overview-tab__risk-count">{{ p.riskTgCount }}개</span>
              <span v-else class="overview-tab__ok">—</span>
            </td>
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
            <th>가동률</th>
            <th>Queue Lot</th>
            <th>병목 확률</th>
            <th>등급</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="tgRows.length === 0">
            <td colspan="6" class="overview-tab__empty">TG 없음</td>
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
                <span>{{ formatRatioPercent(tg.utilizationRate) }}</span>
                <span class="overview-tab__util-bar"><i :style="{ width: `${tg.utilizationRate * 100}%` }" /></span>
              </div>
            </td>
            <td>{{ formatNumber(tg.queueLotCount) }}</td>
            <td>{{ formatRatioPercent(tg.bottleneckProb) }}</td>
            <td>
              <span class="overview-tab__grade" :style="{ color: RISK_COLOR[tg.riskGrade] }">{{ tg.riskGrade }}</span>
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
            <th>가동률</th>
            <th>Δ가동률</th>
            <th>OEE</th>
            <th>Queue Lot</th>
            <th>Down 비율</th>
            <th>이상도</th>
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
            :class="`overview-tab__row--${eq.status.toLowerCase()}`"
          >
            <td>
              <strong>{{ eq.toolCode }}</strong>
              <span>{{ eq.toolName }}</span>
            </td>
            <td>
              <span class="overview-tab__status" :class="STATUS_CLASS[eq.status]">
                {{ STATUS_LABEL[eq.status] }}
              </span>
            </td>
            <td class="overview-tab__util-inline">
              <span>{{ formatRatioPercent(eq.utilizationRate) }}</span>
              <svg class="overview-tab__sparkline" viewBox="0 0 44 12" preserveAspectRatio="none" aria-hidden="true">
                <polyline
                  v-if="sparkline(eq.toolId)"
                  :points="sparkline(eq.toolId)"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linejoin="round"
                  stroke-linecap="round"
                />
              </svg>
            </td>
            <td>
              <span
                class="overview-tab__delta"
                :class="eq.utilizationRate - eq.baselineUtilizationRate >= 0 ? 'delta--pos' : 'delta--neg'"
              >
                {{ eq.utilizationRate - eq.baselineUtilizationRate >= 0 ? '+' : ''
                }}{{ ((eq.utilizationRate - eq.baselineUtilizationRate) * 100).toFixed(1) }}pp
              </span>
            </td>
            <td>{{ formatRatioPercent(eq.oeeEstimate) }}</td>
            <td>{{ formatNumber(eq.queueLotCount) }}</td>
            <td>{{ formatRatioPercent(eq.downRatio) }}</td>
            <td class="overview-tab__anomaly-cell">
              <span class="overview-tab__anomaly-bar">
                <i :style="{ width: `${(eq.anomalyScore / anomalyMax) * 100}%` }" />
              </span>
              <span>{{ eq.anomalyScore.toFixed(2) }}</span>
            </td>
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
}

/* KPI */
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
  font-size: var(--font-size-sm);
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
  color: var(--color-fg-subtle);
  font-size: var(--font-size-sm);
}

/* 테이블 공통 */
.overview-tab__table-wrap {
  overflow: auto;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
}

.overview-tab__table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-bg-card);
}

.overview-tab__table th,
.overview-tab__table td {
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
  padding: 10px var(--space-3);
  color: var(--color-fg);
  font-size: var(--font-size-xs);
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
  background: var(--color-bg-hover);
}

.overview-tab__row--danger td:first-child {
  border-left: 3px solid var(--color-status-down);
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
  font-size: var(--font-size-xs);
}

.overview-tab__breakdown {
  display: block;
  font-size: 10px;
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
  font-size: 10px;
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
  color: var(--color-fg-subtle);
}

/* 등급 */
.overview-tab__grade {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-xs);
}

/* 상태 배지 */
.overview-tab__status {
  display: inline-block;
  border-radius: var(--radius-pill);
  padding: 2px 8px;
  font-size: 10px;
  font-weight: var(--font-weight-bold);
}

.status--run {
  background: color-mix(in srgb, var(--color-status-success) 14%, transparent);
  color: var(--color-status-success);
}
.status--idle {
  background: color-mix(in srgb, var(--color-status-warning) 14%, transparent);
  color: var(--color-status-warning);
}
.status--down {
  background: var(--color-status-down-soft);
  color: var(--color-status-down);
}

/* Tool — 가동률 + sparkline */
.overview-tab__util-inline {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.overview-tab__sparkline {
  width: 44px;
  height: 12px;
  color: var(--color-chart-blue);
  flex-shrink: 0;
  opacity: 0.75;
}

.overview-tab__row--down .overview-tab__sparkline {
  color: var(--color-status-down);
}

/* delta */
.overview-tab__delta {
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-xs);
  font-variant-numeric: tabular-nums;
}

.delta--pos {
  color: var(--color-status-success);
}
.delta--neg {
  color: var(--color-status-down);
}

/* 이상도 */
.overview-tab__anomaly-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 72px;
}

.overview-tab__anomaly-bar {
  flex: 1;
  height: 4px;
  border-radius: var(--radius-pill);
  background: var(--color-border-subtle);
  overflow: hidden;
}

.overview-tab__anomaly-bar i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--color-risk-high);
  min-width: 2px;
}

.overview-tab__row--down .overview-tab__anomaly-bar i {
  background: var(--color-risk-critical);
}

.overview-tab__anomaly-cell > span:last-child {
  color: var(--color-fg-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.overview-tab__empty {
  padding: var(--space-4);
  color: var(--color-fg-muted);
  text-align: center;
}

@media (max-width: 1100px) {
  .overview-tab__kpi {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>

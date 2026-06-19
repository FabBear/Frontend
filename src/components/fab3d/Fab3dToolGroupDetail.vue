<script setup lang="ts">
import { RouterLink } from 'vue-router';

import { getProcessAreaDisplayCode, getProcessAreaNameKo } from '@/constants/processArea';
import { formatNumber } from '@/utils/format';

import type { Fab3dToolDetail, Fab3dToolGroup, ToolActivity } from '@/types/fab3d';

const props = defineProps<{
  selectedTg: Fab3dToolGroup;
  selectedTool: Fab3dToolDetail | null;
  toolActivity: ToolActivity | null;
  isLoadingActivity: boolean;
  activityLoadError: boolean;
  isSnapshotMode: boolean;
  selectedTgIsAnchor: boolean;
  selectedTgIsAffected: boolean;
  selectedTgDiffusionHop: number | null;
  snapshotCaseId: string | null;
  snapshotAnchorTgName: string | null;
  snapshotCompositeScore: number | null;
  snapshotImpactScore: number | null;
  snapshotAffectedCount: number | null;
  snapshotCtIncreaseMin: number | null;
  isLoadingRouteSteps: boolean;
  prevProcessAreas: string[];
  nextProcessAreas: string[];
  hasProcessFlow: boolean;
  selectedTgIsBuffer: boolean;
  visibleStatuses: Fab3dToolDetail['status'][];
  statusSummary: Record<Fab3dToolDetail['status'], number>;
  statusTotal: number;
  hasTools: boolean;
}>();

const emit = defineEmits<{
  (e: 'show-process-flow'): void;
  (e: 'close'): void;
}>();

function riskHex(risk: string | undefined) {
  if (risk === 'CRITICAL') return 'var(--color-risk-critical)';
  if (risk === 'HIGH') return 'var(--color-risk-high)';
  if (risk === 'MEDIUM') return 'var(--color-risk-medium)';
  return 'var(--color-risk-low)';
}
function riskLabel(risk: string | undefined) {
  if (risk === 'CRITICAL') return 'Critical';
  if (risk === 'HIGH') return 'High';
  if (risk === 'MEDIUM') return 'Medium';
  return 'Low';
}
function statusLabel(status: Fab3dToolDetail['status']) {
  switch (status) {
    case 'RUN': return '가동';
    case 'IDLE': return '대기';
    case 'SETUP': return '셋업';
    case 'DOWN': return '비가동';
    default: return status;
  }
}
function statusColor(status: Fab3dToolDetail['status']) {
  switch (status) {
    case 'RUN': return 'var(--color-status-success)';
    case 'IDLE': return 'var(--color-fg-muted)';
    case 'SETUP': return 'var(--color-status-warning)';
    case 'DOWN': return 'var(--color-status-danger)';
    default: return 'var(--color-fg-muted)';
  }
}
function formatAreaDisplay(areaCode: string): string {
  return `${getProcessAreaDisplayCode(areaCode)} · ${getProcessAreaNameKo(areaCode)}`;
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
    case 'LOADING': return '투입';
    case 'BATCH_START': return '배치 시작';
    case 'BATCH_MEMBER_START': return '배치 투입';
    case 'FINISH': return '완료';
    case 'BATCH_MEMBER_FINISH': return '배치 완료';
    case 'CQT_START': return 'CQT 진입';
    case 'CQT_END': return 'CQT 완료';
    case 'ARRIVAL': return '도착';
    case 'REWORK': return '재작업';
    case 'SCRAP': return '폐기';
    default: return type;
  }
}
</script>

<template>
  <div class="tgd__wrap">
    <!-- TG 기본 정보 -->
    <div class="tgd__name">{{ selectedTg.tgName }}</div>
    <div class="tgd__area">{{ formatAreaDisplay(selectedTg.areaCode) }}</div>
    <div class="tgd__risk" :style="{ color: riskHex(selectedTg.risk) }">
      ● {{ riskLabel(selectedTg.risk) }}
    </div>
    <dl class="tgd__kpis">
      <div v-if="selectedTg.compositeScore != null">
        <dt>병목 위험 점수</dt>
        <dd>{{ (selectedTg.compositeScore * 100).toFixed(0) }}</dd>
      </div>
      <div>
        <dt>가동률 (MES)</dt>
        <dd>{{ formatNumber(selectedTg.utilizationRate * 100) }}%</dd>
      </div>
      <div>
        <dt>WIP</dt>
        <dd>{{ formatNumber(selectedTg.wipCount) }} Lot</dd>
      </div>
      <div>
        <dt>대기 Lot</dt>
        <dd>{{ formatNumber(selectedTg.waitingLots) }}</dd>
      </div>
    </dl>

    <!-- 스냅샷 모드: 병목 탐지 정보 -->
    <section v-if="selectedTgIsAnchor" class="tgd__bnc tgd__bnc--anchor">
      <div class="tgd__bnc-label">병목 탐지 TG</div>
      <dl class="tgd__kpis">
        <div v-if="snapshotCompositeScore !== null">
          <dt>위험 점수</dt>
          <dd>{{ (snapshotCompositeScore * 100).toFixed(0) }}</dd>
        </div>
        <div v-if="snapshotImpactScore !== null">
          <dt>확산 영향</dt>
          <dd>{{ (snapshotImpactScore * 100).toFixed(0) }}</dd>
        </div>
        <div v-if="snapshotAffectedCount !== null">
          <dt>영향 TG</dt>
          <dd>{{ snapshotAffectedCount }}개</dd>
        </div>
        <div v-if="snapshotCtIncreaseMin !== null">
          <dt>CT 증가</dt>
          <dd>+{{ snapshotCtIncreaseMin }}분</dd>
        </div>
      </dl>
      <RouterLink
        v-if="snapshotCaseId"
        :to="{ name: 'bottleneckCenter', query: { caseId: snapshotCaseId } }"
        class="tgd__bnc-link"
        >AI 분석 보기 →</RouterLink
      >
    </section>
    <section v-else-if="selectedTgIsAffected" class="tgd__bnc tgd__bnc--affected">
      <div class="tgd__bnc-label">확산 영향 TG</div>
      <div v-if="selectedTgDiffusionHop !== null" class="tgd__bnc-hop">
        병목 TG로부터 {{ selectedTgDiffusionHop }}홉
      </div>
      <div class="tgd__bnc-anchor">병목: {{ snapshotAnchorTgName }}</div>
    </section>

    <!-- 공정 흐름 -->
    <section v-if="!selectedTgIsBuffer" class="tgd__flow">
      <div class="tgd__section-title">공정 흐름</div>
      <div v-if="isLoadingRouteSteps" class="tgd__flow-loading">조회 중…</div>
      <template v-else>
        <div v-if="prevProcessAreas.length" class="tgd__flow-row">
          <span class="tgd__flow-label tgd__flow-label--prev">이전</span>
          <span class="tgd__flow-chips">
            <span v-for="a in prevProcessAreas" :key="a" class="tgd__flow-chip tgd__flow-chip--prev">
              {{ formatAreaDisplay(a) }}
            </span>
          </span>
        </div>
        <div class="tgd__flow-row">
          <span class="tgd__flow-label tgd__flow-label--cur">현재</span>
          <span class="tgd__flow-chips">
            <span class="tgd__flow-chip tgd__flow-chip--cur">{{ formatAreaDisplay(selectedTg.areaCode) }}</span>
          </span>
        </div>
        <div v-if="nextProcessAreas.length" class="tgd__flow-row">
          <span class="tgd__flow-label tgd__flow-label--next">다음</span>
          <span class="tgd__flow-chips">
            <span v-for="a in nextProcessAreas" :key="a" class="tgd__flow-chip tgd__flow-chip--next">
              {{ formatAreaDisplay(a) }}
            </span>
          </span>
        </div>
        <button v-if="hasProcessFlow" type="button" class="tgd__flow-view-btn" @click="emit('show-process-flow')">
          공정 흐름 한눈에 보기
        </button>
        <p v-else class="tgd__flow-loading">연결된 공정 정보가 없습니다</p>
      </template>
    </section>

    <!-- 버퍼 상태 -->
    <section v-if="selectedTgIsBuffer" class="tgd__buffer">
      <div class="tgd__section-title">버퍼 상태 요약</div>
      <dl class="tgd__buffer-kpis">
        <div><dt>활성 슬롯</dt><dd>{{ statusSummary.RUN }}</dd></div>
        <div><dt>대기 슬롯</dt><dd>{{ statusSummary.IDLE }}</dd></div>
        <div><dt>총 슬롯</dt><dd>{{ selectedTg.toolCount }}</dd></div>
        <div><dt>대기 Lot</dt><dd>{{ formatNumber(selectedTg.waitingLots) }}</dd></div>
      </dl>
      <div class="tgd__tool-dist" aria-hidden="true">
        <span
          v-for="status in visibleStatuses"
          :key="status"
          :style="{
            width: `${((statusSummary[status] / statusTotal) * 100).toFixed(1)}%`,
            background: statusColor(status),
          }"
        />
      </div>
    </section>

    <!-- 선택 설비 상세 -->
    <section v-else class="tgd__tool-panel">
      <div class="tgd__section-title">선택 설비</div>
      <div v-if="selectedTool" class="tgd__selected-tool">
        <div class="tgd__selected-tool-hd">
          <strong>{{ selectedTool.toolCode }}</strong>
          <span :style="{ color: statusColor(selectedTool.status) }">{{ statusLabel(selectedTool.status) }}</span>
        </div>

        <div v-if="isLoadingActivity" class="tgd__act-loading">불러오는 중…</div>
        <div v-else-if="activityLoadError" class="tgd__act-error">활동 정보를 불러오지 못했습니다</div>

        <template v-else-if="toolActivity">
          <!-- DOWN 구분: PM vs BM -->
          <div
            v-if="toolActivity.currentState === 'DOWN'"
            class="tgd__act-down-badge"
            :class="{ 'tgd__act-down-badge--bm': toolActivity.rawState === 'DOWN_BM' }"
          >
            <span class="tgd__act-down-type" :style="{ color: downStateColor(toolActivity.rawState) }">
              {{ downStateLabel(toolActivity.rawState) }}
            </span>
            <span
              class="tgd__act-duration"
              :class="{ 'tgd__act-duration--alarm': isLongDown(toolActivity.stateDurationMin) }"
            >
              {{ formatDuration(toolActivity.stateDurationMin) }} 경과
            </span>
          </div>
          <div v-else class="tgd__act-duration" :style="{ color: statusColor(selectedTool.status) }">
            {{ formatDuration(toolActivity.stateDurationMin) }} 지속
          </div>

          <!-- DOWN 시작 시각 -->
          <div v-if="toolActivity.currentState === 'DOWN' && toolActivity.stateChangedAt" class="tgd__act-row">
            <span class="tgd__act-label">발생 시각</span>
            <span>{{ formatEventTime(toolActivity.stateChangedAt) }}</span>
          </div>
          <div v-if="toolActivity.currentState === 'DOWN' && toolActivity.reason" class="tgd__act-row">
            <span class="tgd__act-label">사유</span>
            <span>{{ toolActivity.reason }}</span>
          </div>
          <div v-if="toolActivity.setupName" class="tgd__act-row">
            <span class="tgd__act-label">공정 레시피</span>
            <span>{{ toolActivity.setupName }}</span>
          </div>
          <div class="tgd__act-row">
            <span class="tgd__act-label">
              {{ toolActivity.currentState === 'RUN' ? '처리 중 Lot' : '마지막 처리 Lot' }}
            </span>
            <span>
              {{ toolActivity.currentLotId ?? toolActivity.lastDispatchLotId ?? '없음' }}
              <em
                v-if="toolActivity.currentState !== 'RUN' && toolActivity.lastDispatchAt"
                class="tgd__act-lot-time"
              >
                {{ formatEventTime(toolActivity.lastDispatchAt) }} 투입
              </em>
            </span>
          </div>
          <div class="tgd__act-metrics">
            <span>대기 Lot <strong>{{ toolActivity.queueLotCount ?? selectedTool.queueLotCount }}</strong></span>
            <span>가동률 <strong>{{ formatNumber(selectedTool.utilizationRate * 100) }}%</strong></span>
            <span v-if="selectedTool.downRatio > 0">비가동 <strong>{{ formatNumber(selectedTool.downRatio * 100) }}%</strong></span>
            <span v-if="selectedTool.setupRatio > 0">셋업 <strong>{{ formatNumber(selectedTool.setupRatio * 100) }}%</strong></span>
          </div>
          <div v-if="toolActivity.recentEvents.length" class="tgd__act-events">
            <div class="tgd__act-label">최근 이벤트</div>
            <div
              v-for="ev in toolActivity.recentEvents.slice(0, 5)"
              :key="ev.eventTime + ev.eventType + (ev.lotId ?? '')"
              class="tgd__act-event-row"
            >
              <span class="tgd__act-event-time">{{ formatEventTime(ev.eventTime) }}</span>
              <span class="tgd__act-event-type" :style="{ color: eventTypeColor(ev.eventType) }">{{
                eventTypeLabel(ev.eventType)
              }}</span>
              <span class="tgd__act-event-lot">{{ ev.lotId }}</span>
            </div>
          </div>
        </template>

        <template v-else>
          <dl class="tgd__tool-kpis">
            <div><dt>가동률</dt><dd>{{ formatNumber(selectedTool.utilizationRate * 100) }}%</dd></div>
            <div v-if="selectedTool.queueLotCount > 0"><dt>대기 Lot</dt><dd>{{ selectedTool.queueLotCount }}</dd></div>
            <div v-if="selectedTool.setupRatio > 0"><dt>셋업</dt><dd>{{ formatNumber(selectedTool.setupRatio * 100) }}%</dd></div>
            <div v-if="selectedTool.downRatio > 0"><dt>비가동</dt><dd>{{ formatNumber(selectedTool.downRatio * 100) }}%</dd></div>
          </dl>
        </template>
      </div>
      <p v-else-if="!hasTools" class="tgd__empty-tool">
        해당 TG의 설비 상세 데이터가 없습니다.
      </p>
      <p v-else class="tgd__tool-hint">
        아래 <strong>설비 보드</strong>에서 설비를 선택하면 상세가 표시됩니다.
      </p>
    </section>
  </div>
</template>

<style scoped>
.tgd__wrap {
  display: contents;
}

/* TG 헤더 */
.tgd__name {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-strong);
  margin-bottom: 3px;
  line-height: 1.25;
}
.tgd__area {
  font-size: var(--font-size-sm);
  color: var(--color-muted);
  margin-bottom: 6px;
  line-height: 1.4;
}
.tgd__risk {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  margin-bottom: 12px;
}

/* KPI 그리드 */
.tgd__kpis {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  margin: 0 0 var(--space-3);
}
.tgd__kpis div {
  min-width: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
}
.tgd__kpis dt {
  font-size: var(--font-size-xs);
  color: var(--color-muted);
  margin-bottom: 4px;
}
.tgd__kpis dd {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-strong);
  overflow-wrap: anywhere;
  line-height: 1.2;
}

/* 병목 탐지 / 영향 섹션 */
.tgd__bnc {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.tgd__bnc--anchor {
  background: color-mix(in srgb, var(--color-risk-critical) 10%, transparent);
  border-left: 3px solid var(--color-risk-critical);
}
.tgd__bnc--affected {
  background: color-mix(in srgb, var(--color-risk-high) 10%, transparent);
  border-left: 3px solid var(--color-risk-high);
}
.tgd__bnc-label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--f-hint);
}
.tgd__bnc--anchor .tgd__bnc-label {
  color: var(--color-risk-critical);
}
.tgd__bnc--affected .tgd__bnc-label {
  color: var(--color-risk-high);
}
.tgd__bnc-hop {
  font-size: var(--font-size-sm);
  color: var(--f-body);
}
.tgd__bnc-anchor {
  font-size: var(--font-size-xs);
  color: var(--f-hint);
}
.tgd__bnc-link {
  font-size: var(--font-size-xs);
  color: var(--color-action-primary);
  text-decoration: none;
  align-self: flex-start;
}
.tgd__bnc-link:hover {
  text-decoration: underline;
}

/* 섹션 공통 제목 */
.tgd__section-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 11px;
}

/* 공정 흐름 */
.tgd__flow {
  padding-top: 12px;
  border-top: 1px solid var(--color-border-subtle);
  display: grid;
  gap: 8px;
}
.tgd__flow-loading {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-muted);
}
.tgd__flow-row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
}
.tgd__flow-label {
  font-size: var(--font-size-xs);
  font-weight: 800;
  letter-spacing: 0.02em;
}
.tgd__flow-label--prev { color: var(--color-chart-blue); }
.tgd__flow-label--cur  { color: var(--color-action-primary); }
.tgd__flow-label--next { color: var(--color-risk-high); }
.tgd__flow-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  min-width: 0;
}
.tgd__flow-chip {
  padding: 3px 9px;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-weight: 600;
  white-space: nowrap;
}
.tgd__flow-chip--prev {
  background: color-mix(in srgb, var(--color-chart-blue) 14%, transparent);
  color: var(--color-chart-blue);
}
.tgd__flow-chip--cur {
  background: color-mix(in srgb, var(--color-action-primary) 15%, transparent);
  color: var(--color-action-primary);
  font-weight: 800;
}
.tgd__flow-chip--next {
  background: color-mix(in srgb, var(--color-risk-high) 14%, transparent);
  color: var(--color-risk-high);
}
.tgd__flow-view-btn {
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
.tgd__flow-view-btn:hover,
.tgd__flow-view-btn:focus-visible {
  background: color-mix(in srgb, var(--color-action-primary) 22%, transparent);
  outline: none;
}

/* 버퍼 패널 */
.tgd__buffer {
  display: grid;
  gap: 9px;
  margin-top: 12px;
}
.tgd__buffer-kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}
.tgd__buffer-kpis div {
  min-width: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
}
.tgd__buffer-kpis dt {
  color: var(--color-muted);
  font-size: var(--font-size-xs);
  margin-bottom: 4px;
}
.tgd__buffer-kpis dd {
  margin: 0;
  color: var(--color-text-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
}
.tgd__tool-dist {
  display: flex;
  height: 8px;
  overflow: hidden;
  background: var(--f-bar-track);
  border-radius: 4px;
}

/* 선택 설비 */
.tgd__tool-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.tgd__selected-tool {
  display: grid;
  gap: 8px;
  padding: var(--space-3);
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 26%, var(--color-border-default));
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  box-shadow: var(--shadow-sm);
}
.tgd__selected-tool-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.tgd__selected-tool-hd strong {
  color: var(--color-text-strong);
  font-size: var(--font-size-sm);
  font-weight: 800;
  overflow-wrap: anywhere;
}
.tgd__selected-tool-hd span {
  font-size: var(--font-size-sm);
  font-weight: 800;
}
.tgd__tool-kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
  margin: 0;
}
.tgd__tool-kpis dt {
  color: var(--color-muted);
  font-size: var(--font-size-xs);
}
.tgd__tool-kpis dd {
  margin: 0;
  color: var(--color-text-strong);
  font-size: var(--font-size-md);
  font-weight: 800;
}

/* Activity 카드 */
.tgd__act-loading {
  font-size: var(--font-size-xs);
  color: var(--color-muted);
  padding: 4px 0;
}
.tgd__act-error {
  font-size: var(--font-size-xs);
  color: var(--color-status-danger);
  padding: 4px 0;
}
.tgd__act-down-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--color-status-warning) 10%, var(--f-bar-track));
  border: 1px solid color-mix(in srgb, var(--color-status-warning) 30%, transparent);
}
.tgd__act-down-badge--bm {
  background: color-mix(in srgb, var(--color-status-danger) 10%, var(--f-bar-track));
  border-color: color-mix(in srgb, var(--color-status-danger) 30%, transparent);
}
.tgd__act-down-type {
  font-size: var(--font-size-sm);
  font-weight: 800;
}
.tgd__act-duration {
  font-size: var(--font-size-sm);
  font-weight: 800;
  margin-bottom: 2px;
}
.tgd__act-duration--alarm {
  color: var(--color-status-danger) !important;
  animation: act-blink 1.6s ease-in-out infinite;
}
@keyframes act-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
.tgd__act-row {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 6px 8px;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  line-height: 1.5;
}
.tgd__act-label {
  color: var(--color-muted);
  min-width: 0;
  font-size: var(--font-size-sm);
  font-weight: 700;
  padding-top: 1px;
}
.tgd__act-row > span:last-child {
  min-width: 0;
  overflow-wrap: anywhere;
}
.tgd__act-lot-time {
  display: block;
  font-style: normal;
  color: var(--color-muted);
  font-size: var(--font-size-xs);
}
.tgd__act-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  font-size: var(--font-size-xs);
  color: var(--color-muted);
  padding: 4px 0 2px;
}
.tgd__act-metrics span {
  min-width: 0;
  padding: 6px 9px;
  border: 1px solid var(--color-border-default);
  border-radius: 999px;
  background: var(--color-bg-card);
  white-space: nowrap;
}
.tgd__act-metrics strong {
  color: var(--color-text-strong);
  font-weight: 800;
}
.tgd__act-events {
  display: grid;
  gap: 3px;
  padding-top: 4px;
  border-top: 1px solid var(--color-border-subtle);
}
.tgd__act-event-row {
  display: grid;
  grid-template-columns: minmax(64px, 0.8fr) minmax(58px, 0.75fr) minmax(0, 1.4fr);
  gap: 6px;
  font-size: var(--font-size-xs);
  color: var(--color-text);
  overflow: hidden;
}
.tgd__act-event-time {
  color: var(--color-muted);
}
.tgd__act-event-type {
  min-width: 0;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tgd__act-event-lot {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--f-muted);
}
.tgd__empty-tool {
  margin: 0;
  color: var(--color-muted);
  font-size: var(--font-size-sm);
  line-height: 1.45;
}
.tgd__tool-hint {
  margin: 0;
  padding: 14px 12px;
  text-align: center;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  color: var(--color-muted);
  border: 1px dashed var(--color-border-default);
  border-radius: var(--radius-lg);
}
.tgd__tool-hint strong {
  color: var(--color-text-strong);
}
</style>

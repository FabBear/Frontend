<script setup lang="ts">
import { ref } from 'vue';

import type { Fab3dToolDetail, Fab3dToolGroup } from '@/types/fab3d';

const props = defineProps<{
  selectedTg: Fab3dToolGroup;
  tools: Fab3dToolDetail[];        // filtered (selectedTgHeatmapTools)
  allToolCount: number;            // selectedTgAllTools.length
  statusSummary: Record<string, number>;
  statusFilter: string;
  visibleStatuses: Fab3dToolDetail['status'][];
  selectedToolId: string | null;
  isSnapshotMode: boolean;
  isDark: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-tool', tool: Fab3dToolDetail): void;
  (e: 'filter', status: Fab3dToolDetail['status']): void;
  (e: 'close'): void;
}>();

const isCollapsed = ref(false);

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
function statusIcon(status: Fab3dToolDetail['status']): string {
  switch (status) {
    case 'RUN': return '▶';
    case 'SETUP': return '⚙';
    case 'DOWN': return '✕';
    case 'IDLE': default: return '⏸';
  }
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
function cellColor(tool: Fab3dToolDetail): string {
  if (tool.status !== 'RUN') {
    return props.isDark ? 'rgba(82,92,108,0.68)' : 'rgba(150,160,175,0.6)';
  }
  const base = riskHex(props.selectedTg.risk);
  const u = tool.utilizationRate;
  const alpha = u >= 0.85 ? 1 : u >= 0.7 ? 0.65 : 0.4;
  return `color-mix(in srgb, ${base} ${Math.round(alpha * 100)}%, ${props.isDark ? '#1e2330' : '#f0f2f5'})`;
}
</script>

<template>
  <div class="tb__board" :class="{ 'tb__board--collapsed': isCollapsed }">
    <div class="tb__hd">
      <div>
        <div class="tb__name">{{ selectedTg.tgName }} · 설비 {{ allToolCount }}대</div>
        <div class="tb__sub">
          <span :style="{ color: riskHex(selectedTg.risk) }">● {{ riskLabel(selectedTg.risk) }}</span>
          · {{ isSnapshotMode ? '감지 당시' : '실시간' }}
        </div>
      </div>
      <div class="tb__actions">
        <button class="tb__btn-icon" :title="isCollapsed ? '펼치기' : '접기'" @click="isCollapsed = !isCollapsed">
          {{ isCollapsed ? '+' : '−' }}
        </button>
        <button class="tb__btn-icon" title="닫기" @click="emit('close')">✕</button>
      </div>
    </div>

    <!-- 상태 필터칩 -->
    <div v-show="!isCollapsed" class="tb__filters">
      <button
        v-for="status in visibleStatuses"
        :key="status"
        type="button"
        class="tb__chip"
        :class="{ 'tb__chip--active': statusFilter === status }"
        @click="emit('filter', status)"
      >
        <span class="tb__chip-ic">{{ statusIcon(status) }}</span>
        <span>{{ statusLabel(status) }}</span>
        <strong>{{ statusSummary[status] }}</strong>
      </button>
    </div>

    <!-- 설비 셀 그리드 -->
    <div v-show="!isCollapsed" class="tb__grid">
      <button
        v-for="t in tools"
        :key="t.toolId"
        class="tb__cell"
        :class="{ 'tb__cell--active': selectedToolId === t.toolId }"
        type="button"
        :style="{ background: cellColor(t) }"
        :title="`${t.toolCode} · ${statusLabel(t.status)} · 가동률 ${(t.utilizationRate * 100).toFixed(0)}%`"
        @click="emit('select-tool', t)"
      >
        <span class="tb__cell-top">
          <span class="tb__cell-st">{{ statusIcon(t.status) }}</span>
          <span class="tb__cell-id">{{ t.toolCode.split('#').at(-1) ?? t.toolCode }}</span>
        </span>
        <span class="tb__cell-pct">{{ (t.utilizationRate * 100).toFixed(0) }}%</span>
      </button>
      <p v-if="!tools.length" class="tb__empty">
        <strong>{{ statusLabel(statusFilter as Fab3dToolDetail['status']) }}</strong> 상태 설비가 없습니다
      </p>
    </div>

    <div v-show="!isCollapsed" class="tb__note">
      셀 색 = TG 병목 위험 등급 색상 · 명도 = 가동률 높을수록 진함 · 아이콘 = 상태 · 숫자 = 가동률%
    </div>
  </div>
</template>

<style scoped>
.tb__board {
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
:global(.fab3d--dark) .tb__board {
  box-shadow: 0 10px 36px rgba(0, 0, 0, 0.52);
}
.tb__board--collapsed {
  width: min(56%, 460px);
  padding-bottom: 14px;
}

.tb__hd {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.tb__board--collapsed .tb__hd {
  margin-bottom: 0;
}
.tb__name {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--f-text-strong);
  line-height: 1.3;
}
.tb__sub {
  font-size: var(--font-size-xs);
  color: var(--f-muted);
  margin-top: 2px;
}
.tb__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.tb__btn-icon {
  background: none;
  border: none;
  color: var(--f-hint);
  cursor: pointer;
  font-size: 17px;
  padding: 0 4px;
  line-height: 1;
  transition: color 0.15s;
}
.tb__btn-icon:hover {
  color: var(--f-text-strong);
}

/* 필터칩 */
.tb__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.tb__chip {
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
  transition: background 0.15s, border-color 0.15s;
}
.tb__chip:hover {
  background: var(--f-bar-track);
}
.tb__chip--active {
  border-color: var(--color-action-primary);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
}
.tb__chip-ic {
  font-size: 11px;
  line-height: 1;
  color: var(--f-muted);
  flex-shrink: 0;
}
.tb__chip--active .tb__chip-ic {
  color: var(--color-action-primary);
}
.tb__chip strong {
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

/* 설비 그리드 */
.tb__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 10px;
  overflow-y: auto;
  overscroll-behavior: contain;
  align-content: flex-start;
}
.tb__empty {
  margin: 6px 2px;
  font-size: var(--font-size-sm);
  color: var(--f-muted);
}
.tb__empty strong {
  color: var(--f-text-strong);
}

/* 설비 셀 */
.tb__cell {
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
  transition: filter 0.12s, outline-color 0.12s;
}
:global(.fab3d--dark) .tb__cell {
  border-color: rgba(255, 255, 255, 0.07);
}
.tb__cell:hover,
.tb__cell:focus-visible,
.tb__cell--active {
  filter: brightness(1.12);
  z-index: 2;
  outline: 2px solid var(--color-action-primary);
  outline-offset: -1px;
}
.tb__cell-top {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
.tb__cell-st {
  font-size: 10px;
  line-height: 1;
}
.tb__cell-id {
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}
.tb__cell-pct {
  font-size: 14px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}
.tb__note {
  font-size: var(--font-size-xs);
  color: var(--f-muted);
  line-height: 1.4;
}
</style>

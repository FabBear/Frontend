<script setup lang="ts">
import { getProcessAreaDisplayCode, getProcessAreaNameKo } from '@/constants/processArea';
import type { Fab3dArea, Fab3dRisk } from '@/types/fab3d';

type RiskGrade = 'critical' | 'high' | 'medium' | 'low';

interface GradeItem {
  key: RiskGrade;
  label: string;
  shortLabel: string;
  count: number;
  color: string;
}

const GRADE_META: Array<Omit<GradeItem, 'count'>> = [
  { key: 'critical', label: 'Critical', shortLabel: 'C', color: 'var(--color-risk-critical)' },
  { key: 'high',     label: 'High',     shortLabel: 'H', color: 'var(--color-risk-high)' },
  { key: 'medium',   label: 'Medium',   shortLabel: 'M', color: 'var(--color-risk-medium)' },
  { key: 'low',      label: 'Low',      shortLabel: 'L', color: 'var(--color-risk-low)' },
];

const props = defineProps<{
  areas: Fab3dArea[];
  summary: { total: number; critical: number; high: number; medium: number; low: number };
  summaryItems: GradeItem[];
}>();

const emit = defineEmits<{
  (e: 'zoom-to-area', areaCode: string): void;
}>();

function riskToGrade(risk: Fab3dRisk | undefined): RiskGrade {
  return (risk?.toLowerCase() ?? 'low') as RiskGrade;
}

function areaGradeDistribution(area: Fab3dArea): GradeItem[] {
  const counts: Record<RiskGrade, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  area.toolGroups.forEach((tg) => {
    counts[riskToGrade(tg.risk)] += 1;
  });
  return GRADE_META.map((item) => ({ ...item, count: counts[item.key] })).filter((item) => item.count > 0);
}

function formatAreaDisplay(areaCode: string): string {
  return `${getProcessAreaDisplayCode(areaCode)} · ${getProcessAreaNameKo(areaCode)}`;
}
</script>

<template>
  <div class="sp__wrap">
    <!-- FAB 현황 -->
    <div class="sp__section">
      <div class="sp__title">FAB 현황 · 병목 위험 기준 · TG {{ summary.total }}개</div>
      <div v-for="item in summaryItems" :key="item.key" class="sp__sum-row">
        <span><i class="sp__dot" :style="{ background: item.color }" />{{ item.label }}</span>
        <strong :style="{ color: item.color }">{{ item.count }}개</strong>
      </div>
    </div>

    <!-- 구역별 현황 -->
    <div class="sp__section sp__section--grow">
      <div class="sp__title">구역별 현황</div>
      <button
        v-for="area in areas"
        :key="area.areaCode"
        class="sp__area-row"
        type="button"
        @click="emit('zoom-to-area', area.areaCode)"
      >
        <span class="sp__area-hd">
          <span class="sp__area-name">{{ formatAreaDisplay(area.areaCode) }}</span>
          <span class="sp__area-count">{{ area.toolGroups.length }} TG</span>
        </span>
        <span class="sp__area-dist">
          <span
            v-for="item in areaGradeDistribution(area)"
            :key="item.key"
            class="sp__area-chip"
            :style="{ color: item.color }"
          >
            {{ item.shortLabel }}{{ item.count }}
          </span>
        </span>
        <span class="sp__area-bar-track" aria-hidden="true">
          <span
            v-for="item in areaGradeDistribution(area)"
            :key="item.key"
            class="sp__area-bar-fill"
            :style="{
              width: `${((item.count / Math.max(area.toolGroups.length, 1)) * 100).toFixed(1)}%`,
              background: item.color,
            }"
          />
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.sp__wrap {
  display: contents;
}

.sp__section {
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--f-section-bdr);
}

.sp__section--grow {
  flex: 1;
  overflow-y: auto;
  border-bottom: none;
}

.sp__title {
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--f-title-label);
  margin-bottom: 8px;
}

.sp__sum-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-sm);
  color: var(--color-text);
  line-height: 2.1;
}
.sp__sum-row span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}
.sp__sum-row strong {
  font-weight: 700;
}
.sp__dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 12%, transparent);
}

/* Area rows */
.sp__area-row {
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
.sp__area-row:hover,
.sp__area-row:focus-visible {
  background: var(--f-bar-track);
  outline: none;
}
.sp__area-hd {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 7px;
}
.sp__area-name {
  font-size: var(--font-size-sm);
  font-weight: 700;
  color: var(--color-text-strong);
  line-height: 1.3;
}
.sp__area-count {
  font-size: var(--font-size-xs);
  color: var(--color-muted);
  white-space: nowrap;
}
.sp__area-dist {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.sp__area-chip {
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
.sp__area-bar-track {
  grid-column: 1 / -1;
  display: flex;
  width: 100%;
  height: 7px;
  background: var(--f-bar-track);
  border-radius: 999px;
  overflow: hidden;
}
.sp__area-bar-fill {
  height: 100%;
  min-width: 2px;
}
</style>

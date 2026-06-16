<script setup lang="ts">
import { computed, ref } from 'vue';

import { getProcessAreaDisplayCode, getProcessAreaNameKo } from '@/constants/processArea';
import {
  PROCESS_RISK_GRADES,
  PROCESS_RISK_META,
  type ProcessRiskGrade,
  getProcessFilterButtonStyle,
} from '@/constants/processRisk';

import type { DashboardProcessAreaData, DashboardProcessToolGroupData } from '@/types/dashboard';

import ProcessMapToolbar from '@/components/dashboard/ProcessMapToolbar.vue';

interface Props {
  areas: DashboardProcessAreaData[];
  selectedAreaCode?: string | null;
  metricMode?: 'utilization' | 'bottleneck';
}

const props = withDefaults(defineProps<Props>(), {
  selectedAreaCode: null,
  metricMode: 'utilization',
});

const emit = defineEmits<{
  selectArea: [areaCode: string];
  selectToolGroup: [tgId: string, areaCode: string];
}>();

const activeGrades = ref<Set<ProcessRiskGrade>>(new Set(['dc', 'dr']));
const localSelectedAreaCode = ref<string | null>(null);
const currentSelectedAreaCode = computed(() => props.selectedAreaCode ?? localSelectedAreaCode.value);
const metricHint = computed(() =>
  props.metricMode === 'bottleneck'
    ? '병목 위험 점수 기준 · 검출 케이스만 상위 등급'
    : '가동률 기준 · Critical ≥90% · High ≥85% · Medium ≥70%'
);
const mapTitle = computed(() => (props.metricMode === 'bottleneck' ? '병목 탐지 맵' : '공정 상태맵'));
const metricLabel = computed(() => (props.metricMode === 'bottleneck' ? '병목 위험 점수' : '가동률'));
function formatMetric(value: number | null): string {
  if (value === null) return '-';
  // 병목: 0~100 위험 점수(% 아님) / 가동률: 백분율
  return props.metricMode === 'bottleneck' ? `${Math.round(value * 100)}` : `${(value * 100).toFixed(0)}%`;
}
const gradeCounts = computed<Record<ProcessRiskGrade, number>>(() => {
  const counts = Object.fromEntries(PROCESS_RISK_GRADES.map((grade) => [grade, 0])) as Record<ProcessRiskGrade, number>;

  for (const area of props.areas) {
    for (const tg of area.toolGroups) {
      counts[getTgRiskGrade(tg)] += 1;
    }
  }

  return counts;
});

function handleToggleGrade(grade: ProcessRiskGrade) {
  const next = new Set(activeGrades.value);
  if (next.has(grade)) {
    if (next.size <= 1) return;
    next.delete(grade);
  } else {
    next.add(grade);
  }
  activeGrades.value = next;
}

function handleSelectArea(areaCode: string) {
  localSelectedAreaCode.value = localSelectedAreaCode.value === areaCode ? null : areaCode;
  emit('selectArea', areaCode);
}

function handleSelectToolGroup(tgId: string, areaCode: string) {
  localSelectedAreaCode.value = areaCode;
  emit('selectToolGroup', tgId, areaCode);
}

function getTgRiskGrade(tg: DashboardProcessToolGroupData): ProcessRiskGrade {
  if (tg.riskLevel === 'critical') return 'dc';
  if (tg.riskLevel === 'high') return 'dr';
  if (tg.riskLevel === 'medium') return 'dy';
  return 'dg';
}

function getTgMetricValue(tg: DashboardProcessToolGroupData): number | null {
  // 병목: riskScore(검출된 것만 존재, 없으면 null=미표시) / 가동률: 항상 존재
  return props.metricMode === 'bottleneck' ? tg.riskScore : tg.utilizationRate;
}

function getAreaRiskGrade(toolGroups: DashboardProcessToolGroupData[]): ProcessRiskGrade | null {
  if (toolGroups.length === 0) return null;

  return [...toolGroups]
    .map(getTgRiskGrade)
    .sort((a, b) => PROCESS_RISK_GRADES.indexOf(a) - PROCESS_RISK_GRADES.indexOf(b))[0];
}

const processedAreas = computed(() =>
  props.areas.map((area) => {
    const isSelected = currentSelectedAreaCode.value === area.areaCode;
    const hasSelection = !!currentSelectedAreaCode.value;
    const visibleTgs = area.toolGroups
      .filter((tg) => activeGrades.value.has(getTgRiskGrade(tg)))
      .sort((a, b) => {
        const riskDiff =
          PROCESS_RISK_GRADES.indexOf(getTgRiskGrade(a)) - PROCESS_RISK_GRADES.indexOf(getTgRiskGrade(b));
        return riskDiff !== 0 ? riskDiff : b.utilizationRate - a.utilizationRate;
      });
    const scoredValues = visibleTgs.map(getTgMetricValue).filter((v): v is number => v !== null);
    const metricValue = scoredValues.length ? Math.max(...scoredValues) : null;
    const areaRiskGrade = getAreaRiskGrade(visibleTgs);
    const colors =
      areaRiskGrade === null
        ? {
            background: 'var(--color-bg-subtle)',
            border: 'var(--border-width-default) solid var(--color-border-default)',
            color: 'var(--color-fg-muted)',
          }
        : {
            background: PROCESS_RISK_META[areaRiskGrade].bg,
            border: `var(--border-width-default) solid ${PROCESS_RISK_META[areaRiskGrade].borderColor}`,
            color: PROCESS_RISK_META[areaRiskGrade].color,
          };

    return {
      area,
      metricValue,
      areaRiskGrade,
      isSelected,
      isDimmed: hasSelection && !isSelected,
      displayCode: getProcessAreaDisplayCode(area.areaCode),
      nameKo: getProcessAreaNameKo(area.areaCode),
      btnStyle: {
        ...colors,
        outline: isSelected ? `2px solid ${colors.color}` : 'none',
        outlineOffset: isSelected ? '2px' : '0',
      },
      visibleTgs,
      totalTgCount: area.totalTgCount,
    };
  })
);
</script>

<template>
  <section class="process-map" aria-labelledby="pm-title">
    <div class="process-map__header">
      <h2 id="pm-title" class="process-map__title">{{ mapTitle }}</h2>
      <p class="process-map__hint">{{ metricHint }}</p>
    </div>

    <div class="process-map__card">
      <ProcessMapToolbar
        class="process-map__toolbar"
        :active-grades="activeGrades"
        :grade-counts="gradeCounts"
        :show-label="false"
        @toggle-grade="handleToggleGrade"
      />

      <div class="process-map__grid">
        <article
          v-for="item in processedAreas"
          :key="item.area.areaId"
          class="process-map__area"
          :class="{ 'process-map__area--dimmed': item.isDimmed }"
        >
          <button
            class="process-map__process-btn"
            :class="{ 'process-map__process-btn--selected': item.isSelected }"
            type="button"
            :style="item.btnStyle"
            :aria-label="`${item.area.areaCode} (${item.nameKo}) ${metricLabel} ${formatMetric(item.metricValue)}`"
            @click="handleSelectArea(item.area.areaCode)"
          >
            <span
              v-if="item.areaRiskGrade"
              class="process-map__risk-chip"
              :style="getProcessFilterButtonStyle(item.areaRiskGrade, true)"
            >
              {{ PROCESS_RISK_META[item.areaRiskGrade].label }}
            </span>
            <span v-else class="process-map__risk-chip process-map__risk-chip--empty">-</span>
            <strong>{{ item.nameKo }}</strong>
            <span>{{ item.displayCode }}</span>
            <span>{{ formatMetric(item.metricValue) }}</span>
          </button>

          <div class="process-map__tg-col">
            <p class="process-map__tg-count">{{ item.visibleTgs.length }}/{{ item.totalTgCount }} TG</p>
            <div class="process-map__tg-list">
              <button
                v-for="tg in item.visibleTgs"
                :key="tg.tgId"
                class="process-map__tg-chip"
                type="button"
                :title="`${tg.tgCode} · ${tg.riskGrade} · ${metricLabel} ${formatMetric(getTgMetricValue(tg))}`"
                :aria-label="`${tg.tgName} ${metricLabel} ${formatMetric(getTgMetricValue(tg))} 상세 보기`"
                @click="handleSelectToolGroup(tg.tgId, item.area.areaCode)"
              >
                <i
                  class="process-map__tg-dot"
                  :class="`process-map__tg-dot--${getTgRiskGrade(tg)}`"
                  aria-hidden="true"
                />
                {{ tg.tgName }}
              </button>
              <span v-if="item.visibleTgs.length === 0" class="process-map__tg-empty"> 해당 등급 없음 </span>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.process-map {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: var(--space-2);
  min-width: 0;
  min-height: 0;
}

.process-map__header {
  display: flex;
  gap: var(--space-2);
  justify-content: space-between;
}

.process-map__title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.process-map__hint {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}

.process-map__card {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 10px;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: 12px;
  box-shadow: var(--shadow-sm);
}

.process-map__toolbar {
  justify-content: flex-end;
}

.process-map__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(300px, 1fr));
  grid-template-rows: repeat(4, minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: 10px;
  min-width: 0;
  min-height: 0;
}

.process-map__area {
  display: grid;
  grid-template-columns: 9rem minmax(0, 1fr);
  align-items: stretch;
  min-width: 0;
  gap: var(--space-2);
  border-radius: var(--radius-md);
  transition: opacity var(--transition-fast);
}

.process-map__area--dimmed {
  opacity: 0.35;
}

.process-map__process-btn {
  width: 100%;
  min-height: 0;
  border-radius: var(--radius-md);
  padding: 8px var(--space-1);
  display: grid;
  grid-template-rows: auto auto minmax(0, auto) auto;
  place-content: center;
  gap: 4px;
  text-align: center;
  cursor: pointer;
  transition:
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
  overflow: hidden;
}

.process-map__process-btn:hover,
.process-map__process-btn:focus-visible {
  transform: translateY(-2px);
  box-shadow: var(--shadow-panel);
  outline: none;
}

.process-map__process-btn--selected {
  transform: translateY(-2px);
  box-shadow: var(--shadow-panel);
}

.process-map__process-btn strong {
  display: block;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}

.process-map__risk-chip {
  justify-self: center;
  border: var(--border-width-default) solid;
  border-radius: var(--radius-pill);
  padding: 1px var(--space-2);
  color: var(--color-fg-strong) !important;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}

.process-map__risk-chip--empty {
  border-color: var(--color-border-default);
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted) !important;
}

.process-map__process-btn span {
  display: block;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-tight);
  overflow-wrap: anywhere;
  white-space: normal;
}

.process-map__process-btn span:nth-of-type(1) {
  display: -webkit-box;
  max-width: 100%;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.process-map__tg-col {
  display: grid;
  align-content: start;
  align-items: start;
  gap: 3px;
  min-width: 0;
  border-radius: var(--radius-md);
  padding: 6px 0;
}

.process-map__tg-count {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

/* TG 목록: 최대 2줄 wrap, 초과 시 세로 스크롤 */
.process-map__tg-list {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: var(--space-1);
  max-height: 4.75rem;
  overflow-y: auto;
  scrollbar-width: thin;
}

.process-map__tg-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-pill);
  background: var(--color-bg-surface);
  padding: 3px 10px;
  color: var(--color-fg);
  font: inherit;
  font-size: var(--font-size-sm);
  line-height: var(--line-height-tight);
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    background-color var(--transition-fast),
    color var(--transition-fast);
}

.process-map__tg-chip:hover,
.process-map__tg-chip:focus-visible {
  border-color: var(--color-state-selected-border);
  background: var(--color-state-selected-bg);
  color: var(--color-fg-strong);
  outline: none;
}

.process-map__tg-empty {
  color: var(--color-fg-subtle);
  font-size: var(--font-size-xs);
}

/* 도트 색상 */
.process-map__tg-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}

.process-map__tg-dot--dc {
  background: var(--color-risk-critical);
}
.process-map__tg-dot--dr {
  background: var(--color-risk-high);
}
.process-map__tg-dot--dy {
  background: var(--color-risk-medium);
}
.process-map__tg-dot--dg {
  background: var(--color-risk-low);
}

@media (max-width: 1180px) {
  .process-map__grid {
    grid-template-columns: 1fr;
  }
}
</style>

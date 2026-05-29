<script setup lang="ts">
import { computed, ref } from 'vue';

import type { ProcessAreaData, ProcessToolGroup } from '@/types/dashboard';

type Grade = 'dc' | 'dr' | 'dy' | 'dg';

interface Props {
  areas: ProcessAreaData[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  selectArea: [name: string];
}>();

const GRADES: Grade[] = ['dc', 'dr', 'dy', 'dg'];

const GRADE_META: Record<Grade, { label: string; color: string; borderColor: string; bg: string }> = {
  dc: {
    label: 'Critical',
    color: 'var(--color-risk-critical)',
    borderColor: 'color-mix(in srgb, var(--color-risk-critical) 80%, transparent)',
    bg: 'color-mix(in srgb, var(--color-risk-critical) 12%, transparent)',
  },
  dr: {
    label: 'High',
    color: 'var(--color-risk-high)',
    borderColor: 'color-mix(in srgb, var(--color-risk-high) 60%, transparent)',
    bg: 'color-mix(in srgb, var(--color-risk-high) 12%, transparent)',
  },
  dy: {
    label: 'Medium',
    color: 'var(--color-risk-medium)',
    borderColor: 'color-mix(in srgb, var(--color-risk-medium) 55%, transparent)',
    bg: 'color-mix(in srgb, var(--color-risk-medium) 10%, transparent)',
  },
  dg: {
    label: 'Low',
    color: 'var(--color-risk-low)',
    borderColor: 'color-mix(in srgb, var(--color-risk-low) 40%, transparent)',
    bg: 'color-mix(in srgb, var(--color-risk-low) 8%, transparent)',
  },
};

const activeGrades = ref<Set<Grade>>(new Set(['dc', 'dr']));
const selectedName = ref<string | null>(null);

function grade(u: number): Grade {
  if (u >= 0.9) return 'dc';
  if (u >= 0.85) return 'dr';
  if (u >= 0.7) return 'dy';
  return 'dg';
}

function getStepTone(maxU: number) {
  if (maxU >= 0.9) {
    return {
      background: GRADE_META.dc.bg,
      border: `var(--border-width-thick) solid ${GRADE_META.dc.borderColor}`,
      color: GRADE_META.dc.color,
    };
  }

  if (maxU >= 0.85) {
    return {
      background: GRADE_META.dr.bg,
      border: `var(--border-width-thick) solid ${GRADE_META.dr.borderColor}`,
      color: GRADE_META.dr.color,
    };
  }

  if (maxU >= 0.7) {
    return {
      background: GRADE_META.dy.bg,
      border: `var(--border-width-default) solid ${GRADE_META.dy.borderColor}`,
      color: GRADE_META.dy.color,
    };
  }

  return {
    background: GRADE_META.dg.bg,
    border: `var(--border-width-default) solid ${GRADE_META.dg.borderColor}`,
    color: GRADE_META.dg.color,
  };
}

function maxUtil(area: ProcessAreaData): number {
  const all = [...area.gFE, ...area.gBE];
  return all.length ? Math.max(...all.map((g) => g.util)) : 0;
}

function bnCount(area: ProcessAreaData): number {
  return [...area.gFE, ...area.gBE].filter((g) => g.util >= 0.85).length;
}

function totalCount(area: ProcessAreaData): number {
  return area.gFE.length + area.gBE.length;
}

const totalTgs = computed(() => props.areas.reduce((s, a) => s + totalCount(a), 0));

function isVisible(tg: ProcessToolGroup): boolean {
  return activeGrades.value.has(grade(tg.util));
}

function isGradeActive(g: Grade): boolean {
  return activeGrades.value.has(g);
}

function toggleGrade(g: Grade) {
  const next = new Set(activeGrades.value);
  if (next.has(g)) {
    if (next.size <= 1) return;
    next.delete(g);
  } else {
    next.add(g);
  }
  activeGrades.value = next;
}

function filterBtnStyle(g: Grade, active: boolean) {
  const m = GRADE_META[g];
  return active
    ? { borderColor: m.borderColor, background: m.bg, color: m.color }
    : { borderColor: m.borderColor, background: 'transparent', color: 'var(--color-fg-muted)' };
}

function handleStepClick(area: ProcessAreaData) {
  selectedName.value = selectedName.value === area.name ? null : area.name;
  emit('selectArea', area.name);
}

function stepStyle(area: ProcessAreaData) {
  const colors = getStepTone(maxUtil(area));
  const isSelected = selectedName.value === area.name;
  return {
    ...colors,
    outline: isSelected ? `var(--border-width-thick) solid ${colors.color}` : 'none',
    outlineOffset: isSelected ? 'var(--space-1)' : '0',
  };
}

function tgColStyle(area: ProcessAreaData) {
  if (!selectedName.value) return {};
  return selectedName.value === area.name
    ? { background: 'var(--color-state-hover)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-1)' }
    : { opacity: '0.4' };
}
</script>

<template>
  <section class="process-map" aria-labelledby="pm-title">
    <header class="pm-section-header">
      <h2 id="pm-title" class="pm-title">공정 상태맵</h2>
    </header>

    <div class="process-map-card">
      <div class="pm-toolbar">
        <div class="pm-tg-label">Tool Group 상태 · 전체 {{ totalTgs }}개 · 가동률 기준</div>
        <div class="pm-filters" role="group" aria-label="위험도 필터">
          <button
            v-for="g in GRADES"
            :key="g"
            class="pm-filter-btn"
            :style="filterBtnStyle(g, isGradeActive(g))"
            type="button"
            :aria-pressed="isGradeActive(g)"
            @click="toggleGrade(g)"
          >
            ● {{ GRADE_META[g].label }}
          </button>
        </div>
      </div>

      <div class="pm-scroll">
        <div class="pm-flow">
          <div class="pm-io">IN<br /><span class="pm-io-sub">입고</span></div>
          <div class="pm-arr">→</div>
          <template v-for="(area, i) in areas" :key="area.name">
            <button
              class="pm-step"
              type="button"
              :style="stepStyle(area)"
              :aria-label="`${area.name} (${area.ko}) 가동률 ${(maxUtil(area) * 100).toFixed(0)}%`"
              @click="handleStepClick(area)"
            >
              {{ area.name }}{{ maxUtil(area) >= 0.85 ? ' ⚠' : '' }}<br />
              <span class="pm-step-sub">{{ area.ko }} · {{ (maxUtil(area) * 100).toFixed(0) }}%</span>
            </button>
            <div v-if="i < areas.length - 1" class="pm-arr">→</div>
          </template>
          <div class="pm-arr">→</div>
          <div class="pm-io">OUT<br /><span class="pm-io-sub">출고</span></div>
        </div>

        <div class="pm-sep" />

        <div class="pm-tg-row">
          <div class="pm-spacer" />
          <div class="pm-tg-sp" />
          <template v-for="(area, i) in areas" :key="area.name">
            <div class="pm-tg-col" :style="tgColStyle(area)">
              <div
                class="pm-tg-hdr"
                :style="{ color: bnCount(area) > 0 ? 'var(--color-risk-critical)' : 'var(--color-fg-muted)' }"
              >
                {{
                  bnCount(area) > 0
                    ? `⚠ 병목 ${bnCount(area)}개 / 총 ${totalCount(area)}개`
                    : `총 ${totalCount(area)}개`
                }}
              </div>

              <template v-if="area.gBE.length > 0">
                <div class="pm-tg-subhdr">FE</div>
                <div v-for="tg in area.gFE" v-show="isVisible(tg)" :key="tg.name" class="pm-tg-item">
                  <span :class="`pm-dot pm-dot--${grade(tg.util)}`" />
                  {{ tg.name }}
                </div>
                <div class="pm-tg-subhdr">BE</div>
                <div v-for="tg in area.gBE" v-show="isVisible(tg)" :key="tg.name" class="pm-tg-item">
                  <span :class="`pm-dot pm-dot--${grade(tg.util)}`" />
                  {{ tg.name }}
                </div>
              </template>

              <template v-else>
                <div v-for="tg in area.gFE" v-show="isVisible(tg)" :key="tg.name" class="pm-tg-item">
                  <span :class="`pm-dot pm-dot--${grade(tg.util)}`" />
                  {{ tg.name }}
                </div>
              </template>
            </div>
            <div v-if="i < areas.length - 1" class="pm-tg-sp" />
          </template>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.process-map {
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100%;
  min-width: 0;
  gap: var(--space-2);
}
.process-map-card {
  --pm-column-width: 10rem;
  display: grid;
  gap: var(--space-3);
  height: 100%;
  min-height: 0;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
}
.pm-section-header,
.pm-toolbar,
.pm-filters,
.pm-flow,
.pm-tg-row,
.pm-tg-item {
  display: flex;
}
.pm-section-header {
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}
.pm-title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}
.pm-toolbar {
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}
.pm-filters {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-1);
}
.pm-filter-btn {
  display: inline-flex;
  align-items: center;
  min-height: var(--space-8);
  border: var(--border-width-default) solid;
  border-radius: var(--radius-pill);
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    opacity var(--transition-fast);
}
.pm-scroll {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding-bottom: var(--space-4);
  scrollbar-gutter: stable;
}
.pm-flow,
.pm-tg-row {
  min-width: max-content;
}
.pm-flow {
  align-items: flex-end;
}
.pm-tg-row {
  align-items: flex-start;
}
.pm-io,
.pm-step,
.pm-spacer,
.pm-tg-col,
.pm-arr,
.pm-tg-sp,
.pm-dot {
  flex-shrink: 0;
}
.pm-io {
  width: var(--space-10);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: var(--space-2) var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  line-height: 1.5;
  text-align: center;
}
.pm-io-sub,
.pm-step-sub {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}
.pm-arr,
.pm-tg-sp {
  width: var(--space-4);
}
.pm-arr {
  padding-bottom: var(--space-3);
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  text-align: center;
}
.pm-step {
  width: var(--pm-column-width);
  border-radius: var(--radius-md);
  padding: var(--space-2) var(--space-1);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  line-height: 1.5;
  text-align: center;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}
.pm-sep {
  border-top: var(--border-width-default) dashed var(--color-border-subtle);
  margin: var(--space-3) 0 0;
}
.pm-tg-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}
.pm-spacer {
  width: var(--space-10);
}
.pm-tg-col {
  width: var(--pm-column-width);
  transition: opacity var(--transition-fast);
}
.pm-tg-hdr {
  margin: var(--space-1);
  padding-left: var(--space-1);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.pm-tg-subhdr {
  display: inline-block;
  margin: var(--space-1) 0;
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  padding: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}
.pm-tg-item {
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}
.pm-dot {
  display: inline-block;
  width: var(--space-2);
  height: var(--space-2);
  border-radius: var(--radius-pill);
}
.pm-dot--dc {
  background: var(--color-risk-critical);
  box-shadow: var(--shadow-sm);
}
.pm-dot--dr {
  background: var(--color-risk-high);
}
.pm-dot--dy {
  background: var(--color-risk-medium);
}
.pm-dot--dg {
  background: var(--color-risk-low);
}
</style>

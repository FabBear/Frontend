<script setup lang="ts">
import { computed, ref } from 'vue';

import { type ProcessRiskGrade } from '@/constants/processRisk';

import type { ProcessAreaData } from '@/types/dashboard';

import ProcessFlowRow from '@/components/dashboard/ProcessFlowRow.vue';
import ProcessMapToolbar from '@/components/dashboard/ProcessMapToolbar.vue';
import ProcessToolGroupRow from '@/components/dashboard/ProcessToolGroupRow.vue';

interface Props {
  areas: ProcessAreaData[];
  selectedAreaName?: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  selectArea: [name: string];
}>();

const activeGrades = ref<Set<ProcessRiskGrade>>(new Set(['dc', 'dr']));
const localSelectedAreaName = ref<string | null>(null);

const currentSelectedAreaName = computed(() => props.selectedAreaName ?? localSelectedAreaName.value);

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

function handleSelectArea(area: ProcessAreaData) {
  localSelectedAreaName.value = localSelectedAreaName.value === area.name ? null : area.name;
  emit('selectArea', area.name);
}
</script>

<template>
  <section class="process-map" aria-labelledby="pm-title">
    <div class="process-map__card">
      <div class="process-map__card-header">
        <h2 id="pm-title" class="process-map__title">공정 상태맵</h2>
        <div class="process-map__legend" aria-label="가동률 범례">
          <span class="process-map__legend-item">
            <i class="process-map__legend-dot process-map__legend-dot--low" aria-hidden="true" />정상 (&lt;70%)
          </span>
          <span class="process-map__legend-item">
            <i class="process-map__legend-dot process-map__legend-dot--medium" aria-hidden="true" />주의 (70~85%)
          </span>
          <span class="process-map__legend-item">
            <i class="process-map__legend-dot process-map__legend-dot--high" aria-hidden="true" />위험 (≥85%)
          </span>
        </div>
      </div>

      <ProcessMapToolbar :active-grades="activeGrades" @toggle-grade="handleToggleGrade" />

      <div class="process-map__scroll">
        <ProcessFlowRow :areas="areas" :selected-area-name="currentSelectedAreaName" @select-area="handleSelectArea" />
        <div class="process-map__separator" />
        <ProcessToolGroupRow
          :areas="areas"
          :active-grades="activeGrades"
          :selected-area-name="currentSelectedAreaName"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.process-map {
  height: 100%;
  min-width: 0;
}

.process-map__card {
  --pm-column-width: 10rem;
  display: grid;
  gap: var(--space-2);
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

.process-map__card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.process-map__title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
  white-space: nowrap;
}

.process-map__legend {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.process-map__legend-item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.process-map__legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}

.process-map__legend-dot--low {
  background: var(--color-risk-low);
}

.process-map__legend-dot--medium {
  background: var(--color-risk-medium);
}

.process-map__legend-dot--high {
  background: var(--color-risk-high);
}

.process-map__scroll {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  padding-bottom: var(--space-4);
  scrollbar-gutter: stable;
}

.process-map__separator {
  border-top: var(--border-width-default) dashed var(--color-border-subtle);
  margin: var(--space-3) 0 0;
}
</style>

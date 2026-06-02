<script setup lang="ts">
import { computed, ref } from 'vue';

import { type ProcessRiskGrade } from '@/constants/processRisk';

import type { DashboardProcessAreaData } from '@/types/dashboard';

import ProcessFlowRow from '@/components/dashboard/ProcessFlowRow.vue';
import ProcessMapToolbar from '@/components/dashboard/ProcessMapToolbar.vue';
import ProcessToolGroupRow from '@/components/dashboard/ProcessToolGroupRow.vue';

interface Props {
  areas: DashboardProcessAreaData[];
  selectedAreaCode?: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  selectArea: [areaCode: string];
}>();

const activeGrades = ref<Set<ProcessRiskGrade>>(new Set(['dc', 'dr']));
const localSelectedAreaCode = ref<string | null>(null);

const currentSelectedAreaCode = computed(() => props.selectedAreaCode ?? localSelectedAreaCode.value);

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

function handleSelectArea(area: DashboardProcessAreaData) {
  localSelectedAreaCode.value = localSelectedAreaCode.value === area.areaCode ? null : area.areaCode;
  emit('selectArea', area.areaCode);
}
</script>

<template>
  <section class="process-map" aria-labelledby="pm-title">
    <div class="process-map__card">
      <div class="process-map__card-header">
        <h2 id="pm-title" class="process-map__title">공정 상태맵</h2>
        <p class="process-map__hint">가동률 기준 · Critical ≥90% · High ≥85% · Medium ≥70%</p>
      </div>

      <ProcessMapToolbar :active-grades="activeGrades" @toggle-grade="handleToggleGrade" />

      <div class="process-map__scroll">
        <ProcessFlowRow :areas="areas" :selected-area-code="currentSelectedAreaCode" @select-area="handleSelectArea" />
        <div class="process-map__separator" />
        <ProcessToolGroupRow
          :areas="areas"
          :active-grades="activeGrades"
          :selected-area-code="currentSelectedAreaCode"
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
  --pm-step-height: 6rem;
  display: grid;
  align-content: start;
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

.process-map__hint {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
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

<script setup lang="ts">
import { computed, ref } from 'vue';

import { type ProcessRiskGrade, getAreaToolGroupCount } from '@/constants/processRisk';

import type { ProcessAreaData } from '@/types/dashboard';

import ProcessFlowRow from '@/components/dashboard/ProcessFlowRow.vue';
import ProcessMapToolbar from '@/components/dashboard/ProcessMapToolbar.vue';
import ProcessToolGroupRow from '@/components/dashboard/ProcessToolGroupRow.vue';

interface Props {
  areas: ProcessAreaData[];
}

const props = defineProps<Props>();

const emit = defineEmits<{
  selectArea: [name: string];
}>();

const activeGrades = ref<Set<ProcessRiskGrade>>(new Set(['dc', 'dr']));
const selectedAreaName = ref<string | null>(null);

const totalToolGroupCount = computed(() => props.areas.reduce((sum, area) => sum + getAreaToolGroupCount(area), 0));

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
  selectedAreaName.value = selectedAreaName.value === area.name ? null : area.name;
  emit('selectArea', area.name);
}
</script>

<template>
  <section class="process-map" aria-labelledby="pm-title">
    <header class="process-map__section-header">
      <h2 id="pm-title" class="process-map__title">공정 상태맵</h2>
    </header>

    <div class="process-map__card">
      <ProcessMapToolbar
        :total-tool-group-count="totalToolGroupCount"
        :active-grades="activeGrades"
        @toggle-grade="handleToggleGrade"
      />

      <div class="process-map__scroll">
        <ProcessFlowRow :areas="areas" :selected-area-name="selectedAreaName" @select-area="handleSelectArea" />
        <div class="process-map__separator" />
        <ProcessToolGroupRow :areas="areas" :active-grades="activeGrades" :selected-area-name="selectedAreaName" />
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

.process-map__card {
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

.process-map__section-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.process-map__title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
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

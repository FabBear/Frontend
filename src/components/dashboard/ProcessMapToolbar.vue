<script setup lang="ts">
import {
  PROCESS_RISK_GRADES,
  PROCESS_RISK_META,
  type ProcessRiskGrade,
  getProcessFilterButtonStyle,
} from '@/constants/processRisk';

interface Props {
  totalToolGroupCount: number;
  activeGrades: Set<ProcessRiskGrade>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  toggleGrade: [grade: ProcessRiskGrade];
}>();

function isGradeActive(grade: ProcessRiskGrade): boolean {
  return props.activeGrades.has(grade);
}
</script>

<template>
  <div class="process-map-toolbar">
    <div class="process-map-toolbar__label">Tool Group 상태 · 전체 {{ totalToolGroupCount }}개 · 가동률 기준</div>
    <div class="process-map-toolbar__filters" role="group" aria-label="위험도 필터">
      <button
        v-for="grade in PROCESS_RISK_GRADES"
        :key="grade"
        class="process-map-toolbar__filter-btn"
        :style="getProcessFilterButtonStyle(grade, isGradeActive(grade))"
        type="button"
        :aria-pressed="isGradeActive(grade)"
        @click="emit('toggleGrade', grade)"
      >
        ● {{ PROCESS_RISK_META[grade].label }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.process-map-toolbar,
.process-map-toolbar__filters {
  display: flex;
}

.process-map-toolbar {
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.process-map-toolbar__label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.process-map-toolbar__filters {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space-1);
}

.process-map-toolbar__filter-btn {
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
</style>

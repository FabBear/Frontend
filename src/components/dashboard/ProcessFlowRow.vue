<script setup lang="ts">
import { computed } from 'vue';

import { getProcessAreaNameKo } from '@/constants/processArea';
import { getAreaMaxUtilization, getProcessStepTone, isBottleneckUtilization } from '@/constants/processRisk';

import type { ProcessAreaData } from '@/types/dashboard';

interface Props {
  areas: ProcessAreaData[];
  selectedAreaName: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  selectArea: [area: ProcessAreaData];
}>();

const processedAreas = computed(() =>
  props.areas.map((area) => {
    const maxUtil = getAreaMaxUtilization(area);
    const colors = getProcessStepTone(maxUtil);
    const isSelected = props.selectedAreaName === area.name;
    return {
      area,
      maxUtil,
      isBottleneck: isBottleneckUtilization(maxUtil),
      nameKo: getProcessAreaNameKo(area.name),
      stepStyle: {
        ...colors,
        outline: isSelected ? `var(--border-width-thick) solid ${colors.color}` : 'none',
        outlineOffset: isSelected ? 'var(--space-1)' : '0',
      },
    };
  })
);
</script>

<template>
  <div class="process-flow-row">
    <div class="process-flow-row__io">IN<br /><span>입고</span></div>
    <div class="process-flow-row__arrow">→</div>
    <template v-for="(item, index) in processedAreas" :key="item.area.name">
      <button
        class="process-flow-row__step"
        type="button"
        :style="item.stepStyle"
        :aria-label="`${item.area.name} (${item.nameKo}) 가동률 ${(item.maxUtil * 100).toFixed(0)}%`"
        @click="emit('selectArea', item.area)"
      >
        {{ item.area.name }}{{ item.isBottleneck ? ' ⚠' : '' }}<br />
        <span>{{ item.nameKo }} · {{ (item.maxUtil * 100).toFixed(0) }}%</span>
      </button>
      <div v-if="index < processedAreas.length - 1" class="process-flow-row__arrow">→</div>
    </template>
    <div class="process-flow-row__arrow">→</div>
    <div class="process-flow-row__io">OUT<br /><span>출고</span></div>
  </div>
</template>

<style scoped>
.process-flow-row {
  display: flex;
  align-items: flex-end;
  min-width: max-content;
}

.process-flow-row__io,
.process-flow-row__step,
.process-flow-row__arrow {
  flex-shrink: 0;
}

.process-flow-row__io {
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

.process-flow-row__io span,
.process-flow-row__step span {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.process-flow-row__arrow {
  width: var(--space-4);
  padding-bottom: var(--space-3);
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  text-align: center;
}

.process-flow-row__step {
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
</style>

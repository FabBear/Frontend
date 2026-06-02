<script setup lang="ts">
import { computed } from 'vue';

import { getProcessAreaDisplayCode, getProcessAreaNameKo } from '@/constants/processArea';
import { getProcessStepTone, isBottleneckUtilization } from '@/constants/processRisk';

import type { DashboardProcessAreaData } from '@/types/dashboard';

interface Props {
  areas: DashboardProcessAreaData[];
  selectedAreaCode: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  selectArea: [area: DashboardProcessAreaData];
}>();

const processedAreas = computed(() =>
  props.areas.map((area) => {
    const maxUtil = getAreaMaxUtilization(area);
    const colors = getProcessStepTone(maxUtil);
    const isSelected = props.selectedAreaCode === area.areaCode;
    const riskTgCount = area.bottleneckTgCount;
    return {
      area,
      maxUtil,
      isBottleneck: riskTgCount > 0 || isBottleneckUtilization(maxUtil),
      displayCode: getProcessAreaDisplayCode(area.areaCode),
      nameKo: getProcessAreaNameKo(area.areaCode),
      riskTgCount,
      stepStyle: {
        ...colors,
        outline: isSelected ? `var(--border-width-thick) solid ${colors.color}` : 'none',
        outlineOffset: isSelected ? 'var(--space-1)' : '0',
      },
    };
  })
);

function getAreaMaxUtilization(area: DashboardProcessAreaData): number {
  return area.toolGroups.length ? Math.max(...area.toolGroups.map((toolGroup) => toolGroup.utilizationRate)) : 0;
}
</script>

<template>
  <div class="process-flow-row">
    <div class="process-flow-row__io">IN<br /><span>입고</span></div>
    <div class="process-flow-row__arrow">→</div>
    <template v-for="(item, index) in processedAreas" :key="item.area.areaId">
      <button
        class="process-flow-row__step"
        type="button"
        :style="item.stepStyle"
        :aria-label="`${item.area.areaCode} (${item.nameKo}) 가동률 ${(item.maxUtil * 100).toFixed(0)}%`"
        :title="`${item.area.areaCode} · ${item.nameKo}`"
        @click="emit('selectArea', item.area)"
      >
        <strong>{{ item.nameKo }}</strong>
        <span
          >{{ item.displayCode }} <br />
          {{ (item.maxUtil * 100).toFixed(0) }}%</span
        >
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
  align-items: center;
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
  display: grid;
  place-content: center;
}

.process-flow-row__io span,
.process-flow-row__step span {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

.process-flow-row__step strong {
  display: block;
  color: currentColor;
  font-size: var(--font-size-sm);
}

.process-flow-row__arrow {
  width: var(--space-8);
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  line-height: var(--pm-step-height);
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
  display: grid;
  place-content: center;
  gap: 2px;
  overflow: hidden;
}

.process-flow-row__step strong,
.process-flow-row__step span {
  max-width: calc(var(--pm-column-width) - var(--space-2));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>

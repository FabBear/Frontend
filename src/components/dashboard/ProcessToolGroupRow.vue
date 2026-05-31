<script setup lang="ts">
import {
  type ProcessRiskGrade,
  getAreaBottleneckCount,
  getAreaToolGroupCount,
  getProcessRiskGrade,
} from '@/constants/processRisk';

import type { ProcessAreaData, ProcessToolGroup } from '@/types/dashboard';

interface Props {
  areas: ProcessAreaData[];
  activeGrades: Set<ProcessRiskGrade>;
  selectedAreaName: string | null;
}

const props = defineProps<Props>();

function isVisible(toolGroup: ProcessToolGroup): boolean {
  return props.activeGrades.has(getProcessRiskGrade(toolGroup.util));
}

function getColumnStyle(area: ProcessAreaData) {
  if (!props.selectedAreaName) return {};
  return props.selectedAreaName === area.name
    ? { background: 'var(--color-state-hover)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-1)' }
    : { opacity: '0.4' };
}

function getHeaderColor(area: ProcessAreaData) {
  return getAreaBottleneckCount(area) > 0 ? 'var(--color-risk-critical)' : 'var(--color-fg-muted)';
}
</script>

<template>
  <div class="process-tool-group-row">
    <div class="process-tool-group-row__spacer" />
    <div class="process-tool-group-row__gap" />
    <template v-for="(area, index) in areas" :key="area.name">
      <div class="process-tool-group-row__column" :style="getColumnStyle(area)">
        <div class="process-tool-group-row__header" :style="{ color: getHeaderColor(area) }">
          {{
            getAreaBottleneckCount(area) > 0
              ? `⚠ 병목 ${getAreaBottleneckCount(area)}개 / 총 ${getAreaToolGroupCount(area)}개`
              : `총 ${getAreaToolGroupCount(area)}개`
          }}
        </div>

        <template v-if="area.gBE.length > 0">
          <div class="process-tool-group-row__subheader">FE</div>
          <div
            v-for="toolGroup in area.gFE"
            v-show="isVisible(toolGroup)"
            :key="toolGroup.name"
            class="process-tool-group-row__item"
          >
            <span
              :class="`process-tool-group-row__dot process-tool-group-row__dot--${getProcessRiskGrade(toolGroup.util)}`"
            />
            {{ toolGroup.name }}
          </div>
          <div class="process-tool-group-row__subheader">BE</div>
          <div
            v-for="toolGroup in area.gBE"
            v-show="isVisible(toolGroup)"
            :key="toolGroup.name"
            class="process-tool-group-row__item"
          >
            <span
              :class="`process-tool-group-row__dot process-tool-group-row__dot--${getProcessRiskGrade(toolGroup.util)}`"
            />
            {{ toolGroup.name }}
          </div>
        </template>

        <template v-else>
          <div
            v-for="toolGroup in area.gFE"
            v-show="isVisible(toolGroup)"
            :key="toolGroup.name"
            class="process-tool-group-row__item"
          >
            <span
              :class="`process-tool-group-row__dot process-tool-group-row__dot--${getProcessRiskGrade(toolGroup.util)}`"
            />
            {{ toolGroup.name }}
          </div>
        </template>
      </div>
      <div v-if="index < areas.length - 1" class="process-tool-group-row__gap" />
    </template>
  </div>
</template>

<style scoped>
.process-tool-group-row,
.process-tool-group-row__item {
  display: flex;
}

.process-tool-group-row {
  align-items: flex-start;
  min-width: max-content;
}

.process-tool-group-row__spacer,
.process-tool-group-row__gap,
.process-tool-group-row__column,
.process-tool-group-row__dot {
  flex-shrink: 0;
}

.process-tool-group-row__spacer {
  width: var(--space-10);
}

.process-tool-group-row__gap {
  width: var(--space-4);
}

.process-tool-group-row__column {
  width: var(--pm-column-width);
  transition: opacity var(--transition-fast);
}

.process-tool-group-row__header {
  margin: var(--space-1);
  padding-left: var(--space-1);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.process-tool-group-row__subheader {
  display: inline-block;
  margin: var(--space-1) 0;
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  padding: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.process-tool-group-row__item {
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  white-space: nowrap;
}

.process-tool-group-row__dot {
  display: inline-block;
  width: var(--space-2);
  height: var(--space-2);
  border-radius: var(--radius-pill);
}

.process-tool-group-row__dot--dc {
  background: var(--color-risk-critical);
  box-shadow: var(--shadow-sm);
}

.process-tool-group-row__dot--dr {
  background: var(--color-risk-high);
}

.process-tool-group-row__dot--dy {
  background: var(--color-risk-medium);
}

.process-tool-group-row__dot--dg {
  background: var(--color-risk-low);
}
</style>

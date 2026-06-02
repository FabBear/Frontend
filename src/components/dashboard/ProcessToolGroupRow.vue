<script setup lang="ts">
import { computed } from 'vue';

import { PROCESS_RISK_GRADES, type ProcessRiskGrade, getProcessRiskGrade } from '@/constants/processRisk';

import type { DashboardProcessAreaData, DashboardProcessToolGroupData } from '@/types/dashboard';

interface Props {
  areas: DashboardProcessAreaData[];
  activeGrades: Set<ProcessRiskGrade>;
  selectedAreaCode: string | null;
}

interface ToolGroupSection {
  key: 'FE' | 'BE' | 'OTHER';
  label: string;
  items: DashboardProcessToolGroupData[];
}

interface ProcessedArea {
  area: DashboardProcessAreaData;
  visibleGroups: DashboardProcessToolGroupData[];
  sections: ToolGroupSection[];
}

const props = defineProps<Props>();

const processedAreas = computed<ProcessedArea[]>(() =>
  props.areas.map((area) => {
    const visibleGroups = getVisibleToolGroups(area);
    const sections = getToolGroupSections(visibleGroups);

    return {
      area,
      visibleGroups,
      sections,
    };
  })
);

function isVisible(toolGroup: DashboardProcessToolGroupData): boolean {
  return props.activeGrades.has(getToolGroupProcessRiskGrade(toolGroup));
}

function getToolGroupFamily(toolGroup: DashboardProcessToolGroupData): string {
  const code = toolGroup.tgCode || toolGroup.tgName;
  return code.replace(/_(FE|BE)(?:_|$).*/i, '').replace(/_\d+$/i, '') || '기타';
}

function getVisibleToolGroups(area: DashboardProcessAreaData): DashboardProcessToolGroupData[] {
  return area.toolGroups.filter(isVisible).sort((a, b) => {
    const riskOrder =
      PROCESS_RISK_GRADES.indexOf(getToolGroupProcessRiskGrade(a)) -
      PROCESS_RISK_GRADES.indexOf(getToolGroupProcessRiskGrade(b));
    if (riskOrder !== 0) return riskOrder;
    const familyOrder = getToolGroupFamily(a).localeCompare(getToolGroupFamily(b));
    if (familyOrder !== 0) return familyOrder;
    return b.utilizationRate - a.utilizationRate;
  });
}

function getToolGroupSections(groups: DashboardProcessToolGroupData[]): ToolGroupSection[] {
  const sections = [
    { key: 'FE' as const, label: 'FE', items: groups.filter((toolGroup) => getToolGroupSide(toolGroup) === 'FE') },
    { key: 'BE' as const, label: 'BE', items: groups.filter((toolGroup) => getToolGroupSide(toolGroup) === 'BE') },
    {
      key: 'OTHER' as const,
      label: '공통/기타',
      items: groups.filter((toolGroup) => getToolGroupSide(toolGroup) === 'OTHER'),
    },
  ];

  return sections
    .filter((section) => section.items.length > 0)
    .map((section) => ({
      key: section.key,
      label: section.label,
      items: section.items,
    }));
}

function getColumnStyle(area: DashboardProcessAreaData) {
  if (!props.selectedAreaCode) return {};
  return props.selectedAreaCode === area.areaCode
    ? { background: 'var(--color-state-hover)', borderRadius: 'var(--radius-sm)' }
    : { opacity: '0.4' };
}

function getToolGroupProcessRiskGrade(toolGroup: DashboardProcessToolGroupData): ProcessRiskGrade {
  if (toolGroup.riskLevel === 'critical') return 'dc';
  if (toolGroup.riskLevel === 'high') return 'dr';
  if (toolGroup.riskLevel === 'medium') return 'dy';
  if (toolGroup.riskLevel === 'low') return 'dg';
  return getProcessRiskGrade(toolGroup.utilizationRate);
}

function getToolGroupSide(toolGroup: DashboardProcessToolGroupData): 'FE' | 'BE' | 'OTHER' {
  const code = `${toolGroup.tgCode}_${toolGroup.tgName}`.toUpperCase();
  if (code.includes('_FE_') || code.endsWith('_FE')) return 'FE';
  if (code.includes('_BE_') || code.endsWith('_BE')) return 'BE';
  return 'OTHER';
}
</script>

<template>
  <div class="process-tool-group-row">
    <div class="process-tool-group-row__spacer" />
    <div class="process-tool-group-row__gap" />
    <template v-for="(item, index) in processedAreas" :key="item.area.areaId">
      <div class="process-tool-group-row__column" :style="getColumnStyle(item.area)">
        <div class="process-tool-group-row__header">
          {{ item.visibleGroups.length }}/{{ item.area.totalTgCount }} TG
        </div>

        <section v-for="section in item.sections" :key="section.key" class="process-tool-group-row__section">
          <p class="process-tool-group-row__subheader">
            {{ section.label }} <span>{{ section.items.length }}</span>
          </p>
          <div
            v-for="toolGroup in section.items"
            :key="toolGroup.tgId"
            class="process-tool-group-row__item"
            :title="`${toolGroup.tgCode} · ${section.label} · ${toolGroup.riskGrade} · 가동률 ${(toolGroup.utilizationRate * 100).toFixed(1)}% · WIP ${toolGroup.wipCount}`"
          >
            <span
              :class="`process-tool-group-row__dot process-tool-group-row__dot--${getToolGroupProcessRiskGrade(toolGroup)}`"
            />
            {{ toolGroup.tgName }}
          </div>
        </section>
        <p v-if="item.visibleGroups.length === 0" class="process-tool-group-row__empty">해당 등급 없음</p>
      </div>
      <div v-if="index < processedAreas.length - 1" class="process-tool-group-row__gap" />
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
  width: var(--space-8);
}

.process-tool-group-row__column {
  width: var(--pm-column-width);
  box-sizing: border-box;
  padding: 0 var(--space-1); /* step 버튼 수평 padding과 맞춤 */
  transition: opacity var(--transition-fast);
}

.process-tool-group-row__header {
  margin: var(--space-1) 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-align: center;
}

.process-tool-group-row__section + .process-tool-group-row__section {
  margin-top: var(--space-2);
}

.process-tool-group-row__subheader {
  margin: var(--space-1) 0 0;
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  padding: 2px var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-align: center;
}

.process-tool-group-row__subheader span {
  color: var(--color-fg-muted);
  font-weight: var(--font-weight-medium);
}

.process-tool-group-row__item {
  align-items: center;
  justify-content: center;
  gap: var(--space-1);
  padding: var(--space-1) 0;
  min-width: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.process-tool-group-row__empty {
  padding: var(--space-1) 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  text-align: center;
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

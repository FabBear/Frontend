<script setup lang="ts">
import { toMesRiskLevel } from '@/composables/useMesMonitoring';

import { MES_RISK_FILTERS } from '@/constants/mes';
import { RISK_LEVEL_META } from '@/constants/riskLevel';

import type { MesRiskGrade, MesToolGroupMetric } from '@/types/mes';

import { formatNumber, formatRatioPercent } from '@/utils/format';

interface Props {
  toolGroups: MesToolGroupMetric[];
  selectedToolGroupId: string | null;
  search: string;
  riskFilter: MesRiskGrade | 'ALL';
}

defineProps<Props>();

const emit = defineEmits<{
  'update:search': [value: string];
  'update:riskFilter': [value: MesRiskGrade | 'ALL'];
  select: [tgId: string];
}>();

function getRiskFilterColor(value: MesRiskGrade | 'ALL') {
  if (value === 'ALL') return undefined;
  return RISK_LEVEL_META[toMesRiskLevel(value)].color;
}
</script>

<template>
  <aside class="tool-group-list-panel" aria-label="Tool Group 선택">
    <header class="tool-group-list-panel__header">
      <div class="tool-group-list-panel__title">
        Tool Group 선택 <span>({{ formatNumber(toolGroups.length) }}개)</span>
      </div>
      <input
        class="tool-group-list-panel__search"
        :value="search"
        type="text"
        placeholder="TG 이름 검색..."
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
      <div class="tool-group-list-panel__filters" role="group" aria-label="위험도 필터">
        <button
          v-for="filter in MES_RISK_FILTERS"
          :key="filter.value"
          class="tool-group-list-panel__filter"
          :class="{ 'tool-group-list-panel__filter--active': riskFilter === filter.value }"
          :style="riskFilter !== filter.value ? { color: getRiskFilterColor(filter.value) } : {}"
          type="button"
          @click="emit('update:riskFilter', filter.value)"
        >
          {{ filter.label }}
        </button>
      </div>
    </header>

    <div class="tool-group-list-panel__list">
      <button
        v-for="toolGroup in toolGroups"
        :key="toolGroup.tgId"
        class="tool-group-list-panel__item"
        :class="{ 'tool-group-list-panel__item--selected': selectedToolGroupId === toolGroup.tgId }"
        type="button"
        @click="emit('select', toolGroup.tgId)"
      >
        <span
          class="tool-group-list-panel__dot"
          :style="{ backgroundColor: RISK_LEVEL_META[toMesRiskLevel(toolGroup.riskGrade)].color }"
          aria-hidden="true"
        />
        <span class="tool-group-list-panel__item-body">
          <strong>{{ toolGroup.tgName }}</strong>
          <small
            >{{ toolGroup.areaNameKo }} · {{ toolGroup.toolCount }}대 · 대기
            {{ formatNumber(toolGroup.wipCount) }} Lot</small
          >
        </span>
        <span
          class="tool-group-list-panel__util"
          :style="{ color: RISK_LEVEL_META[toMesRiskLevel(toolGroup.riskGrade)].color }"
        >
          {{ formatRatioPercent(toolGroup.utilizationRate) }}
        </span>
      </button>
      <p v-if="toolGroups.length === 0" class="tool-group-list-panel__empty">검색 결과 없음</p>
    </div>
  </aside>
</template>

<style scoped>
.tool-group-list-panel {
  display: grid;
  grid-template-rows: auto 1fr;
  width: 256px;
  flex-shrink: 0;
  overflow: hidden;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}

.tool-group-list-panel__header {
  border-bottom: var(--border-width-default) solid var(--color-border-default);
  background: var(--color-bg-surface);
  padding: var(--space-3);
}

.tool-group-list-panel__title {
  margin-bottom: var(--space-2);
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.tool-group-list-panel__title span {
  color: var(--color-fg-muted);
  font-weight: var(--font-weight-normal);
}

.tool-group-list-panel__search {
  width: 100%;
  margin-bottom: var(--space-2);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: 5px 9px;
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
}

.tool-group-list-panel__filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.tool-group-list-panel__filter {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: transparent;
  padding: 2px 8px;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-xs);
}

.tool-group-list-panel__filter--active {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
  font-weight: var(--font-weight-semibold);
}

.tool-group-list-panel__list {
  overflow-y: auto;
  max-height: 560px;
  padding: var(--space-2);
}

.tool-group-list-panel__item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--space-2);
  border: var(--border-width-default) solid transparent;
  border-radius: var(--radius-md);
  background: transparent;
  padding: 7px 8px;
  cursor: pointer;
  text-align: left;
}

.tool-group-list-panel__item:hover,
.tool-group-list-panel__item--selected {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
}

.tool-group-list-panel__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}

.tool-group-list-panel__item-body {
  min-width: 0;
  flex: 1;
}

.tool-group-list-panel__item-body strong {
  display: block;
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-group-list-panel__item-body small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.tool-group-list-panel__util {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.tool-group-list-panel__empty {
  padding: var(--space-5);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  text-align: center;
}
</style>

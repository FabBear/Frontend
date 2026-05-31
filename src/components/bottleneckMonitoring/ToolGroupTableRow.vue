<script setup lang="ts">
import { computed } from 'vue';

import { RISK_LEVEL_META, type RiskLevel } from '@/constants/riskLevel';

import type { BottleneckToolGroupItem } from '@/types/bottleneckMonitoring';

import { formatNumber, formatPercentPoint, formatRatioPercent } from '@/utils/format';

interface Props {
  toolGroup: BottleneckToolGroupItem;
  selected?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
});

const emit = defineEmits<{
  select: [tgId: string];
}>();

const riskLevel = computed(() => props.toolGroup.riskGrade.toLowerCase() as RiskLevel);
const riskMeta = computed(() => RISK_LEVEL_META[riskLevel.value]);
const laneLabel = computed(() => {
  if (props.toolGroup.tgCode.includes('_FE_') || props.toolGroup.tgCode.endsWith('_FE')) return 'FE';
  if (props.toolGroup.tgCode.includes('_BE_') || props.toolGroup.tgCode.endsWith('_BE')) return 'BE';
  return null;
});

function handleSelect() {
  emit('select', props.toolGroup.tgId);
}
</script>

<template>
  <tr
    class="tool-group-table-row"
    :class="{ 'tool-group-table-row--selected': selected }"
    tabindex="0"
    @click="handleSelect"
    @keydown.enter.prevent="handleSelect"
    @keydown.space.prevent="handleSelect"
  >
    <td>
      <span class="tool-group-table-row__badge" :style="{ color: riskMeta.color, borderColor: riskMeta.color }">
        <i class="tool-group-table-row__dot" :style="{ backgroundColor: riskMeta.color }" aria-hidden="true" />
        {{ riskMeta.label }}
      </span>
    </td>
    <td class="tool-group-table-row__name-cell">
      <span class="tool-group-table-row__name">{{ toolGroup.tgName }}</span>
      <span v-if="laneLabel" class="tool-group-table-row__lane">{{ laneLabel }}</span>
    </td>
    <td class="tool-group-table-row__util">{{ formatRatioPercent(toolGroup.utilizationRate) }}</td>
    <td class="tool-group-table-row__wip">{{ formatNumber(toolGroup.wipCount) }}</td>
    <td class="tool-group-table-row__prob">{{ formatRatioPercent(toolGroup.bottleneckProb) }}</td>
    <td class="tool-group-table-row__setup">{{ formatRatioPercent(toolGroup.setupRatio) }}</td>
    <td class="tool-group-table-row__wait">{{ formatPercentPoint(toolGroup.waitRatio) }}</td>
  </tr>
</template>

<style scoped>
.tool-group-table-row {
  cursor: pointer;
  transition: background var(--transition-fast);
}

.tool-group-table-row:hover,
.tool-group-table-row:focus-visible {
  background: var(--color-state-hover);
  outline: none;
}

.tool-group-table-row--selected {
  background: var(--color-state-selected-bg);
}

.tool-group-table-row__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: var(--border-width-default) solid;
  border-radius: var(--radius-sm);
  padding: 2px 6px;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.tool-group-table-row__dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}

.tool-group-table-row__name-cell {
  white-space: nowrap;
}

.tool-group-table-row__name {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

.tool-group-table-row__lane {
  display: inline-block;
  margin-left: var(--space-1);
  border-radius: var(--radius-xs, 2px);
  background: var(--color-bg-surface);
  padding: 1px 4px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  vertical-align: middle;
}

.tool-group-table-row__util,
.tool-group-table-row__prob {
  font-weight: var(--font-weight-semibold);
  text-align: right;
}

.tool-group-table-row__wip,
.tool-group-table-row__setup,
.tool-group-table-row__wait {
  color: var(--color-fg-muted);
  text-align: right;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { getProcessAreaSortOrder } from '@/constants/processArea';

import type {
  MesKpiCard,
  MesMonitoringData,
  MesRiskGrade,
  MesToolGroupMetric,
  MesToolMetric,
  MesToolStatusSummary,
  MesToolViewMode,
} from '@/types/mes';

import MesKpiCardGrid from '@/components/mes/MesKpiCardGrid.vue';
import ToolGroupDetailPanel from '@/components/mes/ToolGroupDetailPanel.vue';
import ToolGroupListPanel from '@/components/mes/ToolGroupListPanel.vue';

import { formatNumber, formatRatioPercent } from '@/utils/format';
import { average, createMesToolStatusSummary } from '@/utils/mesMetrics';

interface Props {
  data: MesMonitoringData;
  selectedToolGroupId: string | null;
  selectedToolGroup: MesToolGroupMetric | null;
  selectedTools: MesToolMetric[];
  toolViewMode: MesToolViewMode;
  detailErrorMessage: string | null;
  tgAreaFilter: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:toolViewMode': [value: MesToolViewMode];
  'update:tgAreaFilter': [value: string];
  selectToolGroup: [tgId: string];
}>();

const tgSearch = ref('');
const tgRiskFilter = ref<MesRiskGrade | 'ALL'>('ALL');

const toolStatusSummaries = computed<Record<string, MesToolStatusSummary>>(() => {
  const toolsByTgId = props.data.tools.reduce<Record<string, MesToolMetric[]>>((groups, tool) => {
    groups[tool.tgId] ??= [];
    groups[tool.tgId].push(tool);
    return groups;
  }, {});

  return props.data.toolGroups.reduce<Record<string, MesToolStatusSummary>>((summaries, toolGroup) => {
    summaries[toolGroup.tgId] = createMesToolStatusSummary(toolsByTgId[toolGroup.tgId] ?? []);
    return summaries;
  }, {});
});

const areaOptions = computed(() =>
  [...props.data.processSummaries]
    .sort((a, b) => getProcessAreaSortOrder(a.areaCode) - getProcessAreaSortOrder(b.areaCode))
    .map((area) => ({ areaCode: area.areaCode, areaNameKo: area.areaNameKo }))
);

const filteredToolGroups = computed(() => {
  const keyword = tgSearch.value.trim().toLowerCase();
  return props.data.toolGroups
    .filter((tg) => {
      if (keyword && !tg.tgName.toLowerCase().includes(keyword)) return false;
      if (props.tgAreaFilter !== 'ALL' && tg.areaCode !== props.tgAreaFilter) return false;
      if (tgRiskFilter.value !== 'ALL' && tg.riskGrade !== tgRiskFilter.value) return false;
      return true;
    })
    .sort((a, b) => b.utilizationRate - a.utilizationRate);
});

const summaryCards = computed<MesKpiCard[]>(() => {
  const tgs = props.data.toolGroups;
  const statusSummary = createMesToolStatusSummary(props.data.tools);
  const criticalCount = tgs.filter((tg) => tg.utilizationRate >= 0.9).length;
  const highCount = tgs.filter((tg) => tg.utilizationRate >= 0.85 && tg.utilizationRate < 0.9).length;
  const avgAvailRatio = average(tgs.map((tg) => tg.availableToolRatio));

  return [
    {
      key: 'tg-total',
      title: '전체 TG 수',
      value: `${formatNumber(tgs.length)}개`,
      subtitle: '전체 Tool Group',
      tone: 'info',
    },
    {
      key: 'tool-total',
      title: '전체 Tool 수',
      value: `${formatNumber(props.data.tools.length)}대`,
      subtitle: 'MES 수집 장비',
    },
    {
      key: 'tg-critical',
      title: 'Critical TG',
      value: `${formatNumber(criticalCount)}개`,
      subtitle: '가동률 ≥90%',
      tone: 'critical',
    },
    {
      key: 'tg-high',
      title: 'High TG',
      value: `${formatNumber(highCount)}개`,
      subtitle: '가동률 85~90%',
      tone: 'high',
    },
    {
      key: 'tool-down',
      title: 'Down Tool',
      value: `${formatNumber(statusSummary.DOWN)}대`,
      subtitle: `Setup ${formatNumber(statusSummary.SETUP)}대 포함 시 ${formatNumber(statusSummary.DOWN + statusSummary.SETUP)}대`,
      tone: statusSummary.DOWN > 0 ? 'danger' : undefined,
    },
    {
      key: 'tg-avail',
      title: '평균 가용 장비율',
      value: formatRatioPercent(avgAvailRatio),
      subtitle: 'TG 평균 available ratio',
    },
  ];
});
</script>

<template>
  <section class="mes-tg-tool-tab">
    <MesKpiCardGrid :cards="summaryCards" :columns="6" />

    <div class="mes-tg-tool-tab__body">
      <ToolGroupListPanel
        :tool-groups="filteredToolGroups"
        :selected-tool-group-id="selectedToolGroupId"
        :search="tgSearch"
        :risk-filter="tgRiskFilter"
        :area-filter="tgAreaFilter"
        :area-options="areaOptions"
        :status-summaries="toolStatusSummaries"
        @update:search="tgSearch = $event"
        @update:risk-filter="tgRiskFilter = $event"
        @update:area-filter="emit('update:tgAreaFilter', $event)"
        @select="emit('selectToolGroup', $event)"
      />
      <ToolGroupDetailPanel
        :tool-group="selectedToolGroup"
        :tools="selectedTools"
        :tool-view-mode="toolViewMode"
        :error-message="detailErrorMessage"
        @update:tool-view-mode="emit('update:toolViewMode', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.mes-tg-tool-tab {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.mes-tg-tool-tab__body {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  min-width: 0;
}

.mes-tg-tool-tab__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.mes-tg-tool-tab__section-header h3 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.mes-tg-tool-tab__section-header span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.mes-tg-tool-tab__filters {
  display: flex;
  gap: var(--space-2);
}

.mes-tg-tool-tab__filters input,
.mes-tg-tool-tab__filters select {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  color: var(--color-fg-default);
  font-size: var(--font-size-sm);
  padding: var(--space-1) var(--space-2);
}

@media (max-width: 1100px) {
  .mes-tg-tool-tab__section-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .mes-tg-tool-tab__filters {
    flex-direction: column;
  }
}
</style>

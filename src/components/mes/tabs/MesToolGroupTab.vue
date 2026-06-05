<script setup lang="ts">
import { computed, ref } from 'vue';

import { getProcessAreaSortOrder } from '@/constants/processArea';

import type {
  MesKpiCard,
  MesMonitoringData,
  MesRiskGrade,
  MesToolGroupMetric,
  MesToolMetric,
  MesToolStatus,
  MesToolStatusSummary,
  MesToolViewMode,
} from '@/types/mes';

import MesKpiCardGrid from '@/components/mes/MesKpiCardGrid.vue';
import ToolGroupDetailPanel from '@/components/mes/ToolGroupDetailPanel.vue';
import ToolGroupListPanel from '@/components/mes/ToolGroupListPanel.vue';

import { formatNumber, formatRatioPercent } from '@/utils/format';

interface Props {
  data: MesMonitoringData;
  selectedToolGroupId: string | null;
  selectedToolGroup: MesToolGroupMetric | null;
  selectedTools: MesToolMetric[];
  toolViewMode: MesToolViewMode;
  detailErrorMessage: string | null;
  tgAreaFilter: string;
  tgRiskFilter: MesRiskGrade | 'ALL';
  tgToolStatusFilter: string;
  onDownToolClick?: () => void;
  onCriticalClick?: () => void;
  onHighClick?: () => void;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:toolViewMode': [value: MesToolViewMode];
  'update:tgAreaFilter': [value: string];
  'update:tgRiskFilter': [value: MesRiskGrade | 'ALL'];
  'clear-tool-status-filter': [];
  'set-tool-status-filter': [value: string];
  selectToolGroup: [tgId: string];
}>();

const tgSearch = ref('');

const toolStatusSummaries = computed<Record<string, MesToolStatusSummary>>(() =>
  props.data.toolGroups.reduce<Record<string, MesToolStatusSummary>>((acc, tg) => {
    acc[tg.tgId] = tg.statusSummary;
    return acc;
  }, {})
);

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
      if (props.tgRiskFilter !== 'ALL' && tg.riskGrade !== props.tgRiskFilter) return false;
      if (props.tgToolStatusFilter !== 'ALL') {
        const summary = toolStatusSummaries.value[tg.tgId];
        if (!summary || summary[props.tgToolStatusFilter as MesToolStatus] === 0) return false;
      }
      return true;
    })
    .sort((a, b) => b.utilizationRate - a.utilizationRate);
});

const summaryCards = computed<MesKpiCard[]>(() => {
  const { criticalTgCount, highTgCount, toolStatusSummary, avgAvailableToolRatio } = props.data.fabSummary;
  const tgs = props.data.toolGroups;

  return [
    {
      key: 'tg-critical',
      title: 'Critical TG',
      value: `${formatNumber(criticalTgCount)}개`,
      subtitle: '가동률 ≥90%',
      tone: 'critical',
      onClick: criticalTgCount > 0 ? props.onCriticalClick : undefined,
    },
    {
      key: 'tg-high',
      title: 'High TG',
      value: `${formatNumber(highTgCount)}개`,
      subtitle: '가동률 85~90%',
      tone: 'high',
      onClick: highTgCount > 0 ? props.onHighClick : undefined,
    },
    {
      key: 'tool-down',
      title: '정비 Tool',
      value: `${formatNumber(toolStatusSummary.DOWN)}대`,
      subtitle: '상태 원천 가동/대기/정비',
      tone: toolStatusSummary.DOWN > 0 ? 'danger' : undefined,
      onClick: toolStatusSummary.DOWN > 0 ? props.onDownToolClick : undefined,
    },
    {
      key: 'tg-avail',
      title: '평균 가용 장비율',
      value: formatRatioPercent(avgAvailableToolRatio),
      subtitle: 'TG 평균 available ratio',
    },
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
        :tool-status-filter="tgToolStatusFilter"
        @update:search="tgSearch = $event"
        @update:risk-filter="emit('update:tgRiskFilter', $event)"
        @update:area-filter="emit('update:tgAreaFilter', $event)"
        @clear-tool-status-filter="emit('clear-tool-status-filter')"
        @set-tool-status-filter="emit('set-tool-status-filter', $event)"
        @select="emit('selectToolGroup', $event)"
      />
      <ToolGroupDetailPanel
        :tool-group="selectedToolGroup"
        :tools="selectedTools"
        :tool-view-mode="toolViewMode"
        :error-message="detailErrorMessage"
        :initial-status-filter="tgToolStatusFilter"
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
</style>

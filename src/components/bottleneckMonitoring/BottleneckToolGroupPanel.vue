<script setup lang="ts">
import { computed, ref } from 'vue';

import type {
  AreaFilterOption,
  BottleneckRiskGrade,
  BottleneckToolGroupDetail,
  BottleneckToolGroupItem,
} from '@/types/bottleneckMonitoring';

import ToolGroupDetailPanel from '@/components/bottleneckMonitoring/ToolGroupDetailPanel.vue';
import ToolGroupTable from '@/components/bottleneckMonitoring/ToolGroupTable.vue';

interface Props {
  selectedArea: AreaFilterOption | null;
  toolGroups: BottleneckToolGroupItem[];
  selectedToolGroupId: string | null;
  selectedToolGroupDetail: BottleneckToolGroupDetail | null;
  loading: boolean;
  errorMessage: string | null;
  detailErrorMessage: string | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  selectToolGroup: [tgId: string];
}>();

type RiskFilter = BottleneckRiskGrade | 'ALL';

const tgSearch = ref('');
const tgRiskFilter = ref<RiskFilter>('ALL');

const filteredToolGroups = computed(() => {
  const keyword = tgSearch.value.trim().toLowerCase();
  return props.toolGroups.filter((tg) => {
    if (keyword && !tg.tgName.toLowerCase().includes(keyword)) return false;
    if (tgRiskFilter.value !== 'ALL' && tg.riskGrade !== tgRiskFilter.value) return false;
    return true;
  });
});

const title = computed(() =>
  props.selectedArea ? `${props.selectedArea.areaCode} (${props.selectedArea.areaNameKo})` : '전체 공정'
);

const subtitleCount = computed(() =>
  filteredToolGroups.value.length === props.toolGroups.length
    ? `총 ${props.toolGroups.length}개`
    : `${filteredToolGroups.value.length} / ${props.toolGroups.length}개`
);
</script>

<template>
  <section class="bottleneck-tool-group-panel" aria-labelledby="tg-panel-title">
    <header class="bottleneck-tool-group-panel__header">
      <div>
        <h2 id="tg-panel-title" class="bottleneck-tool-group-panel__title">{{ title }}</h2>
        <p class="bottleneck-tool-group-panel__subtitle">{{ subtitleCount }}</p>
      </div>
      <div class="bottleneck-tool-group-panel__controls">
        <input
          v-model="tgSearch"
          class="bottleneck-tool-group-panel__search"
          type="text"
          placeholder="TG 이름 검색..."
        />
        <div class="bottleneck-tool-group-panel__risk-filters" role="group" aria-label="위험도 필터">
          <button
            v-for="grade in ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const"
            :key="grade"
            type="button"
            class="bottleneck-tool-group-panel__risk-btn"
            :class="{ 'bottleneck-tool-group-panel__risk-btn--active': tgRiskFilter === grade }"
            @click="tgRiskFilter = grade"
          >
            {{ grade === 'ALL' ? '전체' : grade }}
          </button>
        </div>
      </div>
    </header>

    <p v-if="errorMessage" class="bottleneck-tool-group-panel__state bottleneck-tool-group-panel__state--error">
      {{ errorMessage }}
    </p>

    <div class="bottleneck-tool-group-panel__content">
      <ToolGroupTable
        :tool-groups="filteredToolGroups"
        :selected-tool-group-id="selectedToolGroupId"
        :loading="loading"
        @select-tool-group="emit('selectToolGroup', $event)"
      />
      <ToolGroupDetailPanel :detail="selectedToolGroupDetail" :error-message="detailErrorMessage" />
    </div>
  </section>
</template>

<style scoped>
.bottleneck-tool-group-panel {
  display: grid;
  gap: var(--space-3);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
}

.bottleneck-tool-group-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.bottleneck-tool-group-panel__title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.bottleneck-tool-group-panel__subtitle {
  margin-top: var(--space-1);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bottleneck-tool-group-panel__controls {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.bottleneck-tool-group-panel__search {
  width: 180px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: 4px 9px;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

.bottleneck-tool-group-panel__search:focus {
  border-color: var(--color-action-primary-border);
  outline: none;
}

.bottleneck-tool-group-panel__risk-filters {
  display: flex;
  gap: var(--space-1);
}

.bottleneck-tool-group-panel__risk-btn {
  min-height: 28px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: transparent;
  padding: 2px 10px;
  color: var(--color-fg-muted);
  cursor: pointer;
  font-size: var(--font-size-sm);
}

.bottleneck-tool-group-panel__risk-btn--active {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
  font-weight: var(--font-weight-semibold);
}

.bottleneck-tool-group-panel__state {
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.bottleneck-tool-group-panel__state--error {
  border-color: var(--color-status-danger);
  color: var(--color-status-danger);
}

.bottleneck-tool-group-panel__content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
  align-items: start;
  gap: var(--space-3);
  min-width: 0;
}

@media (max-width: 1120px) {
  .bottleneck-tool-group-panel__content {
    grid-template-columns: 1fr;
  }
}
</style>

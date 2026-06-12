<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { useAuthStore } from '@/stores/auth';

import { MOCK_THRESHOLD_CONFIGS, MOCK_THRESHOLD_HISTORY } from '@/constants/mockData/admin';

import type { AdminThresholdConfig, AdminThresholdHistory } from '@/types/admin';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseInput from '@/components/base/BaseInput.vue';
import BaseTable from '@/components/base/BaseTable.vue';
import type { BaseTableColumn, BaseTableRow } from '@/components/base/BaseTable.vue';

import { updateThresholdConfig, validateThresholdValue } from '@/utils/admin';
import { formatKoMonthDayTime } from '@/utils/format';

const authStore = useAuthStore();

type ThresholdTabId = AdminThresholdConfig['category'] | 'HISTORY';

const configs = ref(MOCK_THRESHOLD_CONFIGS.map((config) => ({ ...config })));
const histories = ref<AdminThresholdHistory[]>(MOCK_THRESHOLD_HISTORY.map((history) => ({ ...history })));
const editingConfigId = ref<string | null>(null);
const draftValues = ref<Record<string, string>>(
  Object.fromEntries(MOCK_THRESHOLD_CONFIGS.map((config) => [config.id, config.configValue]))
);
const validationErrors = ref<Record<string, string | null>>({});

const activeTab = ref<ThresholdTabId>('BOTTLENECK');

watch(activeTab, () => {
  editingConfigId.value = null;
  validationErrors.value = {};
});

const tabMeta: Record<ThresholdTabId, { label: string; title: string; description: string; source: string }> = {
  BOTTLENECK: {
    label: '병목 판정',
    title: '병목 판정 기준',
    description: '위험 등급, ML 알람 확률, 시뮬레이션 라벨링 기준을 관리합니다.',
    source: 'tm_threshold_config · ps_tg_metrics · ML alarm threshold',
  },
  KPI: {
    label: 'KPI 기준',
    title: 'KPI/대시보드 기준',
    description: '대시보드와 MES 모니터링에서 비교 기준으로 쓰는 운영 목표값입니다.',
    source: 'tm_threshold_config · DashboardService · FAB metrics',
  },
  ACTION_RULE: {
    label: '대응 룰',
    title: '대응/Agent 실행 룰',
    description: '대응안 생성 수와 Agent 연동 대기 기준처럼 실행 흐름을 제한하는 값입니다.',
    source: 'tm_threshold_config · BNC HITL · Agent sync',
  },
  HISTORY: {
    label: '변경 이력',
    title: '임계값 변경 이력',
    description: '저장된 임계값 변경 내역과 변경자를 확인합니다.',
    source: 'th_threshold_history',
  },
};

const tabs: Array<{ id: ThresholdTabId; label: string }> = [
  { id: 'BOTTLENECK', label: tabMeta.BOTTLENECK.label },
  { id: 'KPI', label: tabMeta.KPI.label },
  { id: 'ACTION_RULE', label: tabMeta.ACTION_RULE.label },
  { id: 'HISTORY', label: tabMeta.HISTORY.label },
];

const historyColumns: BaseTableColumn[] = [
  { key: 'changedAt', label: '변경일시' },
  { key: 'itemName', label: '항목' },
  { key: 'before', label: '변경 전' },
  { key: 'after', label: '변경 후' },
  { key: 'changedBy', label: '변경자' },
];

const activeConfigs = computed(() => {
  if (activeTab.value === 'HISTORY') return [];
  return configs.value.filter((config) => config.category === activeTab.value);
});
const dirtyConfigs = computed(() => configs.value.filter((config) => isConfigDirty(config)));
const latestHistory = computed(() => histories.value[0]?.changedAt ?? '');

function toRow(row: object): BaseTableRow {
  return row as BaseTableRow;
}

function updateDraft(configId: string, configValue: string) {
  draftValues.value = { ...draftValues.value, [configId]: configValue };
  const config = configs.value.find((c) => c.id === configId);
  if (config) {
    validationErrors.value = {
      ...validationErrors.value,
      [configId]: validateThresholdValue(configValue, config.valueType),
    };
  }
}

function saveConfig(configId: string) {
  const config = configs.value.find((c) => c.id === configId);
  if (!config) return;
  const error = validateThresholdValue(draftValues.value[configId] ?? '', config.valueType);
  validationErrors.value = { ...validationErrors.value, [configId]: error };
  if (error) return;
  const updatedBy = authStore.user?.loginId ?? 'admin';
  const result = updateThresholdConfig(
    configs.value,
    histories.value,
    configId,
    draftValues.value[configId] ?? '',
    updatedBy
  );
  configs.value = result.configs;
  histories.value = result.histories;
  editingConfigId.value = null;
}

function startEdit(config: AdminThresholdConfig) {
  draftValues.value = { ...draftValues.value, [config.id]: config.configValue };
  validationErrors.value = { ...validationErrors.value, [config.id]: null };
  editingConfigId.value = config.id;
}

function resetConfig(config: AdminThresholdConfig) {
  draftValues.value = { ...draftValues.value, [config.id]: config.configValue };
  validationErrors.value = { ...validationErrors.value, [config.id]: null };
  editingConfigId.value = null;
}

function isConfigDirty(config: AdminThresholdConfig) {
  return (draftValues.value[config.id] ?? '') !== config.configValue;
}

function getHistoryDate(row: BaseTableRow) {
  return formatKoMonthDayTime(String(row.changedAt));
}

function valueTypeLabel(valueType: AdminThresholdConfig['valueType']) {
  const labels: Record<AdminThresholdConfig['valueType'], string> = {
    FLOAT: '실수',
    INT: '정수',
    BOOL: '참/거짓',
    STRING: '문자',
  };
  return labels[valueType];
}
</script>

<template>
  <div class="admin-threshold-view">
    <header class="admin-threshold-view__header">
      <div>
        <h1>임계값 관리</h1>
        <p>공장 단위 병목 판정, KPI 기준, 대응 실행 룰의 현재값을 관리합니다.</p>
      </div>
    </header>

    <section class="admin-threshold-view__summary">
      <div class="surface-card">
        <span>현재 설정</span>
        <strong>{{ configs.length }}</strong>
        <small>tm_threshold_config</small>
      </div>
      <div class="surface-card">
        <span>미저장 변경</span>
        <strong>{{ dirtyConfigs.length }}</strong>
        <small>저장 시 이력 기록</small>
      </div>
      <div class="surface-card">
        <span>DB 카테고리</span>
        <strong>3</strong>
        <small>BOTTLENECK · KPI · ACTION_RULE</small>
      </div>
      <div class="surface-card">
        <span>최근 변경</span>
        <strong>{{ latestHistory ? formatKoMonthDayTime(latestHistory).slice(0, 5) : '-' }}</strong>
        <small>{{ histories.length }}건</small>
      </div>
    </section>

    <section class="admin-threshold-view__tab-shell">
      <nav class="admin-threshold-view__tabs" role="tablist" aria-label="임계값 분류">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :class="{ 'admin-threshold-view__tab--active': activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </nav>

      <div v-if="activeTab !== 'HISTORY'" class="admin-threshold-view__card surface-card" role="tabpanel">
        <div class="admin-threshold-view__title">
          <div>
            <h2>{{ tabMeta[activeTab].title }}</h2>
            <p>{{ tabMeta[activeTab].description }}</p>
          </div>
        </div>

        <div class="admin-threshold-view__source">
          <span>저장 위치: tm_threshold_config</span>
          <span>이력: th_threshold_history</span>
          <span>{{ tabMeta[activeTab].source }}</span>
        </div>

        <div class="admin-threshold-view__table-wrap">
          <table class="admin-threshold-view__table">
            <thead>
              <tr>
                <th scope="col">항목</th>
                <th scope="col">설정 키</th>
                <th scope="col">값</th>
                <th scope="col">단위</th>
                <th scope="col">타입</th>
                <th scope="col">상태</th>
                <th scope="col">관리</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="config in activeConfigs"
                :key="config.id"
                :class="{ 'admin-threshold-view__row--dirty': isConfigDirty(config) }"
              >
                <td class="admin-threshold-view__name">{{ config.description }}</td>
                <td class="admin-threshold-view__key">{{ config.configKey }}</td>
                <td class="admin-threshold-view__input-cell">
                  <template v-if="editingConfigId === config.id">
                    <BaseInput
                      :model-value="draftValues[config.id]"
                      :class="{ 'admin-threshold-view__input--error': validationErrors[config.id] }"
                      @update:model-value="updateDraft(config.id, $event)"
                    />
                    <small v-if="validationErrors[config.id]" class="admin-threshold-view__val-error">
                      {{ validationErrors[config.id] }}
                    </small>
                  </template>
                  <strong v-else>{{ config.configValue }}</strong>
                </td>
                <td>{{ config.unit || '-' }}</td>
                <td>{{ valueTypeLabel(config.valueType) }}</td>
                <td>
                  <BaseBadge v-if="editingConfigId === config.id && isConfigDirty(config)" variant="warning"
                    >변경됨</BaseBadge
                  >
                  <span v-else-if="editingConfigId === config.id" class="admin-threshold-view__editing">수정 중</span>
                  <span v-else class="admin-threshold-view__saved">저장됨</span>
                </td>
                <td>
                  <div class="admin-threshold-view__actions">
                    <BaseButton
                      v-if="editingConfigId !== config.id"
                      variant="ghost"
                      size="sm"
                      @click="startEdit(config)"
                    >
                      수정
                    </BaseButton>
                    <BaseButton
                      v-if="editingConfigId === config.id"
                      size="sm"
                      :disabled="!isConfigDirty(config) || !!validationErrors[config.id]"
                      @click="saveConfig(config.id)"
                    >
                      저장
                    </BaseButton>
                    <BaseButton
                      v-if="editingConfigId === config.id"
                      variant="ghost"
                      size="sm"
                      @click="resetConfig(config)"
                    >
                      취소
                    </BaseButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-else class="admin-threshold-view__card surface-card" role="tabpanel">
        <div class="admin-threshold-view__title">
          <div>
            <h2>{{ tabMeta.HISTORY.title }}</h2>
            <p>{{ tabMeta.HISTORY.description }}</p>
          </div>
          <BaseBadge variant="info">{{ tabMeta.HISTORY.source }}</BaseBadge>
        </div>
        <BaseTable :columns="historyColumns" :rows="histories.map(toRow)" row-key="changedAt">
          <template #cell-changedAt="{ row }">{{ getHistoryDate(row) }}</template>
        </BaseTable>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-threshold-view {
  display: grid;
  gap: var(--space-4);
}

.admin-threshold-view__header,
.admin-threshold-view__title {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-3);
}

h1,
h2,
h3,
p {
  margin: 0;
}

.admin-threshold-view__header h1 {
  color: var(--color-fg-strong);
  font-size: var(--text-page-title-size);
  line-height: var(--text-page-title-line-height);
}

.admin-threshold-view__header p,
.admin-threshold-view__title p,
.admin-threshold-view__summary small,
.admin-threshold-view__summary span,
.admin-threshold-view__source {
  color: var(--color-fg-muted);
}

.admin-threshold-view__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

.admin-threshold-view__summary div {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3);
}

.admin-threshold-view__summary strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-xl);
}

.admin-threshold-view__tabs {
  display: flex;
  gap: var(--space-1);
  border-bottom: 1px solid var(--color-border-default);
  padding: 0 var(--space-4);
}

.admin-threshold-view__tabs button {
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  background: none;
  color: var(--color-fg-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  min-height: 38px;
  padding: var(--space-3) var(--space-3);
  white-space: nowrap;
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast);
}

.admin-threshold-view__tabs button.admin-threshold-view__tab--active {
  color: var(--color-action-primary);
  border-bottom-color: var(--color-action-primary);
}

.admin-threshold-view__tabs button:not(.admin-threshold-view__tab--active):hover {
  color: var(--color-fg);
}

.admin-threshold-view__tab-shell {
  display: grid;
  align-content: start;
}

.admin-threshold-view__card {
  display: grid;
  gap: var(--space-3);
  align-content: start;
  padding: var(--space-4);
}

.admin-threshold-view__title h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

.admin-threshold-view__source {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
  font-size: var(--font-size-xs);
  padding: var(--space-2) var(--space-3);
}

.admin-threshold-view__source span + span::before {
  content: '·';
  margin-right: var(--space-2);
}

.admin-threshold-view__table-wrap {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  overflow: hidden;
}

.admin-threshold-view__table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.admin-threshold-view__table th,
.admin-threshold-view__table td {
  border-bottom: 1px solid var(--color-border-subtle);
  padding: var(--space-3);
  text-align: left;
  vertical-align: middle;
}

.admin-threshold-view__table th {
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.admin-threshold-view__table th:nth-child(1) {
  width: 25%;
}

.admin-threshold-view__table th:nth-child(2) {
  width: 25%;
}

.admin-threshold-view__table th:nth-child(3) {
  width: 120px;
}

.admin-threshold-view__table th:nth-child(4),
.admin-threshold-view__table th:nth-child(5),
.admin-threshold-view__table th:nth-child(6) {
  width: 76px;
}

.admin-threshold-view__table th:nth-child(7) {
  width: 132px;
}

.admin-threshold-view__table tbody tr:last-child td {
  border-bottom: 0;
}

.admin-threshold-view__table tbody tr:hover {
  background: var(--color-bg-subtle);
}

.admin-threshold-view__row--dirty {
  background: color-mix(in srgb, var(--color-risk-medium) 8%, var(--color-bg-surface));
}

.admin-threshold-view__name {
  color: var(--color-fg-strong);
  font-weight: 700;
}

.admin-threshold-view__key,
.admin-threshold-view__saved,
.admin-threshold-view__editing,
.admin-threshold-view__table td {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.admin-threshold-view__key {
  font-family: var(--font-family-mono);
  word-break: break-word;
}

.admin-threshold-view__input-cell :deep(.input) {
  min-height: 34px;
  text-align: right;
}

.admin-threshold-view__input--error :deep(.input) {
  border-color: var(--color-risk-critical);
  outline-color: var(--color-risk-critical);
}

.admin-threshold-view__val-error {
  display: block;
  color: var(--color-risk-critical);
  font-size: var(--font-size-xs);
  margin-top: 2px;
}

.admin-threshold-view__input-cell strong {
  display: inline-block;
  min-width: 72px;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  text-align: right;
}

.admin-threshold-view__editing {
  color: var(--color-fg-strong);
  font-weight: 700;
}

.admin-threshold-view__actions {
  display: flex;
  gap: var(--space-1);
}

@media (max-width: 1100px) {
  .admin-threshold-view__summary {
    grid-template-columns: 1fr;
  }

  .admin-threshold-view__table-wrap {
    overflow-x: auto;
  }

  .admin-threshold-view__table {
    min-width: 820px;
  }

  .admin-threshold-view__title,
  .admin-threshold-view__header {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

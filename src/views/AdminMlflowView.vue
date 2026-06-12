<script setup lang="ts">
import { computed, ref } from 'vue';

import { MOCK_DRIFT_ALERTS, MOCK_ML_MODEL_VERSIONS } from '@/constants/mockData/admin';

import type { AdminDriftAlert, AdminMlModelVersion } from '@/types/admin';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseInput from '@/components/base/BaseInput.vue';
import BaseModal from '@/components/base/BaseModal.vue';

import { formatKoMonthDayTime, formatNumber, formatRatioPercent } from '@/utils/format';

const models = ref(MOCK_ML_MODEL_VERSIONS.map((model) => ({ ...model, featureList: [...model.featureList] })));
const driftAlerts = ref(MOCK_DRIFT_ALERTS.map((alert) => ({ ...alert })));
const selectedModelId = ref(models.value.find((model) => model.status === 'ACTIVE')?.id ?? models.value[0]?.id ?? '');
const keyword = ref('');
const statusFilter = ref<AdminMlModelVersion['status'] | 'ALL'>('ALL');
const pendingPromote = ref<AdminMlModelVersion | null>(null);

const filteredModels = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase();
  return models.value.filter((model) => {
    const matchesStatus = statusFilter.value === 'ALL' || model.status === statusFilter.value;
    const matchesKeyword =
      !normalizedKeyword ||
      `${model.modelName} ${model.mlflowVersion} ${model.mlflowRunId} ${model.featureList.join(' ')}`
        .toLowerCase()
        .includes(normalizedKeyword);
    return matchesStatus && matchesKeyword;
  });
});
const activeModel = computed(() => models.value.find((model) => model.status === 'ACTIVE') ?? null);
const selectedModel = computed(
  () =>
    models.value.find((model) => model.id === selectedModelId.value) ??
    filteredModels.value[0] ??
    models.value[0] ??
    null
);
const stagingCount = computed(() => models.value.filter((model) => model.status === 'STAGING').length);
const latestDrift = computed(
  () => [...driftAlerts.value].sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))[0] ?? null
);
const retrainPendingCount = computed(() => driftAlerts.value.filter((alert) => !alert.isRetrainTriggered).length);

const statusOptions: Array<{ value: AdminMlModelVersion['status'] | 'ALL'; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'ACTIVE', label: '운영' },
  { value: 'STAGING', label: '검증' },
  { value: 'RETIRED', label: '보관' },
];

function statusLabel(status: AdminMlModelVersion['status']) {
  const labels: Record<AdminMlModelVersion['status'], string> = {
    ACTIVE: '운영',
    STAGING: '검증',
    RETIRED: '보관',
  };
  return labels[status];
}

function statusVariant(status: AdminMlModelVersion['status']) {
  if (status === 'ACTIVE') return 'success';
  if (status === 'STAGING') return 'warning';
  return 'info';
}

function requestPromote(model: AdminMlModelVersion) {
  if (model.status !== 'STAGING') return;
  pendingPromote.value = model;
}

function confirmPromote() {
  const model = pendingPromote.value;
  if (!model) return;
  models.value = models.value.map((item) => {
    if (item.id === model.id) return { ...item, status: 'ACTIVE' as const };
    if (item.modelName === model.modelName && item.status === 'ACTIVE') return { ...item, status: 'RETIRED' as const };
    return item;
  });
  selectedModelId.value = model.id;
  pendingPromote.value = null;
}

function markRetrainRequested(alert: AdminDriftAlert) {
  driftAlerts.value = driftAlerts.value.map((item) =>
    item.id === alert.id
      ? {
          ...item,
          isRetrainTriggered: true,
          retrainTriggeredAt: new Date().toISOString(),
        }
      : item
  );
}

function modelVersionName(modelId: string | null) {
  if (!modelId) return '-';
  const model = models.value.find((item) => item.id === modelId);
  return model ? `v${model.mlflowVersion}` : '-';
}
</script>

<template>
  <div class="admin-mlflow-view">
    <header class="admin-mlflow-view__header">
      <div>
        <h1>MLflow 모니터링</h1>
        <p>병목 감지 모델의 운영 버전, 후보 버전, 성능 지표와 drift 재학습 흐름을 점검합니다.</p>
      </div>
      <div class="admin-mlflow-view__tools">
        <BaseInput v-model="keyword" type="search" placeholder="모델명, 버전, Run ID 검색" />
        <select v-model="statusFilter" class="input">
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </header>

    <section class="admin-mlflow-view__summary">
      <div class="surface-card">
        <span>운영 모델</span>
        <strong>{{ activeModel ? `v${activeModel.mlflowVersion}` : '-' }}</strong>
        <small>{{ activeModel?.modelName ?? 'ACTIVE 없음' }}</small>
      </div>
      <div class="surface-card">
        <span>검증 후보</span>
        <strong>{{ stagingCount }}</strong>
        <small>STAGING 모델</small>
      </div>
      <div class="surface-card">
        <span>최근 Drift</span>
        <strong>{{ latestDrift ? latestDrift.triggerType : '-' }}</strong>
        <small>{{ latestDrift ? formatKoMonthDayTime(latestDrift.detectedAt) : '감지 없음' }}</small>
      </div>
      <div class="surface-card">
        <span>재학습 필요</span>
        <strong>{{ retrainPendingCount }}</strong>
        <small>요청 대기 drift</small>
      </div>
    </section>

    <section class="admin-mlflow-view__layout">
      <div class="admin-mlflow-view__registry surface-card">
        <div class="admin-mlflow-view__section-title">
          <div>
            <h2>모델 Registry</h2>
            <p>th_ml_model_version 기준 모델명당 ACTIVE 버전은 하나만 유지합니다.</p>
          </div>
        </div>

        <div class="admin-mlflow-view__table-wrap">
          <table class="admin-mlflow-view__table">
            <thead>
              <tr>
                <th scope="col">상태</th>
                <th scope="col">모델/버전</th>
                <th scope="col">F1</th>
                <th scope="col">AUC</th>
                <th scope="col">Accuracy</th>
                <th scope="col">학습 Row</th>
                <th scope="col">학습 시점</th>
                <th scope="col">관리</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="model in filteredModels"
                :key="model.id"
                :class="{ 'admin-mlflow-view__row--selected': selectedModel?.id === model.id }"
                @click="selectedModelId = model.id"
              >
                <td>
                  <BaseBadge :variant="statusVariant(model.status)">{{ statusLabel(model.status) }}</BaseBadge>
                </td>
                <td>
                  <strong>{{ model.modelName }} v{{ model.mlflowVersion }}</strong>
                  <small>{{ model.mlflowRunId }}</small>
                </td>
                <td>{{ formatRatioPercent(model.f1Score) }}</td>
                <td>{{ formatRatioPercent(model.aucRoc) }}</td>
                <td>{{ formatRatioPercent(model.accuracy) }}</td>
                <td>{{ formatNumber(model.trainRowCount) }}</td>
                <td>{{ formatKoMonthDayTime(model.trainedAt) }}</td>
                <td>
                  <BaseButton
                    v-if="model.status === 'STAGING'"
                    size="sm"
                    variant="ghost"
                    @click.stop="requestPromote(model)"
                  >
                    운영 전환
                  </BaseButton>
                  <span v-else class="admin-mlflow-view__muted">{{
                    model.status === 'ACTIVE' ? '운영 중' : '보관'
                  }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <aside v-if="selectedModel" class="admin-mlflow-view__features-panel surface-card">
        <div class="admin-mlflow-view__section-title">
          <div>
            <h2>주요 Feature</h2>
            <p>{{ selectedModel.modelName }} v{{ selectedModel.mlflowVersion }}</p>
          </div>
        </div>
        <ul>
          <li v-for="feature in selectedModel.featureList" :key="feature">{{ feature }}</li>
        </ul>
      </aside>
    </section>

    <section class="admin-mlflow-view__drift surface-card">
      <div class="admin-mlflow-view__section-title">
        <div>
          <h2>Drift / 재학습 신호</h2>
          <p>th_drift_alert 기준으로 PSI/F1 저하와 재학습 연결 상태를 확인합니다.</p>
        </div>
      </div>

      <div class="admin-mlflow-view__table-wrap">
        <table class="admin-mlflow-view__table">
          <thead>
            <tr>
              <th scope="col">감지 시점</th>
              <th scope="col">모델</th>
              <th scope="col">Trigger</th>
              <th scope="col">PSI</th>
              <th scope="col">F1 감지값</th>
              <th scope="col">재학습</th>
              <th scope="col">결과 버전</th>
              <th scope="col">관리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="alert in driftAlerts" :key="alert.id">
              <td>{{ formatKoMonthDayTime(alert.detectedAt) }}</td>
              <td>{{ modelVersionName(alert.modelVersionId) }}</td>
              <td>
                <BaseBadge variant="warning">{{ alert.triggerType }}</BaseBadge>
              </td>
              <td>{{ alert.psiScore === null ? '-' : alert.psiScore.toFixed(3) }}</td>
              <td>{{ formatRatioPercent(alert.f1AtDetection) }}</td>
              <td>{{ alert.isRetrainTriggered ? '요청됨' : '대기' }}</td>
              <td>{{ modelVersionName(alert.resultingModelVersionId) }}</td>
              <td>
                <BaseButton
                  size="sm"
                  variant="ghost"
                  :disabled="alert.isRetrainTriggered"
                  @click="markRetrainRequested(alert)"
                >
                  재학습 요청
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>

  <BaseModal
    :model-value="Boolean(pendingPromote)"
    title="운영 전환 확인"
    width="420px"
    @update:model-value="pendingPromote = null"
  >
    <div v-if="pendingPromote" class="admin-mlflow-view__promote-confirm">
      <p>
        <strong>{{ pendingPromote.modelName }} v{{ pendingPromote.mlflowVersion }}</strong
        >을 운영 버전으로 전환합니다.
      </p>
      <p class="admin-mlflow-view__promote-warn">
        현재 운영 중인 버전은 보관 상태로 변경됩니다. 이 작업은 되돌릴 수 없습니다.
      </p>
      <dl>
        <div>
          <dt>F1 Score</dt>
          <dd>{{ formatRatioPercent(pendingPromote.f1Score) }}</dd>
        </div>
        <div>
          <dt>AUC-ROC</dt>
          <dd>{{ formatRatioPercent(pendingPromote.aucRoc) }}</dd>
        </div>
        <div>
          <dt>학습 Row</dt>
          <dd>{{ formatNumber(pendingPromote.trainRowCount) }}</dd>
        </div>
      </dl>
      <footer class="admin-mlflow-view__promote-footer">
        <BaseButton size="sm" @click="confirmPromote">전환 확인</BaseButton>
        <BaseButton size="sm" variant="ghost" @click="pendingPromote = null">취소</BaseButton>
      </footer>
    </div>
  </BaseModal>
</template>

<style scoped>
.admin-mlflow-view {
  display: grid;
  gap: var(--space-4);
}

.admin-mlflow-view__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 420px);
  align-items: end;
  gap: var(--space-4);
}

.admin-mlflow-view__header h1,
.admin-mlflow-view__header p,
.admin-mlflow-view__section-title h2,
.admin-mlflow-view__section-title p {
  margin: 0;
}

.admin-mlflow-view__header h1 {
  color: var(--color-fg-strong);
  font-size: var(--text-page-title-size);
  line-height: var(--text-page-title-line-height);
}

.admin-mlflow-view__header p,
.admin-mlflow-view__summary span,
.admin-mlflow-view__summary small,
.admin-mlflow-view__section-title p,
.admin-mlflow-view__muted {
  color: var(--color-fg-muted);
}

.admin-mlflow-view__tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 120px;
  gap: var(--space-2);
}

.admin-mlflow-view__summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

.admin-mlflow-view__summary div {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3);
}

.admin-mlflow-view__summary strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-xl);
}

.admin-mlflow-view__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 280px);
  gap: var(--space-4);
  align-items: start;
}

.admin-mlflow-view__registry,
.admin-mlflow-view__features-panel,
.admin-mlflow-view__drift {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
}

.admin-mlflow-view__section-title {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.admin-mlflow-view__section-title h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
}

.admin-mlflow-view__table-wrap {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  overflow: auto;
}

.admin-mlflow-view__table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
}

.admin-mlflow-view__table th,
.admin-mlflow-view__table td {
  border-bottom: 1px solid var(--color-border-subtle);
  padding: var(--space-3);
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
}

.admin-mlflow-view__table th {
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.admin-mlflow-view__table tbody tr {
  cursor: pointer;
}

.admin-mlflow-view__table tbody tr:hover,
.admin-mlflow-view__row--selected {
  background: var(--color-bg-subtle);
}

.admin-mlflow-view__table td {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.admin-mlflow-view__table td strong {
  display: block;
  color: var(--color-fg-strong);
}

.admin-mlflow-view__table td small {
  color: var(--color-fg-muted);
  font-family: var(--font-family-mono);
}

.admin-mlflow-view__features-panel ul {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.admin-mlflow-view__features-panel li {
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
  color: var(--color-fg-strong);
  font-family: var(--font-family-mono);
  font-size: var(--font-size-sm);
  padding: var(--space-2);
}

.admin-mlflow-view__promote-confirm {
  display: grid;
  gap: var(--space-3);
}

.admin-mlflow-view__promote-confirm p {
  margin: 0;
  color: var(--color-fg-muted);
}

.admin-mlflow-view__promote-confirm strong {
  color: var(--color-fg-strong);
}

.admin-mlflow-view__promote-warn {
  border-left: 3px solid var(--color-risk-high);
  padding-left: var(--space-3);
  font-size: var(--font-size-sm);
}

.admin-mlflow-view__promote-confirm dl {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

.admin-mlflow-view__promote-confirm dl div {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: var(--space-2);
  border-bottom: 1px solid var(--color-border-subtle);
  padding-bottom: var(--space-2);
}

.admin-mlflow-view__promote-confirm dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.admin-mlflow-view__promote-confirm dd {
  margin: 0;
  color: var(--color-fg-strong);
  font-weight: 700;
}

.admin-mlflow-view__promote-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

@media (max-width: 1100px) {
  .admin-mlflow-view__header,
  .admin-mlflow-view__summary,
  .admin-mlflow-view__layout {
    grid-template-columns: 1fr;
  }
}
</style>

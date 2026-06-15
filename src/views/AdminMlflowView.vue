<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
  fetchMlflowDriftAlerts,
  fetchMlflowModelVersions,
  holdMlflowRetrain,
  promoteMlflowModel,
  requestMlflowRetrain,
} from '@/services/adminService';

import type { AdminDriftAlert, AdminMlModelVersion, DriftRetrainDecision } from '@/types/admin';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BaseInput from '@/components/base/BaseInput.vue';
import BaseModal from '@/components/base/BaseModal.vue';

import { formatKoMonthDayTime, formatRatioPercent } from '@/utils/format';

const route = useRoute();
const router = useRouter();
const models = ref<AdminMlModelVersion[]>([]);
const driftAlerts = ref<AdminDriftAlert[]>([]);
const keyword = ref('');
const statusFilter = ref<AdminMlModelVersion['status'] | 'ALL'>('ALL');
const pendingPromote = ref<AdminMlModelVersion | null>(null);
const reportAlert = ref<AdminDriftAlert | null>(null);
const reportDecisionMode = ref<'APPROVE' | 'HOLD'>('APPROVE');
const approvalReasonCode = ref('F1_BELOW_THRESHOLD');
const holdReasonText = ref('');
const isLoading = ref(false);
const isActionPending = ref(false);
const errorMessage = ref<string | null>(null);

const filteredModels = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return models.value.filter((model) => {
    const matchesStatus = statusFilter.value === 'ALL' || model.status === statusFilter.value;
    const matchesKeyword = !kw || `${model.modelName} ${model.mlflowVersion}`.toLowerCase().includes(kw);
    return matchesStatus && matchesKeyword;
  });
});

const activeModel = computed(() => models.value.find((m) => m.status === 'ACTIVE') ?? null);
const stagingCount = computed(() => models.value.filter((m) => m.status === 'STAGING').length);
const retrainPendingCount = computed(
  () => driftAlerts.value.filter((a) => !a.isRetrainTriggered && !isRetrainOnHold(a)).length
);

const statusOptions: Array<{ value: AdminMlModelVersion['status'] | 'ALL'; label: string }> = [
  { value: 'ALL', label: '전체' },
  { value: 'ACTIVE', label: '운영' },
  { value: 'STAGING', label: '검증' },
  { value: 'RETIRED', label: '보관' },
];

const approvalReasonOptions = [
  { value: 'F1_BELOW_THRESHOLD', label: 'F1이 임계값보다 낮음' },
  { value: 'TOP_TG_ERROR_CONCENTRATION', label: '특정 ToolGroup 미탐/오탐 집중' },
  { value: 'REPEATED_DRIFT_PATTERN', label: '반복 드리프트 패턴 확인' },
  { value: 'OTHER', label: '기타' },
];
const customApprovalReason = ref('');

const selectedApprovalReason = computed(
  () => approvalReasonOptions.find((o) => o.value === approvalReasonCode.value) ?? approvalReasonOptions[0]
);

const promoteRecommendation = computed(() => {
  const cand = pendingPromote.value;
  if (!cand) return '';
  const active = activeModel.value;
  if (!active || active.f1Score == null || cand.f1Score == null) {
    return '현재 운영 모델이 없습니다. 첫 운영 반영입니다.';
  }
  return cand.f1Score >= active.f1Score
    ? '후보 F1이 현재 운영 모델 이상입니다. 운영 반영 권장.'
    : '후보 F1이 현재 운영 모델보다 낮습니다. 운영 반영 전 검토 필요.';
});

const canSubmitReportDecision = computed(() => {
  if (!reportAlert.value || isActionPending.value || retrainDecision(reportAlert.value)) return false;
  if (reportDecisionMode.value === 'APPROVE') {
    if (!approvalReasonCode.value) return false;
    if (approvalReasonCode.value === 'OTHER') return customApprovalReason.value.trim().length > 0;
    return true;
  }
  return holdReasonText.value.trim().length > 0;
});

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

function retrainStatusVariant(alert: AdminDriftAlert) {
  if (alert.isRetrainTriggered) return 'success';
  if (isRetrainOnHold(alert)) return 'info';
  return 'warning';
}

function requestPromote(model: AdminMlModelVersion) {
  if (model.status !== 'STAGING') return;
  pendingPromote.value = model;
}

function openReport(alert: AdminDriftAlert) {
  reportAlert.value = alert;
  reportDecisionMode.value = 'APPROVE';
  approvalReasonCode.value = approvalReasonOptions[0].value;
  holdReasonText.value = '';
  customApprovalReason.value = '';
}

async function loadMlflowData() {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const [modelRows, driftRows] = await Promise.all([fetchMlflowModelVersions(), fetchMlflowDriftAlerts()]);
    models.value = modelRows.map((m) => ({ ...m, featureList: [...(m.featureList ?? [])] }));
    driftAlerts.value = driftRows;
    openRouteDriftReport();
  } catch (error) {
    console.error('[AdminMlflowView] load failed:', error);
    errorMessage.value = 'MLflow 운영 데이터를 불러오지 못했습니다.';
  } finally {
    isLoading.value = false;
  }
}

async function confirmPromote() {
  const model = pendingPromote.value;
  if (!model) return;
  isActionPending.value = true;
  errorMessage.value = null;
  try {
    await promoteMlflowModel(model.id);
    pendingPromote.value = null;
    await loadMlflowData();
  } catch (error) {
    console.error('[AdminMlflowView] promote failed:', error);
    errorMessage.value = '운영 전환에 실패했습니다. MLflow 서버와 모델 alias 상태를 확인하세요.';
  } finally {
    isActionPending.value = false;
  }
}

async function submitReportDecision() {
  const alert = reportAlert.value;
  if (!alert || !canSubmitReportDecision.value) return;
  isActionPending.value = true;
  errorMessage.value = null;
  try {
    const updated =
      reportDecisionMode.value === 'APPROVE'
        ? await requestMlflowRetrain(alert.id, {
            reasonCode: selectedApprovalReason.value.value,
            reasonText:
              approvalReasonCode.value === 'OTHER'
                ? customApprovalReason.value.trim()
                : selectedApprovalReason.value.label,
          })
        : await holdMlflowRetrain(alert.id, {
            reasonCode: 'MANUAL_HOLD',
            reasonText: holdReasonText.value.trim(),
          });
    driftAlerts.value = driftAlerts.value.map((item) => (item.id === alert.id ? updated : item));
    reportAlert.value = updated;
  } catch (error) {
    console.error('[AdminMlflowView] retrain decision failed:', error);
    errorMessage.value = '재학습 결정 상태를 기록하지 못했습니다.';
  } finally {
    isActionPending.value = false;
  }
}

function modelVersionName(modelId: string | null) {
  if (!modelId) return '-';
  const model = models.value.find((m) => m.id === modelId);
  return model ? `${model.modelName} v${model.mlflowVersion}` : '-';
}

function contributorName(contributor: { toolgroup?: string; tg_name?: string }) {
  return contributor.toolgroup ?? contributor.tg_name ?? '-';
}

function retrainDecision(alert: AdminDriftAlert | null): DriftRetrainDecision | null {
  return alert?.detail?.retrain_decision ?? alert?.detail?.retrain_approval ?? null;
}

function isRetrainOnHold(alert: AdminDriftAlert) {
  return retrainDecision(alert)?.status === 'ON_HOLD';
}

function retrainStatusLabel(alert: AdminDriftAlert) {
  if (alert.isRetrainTriggered) return '승인됨';
  if (isRetrainOnHold(alert)) return '보류됨';
  return '승인 대기';
}

function alertBaselineF1(alert: AdminDriftAlert) {
  return alert.detail?.f1_baseline ?? null;
}

function alertCurrentF1(alert: AdminDriftAlert) {
  return alert.f1AtDetection ?? alert.detail?.f1_current ?? null;
}

function alertThreshold(alert: AdminDriftAlert) {
  return alert.detail?.threshold ?? null;
}

function decisionReasonCodeLabel(reasonCode: string | null | undefined) {
  const option = approvalReasonOptions.find((item) => item.value === reasonCode);
  if (option) return option.label;
  if (reasonCode === 'MANUAL_HOLD') return '관리자 보류';
  return '';
}

function decisionReasonText(decision: DriftRetrainDecision | null) {
  const savedReason =
    decision?.reason_text?.trim() ||
    decision?.reasonText?.trim() ||
    decision?.reason?.trim() ||
    decisionReasonCodeLabel(decision?.reason_code ?? decision?.reasonCode);
  if (savedReason) return savedReason;
  if (decision?.status === 'APPROVED') return '관리자 승인';
  if (decision?.status === 'ON_HOLD') return '관리자 보류';
  return '';
}

function decisionReason(alert: AdminDriftAlert) {
  return decisionReasonText(retrainDecision(alert));
}

function decisionStatusLabel(decision: DriftRetrainDecision | null) {
  if (!decision) return '확인 필요';
  if (decision.status === 'APPROVED') return '승인됨';
  if (decision.status === 'ON_HOLD') return '보류됨';
  return '확인 필요';
}

function decisionUserName(decision: DriftRetrainDecision | null) {
  if (!decision) return '-';
  return decision.decided_by_name ?? decision.approved_by_name ?? '-';
}

function decisionAt(decision: DriftRetrainDecision | null) {
  if (!decision) return null;
  return decision.decided_at ?? decision.approved_at ?? null;
}

function formatDecisionAt(decision: DriftRetrainDecision | null) {
  const at = decisionAt(decision);
  return at ? formatKoMonthDayTime(at) : '-';
}

function routeDriftId() {
  return typeof route.query.driftId === 'string' ? route.query.driftId : null;
}

function openRouteDriftReport() {
  const driftId = routeDriftId();
  if (!driftId) return;
  const target = driftAlerts.value.find((a) => a.id === driftId);
  if (target) openReport(target);
}

function closeReport() {
  reportAlert.value = null;
  if (route.query.driftId) {
    const query = { ...route.query };
    delete query.driftId;
    void router.replace({ query });
  }
}

onMounted(() => {
  void loadMlflowData();
});

watch(
  () => route.query.driftId,
  () => openRouteDriftReport()
);
</script>

<template>
  <div class="admin-mlflow-view">
    <header class="admin-mlflow-view__header">
      <div>
        <h1>MLflow 모니터링</h1>
        <p>병목 감지 모델 버전 · 성능 지표 · drift 재학습 흐름을 관리합니다.</p>
      </div>
      <div class="admin-mlflow-view__tools">
        <BaseInput v-model="keyword" type="search" placeholder="모델명·버전 검색" />
        <select v-model="statusFilter" class="input">
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </header>

    <p v-if="errorMessage" class="admin-mlflow-view__error">{{ errorMessage }}</p>
    <p v-else-if="isLoading" class="admin-mlflow-view__loading">MLflow 운영 데이터를 불러오는 중입니다.</p>

    <section class="admin-mlflow-view__summary">
      <div class="surface-card">
        <span>운영 모델</span>
        <strong>{{ activeModel ? `v${activeModel.mlflowVersion}` : '-' }}</strong>
        <small>{{ activeModel?.modelName ?? 'ACTIVE 없음' }}</small>
      </div>
      <div class="surface-card">
        <span>운영 F1</span>
        <strong>{{ formatRatioPercent(activeModel?.f1Score ?? null) }}</strong>
        <small>현재 ACTIVE 모델</small>
      </div>
      <div class="surface-card">
        <span>검증 후보</span>
        <strong>{{ stagingCount }}</strong>
        <small>STAGING 모델</small>
      </div>
      <div class="surface-card" :class="{ 'admin-mlflow-view__summary-alert': retrainPendingCount > 0 }">
        <span>재학습 승인 대기</span>
        <strong>{{ retrainPendingCount }}</strong>
        <small>{{ retrainPendingCount > 0 ? '관리자 확인 필요' : '처리 완료' }}</small>
      </div>
    </section>

    <section class="admin-mlflow-view__registry surface-card">
      <div class="admin-mlflow-view__section-title">
        <div>
          <h2>모델 Registry</h2>
          <p>모델명당 ACTIVE 버전은 하나만 유지합니다.</p>
        </div>
      </div>

      <div class="admin-mlflow-view__table-wrap">
        <table class="admin-mlflow-view__table">
          <thead>
            <tr>
              <th scope="col">상태</th>
              <th scope="col">모델 / 버전</th>
              <th scope="col">F1</th>
              <th scope="col">AUC-ROC</th>
              <th scope="col">학습 시점</th>
              <th scope="col">관리</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredModels.length === 0">
              <td colspan="6" class="admin-mlflow-view__empty">등록된 모델 버전이 없습니다.</td>
            </tr>
            <tr v-for="model in filteredModels" :key="model.id">
              <td>
                <BaseBadge :variant="statusVariant(model.status)">{{ statusLabel(model.status) }}</BaseBadge>
              </td>
              <td>
                <strong>{{ model.modelName }} v{{ model.mlflowVersion }}</strong>
              </td>
              <td>
                <span :class="{ 'admin-mlflow-view__f1-active': model.status === 'ACTIVE' }">
                  {{ formatRatioPercent(model.f1Score) }}
                </span>
              </td>
              <td>{{ formatRatioPercent(model.aucRoc) }}</td>
              <td>{{ formatKoMonthDayTime(model.trainedAt) }}</td>
              <td>
                <BaseButton
                  v-if="model.status === 'STAGING'"
                  size="sm"
                  variant="ghost"
                  :disabled="isActionPending"
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
    </section>

    <section class="admin-mlflow-view__drift surface-card">
      <div class="admin-mlflow-view__section-title">
        <div>
          <h2>Drift 알림 · 재학습 승인</h2>
          <p>성능 저하 감지 이력과 재학습 승인 현황입니다.</p>
        </div>
      </div>

      <div class="admin-mlflow-view__table-wrap">
        <table class="admin-mlflow-view__table admin-mlflow-view__drift-table">
          <thead>
            <tr>
              <th scope="col">감지 / 모델</th>
              <th scope="col">Trigger</th>
              <th scope="col">F1 변화</th>
              <th scope="col">재학습 승인</th>
              <th scope="col">상세</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="driftAlerts.length === 0">
              <td colspan="5" class="admin-mlflow-view__empty">감지된 drift 알림이 없습니다.</td>
            </tr>
            <tr v-for="alert in driftAlerts" :key="alert.id">
              <td>
                <div class="admin-mlflow-view__drift-main">
                  <strong>{{ formatKoMonthDayTime(alert.detectedAt) }}</strong>
                  <small>{{ modelVersionName(alert.modelVersionId) }}</small>
                </div>
              </td>
              <td>{{ alert.triggerType }}</td>
              <td>
                <div class="admin-mlflow-view__f1-delta">
                  <span class="admin-mlflow-view__f1-baseline">{{ formatRatioPercent(alertBaselineF1(alert)) }}</span>
                  <span class="admin-mlflow-view__f1-arrow">→</span>
                  <span class="admin-mlflow-view__f1-current">{{ formatRatioPercent(alertCurrentF1(alert)) }}</span>
                </div>
                <small v-if="alertThreshold(alert) !== null" class="admin-mlflow-view__metric-sub">
                  임계 {{ formatRatioPercent(alertThreshold(alert)) }}
                </small>
              </td>
              <td>
                <div class="admin-mlflow-view__decision-cell">
                  <BaseBadge :variant="retrainStatusVariant(alert)">{{ retrainStatusLabel(alert) }}</BaseBadge>
                  <small v-if="decisionReason(alert)">{{ decisionReason(alert) }}</small>
                </div>
              </td>
              <td>
                <BaseButton v-if="alert.detail" size="sm" variant="ghost" @click="openReport(alert)"> 상세 </BaseButton>
                <span v-else class="admin-mlflow-view__muted">-</span>
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
      <dl>
        <div>
          <dt>F1 (현재 → 후보)</dt>
          <dd>
            {{ formatRatioPercent(activeModel?.f1Score ?? null) }} →
            {{ formatRatioPercent(pendingPromote.f1Score) }}
          </dd>
        </div>
        <div>
          <dt>AUC-ROC (현재 → 후보)</dt>
          <dd>
            {{ formatRatioPercent(activeModel?.aucRoc ?? null) }} →
            {{ formatRatioPercent(pendingPromote.aucRoc) }}
          </dd>
        </div>
        <div>
          <dt>학습 시점</dt>
          <dd>{{ formatKoMonthDayTime(pendingPromote.trainedAt) }}</dd>
        </div>
      </dl>
      <p class="admin-mlflow-view__promote-reco">{{ promoteRecommendation }}</p>
      <footer class="admin-mlflow-view__promote-footer">
        <BaseButton size="sm" :disabled="isActionPending" @click="confirmPromote">전환 확인</BaseButton>
        <BaseButton size="sm" variant="ghost" @click="pendingPromote = null">취소</BaseButton>
      </footer>
    </div>
  </BaseModal>

  <BaseModal :model-value="Boolean(reportAlert)" title="Drift 상세" width="520px" @update:model-value="closeReport">
    <div v-if="reportAlert?.detail" class="admin-mlflow-view__report">
      <div class="admin-mlflow-view__report-f1-row">
        <div class="admin-mlflow-view__report-f1-item">
          <span>기준 F1</span>
          <strong>{{ formatRatioPercent(reportAlert.detail.f1_baseline ?? null) }}</strong>
        </div>
        <span class="admin-mlflow-view__report-f1-sep">→</span>
        <div class="admin-mlflow-view__report-f1-item admin-mlflow-view__report-f1-current">
          <span>현재 F1</span>
          <strong>{{ formatRatioPercent(reportAlert.detail.f1_current) }}</strong>
        </div>
        <div class="admin-mlflow-view__report-f1-item">
          <span>임계값</span>
          <strong>{{ formatRatioPercent(reportAlert.detail.threshold) }}</strong>
        </div>
      </div>

      <dl class="admin-mlflow-view__report-meta">
        <div>
          <dt>평가 윈도우</dt>
          <dd>최근 {{ reportAlert.detail.eval_window_hours }}시간</dd>
        </div>
        <div>
          <dt>라벨 샘플</dt>
          <dd>{{ reportAlert.detail.sample_count?.toLocaleString() }}건</dd>
        </div>
        <div>
          <dt>감지 모델</dt>
          <dd>
            {{
              reportAlert.detail.active_version
                ? 'v' + reportAlert.detail.active_version
                : modelVersionName(reportAlert.modelVersionId)
            }}
          </dd>
        </div>
      </dl>

      <template v-if="reportAlert.detail.top_contributors?.length">
        <h3 class="admin-mlflow-view__report-subtitle">미탐/오탐 집중 ToolGroup</h3>
        <table class="admin-mlflow-view__report-table">
          <thead>
            <tr>
              <th scope="col">ToolGroup</th>
              <th scope="col">미탐 (FN)</th>
              <th scope="col">오탐 (FP)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="contributor in reportAlert.detail.top_contributors" :key="contributorName(contributor)">
              <td>{{ contributorName(contributor) }}</td>
              <td>{{ contributor.fn }}</td>
              <td>{{ contributor.fp }}</td>
            </tr>
          </tbody>
        </table>
      </template>

      <dl v-if="retrainDecision(reportAlert)" class="admin-mlflow-view__report-approval">
        <div>
          <dt>결정</dt>
          <dd>{{ decisionStatusLabel(retrainDecision(reportAlert)) }}</dd>
        </div>
        <div>
          <dt>결정자</dt>
          <dd>{{ decisionUserName(retrainDecision(reportAlert)) }}</dd>
        </div>
        <div>
          <dt>결정 시각</dt>
          <dd>{{ formatDecisionAt(retrainDecision(reportAlert)) }}</dd>
        </div>
        <div>
          <dt>사유</dt>
          <dd>{{ decisionReasonText(retrainDecision(reportAlert)) || '-' }}</dd>
        </div>
      </dl>

      <section v-else class="admin-mlflow-view__decision-form">
        <div class="admin-mlflow-view__decision-head">
          <h3>재학습 결정</h3>
          <p>재학습 승인 또는 보류를 선택합니다.</p>
        </div>
        <div class="admin-mlflow-view__decision-toggle" role="group" aria-label="재학습 결정">
          <button
            type="button"
            :class="{ 'admin-mlflow-view__decision-toggle-button--active': reportDecisionMode === 'APPROVE' }"
            @click="reportDecisionMode = 'APPROVE'"
          >
            승인
          </button>
          <button
            type="button"
            :class="{ 'admin-mlflow-view__decision-toggle-button--active': reportDecisionMode === 'HOLD' }"
            @click="reportDecisionMode = 'HOLD'"
          >
            보류
          </button>
        </div>

        <div v-if="reportDecisionMode === 'APPROVE'" class="admin-mlflow-view__decision-field">
          <span>승인 사유</span>
          <select v-model="approvalReasonCode" class="input">
            <option v-for="option in approvalReasonOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <textarea
            v-if="approvalReasonCode === 'OTHER'"
            v-model="customApprovalReason"
            class="input admin-mlflow-view__decision-textarea"
            placeholder="승인 사유를 직접 입력하세요"
            rows="3"
          />
        </div>
        <label v-else class="admin-mlflow-view__decision-field">
          <span>보류 사유</span>
          <textarea
            v-model="holdReasonText"
            class="input admin-mlflow-view__decision-textarea"
            placeholder="보류 사유를 입력하세요"
            rows="3"
          />
        </label>
        <footer class="admin-mlflow-view__decision-footer">
          <BaseButton size="sm" :disabled="!canSubmitReportDecision" @click="submitReportDecision">
            {{ reportDecisionMode === 'APPROVE' ? '승인 기록' : '보류 기록' }}
          </BaseButton>
          <BaseButton size="sm" variant="ghost" @click="closeReport">닫기</BaseButton>
        </footer>
      </section>
    </div>
    <p v-else class="admin-mlflow-view__muted">리포트 상세가 없습니다.</p>
  </BaseModal>
</template>

<style scoped>
.admin-mlflow-view {
  display: grid;
  gap: var(--space-4);
}

.admin-mlflow-view__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 380px);
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
  grid-template-columns: minmax(0, 1fr) 100px;
  gap: var(--space-2);
}

.admin-mlflow-view__error,
.admin-mlflow-view__loading,
.admin-mlflow-view__empty {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.admin-mlflow-view__error {
  border: var(--border-width-default) solid color-mix(in srgb, var(--color-risk-high) 36%, var(--color-border-default));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-risk-high) 6%, var(--color-bg-card));
  color: var(--color-risk-high);
  padding: var(--space-2) var(--space-3);
}

.admin-mlflow-view__empty {
  padding: var(--space-4);
  text-align: center;
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

.admin-mlflow-view__summary-alert {
  border: var(--border-width-default) solid color-mix(in srgb, var(--color-risk-high) 40%, var(--color-border-default)) !important;
}

.admin-mlflow-view__summary-alert span,
.admin-mlflow-view__summary-alert small {
  color: var(--color-risk-high) !important;
}

.admin-mlflow-view__summary-alert strong {
  color: var(--color-risk-high) !important;
}

.admin-mlflow-view__registry,
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
  min-width: 640px;
  border-collapse: collapse;
}

.admin-mlflow-view__drift-table {
  min-width: 820px;
  table-layout: fixed;
}

.admin-mlflow-view__drift-table th:nth-child(1),
.admin-mlflow-view__drift-table td:nth-child(1) {
  width: 250px;
}

.admin-mlflow-view__drift-table th:nth-child(2),
.admin-mlflow-view__drift-table td:nth-child(2) {
  width: 92px;
}

.admin-mlflow-view__drift-table th:nth-child(3),
.admin-mlflow-view__drift-table td:nth-child(3) {
  width: 160px;
}

.admin-mlflow-view__drift-table th:nth-child(4),
.admin-mlflow-view__drift-table td:nth-child(4) {
  width: 220px;
}

.admin-mlflow-view__drift-table th:nth-child(5),
.admin-mlflow-view__drift-table td:nth-child(5) {
  width: 84px;
}

.admin-mlflow-view__drift-main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.admin-mlflow-view__drift-main small {
  overflow: hidden;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
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

.admin-mlflow-view__table tbody tr:last-child td {
  border-bottom: none;
}

.admin-mlflow-view__table td {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.admin-mlflow-view__table td strong {
  display: block;
  color: var(--color-fg-strong);
}

.admin-mlflow-view__f1-active {
  color: var(--color-fg-strong);
  font-weight: 700;
}

.admin-mlflow-view__f1-delta {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.admin-mlflow-view__metric-sub {
  display: block;
  margin-top: 4px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.admin-mlflow-view__f1-baseline {
  color: var(--color-fg-muted);
}

.admin-mlflow-view__f1-arrow {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.admin-mlflow-view__f1-current {
  color: var(--color-risk-high);
  font-weight: 700;
}

.admin-mlflow-view__decision-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.admin-mlflow-view__decision-cell small {
  max-width: 200px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.35;
  white-space: normal;
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

.admin-mlflow-view__promote-confirm dl {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

.admin-mlflow-view__promote-confirm dl div {
  display: grid;
  grid-template-columns: 140px 1fr;
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

.admin-mlflow-view__promote-reco {
  margin: 0;
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  padding: var(--space-2) var(--space-3);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.admin-mlflow-view__promote-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.admin-mlflow-view__report {
  display: grid;
  gap: var(--space-4);
}

.admin-mlflow-view__report-f1-row {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  padding: var(--space-3) var(--space-4);
}

.admin-mlflow-view__report-f1-item {
  display: grid;
  gap: var(--space-1);
}

.admin-mlflow-view__report-f1-item span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.admin-mlflow-view__report-f1-item strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: 700;
}

.admin-mlflow-view__report-f1-current strong {
  color: var(--color-risk-high);
}

.admin-mlflow-view__report-f1-sep {
  color: var(--color-fg-muted);
  font-size: var(--font-size-md);
  margin-top: 12px;
}

.admin-mlflow-view__report-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
}

.admin-mlflow-view__report-meta dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.admin-mlflow-view__report-meta dd {
  margin: 0;
  color: var(--color-fg-strong);
  font-weight: 700;
  font-size: var(--font-size-sm);
}

.admin-mlflow-view__report-subtitle {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

.admin-mlflow-view__report-table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
}

.admin-mlflow-view__report-table th,
.admin-mlflow-view__report-table td {
  border-bottom: 1px solid var(--color-border-subtle);
  padding: var(--space-2);
  text-align: left;
  font-size: var(--font-size-sm);
}

.admin-mlflow-view__report-table tbody tr:last-child td {
  border-bottom: none;
}

.admin-mlflow-view__report-table th {
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.admin-mlflow-view__report-approval {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  padding: var(--space-3);
}

.admin-mlflow-view__report-approval div {
  display: grid;
  gap: var(--space-1);
}

.admin-mlflow-view__report-approval dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.admin-mlflow-view__report-approval dd {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.admin-mlflow-view__decision-form {
  display: grid;
  gap: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.admin-mlflow-view__decision-head {
  display: grid;
  gap: var(--space-1);
}

.admin-mlflow-view__decision-head h3,
.admin-mlflow-view__decision-head p {
  margin: 0;
}

.admin-mlflow-view__decision-head h3 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

.admin-mlflow-view__decision-head p {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.admin-mlflow-view__decision-toggle {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.admin-mlflow-view__decision-toggle button {
  min-height: 34px;
  border: 0;
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  font-weight: 700;
  cursor: pointer;
}

.admin-mlflow-view__decision-toggle-button--active {
  background: var(--color-action-primary) !important;
  color: var(--color-text-inverse) !important;
}

.admin-mlflow-view__decision-field {
  display: grid;
  gap: var(--space-2);
}

.admin-mlflow-view__decision-field span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: 700;
}

.admin-mlflow-view__decision-textarea {
  min-height: 76px;
  resize: vertical;
}

.admin-mlflow-view__decision-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

@media (max-width: 1100px) {
  .admin-mlflow-view__header,
  .admin-mlflow-view__summary {
    grid-template-columns: 1fr;
  }

  .admin-mlflow-view__summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

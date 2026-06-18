<script setup lang="ts">
import { onMounted, ref } from 'vue';

import {
  createLabelingRule,
  fetchActiveLabelingRule,
  fetchLabelingRuleHistory,
  previewLabelingRule,
} from '@/services/adminService';

import type { AdminLabelingPreview, AdminLabelingRule } from '@/types/admin';

import { formatKoMonthDayTime } from '@/utils/format';

// ── state ────────────────────────────────────────────────────────────────────

const activeRule = ref<AdminLabelingRule | null>(null);
const history = ref<AdminLabelingRule[]>([]);
const preview = ref<AdminLabelingPreview | null>(null);
const isLoading = ref(false);
const isSaving = ref(false);
const isPreviewing = ref(false);
const errorMsg = ref<string | null>(null);
const changeReason = ref('');
const reasonError = ref('');

// draft quantile knobs (분위수 0~1, 슬라이더 조작)
const draft = ref({
  lookaheadMin: 120,
  qQuantile: 0.97,
  qMaxQuantile: 0.97,
  wQuantile: 0.97,
  wipQuantile: 0.97,
  aQuantile: 0.01,
  uHiQuantile: 0.75,
  uLoQuantile: 0.95,
});

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined, digits = 4) {
  if (v == null) return '—';
  return v.toFixed(digits);
}

function fmtPct(v: number) {
  return `${(v * 100).toFixed(1)}%`;
}

function loadDraftFromRule(rule: AdminLabelingRule) {
  draft.value = {
    lookaheadMin: rule.lookaheadMin,
    qQuantile: rule.qQuantile,
    qMaxQuantile: rule.qMaxQuantile,
    wQuantile: rule.wQuantile,
    wipQuantile: rule.wipQuantile,
    aQuantile: rule.aQuantile,
    uHiQuantile: rule.uHiQuantile,
    uLoQuantile: rule.uLoQuantile,
  };
}

// ── data loading ─────────────────────────────────────────────────────────────

async function load() {
  isLoading.value = true;
  errorMsg.value = null;
  try {
    const [rule, hist] = await Promise.all([fetchActiveLabelingRule(), fetchLabelingRuleHistory()]);
    activeRule.value = rule;
    history.value = hist;
    loadDraftFromRule(rule);
    preview.value = null;
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '데이터 로드 실패';
  } finally {
    isLoading.value = false;
  }
}

onMounted(load);

// ── actions ──────────────────────────────────────────────────────────────────

async function doPreview() {
  isPreviewing.value = true;
  preview.value = null;
  try {
    preview.value = await previewLabelingRule({ ...draft.value, windowMinutes: 720 });
  } catch {
    errorMsg.value = '미리보기 계산 실패';
  } finally {
    isPreviewing.value = false;
  }
}

async function doSave() {
  if (!changeReason.value.trim()) {
    reasonError.value = '변경 사유를 입력해주세요.';
    return;
  }
  reasonError.value = '';
  isSaving.value = true;
  try {
    const saved = await createLabelingRule({ ...draft.value, changeReason: changeReason.value });
    activeRule.value = saved;
    changeReason.value = '';
    preview.value = null;
    await load();
  } catch {
    errorMsg.value = '저장 실패';
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="labeling-view">
    <!-- 헤더 -->
    <header class="labeling-view__header">
      <div>
        <h1>라벨링 기준 관리</h1>
        <p v-if="activeRule">
          활성 기준: <strong>{{ activeRule.versionLabel }}</strong> &nbsp;·&nbsp; 변경일:
          {{ activeRule.createdAt ? formatKoMonthDayTime(activeRule.createdAt) : '—' }}
          <span v-if="activeRule.changeReason">&nbsp;·&nbsp; 사유: {{ activeRule.changeReason }}</span>
        </p>
      </div>
    </header>

    <div v-if="isLoading" class="labeling-view__loading">데이터 로드 중...</div>
    <div v-else-if="errorMsg" class="labeling-view__error">{{ errorMsg }}</div>

    <template v-else>
      <!-- 기준 편집 폼 -->
      <section class="labeling-view__card surface-card">
        <div class="labeling-view__title">
          <h2>기준 편집</h2>
          <span class="labeling-view__muted">분위수 값을 입력하면 환산 절대 cutoff가 계산됩니다</span>
        </div>

        <div class="labeling-view__groups">
          <div class="labeling-view__group-column">
            <!-- 대기/큐 그룹 -->
            <div class="labeling-view__group">
              <div class="labeling-view__group-label">대기 / 큐</div>
              <div class="labeling-view__knob-row">
                <label>Q (q_time_min 상위)</label>
                <input
                  v-model.number="draft.qQuantile"
                  class="labeling-view__value-input"
                  type="number"
                  min="0.8"
                  max="0.999"
                  step="0.005"
                />
                <span class="labeling-view__cut"
                  >{{ fmtPct(draft.qQuantile) }} → {{ fmt(preview?.qCut ?? activeRule?.qCut, 2) }}분</span
                >
              </div>
              <div class="labeling-view__knob-row">
                <label>W (wait_ratio 상위)</label>
                <input
                  v-model.number="draft.wQuantile"
                  class="labeling-view__value-input"
                  type="number"
                  min="0.8"
                  max="0.999"
                  step="0.005"
                />
                <span class="labeling-view__cut"
                  >{{ fmtPct(draft.wQuantile) }} → {{ fmt(preview?.wCut ?? activeRule?.wCut, 3) }}</span
                >
              </div>
              <div class="labeling-view__knob-row">
                <label>WIP (wip 상위)</label>
                <input
                  v-model.number="draft.wipQuantile"
                  class="labeling-view__value-input"
                  type="number"
                  min="0.8"
                  max="0.999"
                  step="0.005"
                />
                <span class="labeling-view__cut"
                  >{{ fmtPct(draft.wipQuantile) }} → {{ fmt(preview?.wipCut ?? activeRule?.wipCut, 1) }}</span
                >
              </div>
            </div>

            <!-- 가동 불균형 그룹 -->
            <div class="labeling-view__group">
              <div class="labeling-view__group-label">가동 불균형</div>
              <div class="labeling-view__knob-row">
                <label>U_HI (max_util 상위)</label>
                <input
                  v-model.number="draft.uHiQuantile"
                  class="labeling-view__value-input"
                  type="number"
                  min="0.5"
                  max="0.999"
                  step="0.005"
                />
                <span class="labeling-view__cut"
                  >{{ fmtPct(draft.uHiQuantile) }} → {{ fmt(preview?.uHiCut ?? activeRule?.uHiCut, 3) }}</span
                >
              </div>
              <div class="labeling-view__knob-row">
                <label>U_LO (utilization_avg 하위)</label>
                <input
                  v-model.number="draft.uLoQuantile"
                  class="labeling-view__value-input"
                  type="number"
                  min="0.5"
                  max="0.999"
                  step="0.005"
                />
                <span class="labeling-view__cut"
                  >{{ fmtPct(draft.uLoQuantile) }} → {{ fmt(preview?.uLoCut ?? activeRule?.uLoCut, 3) }}</span
                >
              </div>
            </div>
          </div>

          <div class="labeling-view__group-column">
            <!-- 가용 부족 그룹 -->
            <div class="labeling-view__group">
              <div class="labeling-view__group-label">가용 부족</div>
              <div class="labeling-view__knob-row">
                <label>A (available_tool_ratio 하위)</label>
                <input
                  v-model.number="draft.aQuantile"
                  class="labeling-view__value-input"
                  type="number"
                  min="0.001"
                  max="0.1"
                  step="0.001"
                />
                <span class="labeling-view__cut"
                  >{{ fmtPct(draft.aQuantile) }} → {{ fmt(preview?.aCut ?? activeRule?.aCut, 3) }}</span
                >
              </div>
            </div>

            <!-- 최대 큐 그룹 -->
            <div class="labeling-view__group">
              <div class="labeling-view__group-label">최대 큐</div>
              <div class="labeling-view__knob-row">
                <label>Q_MAX (max_avg_q_time 상위)</label>
                <input
                  v-model.number="draft.qMaxQuantile"
                  class="labeling-view__value-input"
                  type="number"
                  min="0.8"
                  max="0.999"
                  step="0.005"
                />
                <span class="labeling-view__cut"
                  >{{ fmtPct(draft.qMaxQuantile) }} → {{ fmt(preview?.qMaxCut ?? activeRule?.qMaxCut, 2) }}분</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- 미리보기 결과 -->
        <div v-if="preview" class="labeling-view__preview-result">
          <span class="labeling-view__preview-label">미리보기 (최근 720분):</span>
          <span class="labeling-view__preview-before">병목 {{ preview.beforePositive }}건</span>
          <span class="labeling-view__preview-arrow">→</span>
          <span class="labeling-view__preview-after">{{ preview.afterPositive }}건</span>
          <span :class="preview.changed >= 0 ? 'labeling-view__delta--pos' : 'labeling-view__delta--neg'">
            ({{ preview.changed > 0 ? '+' : '' }}{{ preview.changed }} 변경)
          </span>
          <span class="labeling-view__muted">· 평가 {{ preview.evaluated }}건 / 스킵 {{ preview.skipped }}건</span>
        </div>

        <!-- 변경 사유 + 액션 버튼 -->
        <div class="labeling-view__reason-row">
          <div class="labeling-view__reason-wrap">
            <label class="labeling-view__reason-label" for="changeReason"
              >변경 사유 <span class="labeling-view__required">*</span></label
            >
            <input
              id="changeReason"
              v-model="changeReason"
              class="labeling-view__reason-input"
              :class="{ 'labeling-view__reason-input--error': reasonError }"
              type="text"
              placeholder="예: 큐시간 민감도 상향 조정"
            />
            <small v-if="reasonError" class="labeling-view__reason-error">{{ reasonError }}</small>
          </div>
        </div>

        <div class="labeling-view__actions">
          <button class="labeling-view__btn labeling-view__btn--secondary" :disabled="isPreviewing" @click="doPreview">
            {{ isPreviewing ? '계산 중...' : '미리보기' }}
          </button>
          <button class="labeling-view__btn labeling-view__btn--primary" :disabled="isSaving" @click="doSave()">
            {{ isSaving ? '저장 중...' : '저장' }}
          </button>
        </div>
      </section>

      <!-- 버전 변경 이력 -->
      <section class="labeling-view__card surface-card">
        <div class="labeling-view__title"><h2>기준 변경 이력</h2></div>
        <table class="labeling-view__table">
          <thead>
            <tr>
              <th>버전</th>
              <th>lookahead</th>
              <th>Q</th>
              <th>W</th>
              <th>WIP</th>
              <th>A</th>
              <th>U_HI</th>
              <th>U_LO</th>
              <th>Q_MAX</th>
              <th>변경 사유</th>
              <th>생성일</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rule in history" :key="rule.ruleId" :class="{ 'labeling-view__row--active': rule.isActive }">
              <td>
                <span class="labeling-view__version">{{ rule.versionLabel }}</span>
                <span v-if="rule.isActive" class="labeling-view__active-badge">현재</span>
              </td>
              <td>{{ rule.lookaheadMin }}분</td>
              <td>
                {{ fmtPct(rule.qQuantile)
                }}<span v-if="rule.qCut != null" class="labeling-view__cut-hist"> → {{ fmt(rule.qCut, 2) }}</span>
              </td>
              <td>
                {{ fmtPct(rule.wQuantile)
                }}<span v-if="rule.wCut != null" class="labeling-view__cut-hist"> → {{ fmt(rule.wCut, 3) }}</span>
              </td>
              <td>
                {{ fmtPct(rule.wipQuantile)
                }}<span v-if="rule.wipCut != null" class="labeling-view__cut-hist"> → {{ fmt(rule.wipCut, 1) }}</span>
              </td>
              <td>
                {{ fmtPct(rule.aQuantile)
                }}<span v-if="rule.aCut != null" class="labeling-view__cut-hist"> → {{ fmt(rule.aCut, 3) }}</span>
              </td>
              <td>
                {{ fmtPct(rule.uHiQuantile)
                }}<span v-if="rule.uHiCut != null" class="labeling-view__cut-hist"> → {{ fmt(rule.uHiCut, 3) }}</span>
              </td>
              <td>
                {{ fmtPct(rule.uLoQuantile)
                }}<span v-if="rule.uLoCut != null" class="labeling-view__cut-hist"> → {{ fmt(rule.uLoCut, 3) }}</span>
              </td>
              <td>
                {{ fmtPct(rule.qMaxQuantile)
                }}<span v-if="rule.qMaxCut != null" class="labeling-view__cut-hist"> → {{ fmt(rule.qMaxCut, 2) }}</span>
              </td>
              <td>{{ rule.changeReason ?? '—' }}</td>
              <td>{{ rule.createdAt ? formatKoMonthDayTime(rule.createdAt) : '—' }}</td>
            </tr>
            <tr v-if="!history.length">
              <td colspan="11" class="labeling-view__empty">이력 없음</td>
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </div>
</template>

<style scoped>
.labeling-view {
  display: grid;
  gap: var(--space-4);
}

h1,
h2,
h3,
p {
  margin: 0;
}

.labeling-view__header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: var(--space-3);
  border-bottom: var(--border-width-default) solid var(--color-border-default);
  padding-bottom: var(--space-2);
}

.labeling-view__header h1 {
  color: var(--color-fg-strong);
  font-size: var(--text-page-title-size);
  line-height: var(--text-page-title-line-height);
}

.labeling-view__header p {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  margin-top: var(--space-1);
}

.labeling-view__card {
  display: grid;
  gap: var(--space-3);
  align-content: start;
  padding: var(--space-4);
}

.labeling-view__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.labeling-view__title h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-xl);
  line-height: var(--line-height-tight);
}

.labeling-view__muted {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

/* 편집 그룹 */
.labeling-view__groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: var(--space-3);
}

.labeling-view__group-column {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  min-width: 0;
}

.labeling-view__group {
  display: grid;
  gap: var(--space-2);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  padding: var(--space-3);
}

.labeling-view__group-label {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border-default);
}

.labeling-view__knob-row {
  display: grid;
  grid-template-columns: minmax(180px, 1fr) 120px minmax(145px, auto);
  align-items: center;
  gap: var(--space-2);
  min-height: 40px;
  font-size: var(--font-size-base);
  color: var(--color-fg);
}

.labeling-view__knob-row label {
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-semibold);
}

.labeling-view__value-input {
  width: 100%;
  min-height: 36px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  color: var(--color-fg-strong);
  font: inherit;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  padding: 0 var(--space-3);
  text-align: right;
}

.labeling-view__value-input:focus {
  border-color: var(--color-action-primary-border);
  outline: none;
  box-shadow: 0 0 0 3px var(--color-action-primary-soft);
}

.labeling-view__cut {
  justify-self: end;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.labeling-view__cut-hist {
  color: var(--color-fg-subtle);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

/* 미리보기 결과 */
.labeling-view__preview-result {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-subtle);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.labeling-view__preview-label {
  font-weight: var(--font-weight-semibold);
  color: var(--color-fg-strong);
}

.labeling-view__preview-before {
  color: var(--color-fg-muted);
}
.labeling-view__preview-arrow {
  color: var(--color-fg-muted);
}
.labeling-view__preview-after {
  font-weight: var(--font-weight-semibold);
  color: var(--color-fg-strong);
}
.labeling-view__delta--pos {
  color: #b45309;
  font-weight: var(--font-weight-semibold);
}
.labeling-view__delta--neg {
  color: var(--color-fg-muted);
}

/* 변경 사유 */
.labeling-view__reason-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.labeling-view__reason-wrap {
  display: grid;
  gap: var(--space-1);
  flex: 1;
}

.labeling-view__reason-label {
  font-size: var(--font-size-sm);
  color: var(--color-fg);
  font-weight: var(--font-weight-semibold);
}

.labeling-view__required {
  color: #dc2626;
}

.labeling-view__reason-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-fg);
  font: inherit;
  font-size: var(--font-size-sm);
  transition: border-color var(--transition-fast);
}

.labeling-view__reason-input:focus {
  outline: none;
  border-color: var(--color-action-primary);
}

.labeling-view__reason-input--error {
  border-color: #dc2626;
}
.labeling-view__reason-error {
  color: #dc2626;
  font-size: var(--font-size-xs);
}

/* 버튼 */
.labeling-view__actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
}

.labeling-view__btn {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition:
    background var(--transition-fast),
    opacity var(--transition-fast);
  border: none;
}

.labeling-view__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.labeling-view__btn--secondary {
  background: var(--color-surface-subtle);
  color: var(--color-fg);
  border: 1px solid var(--color-border-default);
}

.labeling-view__btn--secondary:not(:disabled):hover {
  background: var(--color-surface-hover);
}

.labeling-view__btn--primary {
  background: var(--color-action-primary);
  color: #fff;
}

.labeling-view__btn--primary:not(:disabled):hover {
  filter: brightness(1.1);
}

.labeling-view__btn--primary-gold {
  background: #92400e;
  color: #fff;
}

.labeling-view__btn--primary-gold:not(:disabled):hover {
  background: #78350f;
}

/* 테이블 */
.labeling-view__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.labeling-view__table th,
.labeling-view__table td {
  padding: var(--space-2) var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--color-border-default);
}

.labeling-view__table th {
  color: var(--color-fg-muted);
  font-weight: var(--font-weight-semibold);
  background: var(--color-surface-subtle);
}

.labeling-view__row--active td {
  background: var(--color-surface-subtle);
}

.labeling-view__version {
  font-weight: var(--font-weight-semibold);
  color: var(--color-fg-strong);
}

.labeling-view__active-badge {
  margin-left: var(--space-1);
  background: var(--color-action-primary);
  color: #fff;
  border-radius: 999px;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: var(--font-weight-semibold);
}

.labeling-view__empty {
  text-align: center;
  color: var(--color-fg-muted);
  padding: var(--space-5);
}

.labeling-view__loading,
.labeling-view__error {
  padding: var(--space-5);
  text-align: center;
  color: var(--color-fg-muted);
}

.labeling-view__error {
  color: #dc2626;
}

@media (max-width: 1180px) {
  .labeling-view__groups {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .labeling-view__title,
  .labeling-view__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .labeling-view__knob-row {
    grid-template-columns: 1fr;
  }

  .labeling-view__cut {
    justify-self: start;
  }
}
</style>

<script setup lang="ts">
import { useRouter } from 'vue-router';

import { riskGradeToLevel } from '@/constants/riskLevel';
import { ROUTE_NAMES } from '@/constants/routes';

import type { BncCauseAnalysis, BncTrendInsight } from '@/types/bnc';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';

import { formatKoMonthDayTime, formatNumber, formatRatioPercent } from '@/utils/format';

const router = useRouter();

defineProps<{
  analysis: BncCauseAnalysis | null;
  loading?: boolean;
  errorMessage?: string | null;
}>();

function shapBarPct(importance: number): string {
  return `${(importance * 100).toFixed(1)}%`;
}

function shapBarColor(direction: string): string {
  if (
    direction.includes('병목') ||
    direction.includes('기여') ||
    direction.includes('혼잡') ||
    direction.includes('증가')
  ) {
    return 'var(--color-status-danger)';
  }
  return 'var(--color-action-primary)';
}

function isWorsening(insight: BncTrendInsight): boolean {
  if (insight.feature === 'available_tool_ratio') return insight.slopePerHour < 0;
  return insight.slopePerHour > 0;
}

function formatTrendValue(insight: BncTrendInsight, value: number): string {
  if (insight.feature === 'utilization') return formatRatioPercent(Math.min(value, 1));
  if (insight.feature === 'wip') return `${formatNumber(Math.round(value))} Lot`;
  return Math.round(value).toLocaleString();
}

function trendCurrentValue(insight: BncTrendInsight): string {
  return formatTrendValue(insight, insight.values.at(-1) ?? 0);
}

function trendPredicted(insight: BncTrendInsight): string {
  const current = insight.values.at(-1) ?? 0;
  return formatTrendValue(insight, current + insight.slopePerHour * 2);
}

function trendDeltaText(insight: BncTrendInsight): string {
  const delta = insight.slopePerHour * 2;
  const sign = delta >= 0 ? '+' : '';
  if (insight.feature === 'utilization') return `${sign}${(delta * 100).toFixed(1)}%p`;
  if (insight.feature === 'wip') return `${sign}${Math.round(delta)} Lot`;
  return `${sign}${Math.round(delta).toLocaleString()}`;
}

function goToCase(caseId: string) {
  void router.push({ name: ROUTE_NAMES.actionHistory, query: { caseId } });
}
</script>

<template>
  <section class="bnc-cause">
    <p v-if="loading" class="bnc-cause__state">원인 분석을 불러오는 중입니다.</p>
    <p v-else-if="errorMessage" class="bnc-cause__state bnc-cause__state--error">{{ errorMessage }}</p>
    <p v-else-if="!analysis" class="bnc-cause__state">원인 분석 결과가 없습니다. Cause Analyzer 완료 후 표시됩니다.</p>

    <template v-else>
      <!-- 1. AI 진단 요약 -->
      <div class="bnc-cause__diagnosis">
        <div class="bnc-cause__diagnosis-label">
          <span>AI 원인 분석</span>
          <span class="bnc-cause__diagnosis-time">{{ formatKoMonthDayTime(analysis.createdAt) }}</span>
        </div>
        <p class="bnc-cause__diagnosis-text">{{ analysis.forwardForecastText }}</p>
        <div class="bnc-cause__model-info">
          모델 정확도 {{ (analysis.modelPerformance.accuracy * 100).toFixed(1) }}% · F1
          {{ (analysis.modelPerformance.f1Score * 100).toFixed(1) }}% · 피처
          {{ analysis.modelPerformance.featureCount }}개 기반
        </div>
      </div>

      <!-- 2. 현재 핵심 지표 -->
      <div class="bnc-cause__kpi-strip">
        <div class="bnc-cause__kpi-chip bnc-cause__kpi-chip--danger">
          <span>병목 확률</span>
          <strong>{{ formatRatioPercent(analysis.predictionSummary.bottleneckProb) }}</strong>
        </div>
        <div class="bnc-cause__kpi-chip">
          <span>위험 등급</span>
          <strong>
            <BaseBadge :variant="riskGradeToLevel(analysis.predictionSummary.riskGrade)">
              {{ analysis.predictionSummary.riskGrade }}
            </BaseBadge>
          </strong>
        </div>
        <div class="bnc-cause__kpi-chip">
          <span>최대 WIP</span>
          <strong>{{ formatNumber(analysis.predictionSummary.maxWipCount) }} Lot</strong>
        </div>
        <div class="bnc-cause__kpi-chip">
          <span>최대 가동률</span>
          <strong>{{ formatRatioPercent(analysis.predictionSummary.maxUtilizationRate) }}</strong>
        </div>
      </div>

      <!-- 3. KPI 악화 속도: 현재 vs 2시간 후 비교 -->
      <section class="bnc-cause__section">
        <h3>KPI 악화 속도</h3>
        <p class="bnc-cause__section-sub">조치 없이 현재 추세가 지속될 경우 2시간 후 예상 수치</p>
        <div class="bnc-cause__forecast-grid">
          <div
            v-for="insight in analysis.trendInsights"
            :key="insight.feature"
            class="bnc-cause__forecast-card"
            :class="{ 'bnc-cause__forecast-card--worsening': isWorsening(insight) }"
          >
            <div class="bnc-cause__forecast-name">{{ insight.label }}</div>
            <div class="bnc-cause__forecast-compare">
              <div class="bnc-cause__forecast-col">
                <span class="bnc-cause__forecast-tag">현재</span>
                <strong class="bnc-cause__forecast-val">{{ trendCurrentValue(insight) }}</strong>
              </div>
              <span
                class="bnc-cause__forecast-arrow"
                :class="{ 'bnc-cause__forecast-arrow--bad': isWorsening(insight) }"
                >→</span
              >
              <div class="bnc-cause__forecast-col">
                <span class="bnc-cause__forecast-tag">2시간 후</span>
                <strong
                  class="bnc-cause__forecast-val"
                  :class="{
                    'bnc-cause__forecast-val--bad': isWorsening(insight),
                    'bnc-cause__forecast-val--ok': !isWorsening(insight),
                  }"
                  >{{ trendPredicted(insight) }}</strong
                >
              </div>
            </div>
            <div
              class="bnc-cause__forecast-delta"
              :class="{
                'bnc-cause__forecast-delta--bad': isWorsening(insight),
                'bnc-cause__forecast-delta--ok': !isWorsening(insight),
              }"
            >
              {{ trendDeltaText(insight) }}
            </div>
          </div>
        </div>
      </section>

      <!-- 4. 병목 원인 기여도 (SHAP) -->
      <section class="bnc-cause__section">
        <h3>병목 원인 기여도</h3>
        <p class="bnc-cause__section-sub">AI 모델이 병목 확률 예측에 가장 크게 기여한 지표 순</p>
        <div class="bnc-cause__shap-list">
          <div v-for="feat in analysis.shapFeatures" :key="feat.feature" class="bnc-cause__shap-row">
            <div class="bnc-cause__shap-meta">
              <span class="bnc-cause__shap-rank">#{{ feat.rank }}</span>
              <div class="bnc-cause__shap-info">
                <span class="bnc-cause__shap-label">{{ feat.label }}</span>
                <span class="bnc-cause__shap-direction">{{ feat.direction }}</span>
              </div>
            </div>
            <div class="bnc-cause__shap-bar-track">
              <div
                class="bnc-cause__shap-bar"
                :style="{ width: shapBarPct(feat.importance), background: shapBarColor(feat.direction) }"
              />
            </div>
            <span class="bnc-cause__shap-score">{{ shapBarPct(feat.importance) }}</span>
          </div>
        </div>
      </section>

      <!-- 5. 영향 TG 범위 + 업스트림 의심 공정 -->
      <div class="bnc-cause__impact-row">
        <!-- 5-A. 연쇄 영향 TG -->
        <section class="bnc-cause__section bnc-cause__section--half">
          <h3>
            연쇄 영향 TG
            <span v-if="analysis.diffusion.affectedToolGroups.length" class="bnc-cause__section-count">
              {{ analysis.diffusion.affectedToolGroups.length }}건
            </span>
          </h3>
          <p class="bnc-cause__section-sub">이 병목으로 인해 지연 위험이 있는 후속 공정</p>
          <div class="bnc-cause__tags">
            <span v-for="tg in analysis.diffusion.affectedToolGroups" :key="tg.tgId" class="bnc-cause__tag">
              <strong>{{ tg.tgName }}</strong>
              <em>{{ tg.areaName }}</em>
            </span>
            <span v-if="!analysis.diffusion.affectedToolGroups.length" class="bnc-cause__empty">연쇄 영향 없음</span>
          </div>
        </section>

        <!-- 5-B. 원인 요약 (TG별) -->
        <section class="bnc-cause__section bnc-cause__section--half">
          <h3>TG별 원인 요약</h3>
          <p class="bnc-cause__section-sub">가동률·대기 Lot·원인 유형</p>
          <div class="bnc-cause__cause-rows">
            <div v-for="item in analysis.causeSummary" :key="item.tgId" class="bnc-cause__cause-card">
              <div class="bnc-cause__cause-header">
                <span class="bnc-cause__cause-tg">{{ item.tgName }}</span>
                <span class="bnc-cause__cause-type">{{ item.bottleneckCauseType }}</span>
              </div>
              <div class="bnc-cause__cause-stats">
                <div class="bnc-cause__cause-util">
                  <div class="bnc-cause__cause-util-bar-track">
                    <div
                      class="bnc-cause__cause-util-bar"
                      :style="{ width: `${(item.utilRate * 100).toFixed(0)}%` }"
                      :class="{ 'bnc-cause__cause-util-bar--high': item.utilRate >= 0.85 }"
                    />
                  </div>
                  <span class="bnc-cause__cause-util-label">가동 {{ formatRatioPercent(item.utilRate) }}</span>
                </div>
                <span class="bnc-cause__cause-waiting">대기 {{ formatNumber(item.waitingLots) }} Lot</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      <!-- 6. 과거 유사 사례 -->
      <section v-if="analysis.ragSimilarCases.length" class="bnc-cause__section">
        <h3>과거 유사 사례</h3>
        <p class="bnc-cause__section-sub">유사 패턴의 과거 케이스 — 당시 대응 리포트를 직접 확인하세요</p>
        <ul class="bnc-cause__case-list">
          <li v-for="c in analysis.ragSimilarCases" :key="c.caseId" class="bnc-cause__case-item">
            <span class="bnc-cause__case-summary">{{ c.summary }}</span>
            <BaseButton variant="ghost" size="sm" @click="goToCase(c.caseId)">리포트 보기 →</BaseButton>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>

<style scoped>
.bnc-cause {
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-top: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.bnc-cause__state {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}
.bnc-cause__state--error {
  color: var(--color-status-danger);
}

/* AI 진단 */
.bnc-cause__diagnosis {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-bg-page);
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 22%, var(--color-border-subtle));
  border-radius: var(--radius-md);
}

.bnc-cause__diagnosis-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-action-primary);
}

.bnc-cause__diagnosis-time {
  color: var(--color-fg-muted);
  font-weight: 400;
}

.bnc-cause__diagnosis-text {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  white-space: pre-line;
}

.bnc-cause__model-info {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border-subtle);
}

/* KPI 칩 */
.bnc-cause__kpi-strip {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.bnc-cause__kpi-chip {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 100px;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.bnc-cause__kpi-chip span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-cause__kpi-chip strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.bnc-cause__kpi-chip--danger strong {
  color: var(--color-status-danger);
}

/* 섹션 */
.bnc-cause__section {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}

.bnc-cause__section h3 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.bnc-cause__section-count {
  font-size: var(--font-size-xs);
  font-weight: 400;
  color: var(--color-fg-muted);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-pill);
  padding: 1px var(--space-2);
}

.bnc-cause__section-sub {
  margin: calc(-1 * var(--space-2)) 0 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-cause__impact-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}

.bnc-cause__section--half {
  border-top: none;
  padding-top: 0;
}

/* KPI 악화 속도: 현재 vs 2h 비교 카드 */
.bnc-cause__forecast-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-3);
}

.bnc-cause__forecast-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-3);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.bnc-cause__forecast-card--worsening {
  background: color-mix(in srgb, var(--color-status-danger) 5%, var(--color-bg-page));
  border-color: color-mix(in srgb, var(--color-status-danger) 22%, var(--color-border-subtle));
}

.bnc-cause__forecast-name {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-cause__forecast-compare {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.bnc-cause__forecast-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.bnc-cause__forecast-tag {
  color: var(--color-fg-muted);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.bnc-cause__forecast-val {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
}

.bnc-cause__forecast-val--bad {
  color: var(--color-status-danger);
}

.bnc-cause__forecast-val--ok {
  color: var(--color-status-success);
}

.bnc-cause__forecast-arrow {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  flex-shrink: 0;
}

.bnc-cause__forecast-arrow--bad {
  color: var(--color-status-danger);
}

.bnc-cause__forecast-delta {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  padding: 2px var(--space-2);
  border-radius: var(--radius-pill);
  align-self: flex-start;
}

.bnc-cause__forecast-delta--bad {
  color: var(--color-status-danger);
  background: color-mix(in srgb, var(--color-status-danger) 12%, transparent);
}

.bnc-cause__forecast-delta--ok {
  color: var(--color-status-success);
  background: color-mix(in srgb, var(--color-status-success) 12%, transparent);
}

/* SHAP */
.bnc-cause__shap-list {
  display: grid;
  gap: var(--space-3);
}

.bnc-cause__shap-row {
  display: grid;
  grid-template-columns: minmax(180px, 220px) minmax(100px, 1fr) 44px;
  align-items: center;
  gap: var(--space-3);
}

.bnc-cause__shap-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.bnc-cause__shap-rank {
  flex-shrink: 0;
  width: 20px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-align: center;
}

.bnc-cause__shap-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.bnc-cause__shap-label {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bnc-cause__shap-direction {
  color: var(--color-fg-muted);
  font-size: 10px;
}

.bnc-cause__shap-bar-track {
  height: 8px;
  overflow: hidden;
  background: var(--color-border-subtle);
  border-radius: var(--radius-pill);
}

.bnc-cause__shap-bar {
  height: 100%;
  border-radius: inherit;
  transition: width 0.3s ease;
}

.bnc-cause__shap-score {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-align: right;
}

/* 영향 범위 */
.bnc-cause__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.bnc-cause__tag {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
}

.bnc-cause__tag strong {
  color: var(--color-fg-strong);
}
.bnc-cause__tag em {
  color: var(--color-fg-muted);
  font-style: normal;
}

.bnc-cause__empty {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

/* TG별 원인 요약 */
.bnc-cause__cause-rows {
  display: grid;
  gap: var(--space-2);
}

.bnc-cause__cause-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.bnc-cause__cause-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.bnc-cause__cause-tg {
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-cause__cause-type {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-cause__cause-stats {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.bnc-cause__cause-util {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
}

.bnc-cause__cause-util-bar-track {
  flex: 1;
  height: 6px;
  background: var(--color-border-subtle);
  border-radius: var(--radius-pill);
  overflow: hidden;
  min-width: 40px;
}

.bnc-cause__cause-util-bar {
  height: 100%;
  background: var(--color-action-primary);
  border-radius: inherit;
}

.bnc-cause__cause-util-bar--high {
  background: var(--color-status-danger);
}

.bnc-cause__cause-util-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.bnc-cause__cause-waiting {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

/* 섹션 헤더 (제목 + 버튼) */
.bnc-cause__section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.bnc-cause__section-header h3 {
  margin: 0;
}

/* RAG 유사 사례 */
.bnc-cause__case-list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.bnc-cause__case-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.bnc-cause__case-summary {
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.5;
}

@media (max-width: 900px) {
  .bnc-cause__impact-row {
    grid-template-columns: 1fr;
  }
  .bnc-cause__shap-row {
    grid-template-columns: 1fr;
  }
  .bnc-cause__kpi-strip {
    flex-wrap: wrap;
  }
  .bnc-cause__forecast-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 600px) {
  .bnc-cause__forecast-grid {
    grid-template-columns: 1fr;
  }
}
</style>

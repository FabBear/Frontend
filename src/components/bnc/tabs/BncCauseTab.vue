<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ROUTE_NAMES } from '@/constants/routes';

import type { BncCauseAnalysis, BncCauseConfidence, BncGStarKpi, BncShapFeature, BncTrendInsight } from '@/types/bnc';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BncStatBarChart from '@/components/bnc/BncStatBarChart.vue';
import type { StatBarItem } from '@/components/bnc/BncStatBarChart.vue';

import { formatKoMonthDayTime } from '@/utils/format';

const router = useRouter();

const props = defineProps<{
  analysis: BncCauseAnalysis | null;
  loading?: boolean;
  errorMessage?: string | null;
  caseId?: string | null;
}>();

const judgment = computed(() => props.analysis?.judgment ?? null);
const llmVerdict = computed(() => props.analysis?.llmVerdict ?? null);
const gStar = computed(() => props.analysis?.gStar ?? null);
const simForecast = computed(() => props.analysis?.simForecast ?? null);
const upstreamSuspects = computed(() => props.analysis?.upstreamSuspects ?? []);
// 원인 카테고리 수렴 — 4개 분석(SHAP·트렌드·G*·업스트림) 종합 점수 순
const categories = computed(() =>
  [...(props.analysis?.causeCategories ?? [])].sort((a, b) => b.totalScore - a.totalScore)
);

// 기각된 LOW 카테고리는 기본 접기
const showAllCategories = ref(false);
const primaryCategories = computed(() => categories.value.filter((c) => c.confidence !== 'LOW'));
const visibleCategories = computed(() =>
  showAllCategories.value || primaryCategories.value.length === 0 ? categories.value : primaryCategories.value
);
const hiddenCategoryCount = computed(() =>
  primaryCategories.value.length === 0 ? 0 : categories.value.length - primaryCategories.value.length
);

// G* Δ평균 → 다이버징 막대 차트 아이템
const gStarChartItems = computed<StatBarItem[]>(() =>
  (gStar.value?.sigKpis ?? []).map((k) => ({
    label: kpiLabel(k.kpi),
    value: k.deltaMean,
    tone: k.significant ? 'danger' : 'muted',
    valueText: `${formatGStarDelta(k)}${k.significant ? ' ★' : ''}`,
    subText: `${formatPValue(k.pAdjusted)} · ${k.significant ? '유의' : '비유의'}`,
  }))
);

// 시뮬 변화율(%) → 다이버징 막대 차트 아이템
const simChartItems = computed<StatBarItem[]>(() =>
  (simForecast.value?.kpiDeltas ?? []).map((k) => ({
    label: kpiLabel(k.kpi),
    value: k.pctChange,
    tone: k.delta > 0 ? 'danger' : k.delta < 0 ? 'success' : 'muted',
    valueText: simDeltaText(k),
    subText: `${simNow(k)} → ${simFuture(k)} · 신뢰도 ${k.reliability}`,
  }))
);
const hasGStarChartItems = computed(() => gStarChartItems.value.length > 0);
const hasSimChartItems = computed(() => simChartItems.value.length > 0);
// SHAP는 contributionPct(양수 기여 비율) 기준으로 정렬·길이 산정. 없으면 importance 폴백.
const shapRows = computed(() =>
  [...(props.analysis?.shapFeatures ?? [])].sort((a, b) => shapValueOf(b) - shapValueOf(a))
);

const CONFIDENCE_META: Record<BncCauseConfidence, { label: string; variant: 'danger' | 'warning' | 'info' }> = {
  HIGH: { label: '신뢰도 높음', variant: 'danger' },
  MEDIUM: { label: '신뢰도 보통', variant: 'warning' },
  LOW: { label: '신뢰도 낮음', variant: 'info' },
};

function confidenceMeta(conf: BncCauseConfidence | undefined) {
  return CONFIDENCE_META[conf ?? 'LOW'];
}

function shapValueOf(feat: BncShapFeature): number {
  return feat.contributionPct ?? feat.importance * 100;
}

function shapBarPct(feat: BncShapFeature): string {
  return `${shapValueOf(feat).toFixed(1)}%`;
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

// 피처별 KPI 값 표기 (가동률류는 %, WIP는 Lot, q-time은 분)
function formatKpiByFeature(feature: string, value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (feature.includes('util')) return `${(value <= 1 ? value * 100 : value).toFixed(1)}%`;
  if (feature === 'wip') return `${Math.round(value).toLocaleString('ko-KR')} Lot`;
  if (feature.includes('q_time')) return `${value.toFixed(1)}분`;
  if (feature.includes('wait_ratio')) return value.toFixed(2);
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}

function isWorseningTrend(insight: BncTrendInsight): boolean {
  if (insight.feature === 'available_tool_ratio') return insight.slopePerHour < 0;
  return insight.slopePerHour > 0;
}

function trendCurrent(insight: BncTrendInsight): string {
  return formatKpiByFeature(insight.feature, insight.values.at(-1));
}

function slopeText(insight: BncTrendInsight): string {
  const sign = insight.slopePerHour >= 0 ? '+' : '';
  // 가동률류 기울기는 %p/h, 그 외는 원단위/h
  if (insight.feature.includes('util')) return `${sign}${(insight.slopePerHour * 100).toFixed(2)}%p/h`;
  return `${sign}${insight.slopePerHour.toFixed(2)}/h`;
}

// 미니 스파크라인: values를 0~100% 높이 막대로 정규화
function sparkHeights(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v) => 20 + ((v - min) / span) * 80);
}

function horizonText(t0: number, tFuture: number): string {
  const min = Math.round(tFuture - t0);
  if (min >= 120) return `${Math.round(min / 60)}시간 후 예측`;
  return `${min}분 후 예측`;
}

function formatPValue(p: number): string {
  if (p < 0.001) return 'p<0.001';
  return `p=${p.toFixed(3)}`;
}

function formatGStarDelta(kpi: BncGStarKpi): string {
  // G* Δ평균은 KPI 원단위 평균차 → 원문(JSON/터미널)과 동일하게 raw 값 표기
  const sign = kpi.deltaMean >= 0 ? '+' : '';
  return `Δ ${sign}${kpi.deltaMean.toFixed(3)}`;
}

const KPI_LABELS: Record<string, string> = {
  max_util: '최대 가동률',
  utilization_avg: '평균 가동률',
  utilization: '평균 가동률',
  wip: 'WIP',
  wait_ratio: '대기율',
  q_time_min: '평균 대기시간',
  available_tool_ratio: '가용 Tool 비율',
};

function kpiLabel(key: string): string {
  return KPI_LABELS[key] ?? key.replaceAll('_', ' ');
}

function simNow(kpi: { kpi: string; now: number }): string {
  return formatKpiByFeature(kpi.kpi, kpi.now);
}

function simFuture(kpi: { kpi: string; future: number }): string {
  return formatKpiByFeature(kpi.kpi, kpi.future);
}

function simDeltaText(kpi: { kpi: string; pctChange: number }): string {
  const sign = kpi.pctChange >= 0 ? '+' : '';
  return `${sign}${kpi.pctChange.toFixed(1)}%`;
}

// 업스트림 의심 공정 클릭 → 3D Fab View에서 해당 TG로 포커싱 (Fab3dView는 ?tg=<이름>으로 선택)
function goToFab3d(tgName: string) {
  if (props.caseId) {
    void router.push({ name: ROUTE_NAMES.fab3d, query: { caseId: props.caseId, tg: tgName } });
  } else {
    void router.push({ name: ROUTE_NAMES.fab3d, query: { tg: tgName } });
  }
}
</script>

<template>
  <section class="bnc-cause">
    <p v-if="loading" class="bnc-cause__state">원인 분석을 불러오는 중입니다.</p>
    <p v-else-if="errorMessage" class="bnc-cause__state bnc-cause__state--error">{{ errorMessage }}</p>
    <p v-else-if="!analysis" class="bnc-cause__state">원인 분석 결과가 없습니다. Cause Analyzer 완료 후 표시됩니다.</p>

    <template v-else>
      <!-- 1. AI 원인 판정 카드 -->
      <article v-if="llmVerdict" class="bnc-cause__verdict">
        <!-- 헤더 -->
        <header class="bnc-cause__verdict-hd">
          <span class="bnc-cause__card-label">AI 원인 판정</span>
          <span class="bnc-cause__verdict-time">{{ formatKoMonthDayTime(analysis.createdAt) }}</span>
        </header>

        <!-- 주원인 -->
        <div class="bnc-cause__verdict-main">
          <span class="bnc-cause__verdict-dot" aria-hidden="true" />
          <div class="bnc-cause__verdict-main-text">
            <span class="bnc-cause__verdict-category">{{ llmVerdict.mainCategory }}</span>
            <span class="bnc-cause__verdict-feature">대표 피처 · {{ llmVerdict.mainFeature }}</span>
          </div>
        </div>

        <p class="bnc-cause__verdict-summary">{{ llmVerdict.summary }}</p>

        <!-- 추론 근거 -->
        <p class="bnc-cause__verdict-reasoning">{{ llmVerdict.reasoning }}</p>
      </article>

      <!-- 1. 판정 카드 폴백 (llmVerdict 없을 때) -->
      <article v-else class="bnc-cause__judgment">
        <header class="bnc-cause__judgment-hd">
          <span class="bnc-cause__card-label">AI 원인 판정</span>
          <BaseBadge v-if="judgment" :variant="confidenceMeta(judgment.primaryConfidence).variant">
            {{ confidenceMeta(judgment.primaryConfidence).label }}
          </BaseBadge>
          <span class="bnc-cause__judgment-time">{{ formatKoMonthDayTime(analysis.createdAt) }}</span>
        </header>

        <template v-if="judgment">
          <div class="bnc-cause__judgment-primary">
            <span class="bnc-cause__judgment-cat">{{ judgment.primaryCategory }}</span>
            <span class="bnc-cause__judgment-feature">대표 피처 · {{ judgment.primaryCause }}</span>
          </div>
          <p class="bnc-cause__judgment-reason">{{ judgment.primaryReasoning }}</p>
        </template>
        <p v-else class="bnc-cause__judgment-reason">{{ analysis.forwardForecastText }}</p>
      </article>

      <!-- 1-b. 원인 카테고리 수렴 (판정 근거: 4개 분석 종합 점수) -->
      <section v-if="categories.length" class="bnc-cause__section">
        <div class="bnc-cause__section-hd">
          <h3>원인 카테고리 수렴</h3>
          <p class="bnc-cause__section-sub">SHAP·트렌드·G*·업스트림 4개 분석을 종합한 원인 후보 점수 (높을수록 유력)</p>
        </div>
        <div class="bnc-cause__cat-list">
          <div
            v-for="(cat, i) in visibleCategories"
            :key="cat.name"
            class="bnc-cause__cat-row"
            :class="{ 'bnc-cause__cat-row--top': i === 0 }"
          >
            <span class="bnc-cause__cat-name">{{ cat.name }}</span>
            <div class="bnc-cause__cat-bar-track">
              <div
                class="bnc-cause__cat-bar"
                :style="{ width: `${Math.max(cat.shapSharePct, 2)}%` }"
                :class="{ 'bnc-cause__cat-bar--top': i === 0 }"
              />
            </div>
            <span class="bnc-cause__cat-meta">
              SHAP {{ cat.shapSharePct != null ? cat.shapSharePct.toFixed(0) : '-' }}% · G* {{ cat.gStarConfirmed ? '확인' : '✗' }} · score
              {{ cat.totalScore != null ? cat.totalScore.toFixed(2) : '-' }}
            </span>
            <BaseBadge :variant="confidenceMeta(cat.confidence).variant">{{ cat.confidence }}</BaseBadge>
          </div>
        </div>
        <button
          v-if="hiddenCategoryCount"
          type="button"
          class="bnc-cause__more"
          @click="showAllCategories = !showAllCategories"
        >
          {{ showAllCategories ? '기각 후보 접기' : `기각 후보 ${hiddenCategoryCount}개 보기` }}
        </button>
      </section>

      <!-- 2. SHAP 기여도 막대그래프 -->
      <section class="bnc-cause__section">
        <div class="bnc-cause__section-hd">
          <h3>SHAP 기여도</h3>
          <p class="bnc-cause__section-sub">병목 확률 예측에 기여한 피처 (양수 SHAP 기여 비율 기준)</p>
        </div>
        <div class="bnc-cause__shap-list">
          <div v-for="feat in shapRows" :key="feat.feature" class="bnc-cause__shap-row">
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
                :style="{ width: shapBarPct(feat), background: shapBarColor(feat.direction) }"
              />
            </div>
            <span class="bnc-cause__shap-score">{{ shapBarPct(feat) }}</span>
          </div>
        </div>
      </section>

      <!-- 3. KPI 트렌드 -->
      <section class="bnc-cause__section">
        <div class="bnc-cause__section-hd">
          <h3>KPI 트렌드</h3>
          <p class="bnc-cause__section-sub">관측 구간 내 시간당 변화 기울기 · ★ = 통계적으로 유의한 추세</p>
        </div>
        <div class="bnc-cause__trend-grid">
          <div
            v-for="insight in analysis.trendInsights"
            :key="insight.feature"
            class="bnc-cause__trend-card"
            :class="{ 'bnc-cause__trend-card--worsening': isWorseningTrend(insight) }"
          >
            <div class="bnc-cause__trend-hd">
              <span class="bnc-cause__trend-name">{{ insight.label }}</span>
              <span v-if="insight.significant" class="bnc-cause__trend-flag" title="기울기가 통계적으로 유의 (p<0.05)"
                >★ 유의</span
              >
            </div>
            <div v-if="insight.values.length" class="bnc-cause__trend-spark" aria-hidden="true">
              <span
                v-for="(h, i) in sparkHeights(insight.values)"
                :key="i"
                :style="{ height: `${h}%` }"
                :class="{ 'bnc-cause__trend-spark-bar--bad': isWorseningTrend(insight) }"
              />
            </div>
            <div class="bnc-cause__trend-stats">
              <strong v-if="insight.values.length" class="bnc-cause__trend-current">{{ trendCurrent(insight) }}</strong>
              <span
                class="bnc-cause__trend-slope"
                :class="{ 'bnc-cause__trend-slope--bad': isWorseningTrend(insight) }"
                >{{ slopeText(insight) }}</span
              >
            </div>
          </div>
        </div>
      </section>

      <!-- 4. 통계적 분석 -->
      <section class="bnc-cause__section">
        <div class="bnc-cause__section-hd">
          <h3>통계적 분석</h3>
          <p class="bnc-cause__section-sub">사후 검정(G*)과 Forward 시뮬레이션으로 인과·악화 가능성을 교차 검증</p>
        </div>

        <!-- 4-A. G* KPI 검정 -->
        <article class="bnc-cause__stat-card">
          <div class="bnc-cause__stat-hd">
            <span class="bnc-cause__stat-title">G* KPI 검정</span>
            <BaseBadge v-if="gStar" :variant="gStar.confirmed ? 'success' : 'info'">
              {{ gStar.confirmed ? '통계 확인됨' : '미확인' }}
            </BaseBadge>
            <span class="bnc-cause__stat-note">막대 = Δ평균(처리군−대조군) · ★ p&lt;0.05 유의</span>
          </div>

          <template v-if="gStar">
            <p v-if="gStar.proba" class="bnc-cause__stat-summary">
              앵커 병목 확률 <strong>{{ (gStar.proba * 100).toFixed(1) }}%</strong>
              <template v-if="gStar.nTotal"> · 알람 TG {{ gStar.nAlarm }}/{{ gStar.nTotal }}</template>
            </p>

            <!-- Δ평균 다이버징 막대 그래프 (0 기준축, ★ = 유의) -->
            <BncStatBarChart v-if="hasGStarChartItems" :items="gStarChartItems" />
            <p v-else class="bnc-cause__stat-empty">
              G* 분석 풀에는 포함됐지만 KPI별 유의 항목은 없습니다.
            </p>

            <div v-if="gStar.toolgroups.length" class="bnc-cause__gstar-tgs">
              <span class="bnc-cause__gstar-tgs-label">TG 포함 (통계 확인) · 클릭 시 3D</span>
              <div class="bnc-cause__tags">
                <button
                  v-for="tg in gStar.toolgroups"
                  :key="tg"
                  type="button"
                  class="bnc-cause__chip bnc-cause__chip--link"
                  @click="goToFab3d(tg)"
                >
                  {{ tg }}
                  <span class="bnc-cause__chip-arrow" aria-hidden="true">↗</span>
                </button>
              </div>
            </div>
          </template>
          <p v-else class="bnc-cause__stat-empty">G* 통계 검정이 수행되지 않았습니다(해당 시점 핸드오프 없음).</p>
        </article>

        <!-- 4-B. 시뮬레이션 예측 -->
        <article class="bnc-cause__stat-card">
          <div class="bnc-cause__stat-hd">
            <span class="bnc-cause__stat-title">시뮬레이션 예측</span>
            <BaseBadge v-if="simForecast" :variant="simForecast.getsWorse ? 'warning' : 'success'">
              {{ simForecast.getsWorse ? '악화 예상' : '안정 예상' }}
            </BaseBadge>
            <span v-if="simForecast" class="bnc-cause__stat-note"
              >조치 없을 시 {{ horizonText(simForecast.t0, simForecast.tFuture) }}</span
            >
          </div>

          <!-- 변화율 다이버징 막대 그래프 (감소=초록 / 증가=빨강, 툴팁=현재→예측) -->
          <BncStatBarChart v-if="simForecast && hasSimChartItems" :items="simChartItems" />
          <p v-else-if="simForecast" class="bnc-cause__stat-empty">
            Forward 시뮬레이션 예측은 도착했지만 표시할 KPI 변화량이 없습니다.
          </p>
          <p v-else class="bnc-cause__stat-empty">
            무대응 Forward 시뮬레이션 예측이 아직 저장되지 않았습니다.
          </p>
        </article>
      </section>

      <!-- 5. 업스트림 의심 공정 -->
      <section v-if="upstreamSuspects.length" class="bnc-cause__section">
        <div class="bnc-cause__section-hd">
          <h3>업스트림 의심 공정</h3>
          <p class="bnc-cause__section-sub">병목 유입 가능성이 있는 상류 TG · 클릭하면 3D Fab View에서 확인</p>
        </div>
        <div class="bnc-cause__tags">
          <button
            v-for="tg in upstreamSuspects"
            :key="tg"
            type="button"
            class="bnc-cause__chip bnc-cause__chip--link"
            @click="goToFab3d(tg)"
          >
            {{ tg }}
            <span class="bnc-cause__chip-arrow" aria-hidden="true">↗</span>
          </button>
        </div>
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
}

.bnc-cause__state {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}
.bnc-cause__state--error {
  color: var(--color-status-danger);
}

/* 공통 칩 */
.bnc-cause__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  background: var(--color-bg-card);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-pill);
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}
.bnc-cause__chip em {
  color: var(--color-action-primary);
  font-style: normal;
  font-size: var(--font-size-xs);
}
.bnc-cause__chip--upstream {
  border-color: color-mix(in srgb, var(--color-action-primary) 40%, var(--color-border-subtle));
  background: var(--color-action-primary-soft);
}
.bnc-cause__chip--sub {
  border-color: color-mix(in srgb, var(--color-status-warning) 32%, var(--color-border-subtle));
}
.bnc-cause__chip--dismissed {
  color: var(--color-fg-muted);
  text-decoration: line-through;
  opacity: 0.75;
}
.bnc-cause__chip--link {
  cursor: pointer;
  font: inherit;
  color: var(--color-action-primary);
  border-color: color-mix(in srgb, var(--color-action-primary) 40%, var(--color-border-subtle));
  background: var(--color-action-primary-soft);
  transition: background var(--transition-fast, 0.15s) ease;
}
.bnc-cause__chip--link:hover {
  background: color-mix(in srgb, var(--color-action-primary) 18%, var(--color-bg-card));
}
.bnc-cause__chip-arrow {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

/* 더보기/접기 토글 */
.bnc-cause__more {
  justify-self: start;
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-pill);
  background: var(--color-bg-card);
  color: var(--color-fg-muted);
  font: inherit;
  font-size: var(--font-size-xs);
  cursor: pointer;
}
.bnc-cause__more:hover {
  color: var(--color-fg-strong);
  border-color: var(--color-border-default);
}

.bnc-cause__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

/* 1. LLM 판정 카드 */
.bnc-cause__judgment {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-bg-page);
  border: 1px solid color-mix(in srgb, var(--color-status-danger) 28%, var(--color-border-subtle));
  border-radius: var(--radius-md);
}

.bnc-cause__judgment-hd {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.bnc-cause__card-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-status-danger);
  letter-spacing: 0.02em;
}

.bnc-cause__judgment-time {
  margin-left: auto;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-cause__judgment-primary {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.bnc-cause__judgment-cat {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.bnc-cause__judgment-feature {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.bnc-cause__judgment-reason {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  line-height: 1.65;
}

.bnc-cause__judgment-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.bnc-cause__judgment-tag-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.bnc-cause__judgment-tag-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-cause__judgment-dismiss {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

/* 1-b. 원인 카테고리 수렴 */
.bnc-cause__cat-list {
  display: grid;
  gap: var(--space-2);
}

.bnc-cause__cat-row {
  display: grid;
  grid-template-columns: 92px minmax(80px, 1fr) auto auto;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.bnc-cause__cat-row--top {
  border-color: color-mix(in srgb, var(--color-status-danger) 30%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-status-danger) 5%, var(--color-bg-page));
}

.bnc-cause__cat-name {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.bnc-cause__cat-bar-track {
  height: 8px;
  overflow: hidden;
  background: var(--color-border-subtle);
  border-radius: var(--radius-pill);
}

.bnc-cause__cat-bar {
  height: 100%;
  border-radius: inherit;
  background: var(--color-action-primary);
  transition: width 0.3s ease;
}

.bnc-cause__cat-bar--top {
  background: var(--color-status-danger);
}

.bnc-cause__cat-meta {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* 섹션 */
.bnc-cause__section {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}

.bnc-cause__section-hd {
  display: grid;
  gap: 2px;
}

.bnc-cause__section h3 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}

.bnc-cause__section-sub {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

/* 2. SHAP */
.bnc-cause__shap-list {
  display: grid;
  gap: var(--space-3);
}

.bnc-cause__shap-row {
  display: grid;
  grid-template-columns: minmax(200px, 260px) minmax(100px, 1fr) 52px;
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
  width: 24px;
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
  font-size: var(--font-size-xs);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bnc-cause__shap-bar-track {
  height: 10px;
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
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-align: right;
}

/* 3. KPI 트렌드 */
.bnc-cause__trend-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: var(--space-3);
}

.bnc-cause__trend-card {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.bnc-cause__trend-card--worsening {
  background: color-mix(in srgb, var(--color-status-danger) 5%, var(--color-bg-page));
  border-color: color-mix(in srgb, var(--color-status-danger) 22%, var(--color-border-subtle));
}

.bnc-cause__trend-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.bnc-cause__trend-name {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-cause__trend-flag {
  color: var(--color-status-danger);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.bnc-cause__trend-spark {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 36px;
}

.bnc-cause__trend-spark span {
  flex: 1;
  min-height: 2px;
  background: color-mix(in srgb, var(--color-action-primary) 55%, transparent);
  border-radius: 2px 2px 0 0;
}

.bnc-cause__trend-spark span.bnc-cause__trend-spark-bar--bad {
  background: color-mix(in srgb, var(--color-status-danger) 60%, transparent);
}

.bnc-cause__trend-stats {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.bnc-cause__trend-current {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.bnc-cause__trend-slope {
  color: var(--color-status-success);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-cause__trend-slope--bad {
  color: var(--color-status-danger);
}

/* 4. 통계적 분석 */
.bnc-cause__stat-card {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.bnc-cause__stat-hd {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.bnc-cause__stat-title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.bnc-cause__stat-note {
  margin-left: auto;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-cause__stat-summary {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
}
.bnc-cause__stat-summary strong {
  color: var(--color-fg-strong);
}

.bnc-cause__stat-empty {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

/* 4. 통계적 분석 — 막대 그래프(BncStatBarChart)는 자체 스타일, 여기선 TG 칩만 */
.bnc-cause__gstar-tgs {
  display: grid;
  gap: var(--space-2);
}
.bnc-cause__gstar-tgs-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

/* LLM 판정 카드 (verdict) */
.bnc-cause__verdict {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.bnc-cause__verdict-hd {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.bnc-cause__verdict-time {
  margin-left: auto;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-cause__verdict-main {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.bnc-cause__verdict-dot {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-status-success);
}

.bnc-cause__verdict-main-text {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.bnc-cause__verdict-category {
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
}

.bnc-cause__verdict-feature {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.bnc-cause__verdict-summary {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

/* 근거 3열 */
.bnc-cause__verdict-evidence {
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  align-items: start;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
}

.bnc-cause__verdict-ev-div {
  width: 1px;
  align-self: stretch;
  background: var(--color-border-subtle);
}

.bnc-cause__verdict-ev-cell {
  display: grid;
  gap: var(--space-1);
}

.bnc-cause__verdict-ev-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-cause__verdict-ev-val {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  font-variant-numeric: tabular-nums;
}

.bnc-cause__verdict-ev-val--ok {
  color: var(--color-status-success);
}

.bnc-cause__verdict-ev-val--muted {
  color: var(--color-fg-muted);
}

.bnc-cause__verdict-ev-sub {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-cause__verdict-ev-bar-wrap {
  height: 6px;
  overflow: hidden;
  background: var(--color-border-subtle);
  border-radius: var(--radius-pill);
}

.bnc-cause__verdict-ev-bar {
  height: 100%;
  background: var(--color-status-success);
  border-radius: inherit;
  transition: width 0.4s ease;
}

.bnc-cause__verdict-ev-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.bnc-cause__verdict-ev-tag {
  padding: 1px var(--space-2);
  background: color-mix(in srgb, var(--color-status-danger) 10%, var(--color-bg-card));
  border: 1px solid color-mix(in srgb, var(--color-status-danger) 22%, var(--color-border-subtle));
  border-radius: var(--radius-pill);
  color: var(--color-status-danger);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

/* 추론 */
.bnc-cause__verdict-reasoning {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.7;
}

/* 예측 콜아웃 */
.bnc-cause__verdict-forecast {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
  border-left: 3px solid var(--color-status-warning);
  background: color-mix(in srgb, var(--color-status-warning) 8%, var(--color-bg-card));
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

.bnc-cause__verdict-forecast-icon {
  flex-shrink: 0;
  color: var(--color-status-warning);
  font-size: var(--font-size-sm);
  line-height: 1.7;
}

.bnc-cause__verdict-forecast-text {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.7;
}

/* 기각 후보 */
.bnc-cause__verdict-rejected {
  display: grid;
  gap: var(--space-2);
}

.bnc-cause__verdict-rejected-toggle {
  justify-self: start;
  padding: var(--space-1) var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-pill);
  background: var(--color-bg-card);
  color: var(--color-fg-muted);
  font: inherit;
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.bnc-cause__verdict-rejected-toggle:hover {
  color: var(--color-fg-strong);
  border-color: var(--color-border-default);
}

.bnc-cause__verdict-rejected-list {
  display: grid;
  gap: var(--space-1);
}

.bnc-cause__verdict-rejected-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  flex-wrap: wrap;
}

.bnc-cause__verdict-rejected-cat {
  flex-shrink: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  text-decoration: line-through;
  text-decoration-color: var(--color-fg-muted);
}

.bnc-cause__verdict-rejected-reason {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

@media (max-width: 900px) {
  .bnc-cause__shap-row {
    grid-template-columns: 1fr;
  }
  .bnc-cause__cat-row {
    grid-template-columns: 80px 1fr auto;
  }
  .bnc-cause__cat-meta {
    grid-column: 1 / -1;
  }
  .bnc-cause__verdict-evidence {
    grid-template-columns: 1fr;
  }
  .bnc-cause__verdict-ev-div {
    display: none;
  }
}
</style>

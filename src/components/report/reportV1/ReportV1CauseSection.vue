<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { ROUTE_NAMES } from '@/constants/routes';

import type { ReportV1 } from '@/types/report';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BncStatBarChart from '@/components/bnc/BncStatBarChart.vue';
import type { StatBarItem } from '@/components/bnc/BncStatBarChart.vue';

import { formatKoMonthDayTime } from '@/utils/format';

const router = useRouter();

const props = defineProps<{
  report: ReportV1;
}>();

const cause = computed(() => props.report.cause);
const primary = computed(() => cause.value.primary);

const createdAt = computed(() => props.report.meta.generated_at);

// Build synthetic verdict from ReportV1.cause.primary
const llmVerdict = computed(() => ({
  mainCategory: primary.value.category,
  mainFeature: primary.value.feature,
  summary: cause.value.summary || primary.value.reasoning,
  reasoning: primary.value.reasoning !== cause.value.summary ? primary.value.reasoning : '',
}));

// Categories sorted by total_score
const showAllCategories = ref(false);
const categories = computed(() => [...cause.value.categories].sort((a, b) => b.total_score - a.total_score));
const primaryCategories = computed(() => categories.value.filter((c) => c.confidence !== 'LOW'));
const visibleCategories = computed(() =>
  showAllCategories.value || primaryCategories.value.length === 0 ? categories.value : primaryCategories.value
);
const hiddenCategoryCount = computed(() =>
  primaryCategories.value.length === 0 ? 0 : categories.value.length - primaryCategories.value.length
);

// SHAP rows sorted by contribution_pct descending
const shapRows = computed(() => [...cause.value.shap_top].sort((a, b) => b.contribution_pct - a.contribution_pct));

const KPI_LABELS: Record<string, string> = {
  max_util: '최대 가동률',
  utilization_avg: '평균 가동률',
  utilization: '평균 가동률',
  wip: 'WIP',
  wait_ratio: '대기율',
  q_time_min: '평균 대기시간',
  available_tool_ratio: '가용 Tool 비율',
};

const FEATURE_LABELS: Record<string, string> = {
  ...KPI_LABELS,
};

function kpiLabel(key: string): string {
  return KPI_LABELS[key] ?? key.replaceAll('_', ' ');
}

function featureLabel(feature: string): string {
  return FEATURE_LABELS[feature] ?? feature.replaceAll('_', ' ');
}

// Trend insights from trend_series.features object
const trendInsights = computed(() =>
  Object.entries(cause.value.trend_series.features).map(([feature, data]) => ({
    feature,
    label: kpiLabel(feature),
    slopePerHour: data.slope_per_hour,
    values: data.values,
    r2: data.r2,
    significant: data.significant,
  }))
);

// G* data from cause.g_star (no sigKpis chart - ReportV1 doesn't carry deltaMean/pAdjusted)
const gStar = computed(() => {
  const g = cause.value.g_star;
  if (!g) return null;
  return {
    confirmed: g.confirmed,
    proba: g.probability,
    nTotal: g.monte_carlo.n_total,
    nAlarm: g.monte_carlo.n_alarm,
    toolgroups: g.upstream_confirmed_toolgroups,
    sigKpiNames: g.significant_kpis,
  };
});

// Sim forecast from if_no_action.kpi_changes
const simForecast = computed(() => {
  const ifa = props.report.if_no_action;
  if (!ifa.available) return null;
  return {
    t0: 0,
    tFuture: ifa.horizon_min,
    getsWorse: ifa.will_get_worse,
    kpiDeltas: ifa.kpi_changes.map((k) => ({
      kpi: k.kpi,
      now: k.now,
      future: k.after,
      delta: k.delta,
      pctChange: k.pct_change,
      reliability: k.reliability_token,
    })),
  };
});

const simChartItems = computed<StatBarItem[]>(() =>
  (simForecast.value?.kpiDeltas ?? []).map((k) => ({
    label: kpiLabel(k.kpi),
    value: k.pctChange,
    tone: k.delta > 0 ? 'danger' : k.delta < 0 ? 'success' : 'muted',
    valueText: simDeltaText(k),
    subText: `${simNow(k)} → ${simFuture(k)} · 신뢰도 ${k.reliability}`,
  }))
);

const upstreamSuspects = computed(() => cause.value.upstream_suspects);

type CauseConf = 'HIGH' | 'MEDIUM' | 'LOW';
const CONFIDENCE_META: Record<CauseConf, { label: string; variant: 'danger' | 'warning' | 'info' }> = {
  HIGH: { label: '신뢰도 높음', variant: 'danger' },
  MEDIUM: { label: '신뢰도 보통', variant: 'warning' },
  LOW: { label: '신뢰도 낮음', variant: 'info' },
};

function confidenceMeta(conf: string | undefined) {
  const key = (conf?.toUpperCase() ?? 'LOW') as CauseConf;
  return CONFIDENCE_META[key] ?? CONFIDENCE_META.LOW;
}

function shapBarPct(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

function shapBarColor(directionToken: string): string {
  if (
    directionToken.includes('positive') ||
    directionToken.includes('병목') ||
    directionToken.includes('기여') ||
    directionToken.includes('혼잡') ||
    directionToken.includes('증가')
  ) {
    return 'var(--color-status-danger)';
  }
  return 'var(--color-action-primary)';
}

const DIRECTION_LABELS: Record<string, string> = {
  bottleneck_positive: '병목 기여 (상승)',
  bottleneck_negative: '병목 완화 (하강)',
  positive: '상승',
  negative: '하강',
};

function directionLabel(token: string): string {
  return DIRECTION_LABELS[token] ?? token.replaceAll('_', ' ');
}

function formatKpiByFeature(feature: string, value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  if (feature.includes('util')) return `${(value <= 1 ? value * 100 : value).toFixed(1)}%`;
  if (feature === 'wip') return `${Math.round(value).toLocaleString('ko-KR')} Lot`;
  if (feature.includes('q_time')) return `${value.toFixed(1)}분`;
  if (feature.includes('wait_ratio')) return value.toFixed(2);
  return value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}

function isWorseningTrend(feature: string, slopePerHour: number): boolean {
  if (feature === 'available_tool_ratio') return slopePerHour < 0;
  return slopePerHour > 0;
}

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

function simNow(kpi: { kpi: string; now: number }): string {
  return formatKpiByFeature(kpi.kpi, kpi.now);
}

function simFuture(kpi: { kpi: string; future: number }): string {
  return formatKpiByFeature(kpi.kpi, kpi.future);
}

function simDeltaText(kpi: { pctChange: number }): string {
  const sign = kpi.pctChange >= 0 ? '+' : '';
  return `${sign}${kpi.pctChange.toFixed(1)}%`;
}

function goToFab3d(tgName: string) {
  void router.push({ name: ROUTE_NAMES.fab3d, query: { tg: tgName } });
}
</script>

<template>
  <section class="report-v1__panel">
    <div class="report-v1__panel-head">
      <h3>원인 분석</h3>
      <span class="report-v1__consensus">
        <span
          v-for="i in 4"
          :key="i"
          :class="[
            'report-v1__consensus-dot',
            i <= report.cause.consensus_axes.axes_agreed_count ? 'report-v1__consensus-dot--active' : '',
          ]"
        />
        {{ report.cause.consensus_axes.axes_agreed_count }}/4 분석 수렴
      </span>
    </div>

    <!-- 1. AI 원인 판정 카드 -->
    <article class="bnc-cause__verdict">
      <header class="bnc-cause__verdict-hd">
        <span class="bnc-cause__card-label">AI 원인 판정</span>
        <span class="bnc-cause__verdict-time">{{ formatKoMonthDayTime(createdAt) }}</span>
      </header>

      <div class="bnc-cause__verdict-main">
        <span class="bnc-cause__verdict-dot" aria-hidden="true" />
        <div class="bnc-cause__verdict-main-text">
          <span class="bnc-cause__verdict-category">{{ llmVerdict.mainCategory }}</span>
          <span class="bnc-cause__verdict-feature">대표 피처 · {{ llmVerdict.mainFeature }}</span>
        </div>
      </div>

      <p class="bnc-cause__verdict-summary">{{ llmVerdict.summary }}</p>
      <p v-if="llmVerdict.reasoning" class="bnc-cause__verdict-reasoning">{{ llmVerdict.reasoning }}</p>
    </article>

    <!-- 1-b. 원인 카테고리 수렴 -->
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
              :style="{ width: `${Math.max(cat.shap_share_pct, 2)}%` }"
              :class="{ 'bnc-cause__cat-bar--top': i === 0 }"
            />
          </div>
          <span class="bnc-cause__cat-meta">
            SHAP {{ cat.shap_share_pct.toFixed(0) }}% · G* {{ cat.g_star_confirmed ? '확인' : '✗' }} · score
            {{ cat.total_score.toFixed(2) }}
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

    <!-- 2. SHAP 기여도 -->
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
              <span class="bnc-cause__shap-label">{{ featureLabel(feat.feature) }}</span>
              <span class="bnc-cause__shap-direction">{{ directionLabel(feat.direction_token) }}</span>
            </div>
          </div>
          <div class="bnc-cause__shap-bar-track">
            <div
              class="bnc-cause__shap-bar"
              :style="{ width: shapBarPct(feat.contribution_pct), background: shapBarColor(feat.direction_token) }"
            />
          </div>
          <span class="bnc-cause__shap-score">{{ shapBarPct(feat.contribution_pct) }}</span>
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
          v-for="insight in trendInsights"
          :key="insight.feature"
          class="bnc-cause__trend-card"
          :class="{ 'bnc-cause__trend-card--worsening': isWorseningTrend(insight.feature, insight.slopePerHour) }"
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
              :class="{ 'bnc-cause__trend-spark-bar--bad': isWorseningTrend(insight.feature, insight.slopePerHour) }"
            />
          </div>
          <div class="bnc-cause__trend-stats">
            <strong v-if="insight.values.length" class="bnc-cause__trend-current">
              {{ formatKpiByFeature(insight.feature, insight.values.at(-1)) }}
            </strong>
            <span
              class="bnc-cause__trend-slope"
              :class="{ 'bnc-cause__trend-slope--bad': isWorseningTrend(insight.feature, insight.slopePerHour) }"
            >
              {{
                (() => {
                  const sign = insight.slopePerHour >= 0 ? '+' : '';
                  return insight.feature.includes('util')
                    ? `${sign}${(insight.slopePerHour * 100).toFixed(2)}%p/h`
                    : `${sign}${insight.slopePerHour.toFixed(2)}/h`;
                })()
              }}
            </span>
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
          <span class="bnc-cause__stat-note">몬테카를로 시뮬레이션 기반 병목 통계 검정</span>
        </div>

        <template v-if="gStar">
          <p class="bnc-cause__stat-summary">
            앵커 병목 확률 <strong>{{ (gStar.proba * 100).toFixed(1) }}%</strong> · 알람 TG {{ gStar.nAlarm }}/{{
              gStar.nTotal
            }}
          </p>
          <p v-if="gStar.sigKpiNames.length" class="bnc-cause__stat-summary">
            유의 KPI: {{ gStar.sigKpiNames.map(kpiLabel).join(', ') }}
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
          <span v-if="simForecast" class="bnc-cause__stat-note">
            조치 없을 시 {{ horizonText(simForecast.t0, simForecast.tFuture) }}
          </span>
        </div>

        <BncStatBarChart v-if="simForecast" :items="simChartItems" />
        <p v-else class="bnc-cause__stat-empty">Forward 시뮬레이션 예측이 수행되지 않았습니다.</p>
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
  </section>
</template>

<style scoped>
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

/* 1. AI 판정 카드 */
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

.bnc-cause__card-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-status-danger);
  letter-spacing: 0.02em;
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

.bnc-cause__verdict-reasoning {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.7;
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

.bnc-cause__gstar-tgs {
  display: grid;
  gap: var(--space-2);
}
.bnc-cause__gstar-tgs-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
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
}
</style>

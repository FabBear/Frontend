<script setup lang="ts">
import { computed } from 'vue';

import type { ReportV1, ReportV1Kpi } from '@/types/report';

import { formatKoMonthDayTime } from '@/utils/format';
import { deltaTone, formatKpiDelta, formatKpiValue, formatNumber, kpiTone } from '@/utils/reportV1Formatters';

function deltaArrow(key: string, delta: number | null): string {
  if (delta === null || delta === 0) return '';
  const tone = deltaTone(key, delta);
  if (tone === 'good') return delta < 0 ? '↓' : '↑';
  if (tone === 'bad') return delta > 0 ? '↑' : '↓';
  return '';
}

type WarningItem = ReportV1['data_quality']['warnings'][number];

const props = defineProps<{
  report: ReportV1;
  selectedKpis: ReportV1Kpi[];
  approvedLabel: string;
  visibleWarnings: WarningItem[];
}>();

const detectedShort = computed(() => {
  const d = props.report.meta.detected_at;
  // "2026-06-14 23:12" → "06.14 23:12"
  const m = d.match(/\d{4}-(\d{2})-(\d{2})\s+(\d{2}:\d{2})/);
  return m ? `${m[1]}.${m[2]} ${m[3]}` : d;
});

const riskScore = computed(() => Math.round(props.report.risk.score));
const impactPct = computed(() => props.report.diffusion.impact_pct ?? null);
const atRiskLots = computed(() => props.report.diffusion.at_risk_lots ?? null);
const affectedTgs = computed(
  () =>
    props.report.diffusion.affected_toolgroups ?? props.report.diffusion.high_impact_processes.map((p) => p.toolgroup)
);

function formatApprovalDateTime(value?: string | null): string {
  if (!value) return '-';
  return Number.isNaN(new Date(value).getTime()) ? value : formatKoMonthDayTime(value);
}
</script>

<template>
  <header class="report-v1__hero">
    <!-- 승인자 strip -->
    <div class="report-v1__approval-strip">
      <div>
        <span>승인자</span>
        <strong>{{ report.approval?.approver_name || '김은비' }}</strong>
      </div>
      <div>
        <span>승인일시</span>
        <strong>{{ formatApprovalDateTime(report.approval?.approved_at) }}</strong>
      </div>
    </div>

    <!-- 병목 요약 카드 -->
    <div class="bnc-summary-card">
      <div class="bnc-summary-card__top">
        <span class="bnc-summary-card__area">{{ report.meta.area_name ?? report.meta.process_name }}</span>
        <span class="bnc-summary-card__badge" :data-severity="report.meta.severity_token">
          {{ report.meta.severity }}
        </span>
      </div>

      <div class="bnc-summary-card__title-row">
        <strong class="bnc-summary-card__tg">{{ report.meta.toolgroup }}</strong>
        <span class="bnc-summary-card__detected">{{ detectedShort }} 감지</span>
      </div>

      <dl class="bnc-summary-card__metrics" :class="{ 'has-tg': affectedTgs.length }">
        <div>
          <dt>위험 점수</dt>
          <dd>{{ riskScore }}</dd>
        </div>
        <div>
          <dt>영향</dt>
          <dd>{{ impactPct !== null ? `${formatNumber(impactPct, 1)}%` : '-' }}</dd>
        </div>
        <div v-if="affectedTgs.length" class="bnc-summary-card__metrics-tg">
          <dt>후속 TG</dt>
          <dd>{{ affectedTgs.length }}개</dd>
          <div class="bnc-summary-card__tg-names">
            <span v-for="tg in affectedTgs.slice(0, 5)" :key="tg" class="bnc-summary-card__affected-chip">{{ tg }}</span>
            <span v-if="affectedTgs.length > 5" class="bnc-summary-card__affected-chip bnc-summary-card__affected-chip--more">+{{ affectedTgs.length - 5 }}</span>
          </div>
        </div>
        <div>
          <dt>위험 Lot</dt>
          <dd>{{ atRiskLots !== null ? `${atRiskLots}` : '-' }}</dd>
        </div>
      </dl>
    </div>
  </header>

  <p class="report-v1__kpis-label">해당 시점 KPI</p>
  <dl class="report-v1__kpis">
    <div v-for="kpi in selectedKpis" :key="kpi.key" :class="`report-v1__kpi report-v1__kpi--${kpiTone(kpi)}`">
      <dt>{{ kpi.label }}</dt>
      <dd>{{ formatKpiValue(kpi) }}</dd>
      <span :class="`report-v1__kpi-delta report-v1__kpi-delta--${deltaTone(kpi.key, kpi.delta)}`">
        <span v-if="deltaArrow(kpi.key, kpi.delta)" aria-hidden="true">{{ deltaArrow(kpi.key, kpi.delta) }}</span>
        {{ formatKpiDelta(kpi) }}
      </span>
    </div>
  </dl>
</template>

<style scoped>
/* ── 병목 요약 카드 ─────────────────────────────────── */
.bnc-summary-card {
  padding: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-bg-surface);
  display: grid;
  gap: var(--space-2);
}

.bnc-summary-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.bnc-summary-card__area {
  font-size: var(--font-size-sm);
  color: var(--color-fg-muted);
  font-weight: var(--font-weight-semibold);
}

.bnc-summary-card__badge {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border-radius: var(--radius-pill);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  border: 1px solid transparent;
}

.bnc-summary-card__badge[data-severity='danger'] {
  background: color-mix(in srgb, var(--color-status-danger) 12%, var(--color-bg-surface));
  border-color: color-mix(in srgb, var(--color-status-danger) 30%, transparent);
  color: var(--color-status-danger);
}

.bnc-summary-card__badge[data-severity='warning'] {
  background: color-mix(in srgb, var(--color-status-warning) 12%, var(--color-bg-surface));
  border-color: color-mix(in srgb, var(--color-status-warning) 30%, transparent);
  color: var(--color-status-warning);
}

.bnc-summary-card__title-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.bnc-summary-card__tg {
  font-size: var(--font-size-xl, 1.25rem);
  font-weight: var(--font-weight-bold);
  color: var(--color-fg-strong);
  line-height: 1.1;
}

.bnc-summary-card__detected {
  font-size: var(--font-size-sm);
  color: var(--color-fg-muted);
}

/* 지표 행 */
.bnc-summary-card__metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  margin: 0;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.bnc-summary-card__metrics.has-tg {
  grid-template-columns: repeat(4, 1fr);
}

.bnc-summary-card__metrics > div {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
}

.bnc-summary-card__metrics > div + div {
  border-left: 1px solid var(--color-border-subtle);
}

.bnc-summary-card__metrics dt {
  font-size: var(--font-size-xs);
  color: var(--color-fg-muted);
  font-weight: var(--font-weight-semibold);
}

.bnc-summary-card__metrics dd {
  font-size: var(--font-size-xl, 1.25rem);
  font-weight: var(--font-weight-bold);
  color: var(--color-fg-strong);
  margin: 0;
}

/* 후속 TG (metrics 내부) */
.bnc-summary-card__tg-names {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 2px;
}

.bnc-summary-card__affected-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border-default);
  background: var(--color-bg-subtle);
  font-size: var(--font-size-xs);
  color: var(--color-fg);
  font-weight: var(--font-weight-semibold);
}

.bnc-summary-card__affected-chip--more {
  color: var(--color-fg-muted);
  font-weight: var(--font-weight-normal);
}

/* 해당 시점 KPI 라벨 */
.report-v1__kpis-label {
  font-size: var(--font-size-xs);
  color: var(--color-fg-muted);
  font-weight: var(--font-weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 var(--space-2);
}
</style>

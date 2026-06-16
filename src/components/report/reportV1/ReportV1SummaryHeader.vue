<script setup lang="ts">
import { AlertTriangle, CheckCircle2 } from '@lucide/vue';

import type { ReportV1, ReportV1Kpi } from '@/types/report';

import InsightCallout from '@/components/common/InsightCallout.vue';

import {
  deltaTone,
  formatKpiDelta,
  formatKpiValue,
  formatNumber,
  formatPercent,
  kpiTone,
} from '@/utils/reportV1Formatters';

function deltaArrow(key: string, delta: number | null): string {
  if (delta === null || delta === 0) return '';
  const tone = deltaTone(key, delta);
  if (tone === 'good') return delta < 0 ? '↓' : '↑';
  if (tone === 'bad') return delta > 0 ? '↑' : '↓';
  return '';
}

type BannerTone = 'warning' | 'success' | 'info';
type WarningItem = ReportV1['data_quality']['warnings'][number];

defineProps<{
  report: ReportV1;
  selectedKpis: ReportV1Kpi[];
  approvedLabel: string;
  decisionBannerTone: BannerTone;
  decisionBody: string;
  visibleWarnings: WarningItem[];
  hasSimulationWarning: boolean;
}>();
</script>

<template>
  <header class="report-v1__hero">
    <div class="report-v1__hero-main">
      <span class="report-v1__eyebrow">통합 최종 보고서</span>
      <h2>{{ report.meta.process_name }}</h2>
      <p>
        {{ report.meta.severity }} · 병목 위험 점수 {{ formatNumber(report.risk.score, 1) }} · ML 확률
        {{ formatPercent(report.risk.probability) }}
      </p>
    </div>
    <dl class="report-v1__meta">
      <div>
        <dt>탐지</dt>
        <dd>{{ report.meta.detected_at }}</dd>
      </div>
      <div>
        <dt>생성</dt>
        <dd>{{ report.meta.generated_at }}</dd>
      </div>
      <div v-if="report.approval.approver_name">
        <dt>승인자</dt>
        <dd>{{ report.approval.approver_name }} · {{ report.approval.approver_role }}</dd>
      </div>
      <div>
        <dt>승인 대응안</dt>
        <dd>{{ approvedLabel }}</dd>
      </div>
    </dl>
  </header>

  <InsightCallout
    class="report-v1__banner"
    :variant="decisionBannerTone"
    :title="report.actions.recommendation.headline"
  >
    <template #icon>
      <AlertTriangle v-if="decisionBannerTone === 'warning'" :size="20" aria-hidden="true" />
      <CheckCircle2 v-else :size="20" aria-hidden="true" />
    </template>
    <p>{{ decisionBody }}</p>
    <p v-if="hasSimulationWarning">SIM_KPI_IDENTICAL: 시뮬레이션 결과는 현장 검증 전까지 잠정 판단입니다.</p>
  </InsightCallout>

  <div v-if="visibleWarnings.length" class="report-v1__warnings">
    <strong>데이터 주의</strong>
    <span v-for="warning in visibleWarnings" :key="`${warning.code ?? warning.message}-${warning.field ?? ''}`">
      {{ warning.code ? `${warning.code}: ` : '' }}{{ warning.message }}
    </span>
  </div>

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

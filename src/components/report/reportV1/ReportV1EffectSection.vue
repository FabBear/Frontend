<script setup lang="ts">
import type { ReportV1ForecastMetric, ReportV1TgForecastRow } from '@/utils/reportV1DisplayAdapter';
import { barWidth, formatValue } from '@/utils/reportV1Formatters';

const props = defineProps<{
  noActionMetrics: ReportV1ForecastMetric[];
  noActionHorizonMin: number;
  noActionWillGetWorse: boolean;
  approvedCandidate: unknown;
  forecastGroups: Array<{ toolgroup: string; rows: ReportV1TgForecastRow[] }>;
}>();

function approvedRow(metricKey: string): ReportV1TgForecastRow | null {
  return props.forecastGroups[0]?.rows.find((row) => row.kpi === metricKey) ?? null;
}

function approvedValue(metric: ReportV1ForecastMetric): number | null {
  return approvedRow(metric.key)?.action ?? null;
}

function combinedMaxValue(metric: ReportV1ForecastMetric): number {
  const action = approvedValue(metric);
  return Math.max(Math.abs(metric.now), Math.abs(metric.after), Math.abs(action ?? 0), 1);
}
</script>

<template>
  <section class="report-v1__panel">
    <div class="report-v1__panel-head">
      <h3>미적용시 / 적용 시 실제 효과</h3>
    </div>

    <div v-if="noActionMetrics.length" class="report-v1__forecast-list">
      <article v-for="metric in noActionMetrics" :key="metric.key" class="report-v1__forecast-card">
        <div class="report-v1__forecast-card-head">
          <strong>{{ metric.label }}</strong>
        </div>
        <div class="report-v1__bar-compare">
          <div>
            <span>현재</span>
            <i><b :style="{ width: barWidth(metric.now, combinedMaxValue(metric)) }" /></i>
            <strong>{{ formatValue(metric.key, metric.unit, metric.now) }}</strong>
          </div>
          <div>
            <span>미적용 {{ noActionHorizonMin }}분</span>
            <i
              ><b
                class="report-v1__bar-fill--no-action"
                :style="{ width: barWidth(metric.after, combinedMaxValue(metric)) }"
            /></i>
            <strong>{{ formatValue(metric.key, metric.unit, metric.after) }}</strong>
          </div>
          <div v-if="approvedValue(metric) !== null">
            <span>적용 후 실제</span>
            <i
              ><b
                class="report-v1__bar-fill--action"
                :style="{ width: barWidth(approvedValue(metric) ?? 0, combinedMaxValue(metric)) }"
            /></i>
            <strong>{{ formatValue(metric.key, metric.unit, approvedValue(metric)) }}</strong>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

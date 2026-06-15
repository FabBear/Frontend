<script setup lang="ts">
import type { ReportV1ForecastMetric } from '@/utils/reportV1DisplayAdapter';
import { barWidth, deltaTone, formatForecastDelta, formatNumber, formatValue } from '@/utils/reportV1Formatters';

defineProps<{
  metrics: ReportV1ForecastMetric[];
  horizonMin: number;
  willGetWorse: boolean;
}>();
</script>

<template>
  <section class="report-v1__panel">
    <div class="report-v1__panel-head">
      <h3>무대응 {{ horizonMin }}분 예측</h3>
      <span>{{ willGetWorse ? '악화 가능' : '자연 완화 가능' }}</span>
    </div>
    <div class="report-v1__forecast-list">
      <article v-for="metric in metrics" :key="metric.key" class="report-v1__forecast-card">
        <div class="report-v1__forecast-card-head">
          <strong>{{ metric.label }}</strong>
          <span class="report-v1__pill report-v1__pill--info">신뢰도 {{ metric.reliabilityToken }}</span>
        </div>
        <div class="report-v1__bar-compare">
          <div>
            <span>현재</span>
            <i><b :style="{ width: barWidth(metric.now, metric.maxValue) }" /></i>
            <strong>{{ formatValue(metric.key, metric.unit, metric.now) }}</strong>
          </div>
          <div>
            <span>{{ horizonMin }}분 후</span>
            <i><b :style="{ width: barWidth(metric.after, metric.maxValue) }" /></i>
            <strong>{{ formatValue(metric.key, metric.unit, metric.after) }}</strong>
          </div>
        </div>
        <p :class="`report-v1__delta report-v1__delta--${deltaTone(metric.key, metric.delta)}`">
          {{ formatForecastDelta(metric) }} · {{ metric.pctChange > 0 ? '+' : ''
          }}{{ formatNumber(metric.pctChange, 1) }}%
        </p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

import { BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import { fetchReleasePlan } from '@/services/productionPlanService';

import type { ReleasePlanBucket } from '@/types/productionPlan';

import { resolveCssVar } from '@/utils/chart';
import { formatNumber } from '@/utils/format';

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent]);

// 카드 자체 로딩(실패해도 카드는 유지). 24h 버킷 볼륨 미니 막대 + 핫랏 구간 골드 강조.
const buckets = ref<ReleasePlanBucket[]>([]);
const loaded = ref(false);

onMounted(async () => {
  try {
    const plan = await fetchReleasePlan('24h');
    buckets.value = plan.releaseBuckets;
  } catch (error) {
    console.error('[ReleaseMiniTrendChart] load failed:', error);
  } finally {
    loaded.value = true;
  }
});

const chartOption = computed(() => {
  if (buckets.value.length === 0) return null;

  const brown = resolveCssVar('var(--color-primary)');
  const gold = resolveCssVar('var(--color-gold)');

  return {
    grid: { top: 6, right: 2, bottom: 2, left: 2 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: Array<{ dataIndex: number }>) => {
        const bucket = buckets.value[params[0]?.dataIndex ?? 0];
        if (!bucket) return '';
        const hot = bucket.priorityLots > 0 ? ` · 핫랏 ${formatNumber(bucket.priorityLots)}건` : '';
        return `${bucket.label}<br/>투입 ${formatNumber(bucket.totalLots)} lots${hot}`;
      },
    },
    xAxis: { type: 'category', show: false, data: buckets.value.map((bucket) => bucket.label) },
    yAxis: { type: 'value', show: false },
    series: [
      {
        type: 'bar',
        barCategoryGap: '28%',
        data: buckets.value.map((bucket) => ({
          value: bucket.totalLots,
          itemStyle: { color: bucket.priorityLots > 0 ? gold : brown, borderRadius: [2, 2, 0, 0] },
        })),
      },
    ],
  };
});
</script>

<template>
  <div class="release-mini-trend">
    <VChart v-if="chartOption" class="release-mini-trend__chart" :option="chartOption" autoresize />
    <p v-else class="release-mini-trend__empty">{{ loaded ? '추이 데이터 없음' : '로딩 중' }}</p>
  </div>
</template>

<style scoped>
.release-mini-trend,
.release-mini-trend__chart {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.release-mini-trend__empty {
  display: grid;
  height: 100%;
  place-items: center;
  border: var(--border-width-default) dashed var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
</style>

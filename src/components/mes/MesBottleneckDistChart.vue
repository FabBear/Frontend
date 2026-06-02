<script setup lang="ts">
import { computed } from 'vue';

import { CustomChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import { getProcessAreaAxisLabel, getProcessAreaSortOrder } from '@/constants/processArea';
import { RISK_LEVEL_META } from '@/constants/riskLevel';

import type { MesToolGroupMetric } from '@/types/mes';

import { resolveCssFontSize, resolveCssVar } from '@/utils/chart';

use([CanvasRenderer, CustomChart, GridComponent, TooltipComponent]);

type RiskCountGroup = {
  processCode: string;
  processName: string;
  side: MesToolGroupSide;
  CRITICAL: number;
  HIGH: number;
  MEDIUM: number;
  LOW: number;
};

type MesToolGroupSide = 'FE' | 'BE' | '기타';
type RiskSegment = {
  value: [number, number, number, number, number];
  group: RiskCountGroup;
  riskLabel: string;
  count: number;
  itemStyle: { color: string };
};
type RenderApi = {
  value: (dimension: number) => number;
  coord: (value: [number, number]) => number[];
  size: (value: [number, number]) => number[];
  style: () => Record<string, string>;
};

const SIDES: MesToolGroupSide[] = ['FE', '기타', 'BE'];
const RISK_KEYS = [
  { key: 'CRITICAL', metaKey: 'critical' },
  { key: 'HIGH', metaKey: 'high' },
  { key: 'MEDIUM', metaKey: 'medium' },
  { key: 'LOW', metaKey: 'low' },
] as const;

const props = defineProps<{ toolGroups: MesToolGroupMetric[] }>();

function getToolGroupSide(tgName: string): MesToolGroupSide {
  if (tgName.includes('_FE_') || tgName.endsWith('_FE')) return 'FE';
  if (tgName.includes('_BE_') || tgName.endsWith('_BE')) return 'BE';
  return '기타';
}

const chartData = computed(() => {
  const groupMap = new Map<string, RiskCountGroup>();
  const processMap = new Map<string, { code: string; name: string }>();

  for (const tg of props.toolGroups) {
    const side = getToolGroupSide(tg.tgName);
    const key = `${tg.areaCode}:${side}`;
    processMap.set(tg.areaCode, { code: tg.areaCode, name: tg.areaNameKo });

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        processCode: tg.areaCode,
        processName: tg.areaNameKo,
        side,
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      });
    }
    const group = groupMap.get(key)!;
    group[tg.riskGrade]++;
  }

  const processes = [...processMap.values()].sort(
    (a, b) => getProcessAreaSortOrder(a.code) - getProcessAreaSortOrder(b.code)
  );

  const groups = processes.map((process) =>
    SIDES.map((side) => {
      return (
        groupMap.get(`${process.code}:${side}`) ?? {
          processCode: process.code,
          processName: process.name,
          side,
          CRITICAL: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0,
        }
      );
    })
  );

  const segments: RiskSegment[] = [];
  let maxTotal = 0;

  groups.forEach((processGroups, processIndex) => {
    const visibleGroups = processGroups.filter((group) => {
      return group.CRITICAL + group.HIGH + group.MEDIUM + group.LOW > 0;
    });
    maxTotal = Math.max(
      maxTotal,
      ...visibleGroups.map((group) => group.CRITICAL + group.HIGH + group.MEDIUM + group.LOW)
    );

    visibleGroups.forEach((group, sideIndex) => {
      let start = 0;
      RISK_KEYS.forEach((risk) => {
        const count = group[risk.key];
        if (count === 0) return;
        const end = start + count;
        segments.push({
          value: [processIndex, start, end, sideIndex, visibleGroups.length],
          group,
          riskLabel: RISK_LEVEL_META[risk.metaKey].label,
          count,
          itemStyle: { color: resolveCssVar(RISK_LEVEL_META[risk.metaKey].color) },
        });
        start = end;
      });
    });
  });

  return {
    names: processes.map((process) => getProcessAreaAxisLabel(process.code, process.name)),
    segments,
    max: maxTotal,
  };
});

function renderGroupedStackedBar(_params: unknown, api: RenderApi) {
  const processIndex = api.value(0);
  const start = api.value(1);
  const end = api.value(2);
  const sideIndex = api.value(3);
  const sideCount = api.value(4);
  const centerX = api.coord([processIndex, 0])[0];
  const yStart = api.coord([processIndex, start])[1];
  const yEnd = api.coord([processIndex, end])[1];
  const bandWidth = api.size([1, 0])[0];
  const gap = 4;
  const barWidth = Math.max(8, Math.min(22, (bandWidth * 0.62 - gap * (sideCount - 1)) / sideCount));
  const totalWidth = barWidth * sideCount + gap * (sideCount - 1);
  const x = centerX - totalWidth / 2 + sideIndex * (barWidth + gap);

  return {
    type: 'rect',
    shape: {
      x,
      y: yEnd,
      width: barWidth,
      height: Math.max(1, yStart - yEnd),
    },
    style: api.style(),
  };
}

const chartOption = computed(() => {
  const axisColor = resolveCssVar('var(--color-fg-muted)');
  const gridColor = resolveCssVar('var(--color-border-subtle)');
  const chartFontSize = resolveCssFontSize('--font-size-sm');

  return {
    grid: { top: 30, right: 12, bottom: 54, left: 10, containLabel: true },
    tooltip: {
      trigger: 'item',
      axisPointer: { type: 'shadow' },
      textStyle: { fontSize: chartFontSize },
      formatter: (param: { marker: string; data?: RiskSegment }) => {
        const group = param.data?.group;
        if (!group) return '';
        const total = group.CRITICAL + group.HIGH + group.MEDIUM + group.LOW;

        return [
          `<b>${group.processCode} / ${group.processName}</b>`,
          `${group.side} TG: <b>${total}</b>개`,
          `${param.marker}${param.data?.riskLabel ?? ''}: <b>${param.data?.count ?? 0}</b>개`,
        ].join('<br/>');
      },
    },
    xAxis: {
      type: 'category',
      data: chartData.value.names,
      axisLabel: { color: axisColor, fontSize: chartFontSize, interval: 0, lineHeight: 16 },
      axisLine: { lineStyle: { color: gridColor } },
    },
    yAxis: {
      type: 'value',
      max: Math.max(5, Math.ceil(chartData.value.max + 2)),
      axisLabel: { color: axisColor, fontSize: chartFontSize },
      splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
    },
    series: [
      {
        type: 'custom',
        renderItem: renderGroupedStackedBar,
        encode: { x: 0, y: [1, 2] },
        data: chartData.value.segments,
      },
    ],
  };
});
</script>

<template>
  <section class="mes-bottleneck-dist-chart">
    <header class="mes-bottleneck-dist-chart__header">
      <h3>공정별 위험도 분포</h3>
      <span>8대 공정별 FE/BE TG 수 · hover로 그룹 확인</span>
    </header>
    <div class="mes-bottleneck-dist-chart__chart-wrap">
      <div class="mes-bottleneck-dist-chart__legend" aria-hidden="true">
        <span v-for="risk in RISK_KEYS" :key="risk.key">
          <i :style="{ backgroundColor: RISK_LEVEL_META[risk.metaKey].color }" />
          {{ RISK_LEVEL_META[risk.metaKey].label }}
        </span>
      </div>
      <VChart class="mes-bottleneck-dist-chart__chart" :option="chartOption" autoresize />
    </div>
  </section>
</template>

<style scoped>
.mes-bottleneck-dist-chart {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
}
.mes-bottleneck-dist-chart__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
}
.mes-bottleneck-dist-chart__legend {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  pointer-events: none;
}
.mes-bottleneck-dist-chart__legend span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}
.mes-bottleneck-dist-chart__legend i {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
}
.mes-bottleneck-dist-chart__header h3 {
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-bold);
}
.mes-bottleneck-dist-chart__header span {
  color: var(--color-fg-muted);
}
.mes-bottleneck-dist-chart__chart-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
}
.mes-bottleneck-dist-chart__chart {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>

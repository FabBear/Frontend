<script setup lang="ts">
import { computed } from 'vue';

import { Route } from '@lucide/vue';

import type { ReportV1 } from '@/types/report';

import { formatNumber, formatValue } from '@/utils/reportV1Formatters';

const props = defineProps<{
  report: ReportV1;
}>();

const emit = defineEmits<{
  openFab3d: [tgName: string];
}>();

const highImpactProcesses = computed(() => props.report.diffusion.high_impact_processes.slice(0, 5));
const forwardResults = computed(() =>
  props.report.diffusion.forward_simulation?.available
    ? props.report.diffusion.forward_simulation.results.slice(0, 6)
    : []
);
</script>

<template>
  <section class="report-v1__panel">
    <div class="report-v1__panel-head">
      <h3>확산 영향</h3>
      <button
        type="button"
        class="report-v1__panel-link"
        @click="emit('openFab3d', report.diffusion.bottleneck_location)"
      >
        3D Fab View에서 보기
        <span aria-hidden="true">↗</span>
      </button>
    </div>
    <div class="report-v1__path">
      <Route :size="18" aria-hidden="true" />
      <span v-for="node in report.diffusion.diffusion_path" :key="node">{{ node }}</span>
    </div>
    <div class="report-v1__impact-list">
      <button
        v-for="process in highImpactProcesses"
        :key="process.toolgroup"
        type="button"
        class="report-v1__impact-card"
        @click="emit('openFab3d', process.toolgroup)"
      >
        <strong>
          {{ process.toolgroup }}
          <span class="report-v1__impact-arrow" aria-hidden="true">↗</span>
        </strong>
        <dl>
          <div>
            <dt>가동률</dt>
            <dd>{{ formatNumber(process.utilization_pct, 1) }}%</dd>
          </div>
          <div>
            <dt>Wait</dt>
            <dd>{{ formatNumber(process.wait_ratio, 2) }}</dd>
          </div>
          <div>
            <dt>WIP</dt>
            <dd>{{ formatNumber(process.wip, 0) }}</dd>
          </div>
        </dl>
      </button>
    </div>
    <div class="report-v1__diffusion-foot">
      <span>라인 정지 예상 {{ formatNumber(report.diffusion.line_stop_expected_min, 1) }}분</span>
      <span>확산 위험 {{ report.diffusion.risk_level }}</span>
    </div>
    <div v-if="forwardResults.length" class="report-v1__forward">
      <h4>{{ report.diffusion.forward_simulation.horizon_min }}분 Forward Simulation</h4>
      <table>
        <thead>
          <tr>
            <th>Tool Group</th>
            <th>Q-time</th>
            <th>Wait</th>
            <th>WIP</th>
            <th>예측</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in forwardResults" :key="row.toolgroup">
            <td>{{ row.toolgroup }}</td>
            <td>{{ formatValue('q_time_min', 'min', row.q_time_min_future) }}</td>
            <td>{{ formatNumber(row.wait_ratio_future, 2) }}</td>
            <td>{{ formatNumber(row.wip_future, 0) }}</td>
            <td>{{ row.is_bottleneck_predicted ? '병목 지속' : '모니터링' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

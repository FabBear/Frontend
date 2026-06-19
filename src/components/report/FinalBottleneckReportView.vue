<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

import { LineChart } from 'echarts/charts';
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components';
import { use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import VChart from 'vue-echarts';

import type { FinalBottleneckReport } from '@/types/report';

import { buildTrendPath, parseModelFeatureRows, parseTrendRows } from '@/utils/finalReportParsers';
import { formatKoMonthDayTime } from '@/utils/format';
import { buildReportPdfFilename, downloadElementAsPdf } from '@/utils/reportPdf';

use([CanvasRenderer, LineChart, GridComponent, LegendComponent, TooltipComponent]);

const props = withDefaults(
  defineProps<{
    report: FinalBottleneckReport;
    variant?: 'document' | 'compact';
  }>(),
  {
    variant: 'document',
  }
);

const pdfReportRef = ref<HTMLElement | null>(null);
const isDownloading = ref(false);
const pdfError = ref<string | null>(null);
const showAllProcesses = ref(false);

const CAUSE_LABELS: Record<string, string> = {
  max_util: '최대 설비 가동률',
  wip: '재공 WIP',
  utilization_avg: '평균 가동률',
  utilization_avg_delta_120: '가동률 변화',
  q_time_min: '대기시간',
  q_time_min_delta_120: '대기시간 변화',
  wait_ratio: '대기 비율',
};

function formatApprovalDateTime(value?: string | null): string {
  if (!value) return '-';
  return Number.isNaN(new Date(value).getTime()) ? value : formatKoMonthDayTime(value);
}

const isCompact = computed(() => props.variant === 'compact');

const selectedAction = computed(
  () => props.report.action_effects.find((action) => isRecommended(action)) ?? props.report.action_effects[0] ?? null
);

const causeItems = computed(() =>
  props.report.cause_analysis
    .filter(
      (item): item is typeof item & { cause: string; contribution_pct: number } =>
        item.cause !== undefined && item.contribution_pct !== undefined
    )
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
);

const causeSummary = computed(() => props.report.cause_analysis.find((item) => item.summary)?.summary ?? '');
const consensus = computed(() => props.report.cause_analysis.find((item) => item.consensus)?.consensus);
const topCauseItems = computed(() => causeItems.value.slice(0, 3));
const similarCaseItems = computed(() =>
  topCauseItems.value.map((item) => ({
    cause: causeLabel(item.cause),
    similarCase: item.similar_case || '-',
  }))
);

const affectedActive = computed(() =>
  [...props.report.diffusion_analysis.affected_processes]
    .filter((p) => p.utilization_pct > 0 || p.wip > 0 || p.wait_ratio > 0)
    .sort((a, b) => {
      if (b.wip !== a.wip) return b.wip - a.wip;
      return b.utilization_pct - a.utilization_pct;
    })
);

const pdfAllAffectedProcesses = computed(() => {
  const activeNames = new Set(affectedActive.value.map((process) => process.process));
  const inactive = props.report.diffusion_analysis.affected_processes
    .filter((process) => !activeNames.has(process.process))
    .sort((a, b) => a.process.localeCompare(b.process));
  return [...affectedActive.value, ...inactive];
});

const pdfProcessSummary = computed(() => {
  const all = props.report.diffusion_analysis.affected_processes;
  const fallback = all[0] ?? { process: '-', utilization_pct: 0, wait_ratio: 0, wip: 0 };
  return {
    total: all.length,
    active: affectedActive.value.length,
    inactive: all.length - affectedActive.value.length,
    maxWip: all.reduce((best, process) => (process.wip > best.wip ? process : best), fallback),
    maxUtil: all.reduce((best, process) => (process.utilization_pct > best.utilization_pct ? process : best), fallback),
    maxWait: all.reduce((best, process) => (process.wait_ratio > best.wait_ratio ? process : best), fallback),
  };
});

const displayedProcesses = computed(() => {
  if (isCompact.value) return affectedActive.value.slice(0, 5);
  return showAllProcesses.value ? affectedActive.value : affectedActive.value.slice(0, 10);
});

const forwardResult = computed(() => props.report.diffusion_analysis.forward_simulation?.results?.[0] ?? null);
const pdfAffectedProcesses = computed(() => affectedActive.value.slice(0, 14));
const pdfTrendRows = computed(() => trendRows.value.slice(-8));
const selectedActionParams = computed(() =>
  selectedAction.value ? parseActionParams(selectedAction.value.description) : []
);

const executiveSummary = computed(() => {
  const report = props.report;
  const action = selectedAction.value;
  const path = report.diffusion_analysis.diffusion_path.join(' → ');
  const lines = [
    `${report.meta.detected_at}에 ${report.diffusion_analysis.bottleneck_location}에서 ${report.meta.severity} 병목이 탐지되었습니다. Risk Score는 ${report.bottleneck_info.risk_score.toFixed(1)}이고 지연 주문은 ${report.bottleneck_info.delayed_orders.toLocaleString('ko-KR')}건입니다.`,
    `현재 평균 대기시간은 ${formatMinutes(report.bottleneck_info.avg_queue_time_min)}, 최대 대기시간은 ${formatMinutes(report.bottleneck_info.peak_q_time_min)}, WIP는 ${report.bottleneck_info.wip_count.toLocaleString('ko-KR')}개입니다.`,
    `확산 경로는 ${path || '-'}이며, 전 라인 정지 위험은 ${formatMinutes(report.diffusion_analysis.line_stop_expected_min)} 이내로 추정되었습니다.`,
  ];

  if (causeSummary.value) {
    lines.push(`원인 분석 결과 ${causeSummary.value}`);
  }

  if (action) {
    lines.push(
      `승인된 대응안은 ${formatActionName(action.label)} ${action.action_kind}입니다. 시뮬레이션 기준 평균 대기시간 ${formatDeltaMinutes(action.kpi_delta.avg_queue_time_min)}, WIP ${formatDeltaCount(action.kpi_delta.wip_count)}, 처리량 변화 ${action.kpi_delta.throughput_delta.toLocaleString('ko-KR')}로 비교되었습니다.`
    );
  }

  return lines;
});

const headlineKpis = computed(() => [
  { label: 'Risk Score', value: props.report.bottleneck_info.risk_score.toFixed(1), tone: 'danger' },
  {
    label: '지연 주문',
    value: `${props.report.bottleneck_info.delayed_orders.toLocaleString('ko-KR')}건`,
    tone: 'warning',
  },
  { label: '평균 대기', value: formatMinutes(props.report.bottleneck_info.avg_queue_time_min), tone: 'danger' },
  { label: '최대 대기', value: formatMinutes(props.report.bottleneck_info.peak_q_time_min), tone: 'warning' },
  { label: 'WIP', value: `${props.report.bottleneck_info.wip_count.toLocaleString('ko-KR')}개`, tone: 'info' },
  { label: '가동률', value: `${props.report.bottleneck_info.utilization_pct.toFixed(1)}%`, tone: 'info' },
]);

const trendRows = computed(() => parseTrendRows(props.report.full_markdown));
const hasTrend = computed(() => trendRows.value.length > 0);
const modelFeatureRows = computed(() => parseModelFeatureRows(props.report.full_markdown));

const pdfTrendChart = computed(() => {
  const rows = pdfTrendRows.value;
  const width = 650;
  const height = 156;
  const padX = 34;
  const padY = 18;
  const plotW = width - padX * 2;
  const plotH = height - padY * 2 - 16;
  const xAt = (index: number) => padX + (rows.length <= 1 ? plotW / 2 : (plotW * index) / (rows.length - 1));
  const yAt = (value: number, max: number) => padY + plotH - (value / Math.max(max, 1)) * plotH;
  const values = {
    qTime: rows.map((row) => row.qTimeMin),
    wip: rows.map((row) => row.wip),
    waitRatio: rows.map((row) => row.waitRatio),
  };

  return {
    viewBox: `0 0 ${width} ${height}`,
    gridLines: [0, 0.25, 0.5, 0.75, 1].map((ratio) => padY + plotH - plotH * ratio),
    labels: rows.map((row, index) => ({ label: row.label, x: xAt(index), y: height - 4 })),
    qTimePath: buildTrendPath(values.qTime, xAt, yAt),
    wipPath: buildTrendPath(values.wip, xAt, yAt),
    waitRatioPath: buildTrendPath(values.waitRatio, xAt, yAt),
  };
});

const trendChartOption = computed(() => ({
  grid: { top: 24, right: 48, bottom: 34, left: 52 },
  tooltip: { trigger: 'axis' },
  legend: { bottom: 0, textStyle: { color: '#475467', fontSize: 11 } },
  xAxis: {
    type: 'category',
    data: trendRows.value.map((row) => row.label),
    axisLabel: { color: '#667085' },
  },
  yAxis: [
    {
      type: 'value',
      name: '분',
      axisLabel: { color: '#667085' },
      splitLine: { lineStyle: { color: '#eaecf0', type: 'dashed' } },
    },
    {
      type: 'value',
      name: 'WIP/비율',
      axisLabel: { color: '#667085' },
      splitLine: { show: false },
    },
  ],
  series: [
    {
      name: '대기시간',
      type: 'line',
      smooth: true,
      yAxisIndex: 0,
      data: trendRows.value.map((row) => row.qTimeMin),
      color: '#b42318',
      connectNulls: false,
    },
    {
      name: 'WIP',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: trendRows.value.map((row) => row.wip),
      color: '#1570ef',
      connectNulls: false,
    },
    {
      name: '대기 비율',
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: trendRows.value.map((row) => row.waitRatio),
      color: '#dc6803',
      connectNulls: false,
    },
  ],
}));

function causeLabel(key: string): string {
  return CAUSE_LABELS[key] ?? key.replaceAll('_', ' ');
}

function formatActionName(label: string): string {
  const plan = label.match(/\b[A-Z]\b/)?.[0] ?? label;
  return plan.length === 1 ? `플랜 ${plan}` : label;
}

function isRecommended(action: { label: string }): boolean {
  const plan = action.label.match(/\b[A-Z]\b/)?.[0] ?? action.label;
  return plan === props.report.recommendation.action_label || action.label === props.report.recommendation.action_label;
}

function formatMinutes(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  if (Math.abs(value) >= 60) {
    const h = Math.floor(Math.abs(value) / 60);
    const m = Math.round(Math.abs(value) % 60);
    const text = m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
    return value < 0 ? `-${text}` : text;
  }
  return `${value.toFixed(1)}분`;
}

function formatDeltaMinutes(value: number): string {
  if (value < 0) return `${Math.abs(value).toFixed(1)}분 감소`;
  if (value > 0) return `${value.toFixed(1)}분 증가`;
  return '변화 없음';
}

function formatDeltaCount(value: number): string {
  if (value < 0) return `${Math.abs(value).toLocaleString('ko-KR')}개 감소`;
  if (value > 0) return `${value.toLocaleString('ko-KR')}개 증가`;
  return '변화 없음';
}

function formatRatio(value: number): string {
  return value === 0 ? '0' : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}

function formatRatioWithPercent(value: number): string {
  return `${formatRatio(value)} (${(value * 100).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}%)`;
}

function formatBoolean(value: boolean): string {
  return value ? '예' : '아니오';
}

function utilColorClass(pct: number): string {
  if (pct >= 90) return 'final-report__util-fill--danger';
  if (pct >= 60) return 'final-report__util-fill--warning';
  return 'final-report__util-fill--ok';
}

function parseActionParams(desc: string): string[] {
  return desc
    .split('|')
    .map((s) => s.trim().replace(/^\[플랜 [A-Z]\]\s*/, ''))
    .filter(Boolean);
}

function filenameBase(extension: 'pdf' | 'md' | 'json'): string {
  const base = buildReportPdfFilename(props.report.meta.process_name, props.report.meta.generated_at);
  return base.replace(/\.pdf$/, `.${extension}`);
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadMarkdown() {
  downloadTextFile(filenameBase('md'), props.report.full_markdown, 'text/markdown;charset=utf-8');
}

function downloadJson() {
  downloadTextFile(filenameBase('json'), JSON.stringify(props.report, null, 2), 'application/json;charset=utf-8');
}

async function handlePdfDownload() {
  if (!pdfReportRef.value || isDownloading.value) return;
  isDownloading.value = true;
  pdfError.value = null;

  await nextTick();

  try {
    await downloadElementAsPdf(pdfReportRef.value, filenameBase('pdf'));
  } catch (err) {
    pdfError.value = err instanceof Error ? err.message : 'PDF 생성 실패';
    console.error('[PDF]', err);
  } finally {
    isDownloading.value = false;
  }
}

defineExpose({ triggerPdfDownload: handlePdfDownload, downloadMarkdown, downloadJson, isDownloading, pdfError });
</script>

<template>
  <section class="final-report" :class="{ 'final-report--compact': isCompact }">
    <article class="final-report__paper">
      <header class="final-report__cover">
        <div>
          <p class="final-report__eyebrow">FAB 병목 대응 보고서</p>
          <h2>{{ report.meta.process_name }}</h2>
          <dl class="final-report__meta">
            <div>
              <dt>탐지</dt>
              <dd>{{ report.meta.detected_at }}</dd>
            </div>
            <div>
              <dt>생성</dt>
              <dd>{{ report.meta.generated_at }}</dd>
            </div>
            <div>
              <dt>승인자</dt>
              <dd>{{ report.approval_info.approved_by }} · {{ report.approval_info.approved_role }}</dd>
            </div>
            <div>
              <dt>승인 상태</dt>
              <dd>{{ report.approval_info.status }}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div v-if="pdfError" class="final-report__pdf-error" role="alert">PDF 생성 중 오류 발생: {{ pdfError }}</div>

      <section class="final-report__summary-stack" aria-labelledby="report-summary-title">
        <section class="final-report__summary-card final-report__summary-card--executive">
          <div class="final-report__section-head">
            <h3 id="report-summary-title">Executive Summary</h3>
            <span>전문 판단 요약</span>
          </div>
          <ol class="final-report__summary-list">
            <li v-for="line in executiveSummary" :key="line">{{ line }}</li>
          </ol>
        </section>

        <section class="final-report__summary-card final-report__summary-card--decision">
          <div class="final-report__section-head">
            <h3>승인 대응안</h3>
            <span
              >Simulation confidence
              {{ selectedAction ? Math.round(selectedAction.simulation_confidence * 100) : 0 }}%</span
            >
          </div>
          <div v-if="selectedAction" class="final-report__selected-action">
            <strong>{{ formatActionName(selectedAction.label) }} · {{ selectedAction.action_kind }}</strong>
            <p class="final-report__body">{{ report.recommendation.reason }}</p>
            <ul>
              <li v-for="param in selectedActionParams" :key="param">{{ param }}</li>
            </ul>
            <dl>
              <div>
                <dt>평균 대기시간</dt>
                <dd>{{ formatDeltaMinutes(selectedAction.kpi_delta.avg_queue_time_min) }}</dd>
              </div>
              <div>
                <dt>WIP</dt>
                <dd>{{ formatDeltaCount(selectedAction.kpi_delta.wip_count) }}</dd>
              </div>
              <div>
                <dt>처리량</dt>
                <dd>{{ selectedAction.kpi_delta.throughput_delta.toLocaleString('ko-KR') }}</dd>
              </div>
            </dl>
          </div>
        </section>

        <dl class="final-report__kpis">
          <div v-for="item in headlineKpis" :key="item.label" :class="`final-report__kpi--${item.tone}`">
            <dt>{{ item.label }}</dt>
            <dd>{{ item.value }}</dd>
          </div>
        </dl>
      </section>

      <template v-if="!isCompact">
        <section class="final-report__section final-report__chapter">
          <div class="final-report__section-head">
            <h3><span>01</span> 병목 탐지 및 확산 영향</h3>
            <span v-if="report.diffusion_analysis.line_stop_expected_min">
              전 라인 정지 예상 {{ formatMinutes(report.diffusion_analysis.line_stop_expected_min) }} 이내
            </span>
          </div>
          <p class="final-report__body">
            {{ report.meta.detected_at }}에 {{ report.diffusion_analysis.bottleneck_location }} 공정에서 병목이
            탐지되었습니다. 탐지 기준 Risk Score는 {{ report.bottleneck_info.risk_score.toFixed(1) }}이고, 심각도는
            {{ report.meta.severity }}입니다. 현재 평균 대기시간은
            {{ formatMinutes(report.bottleneck_info.avg_queue_time_min) }}, 최대 대기시간은
            {{ formatMinutes(report.bottleneck_info.peak_q_time_min) }}입니다.
          </p>
          <dl class="final-report__facts">
            <div>
              <dt>탐지 시각</dt>
              <dd>{{ report.meta.detected_at }}</dd>
            </div>
            <div>
              <dt>병목 위치</dt>
              <dd>{{ report.diffusion_analysis.bottleneck_location }}</dd>
            </div>
            <div>
              <dt>병목 발생</dt>
              <dd>{{ formatBoolean(report.diffusion_analysis.is_bottleneck) }}</dd>
            </div>
            <div>
              <dt>Risk Level</dt>
              <dd>{{ report.diffusion_analysis.risk_level ?? report.meta.severity }}</dd>
            </div>
            <div>
              <dt>Load Ratio</dt>
              <dd>{{ formatRatioWithPercent(report.bottleneck_info.load_ratio) }}</dd>
            </div>
            <div>
              <dt>가용 호기 비율</dt>
              <dd>{{ formatRatioWithPercent(report.bottleneck_info.available_tool_ratio) }}</dd>
            </div>
          </dl>
          <div class="final-report__path">
            <span v-for="node in report.diffusion_analysis.diffusion_path" :key="node">{{ node }}</span>
          </div>
          <div v-if="forwardResult" class="final-report__forecast">
            <strong>{{ props.report.diffusion_analysis.forward_simulation?.horizon_min ?? 120 }}분 후 예측</strong>
            <span>{{ forwardResult.y_bottleneck ? '병목 지속 가능성 있음' : '병목 해소 예상' }}</span>
            <span>미래 Q-Time {{ formatMinutes(forwardResult.q_time_future) }}</span>
            <span>미래 WIP {{ forwardResult.wip_future.toLocaleString('ko-KR') }}</span>
            <span>미래 대기 비율 {{ formatRatioWithPercent(forwardResult.wait_ratio_future) }}</span>
          </div>
        </section>

        <section class="final-report__section final-report__chapter">
          <div class="final-report__section-head">
            <h3><span>02</span> 원인 분석 및 모델 근거</h3>
            <span v-if="consensus">모델 합의 {{ consensus.confidence_level }}</span>
          </div>
          <p v-if="causeSummary" class="final-report__body">{{ causeSummary }}</p>

          <section class="final-report__subsection">
            <div class="final-report__subhead">
              <h4>Trend 지표</h4>
              <span>탐지 전 구간</span>
            </div>
            <VChart v-if="hasTrend" class="final-report__chart" :option="trendChartOption" autoresize />
            <p v-else class="final-report__empty">구조화된 trend 데이터가 없어 차트를 표시하지 않습니다.</p>
          </section>

          <section class="final-report__subsection">
            <div class="final-report__subhead">
              <h4>영향 공정</h4>
              <span>활성 영향 {{ pdfProcessSummary.active }}개 / 전체 {{ pdfProcessSummary.total }}개</span>
            </div>
            <div class="final-report__process-table-wrap" data-pdf-scroll>
              <table class="final-report__process-table">
                <thead>
                  <tr>
                    <th>공정</th>
                    <th>상태</th>
                    <th>가동률</th>
                    <th>대기 비율</th>
                    <th>WIP</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="process in displayedProcesses" :key="process.process">
                    <td class="final-report__process-name">{{ process.process }}</td>
                    <td>{{ process.status }}</td>
                    <td class="final-report__process-util">
                      <div class="final-report__util-track">
                        <span
                          class="final-report__util-fill"
                          :class="utilColorClass(process.utilization_pct)"
                          :style="{ width: `${Math.min(100, process.utilization_pct)}%` }"
                        />
                      </div>
                      <b>{{ process.utilization_pct.toFixed(1) }}%</b>
                    </td>
                    <td>{{ formatRatio(process.wait_ratio) }}</td>
                    <td>{{ process.wip.toLocaleString('ko-KR') }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button
              v-if="affectedActive.length > displayedProcesses.length"
              class="final-report__show-more"
              type="button"
              data-pdf-ignore
              @click="showAllProcesses = true"
            >
              전체 {{ affectedActive.length }}개 활성 영향 공정 보기
            </button>
          </section>

          <section class="final-report__subsection">
            <div class="final-report__subhead">
              <h4>원인 분석 Top 3</h4>
              <span>SHAP 기여도 기준</span>
            </div>
            <div class="final-report__causes">
              <div v-for="item in topCauseItems" :key="item.cause" class="final-report__cause">
                <div>
                  <span>{{ causeLabel(item.cause) }}</span>
                  <strong>{{ item.contribution_pct.toFixed(1) }}%</strong>
                </div>
                <div class="final-report__cause-track">
                  <span
                    class="final-report__cause-fill"
                    :class="
                      item.contribution_pct >= 40
                        ? 'final-report__cause-fill--high'
                        : item.contribution_pct >= 20
                          ? 'final-report__cause-fill--mid'
                          : ''
                    "
                    :style="{ width: `${Math.min(100, item.contribution_pct)}%` }"
                  />
                </div>
              </div>
            </div>
          </section>

          <section class="final-report__subsection">
            <div class="final-report__subhead">
              <h4>유사 과거 사례</h4>
              <span>원인별 RAG 조회 결과</span>
            </div>
            <table class="final-report__process-table">
              <thead>
                <tr>
                  <th>원인</th>
                  <th>유사 사례</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in similarCaseItems" :key="item.cause">
                  <td class="final-report__process-name">{{ item.cause }}</td>
                  <td>{{ item.similarCase }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="final-report__subsection">
            <div class="final-report__subhead">
              <h4>모델 분석</h4>
              <span>SHAP · Trend consensus</span>
            </div>
            <table v-if="modelFeatureRows.length" class="final-report__process-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  <th>현재값</th>
                  <th>기여도</th>
                  <th>방향</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in modelFeatureRows" :key="row.feature">
                  <td class="final-report__process-name">{{ row.feature }}</td>
                  <td>{{ row.currentValue }}</td>
                  <td>{{ row.contribution }}</td>
                  <td>{{ row.direction }}</td>
                </tr>
              </tbody>
            </table>
            <div v-if="consensus" class="final-report__consensus">
              <strong>{{ consensus.summary }}</strong>
              <dl>
                <div>
                  <dt>G* 확인</dt>
                  <dd>
                    {{ consensus.g_star_confirmed === undefined ? '-' : formatBoolean(consensus.g_star_confirmed) }}
                  </dd>
                </div>
                <div>
                  <dt>G* 확률</dt>
                  <dd>
                    {{ consensus.g_star_proba === undefined ? '-' : formatRatioWithPercent(consensus.g_star_proba) }}
                  </dd>
                </div>
                <div>
                  <dt>합의 Feature</dt>
                  <dd>{{ consensus.agreed_features?.join(', ') || '-' }}</dd>
                </div>
                <div>
                  <dt>불일치 Feature</dt>
                  <dd>{{ consensus.conflicted_features?.join(', ') || '-' }}</dd>
                </div>
              </dl>
            </div>
          </section>
        </section>

        <section class="final-report__section final-report__chapter">
          <div class="final-report__section-head">
            <h3><span>03</span> 대응안 비교 및 승인 결과</h3>
            <span>선택안 {{ selectedAction ? formatActionName(selectedAction.label) : '-' }}</span>
          </div>
          <p class="final-report__body">
            승인된 대응안은
            {{
              selectedAction ? `${formatActionName(selectedAction.label)} ${selectedAction.action_kind}` : '-'
            }}입니다. 후보 대응안은 총 {{ report.action_effects.length }}개이며, 시뮬레이션 결과와 운영 조건을 비교해
            최종안을 선택했습니다.
          </p>
          <table class="final-report__process-table">
            <thead>
              <tr>
                <th>선택</th>
                <th>대응안</th>
                <th>종류</th>
                <th>평균 대기 변화</th>
                <th>WIP 변화</th>
                <th>처리량 변화</th>
                <th>신뢰도</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="action in report.action_effects"
                :key="action.label"
                :class="{ 'final-report__selected-row': isRecommended(action) }"
              >
                <td>{{ isRecommended(action) ? '선택' : '-' }}</td>
                <td class="final-report__process-name">{{ formatActionName(action.label) }}</td>
                <td>{{ action.action_kind }}</td>
                <td>{{ formatDeltaMinutes(action.kpi_delta.avg_queue_time_min) }}</td>
                <td>{{ formatDeltaCount(action.kpi_delta.wip_count) }}</td>
                <td>{{ action.kpi_delta.throughput_delta.toLocaleString('ko-KR') }}</td>
                <td>{{ Math.round(action.simulation_confidence * 100) }}%</td>
              </tr>
            </tbody>
          </table>

          <section v-if="selectedAction" class="final-report__subsection">
            <div class="final-report__subhead">
              <h4>Baseline 대비 선택안 효과</h4>
              <span>현재 보고서 제공 KPI 기준</span>
            </div>
            <table class="final-report__process-table">
              <thead>
                <tr>
                  <th>KPI</th>
                  <th>Baseline</th>
                  <th>선택안 적용 후</th>
                  <th>변화량</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>평균 대기시간</td>
                  <td>{{ formatMinutes(report.bottleneck_info.avg_queue_time_min) }}</td>
                  <td>
                    {{
                      formatMinutes(
                        report.bottleneck_info.avg_queue_time_min + selectedAction.kpi_delta.avg_queue_time_min
                      )
                    }}
                  </td>
                  <td>{{ formatDeltaMinutes(selectedAction.kpi_delta.avg_queue_time_min) }}</td>
                </tr>
                <tr>
                  <td>WIP</td>
                  <td>{{ report.bottleneck_info.wip_count.toLocaleString('ko-KR') }}개</td>
                  <td>
                    {{
                      (report.bottleneck_info.wip_count + selectedAction.kpi_delta.wip_count).toLocaleString('ko-KR')
                    }}개
                  </td>
                  <td>{{ formatDeltaCount(selectedAction.kpi_delta.wip_count) }}</td>
                </tr>
                <tr>
                  <td>처리량</td>
                  <td>-</td>
                  <td>-</td>
                  <td>{{ selectedAction.kpi_delta.throughput_delta.toLocaleString('ko-KR') }}</td>
                </tr>
              </tbody>
            </table>
          </section>

          <section class="final-report__subsection">
            <div class="final-report__subhead">
              <h4>대응안 원문</h4>
              <span>Agent 생성 후보</span>
            </div>
            <div class="final-report__action-texts">
              <article
                v-for="action in report.action_effects"
                :key="`${action.label}-text`"
                :class="{ 'final-report__action-text--selected': isRecommended(action) }"
              >
                <strong>{{ formatActionName(action.label) }} · {{ action.action_kind }}</strong>
                <p>{{ action.description }}</p>
              </article>
            </div>
          </section>
        </section>

        <section class="final-report__section final-report__chapter">
          <div class="final-report__section-head">
            <h3><span>04</span> 승인 정보</h3>
            <span>{{ report.approval_info.status }}</span>
          </div>
          <dl class="final-report__approval">
            <div>
              <dt>승인자</dt>
              <dd>{{ report.approval_info.approved_by }} ({{ report.approval_info.approved_role }})</dd>
            </div>
            <div>
              <dt>승인일시</dt>
              <dd>{{ formatApprovalDateTime(report.approval_info.approved_at) }}</dd>
            </div>
            <div>
              <dt>의견</dt>
              <dd>{{ report.approval_info.comment }}</dd>
            </div>
            <div>
              <dt>반려 사유</dt>
              <dd>{{ report.approval_info.rejection_reason ?? '-' }}</dd>
            </div>
          </dl>
        </section>
      </template>

      <p v-else class="final-report__compact-note">요약 모드입니다. 전체 전문은 리포트 상세 화면에서 확인합니다.</p>
    </article>

    <article ref="pdfReportRef" class="final-report__pdf-paper" aria-hidden="true">
      <header class="final-report__pdf-cover">
        <div>
          <p class="final-report__pdf-eyebrow">FAB BOTTLENECK RESPONSE REPORT</p>
          <h1>병목 대응 공식 보고서</h1>
          <p>{{ report.meta.process_name }}</p>
        </div>
        <div class="final-report__pdf-stamp">{{ report.meta.severity }}</div>
      </header>

      <table class="final-report__pdf-meta">
        <tbody>
          <tr>
            <th>대상 공정</th>
            <td>{{ report.meta.process_name }}</td>
            <th>탐지 시각</th>
            <td>{{ report.meta.detected_at }}</td>
          </tr>
          <tr>
            <th>생성 시각</th>
            <td>{{ report.meta.generated_at }}</td>
            <th>승인 상태</th>
            <td>{{ report.approval_info.status }}</td>
          </tr>
          <tr>
            <th>Tool Group</th>
            <td>{{ report.bottleneck_info.tool_group }}</td>
            <th>Risk Level</th>
            <td>{{ report.diffusion_analysis.risk_level ?? report.meta.severity }}</td>
          </tr>
          <tr>
            <th>병목 발생</th>
            <td>{{ formatBoolean(report.diffusion_analysis.is_bottleneck) }}</td>
            <th>병목 위치</th>
            <td>{{ report.diffusion_analysis.bottleneck_location }}</td>
          </tr>
        </tbody>
      </table>

      <section class="final-report__pdf-section">
        <h2>1. Executive Summary</h2>
        <ol class="final-report__pdf-summary">
          <li v-for="line in executiveSummary" :key="line">{{ line }}</li>
        </ol>
      </section>

      <section class="final-report__pdf-section">
        <h2>2. 핵심 지표</h2>
        <table class="final-report__pdf-table final-report__pdf-kpi-table">
          <tbody>
            <tr>
              <th>Risk Score</th>
              <td>{{ report.bottleneck_info.risk_score.toFixed(1) }}</td>
              <th>지연 주문</th>
              <td>{{ report.bottleneck_info.delayed_orders.toLocaleString('ko-KR') }}건</td>
            </tr>
            <tr>
              <th>평균 대기</th>
              <td>{{ formatMinutes(report.bottleneck_info.avg_queue_time_min) }}</td>
              <th>최대 대기</th>
              <td>{{ formatMinutes(report.bottleneck_info.peak_q_time_min) }}</td>
            </tr>
            <tr>
              <th>WIP</th>
              <td>{{ report.bottleneck_info.wip_count.toLocaleString('ko-KR') }}개</td>
              <th>가동률</th>
              <td>{{ report.bottleneck_info.utilization_pct.toFixed(1) }}%</td>
            </tr>
            <tr>
              <th>Load Ratio</th>
              <td>{{ formatRatioWithPercent(report.bottleneck_info.load_ratio) }}</td>
              <th>가용 호기 비율</th>
              <td>{{ formatRatioWithPercent(report.bottleneck_info.available_tool_ratio) }}</td>
            </tr>
            <tr>
              <th>FAB 총 WIP</th>
              <td>{{ report.fab_kpi.wip_total.toLocaleString('ko-KR') }}개</td>
              <th>FAB 평균 가동률</th>
              <td>{{ report.fab_kpi.utilization_avg_pct.toFixed(1) }}%</td>
            </tr>
            <tr>
              <th>FAB Q-Time</th>
              <td>{{ formatMinutes(report.fab_kpi.q_time_min) }}</td>
              <th>FAB Wait Ratio</th>
              <td>{{ formatRatioWithPercent(report.fab_kpi.wait_ratio) }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="final-report__pdf-section">
        <h2>3. 승인 대응안</h2>
        <div v-if="selectedAction" class="final-report__pdf-action">
          <div>
            <strong>{{ formatActionName(selectedAction.label) }} · {{ selectedAction.action_kind }}</strong>
            <p>{{ report.recommendation.reason }}</p>
          </div>
          <div class="final-report__pdf-action-params">
            <b>선택 대응안 운영 조건</b>
            <ul>
              <li v-for="param in parseActionParams(selectedAction.description)" :key="param">{{ param }}</li>
            </ul>
          </div>
          <table class="final-report__pdf-table">
            <thead>
              <tr>
                <th>대응안</th>
                <th>종류</th>
                <th>평균 대기 변화</th>
                <th>WIP 변화</th>
                <th>처리량 변화</th>
                <th>신뢰도</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="action in report.action_effects"
                :key="action.label"
                :class="{ 'final-report__pdf-selected-row': isRecommended(action) }"
              >
                <td>{{ formatActionName(action.label) }}</td>
                <td>{{ action.action_kind }}</td>
                <td>{{ formatDeltaMinutes(action.kpi_delta.avg_queue_time_min) }}</td>
                <td>{{ formatDeltaCount(action.kpi_delta.wip_count) }}</td>
                <td>{{ action.kpi_delta.throughput_delta.toLocaleString('ko-KR') }}</td>
                <td>{{ Math.round(action.simulation_confidence * 100) }}%</td>
              </tr>
            </tbody>
          </table>
          <table class="final-report__pdf-table">
            <thead>
              <tr>
                <th>후보</th>
                <th>대응안 원문</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="action in report.action_effects"
                :key="`${action.label}-description`"
                :class="{ 'final-report__pdf-selected-row': isRecommended(action) }"
              >
                <td>{{ formatActionName(action.label) }}</td>
                <td>{{ action.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="final-report__pdf-section">
        <h2>4. 원인 분석</h2>
        <p v-if="causeSummary" class="final-report__pdf-body">{{ causeSummary }}</p>
        <table class="final-report__pdf-table">
          <thead>
            <tr>
              <th>순위</th>
              <th>원인</th>
              <th>기여도</th>
              <th>권고 조치</th>
              <th>유사 사례</th>
              <th>시각화</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in causeItems.slice(0, 5)" :key="item.cause">
              <td>{{ item.rank }}</td>
              <td>{{ causeLabel(item.cause) }}</td>
              <td>{{ item.contribution_pct.toFixed(1) }}%</td>
              <td>{{ item.recommended_action || '-' }}</td>
              <td>{{ item.similar_case || '-' }}</td>
              <td>
                <span class="final-report__pdf-bar">
                  <span :style="{ width: `${Math.min(100, item.contribution_pct)}%` }" />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="consensus" class="final-report__pdf-consensus">
          <strong>모델 합의 진단 · {{ consensus.confidence_level }}</strong>
          <p>{{ consensus.summary }}</p>
          <dl>
            <div>
              <dt>G* 확인</dt>
              <dd>{{ consensus.g_star_confirmed === undefined ? '-' : formatBoolean(consensus.g_star_confirmed) }}</dd>
            </div>
            <div>
              <dt>G* 확률</dt>
              <dd>{{ consensus.g_star_proba === undefined ? '-' : formatRatioWithPercent(consensus.g_star_proba) }}</dd>
            </div>
            <div>
              <dt>합의 Feature</dt>
              <dd>{{ consensus.agreed_features?.join(', ') || '-' }}</dd>
            </div>
            <div>
              <dt>불일치 Feature</dt>
              <dd>{{ consensus.conflicted_features?.join(', ') || '-' }}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="final-report__pdf-section">
        <h2>5. Trend 근거</h2>
        <div v-if="pdfTrendRows.length" class="final-report__pdf-chart">
          <svg :viewBox="pdfTrendChart.viewBox" role="img" aria-label="Trend line chart">
            <line
              v-for="lineY in pdfTrendChart.gridLines"
              :key="lineY"
              x1="34"
              x2="616"
              :y1="lineY"
              :y2="lineY"
              class="final-report__pdf-chart-grid"
            />
            <path
              :d="pdfTrendChart.qTimePath"
              class="final-report__pdf-chart-line final-report__pdf-chart-line--qtime"
            />
            <path :d="pdfTrendChart.wipPath" class="final-report__pdf-chart-line final-report__pdf-chart-line--wip" />
            <path
              :d="pdfTrendChart.waitRatioPath"
              class="final-report__pdf-chart-line final-report__pdf-chart-line--wait"
            />
            <text
              v-for="label in pdfTrendChart.labels"
              :key="label.label"
              :x="label.x"
              :y="label.y"
              text-anchor="middle"
              class="final-report__pdf-chart-label"
            >
              {{ label.label }}
            </text>
          </svg>
          <div class="final-report__pdf-chart-legend">
            <span><i class="final-report__pdf-legend-qtime" />대기시간</span>
            <span><i class="final-report__pdf-legend-wip" />WIP</span>
            <span><i class="final-report__pdf-legend-wait" />대기 비율</span>
          </div>
        </div>
        <table v-if="pdfTrendRows.length" class="final-report__pdf-table">
          <thead>
            <tr>
              <th>시점</th>
              <th>대기시간</th>
              <th>대기 비율</th>
              <th>WIP</th>
              <th>최대 가동률</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pdfTrendRows" :key="row.label">
              <td>{{ row.label }}</td>
              <td>{{ row.qTimeMin === null ? '-' : formatMinutes(row.qTimeMin) }}</td>
              <td>{{ row.waitRatio === null ? '-' : formatRatio(row.waitRatio) }}</td>
              <td>{{ row.wip === null ? '-' : row.wip.toLocaleString('ko-KR') }}</td>
              <td>{{ row.maxUtil === null ? '-' : `${row.maxUtil.toFixed(1)}%` }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="final-report__pdf-body">구조화된 Trend 데이터가 없습니다.</p>
      </section>

      <section class="final-report__pdf-section">
        <h2>6. 확산 경로 및 영향 공정</h2>
        <table class="final-report__pdf-table final-report__pdf-kpi-table">
          <tbody>
            <tr>
              <th>전체 영향 공정</th>
              <td>{{ pdfProcessSummary.total.toLocaleString('ko-KR') }}개</td>
              <th>활성 영향 공정</th>
              <td>{{ pdfProcessSummary.active.toLocaleString('ko-KR') }}개</td>
            </tr>
            <tr>
              <th>비활성 영향 공정</th>
              <td>{{ pdfProcessSummary.inactive.toLocaleString('ko-KR') }}개</td>
              <th>전 라인 정지 예상</th>
              <td>{{ formatMinutes(report.diffusion_analysis.line_stop_expected_min) }}</td>
            </tr>
            <tr>
              <th>최대 WIP 공정</th>
              <td>
                {{ pdfProcessSummary.maxWip.process }} · {{ pdfProcessSummary.maxWip.wip.toLocaleString('ko-KR') }}
              </td>
              <th>최대 가동률 공정</th>
              <td>
                {{ pdfProcessSummary.maxUtil.process }} · {{ pdfProcessSummary.maxUtil.utilization_pct.toFixed(1) }}%
              </td>
            </tr>
            <tr>
              <th>최대 Wait Ratio 공정</th>
              <td colspan="3">
                {{ pdfProcessSummary.maxWait.process }} ·
                {{ formatRatioWithPercent(pdfProcessSummary.maxWait.wait_ratio) }}
              </td>
            </tr>
          </tbody>
        </table>
        <div class="final-report__pdf-path">
          <span v-for="node in report.diffusion_analysis.diffusion_path" :key="node">{{ node }}</span>
        </div>
        <div v-if="forwardResult" class="final-report__pdf-forecast">
          <strong>{{ props.report.diffusion_analysis.forward_simulation?.horizon_min ?? 120 }}분 후 예측</strong>
          <span>{{ forwardResult.y_bottleneck ? '병목 지속 가능성 있음' : '병목 해소 예상' }}</span>
          <span>미래 Q-Time {{ formatMinutes(forwardResult.q_time_future) }}</span>
          <span>미래 WIP {{ forwardResult.wip_future.toLocaleString('ko-KR') }}</span>
          <span>미래 대기 비율 {{ formatRatioWithPercent(forwardResult.wait_ratio_future) }}</span>
        </div>
        <table class="final-report__pdf-table">
          <thead>
            <tr>
              <th>공정</th>
              <th>상태</th>
              <th>가동률</th>
              <th>대기 비율</th>
              <th>WIP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="process in pdfAffectedProcesses" :key="process.process">
              <td>{{ process.process }}</td>
              <td>{{ process.status }}</td>
              <td>{{ process.utilization_pct.toFixed(1) }}%</td>
              <td>{{ formatRatioWithPercent(process.wait_ratio) }}</td>
              <td>{{ process.wip.toLocaleString('ko-KR') }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="final-report__pdf-section final-report__pdf-approval">
        <h2>7. 승인 정보</h2>
        <table class="final-report__pdf-table">
          <tbody>
            <tr>
              <th>승인자</th>
              <td>{{ report.approval_info.approved_by }} ({{ report.approval_info.approved_role }})</td>
              <th>승인일시</th>
              <td>{{ formatApprovalDateTime(report.approval_info.approved_at) }}</td>
            </tr>
            <tr>
              <th>의견</th>
              <td colspan="3">{{ report.approval_info.comment }}</td>
            </tr>
            <tr>
              <th>반려 사유</th>
              <td colspan="3">{{ report.approval_info.rejection_reason ?? '-' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="final-report__pdf-section final-report__pdf-appendix">
        <h2>Appendix A. 전체 영향 공정 원본</h2>
        <table class="final-report__pdf-table">
          <thead>
            <tr>
              <th>#</th>
              <th>공정</th>
              <th>상태</th>
              <th>가동률</th>
              <th>대기 비율</th>
              <th>WIP</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(process, index) in pdfAllAffectedProcesses" :key="`appendix-${process.process}`">
              <td>{{ index + 1 }}</td>
              <td>{{ process.process }}</td>
              <td>{{ process.status }}</td>
              <td>{{ process.utilization_pct.toFixed(1) }}%</td>
              <td>{{ formatRatioWithPercent(process.wait_ratio) }}</td>
              <td>{{ process.wip.toLocaleString('ko-KR') }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </article>
  </section>
</template>

<style scoped>
.final-report {
  display: grid;
  justify-items: center;
  min-width: 0;
}

.final-report__paper {
  display: grid;
  width: min(100%, 980px);
  gap: 22px;
  padding: 42px 46px;
  background: #ffffff;
  color: #111827;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
}

.final-report__pdf-paper {
  position: fixed;
  top: 0;
  left: -10000px;
  width: 794px;
  min-height: 1123px;
  padding: 46px 50px;
  background: #ffffff;
  color: #111827;
  border: 0;
  box-shadow: none;
  font-family:
    Inter,
    Pretendard,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
  pointer-events: none;
}

.final-report__pdf-paper * {
  box-sizing: border-box;
}

.final-report__pdf-cover {
  display: flex;
  justify-content: space-between;
  gap: 28px;
  padding-bottom: 18px;
  border-bottom: 3px solid #111827;
}

.final-report__pdf-eyebrow,
.final-report__pdf-cover h1,
.final-report__pdf-cover p,
.final-report__pdf-section h2,
.final-report__pdf-body,
.final-report__pdf-action p {
  margin: 0;
}

.final-report__pdf-eyebrow {
  color: #854d0e;
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.12em;
}

.final-report__pdf-cover h1 {
  margin-top: 8px;
  color: #111827;
  font-size: 26px;
  line-height: 1.18;
}

.final-report__pdf-cover p {
  margin-top: 8px;
  color: #475467;
  font-size: 15px;
  font-weight: 750;
}

.final-report__pdf-stamp {
  align-self: flex-start;
  min-width: 112px;
  padding: 10px 14px;
  color: #b42318;
  background: #fff5f4;
  border: 2px solid #b42318;
  font-size: 16px;
  font-weight: 900;
  text-align: center;
  text-transform: uppercase;
}

.final-report__pdf-meta,
.final-report__pdf-table {
  width: 100%;
  border-collapse: collapse;
}

.final-report__pdf-meta {
  margin-top: 18px;
  font-size: 12px;
}

.final-report__pdf-meta th,
.final-report__pdf-meta td,
.final-report__pdf-table th,
.final-report__pdf-table td {
  padding: 8px 10px;
  border: 1px solid #d0d5dd;
  vertical-align: top;
}

.final-report__pdf-meta th,
.final-report__pdf-table th {
  color: #344054;
  background: #f2f4f7;
  font-weight: 850;
  text-align: left;
}

.final-report__pdf-meta td,
.final-report__pdf-table td {
  color: #111827;
  background: #ffffff;
}

.final-report__pdf-section {
  display: grid;
  gap: 10px;
  margin-top: 20px;
  break-inside: avoid;
}

.final-report__pdf-section h2 {
  padding-bottom: 5px;
  color: #111827;
  border-bottom: 1px solid #98a2b3;
  font-size: 15px;
  font-weight: 900;
}

.final-report__pdf-summary {
  display: grid;
  gap: 6px;
  margin: 0;
  padding-left: 20px;
  color: #344054;
  font-size: 12px;
  line-height: 1.65;
}

.final-report__pdf-kpi-table td {
  font-size: 14px;
  font-weight: 850;
}

.final-report__pdf-action {
  display: grid;
  gap: 10px;
}

.final-report__pdf-action-params {
  display: grid;
  gap: 6px;
  padding: 9px 10px;
  background: #f8fafc;
  border: 1px solid #d0d5dd;
}

.final-report__pdf-action-params b {
  color: #111827;
  font-size: 12px;
}

.final-report__pdf-action-params ul {
  display: grid;
  gap: 3px;
  margin: 0;
  padding-left: 16px;
  color: #344054;
  font-size: 11px;
  line-height: 1.45;
}

.final-report__pdf-action strong {
  color: #166534;
  font-size: 13px;
}

.final-report__pdf-action p,
.final-report__pdf-body {
  color: #344054;
  font-size: 12px;
  line-height: 1.65;
}

.final-report__pdf-table {
  font-size: 11px;
}

.final-report__pdf-table thead,
.final-report__pdf-table tr,
.final-report__pdf-action-params,
.final-report__pdf-chart,
.final-report__pdf-consensus,
.final-report__pdf-forecast {
  break-inside: avoid;
  page-break-inside: avoid;
}

.final-report__pdf-selected-row td {
  background: #f6fef9;
  font-weight: 850;
}

.final-report__pdf-bar {
  display: block;
  width: 100%;
  height: 7px;
  overflow: hidden;
  background: #eaecf0;
  border-radius: 999px;
}

.final-report__pdf-bar span {
  display: block;
  height: 100%;
  background: #b42318;
}

.final-report__pdf-consensus {
  display: grid;
  gap: 7px;
  padding: 10px;
  color: #344054;
  background: #fffaf0;
  border: 1px solid #f3d18b;
  font-size: 11px;
  line-height: 1.55;
}

.final-report__pdf-consensus strong,
.final-report__pdf-consensus p,
.final-report__pdf-consensus dl {
  margin: 0;
}

.final-report__pdf-consensus strong {
  color: #854d0e;
  font-size: 12px;
}

.final-report__pdf-consensus dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 5px 12px;
}

.final-report__pdf-consensus div {
  min-width: 0;
}

.final-report__pdf-consensus dt {
  color: #667085;
  font-weight: 850;
}

.final-report__pdf-consensus dd {
  margin: 2px 0 0;
  color: #111827;
  overflow-wrap: anywhere;
}

.final-report__pdf-chart {
  display: grid;
  gap: 5px;
  padding: 8px 10px 6px;
  background: #ffffff;
  border: 1px solid #d0d5dd;
}

.final-report__pdf-chart svg {
  display: block;
  width: 100%;
  height: auto;
}

.final-report__pdf-chart-grid {
  stroke: #eaecf0;
  stroke-width: 1;
}

.final-report__pdf-chart-line {
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 3;
}

.final-report__pdf-chart-line--qtime {
  stroke: #b42318;
}

.final-report__pdf-chart-line--wip {
  stroke: #1570ef;
}

.final-report__pdf-chart-line--wait {
  stroke: #dc6803;
}

.final-report__pdf-chart-label {
  fill: #667085;
  font-size: 9px;
  font-weight: 700;
}

.final-report__pdf-chart-legend {
  display: flex;
  gap: 14px;
  color: #344054;
  font-size: 10px;
  font-weight: 800;
}

.final-report__pdf-chart-legend span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.final-report__pdf-chart-legend i {
  display: inline-block;
  width: 16px;
  height: 3px;
  border-radius: 999px;
}

.final-report__pdf-legend-qtime {
  background: #b42318;
}

.final-report__pdf-legend-wip {
  background: #1570ef;
}

.final-report__pdf-legend-wait {
  background: #dc6803;
}

.final-report__pdf-path {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  color: #111827;
  font-size: 11px;
  font-weight: 800;
}

.final-report__pdf-path span:not(:last-child)::after {
  content: '→';
  margin-left: 6px;
  color: #98a2b3;
}

.final-report__pdf-forecast {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  padding: 9px 10px;
  color: #344054;
  background: #f8fafc;
  border: 1px solid #d0d5dd;
  font-size: 11px;
}

.final-report__pdf-forecast strong {
  color: #111827;
}

.final-report__pdf-approval {
  margin-bottom: 4px;
}

.final-report__pdf-appendix {
  break-inside: auto;
}

.final-report__pdf-appendix .final-report__pdf-table {
  font-size: 9px;
}

.final-report--compact .final-report__paper {
  width: 100%;
  padding: 28px;
  box-shadow: none;
}

.final-report__cover {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 18px;
  border-bottom: 2px solid #111827;
}

.final-report__eyebrow,
.final-report__cover h2,
.final-report__summary-card h3,
.final-report__section h3,
.final-report__subhead h4,
.final-report__source pre {
  margin: 0;
}

.final-report__eyebrow {
  color: #854d0e;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.final-report__cover h2 {
  margin-top: 6px;
  color: #111827;
  font-size: 30px;
  line-height: 1.15;
}

.final-report__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin: 14px 0 0;
}

.final-report__meta div {
  display: flex;
  gap: 6px;
  color: #475467;
  font-size: 12px;
}

.final-report__meta dt {
  color: #667085;
  font-weight: 700;
}

.final-report__meta dd,
.final-report__kpis,
.final-report__selected-action dl,
.final-report__approval,
.final-report__source {
  margin: 0;
}

.final-report__summary-stack {
  display: grid;
  gap: 14px;
}

.final-report__summary-card {
  display: grid;
  gap: 14px;
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
}

.final-report__summary-card--executive {
  border-color: #98a2b3;
}

.final-report__summary-card--decision {
  background: #fffbeb;
  border-color: #f3d18b;
}

.final-report__summary-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding-left: 20px;
}

.final-report__summary-list li {
  color: #344054;
  font-size: 14px;
  line-height: 1.75;
}

.final-report__summary-card h3,
.final-report__section h3 {
  color: #111827;
  font-size: 18px;
  font-weight: 850;
}

.final-report__body,
.final-report__action-texts p {
  margin: 0;
  color: #344054;
  font-size: 14px;
  line-height: 1.75;
}

.final-report__kpis dt,
.final-report__selected-action dt,
.final-report__approval dt {
  color: #667085;
  font-size: 12px;
  font-weight: 750;
}

.final-report__kpis {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
}

.final-report__kpis div {
  min-width: 0;
  padding: 12px 12px 11px;
  background: #f8fafc;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
}

.final-report__kpis dd {
  margin: 5px 0 0;
  color: #111827;
  font-size: 17px;
  font-weight: 850;
  overflow-wrap: anywhere;
}

.final-report__kpi--danger {
  border-top-color: #b42318 !important;
}
.final-report__kpi--warning {
  border-top-color: #b54708 !important;
}
.final-report__kpi--info {
  border-top-color: #1570ef !important;
}

.final-report__section {
  display: grid;
  gap: 14px;
  padding: 18px;
  background: #ffffff;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
  break-inside: avoid;
}

.final-report__section--action {
  border-color: #abefc6;
  background: #f6fef9;
}

.final-report__section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}

.final-report__section-head h3 {
  display: flex;
  align-items: baseline;
  gap: 9px;
}

.final-report__section-head h3 > span {
  color: #854d0e;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.08em;
}

.final-report__section-head span {
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.final-report__chapter {
  gap: 18px;
  padding: 22px;
}

.final-report__facts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
}

.final-report__facts div {
  min-width: 0;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
}

.final-report__facts dt {
  color: #667085;
  font-size: 12px;
  font-weight: 800;
}

.final-report__facts dd {
  margin: 5px 0 0;
  color: #111827;
  font-size: 14px;
  font-weight: 850;
  overflow-wrap: anywhere;
}

.final-report__subsection {
  display: grid;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid #eaecf0;
}

.final-report__subhead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}

.final-report__subhead h4 {
  color: #111827;
  font-size: 15px;
  font-weight: 850;
}

.final-report__subhead span {
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.final-report__selected-action {
  display: grid;
  gap: 12px;
}

.final-report__selected-action > strong {
  color: #166534;
  font-size: 13px;
  letter-spacing: 0.03em;
}

.final-report__selected-action p {
  margin: 0;
}

.final-report__selected-action ul {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.final-report__selected-action li {
  color: #344054;
  font-size: 13px;
  line-height: 1.55;
}

.final-report__selected-action li::before {
  content: '• ';
  color: #15803d;
}

.final-report__selected-action dl {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.final-report__selected-action dl div,
.final-report__approval div {
  padding: 11px 12px;
  background: #ffffff;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
}

.final-report__selected-action dd,
.final-report__approval dd {
  margin: 4px 0 0;
  color: #111827;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.45;
}

.final-report__causes {
  display: grid;
  gap: 12px;
}

.final-report__cause {
  display: grid;
  gap: 6px;
}

.final-report__cause > div:first-child {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #344054;
  font-size: 13px;
  font-weight: 700;
}

.final-report__cause > div:first-child strong {
  color: #111827;
}

.final-report__cause-track,
.final-report__util-track {
  height: 8px;
  overflow: hidden;
  background: #eaecf0;
  border-radius: 999px;
}

.final-report__cause-fill,
.final-report__util-fill {
  display: block;
  height: 100%;
  min-width: 2px;
  background: #1570ef;
  border-radius: 999px;
}

.final-report__cause-fill--mid {
  background: #dc6803;
}
.final-report__cause-fill--high {
  background: #b42318;
}

.final-report__chart {
  width: 100%;
  height: 260px;
}

.final-report__empty {
  margin: 0;
  color: #667085;
  font-size: 13px;
}

.final-report__path {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.final-report__path span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #111827;
  font-size: 13px;
  font-weight: 750;
}

.final-report__path span:not(:last-child)::after {
  content: '→';
  color: #98a2b3;
}

.final-report__forecast {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
  color: #475467;
  font-size: 13px;
}

.final-report__forecast strong {
  color: #111827;
}

.final-report__process-table-wrap {
  max-height: 340px;
  overflow-y: auto;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
}

.final-report__process-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.final-report__process-table th {
  position: sticky;
  top: 0;
  padding: 9px 11px;
  background: #f8fafc;
  color: #667085;
  font-size: 11px;
  text-align: left;
  border-bottom: 1px solid #d0d5dd;
}

.final-report__process-table td {
  padding: 9px 11px;
  color: #344054;
  border-bottom: 1px solid #eaecf0;
}

.final-report__process-table tr:last-child td {
  border-bottom: 0;
}

.final-report__selected-row td {
  background: #f6fef9;
  color: #111827;
  font-weight: 800;
}

.final-report__process-name {
  color: #111827 !important;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  font-weight: 750;
  white-space: nowrap;
}

.final-report__process-util {
  display: grid;
  grid-template-columns: minmax(80px, 1fr) 48px;
  gap: 8px;
  align-items: center;
  min-width: 150px;
}

.final-report__process-util b {
  color: #475467;
  font-size: 12px;
  text-align: right;
}

.final-report__util-fill--ok {
  background: #16a34a;
}
.final-report__util-fill--warning {
  background: #dc6803;
}
.final-report__util-fill--danger {
  background: #b42318;
}

.final-report__show-more {
  width: 100%;
  padding: 9px;
  color: #475467;
  background: #ffffff;
  border: 1px dashed #98a2b3;
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
}

.final-report__consensus {
  display: grid;
  gap: 10px;
  padding: 14px;
  background: #fffaf0;
  border: 1px solid #f3d18b;
  border-radius: 6px;
}

.final-report__consensus strong {
  color: #854d0e;
  font-size: 13px;
  line-height: 1.6;
}

.final-report__consensus dl {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  margin: 0;
}

.final-report__consensus div {
  min-width: 0;
}

.final-report__consensus dt {
  color: #667085;
  font-size: 12px;
  font-weight: 800;
}

.final-report__consensus dd {
  margin: 3px 0 0;
  color: #111827;
  font-size: 13px;
  font-weight: 750;
  overflow-wrap: anywhere;
}

.final-report__action-texts {
  display: grid;
  gap: 10px;
}

.final-report__action-texts article {
  display: grid;
  gap: 6px;
  padding: 13px;
  background: #f8fafc;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
}

.final-report__action-texts article.final-report__action-text--selected {
  background: #f6fef9;
  border-color: #abefc6;
}

.final-report__action-texts strong {
  color: #111827;
  font-size: 13px;
}

.final-report__action-texts p {
  margin: 0;
  color: #344054;
  font-size: 13px;
  line-height: 1.6;
}

.final-report__approval {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.final-report__source {
  color: #344054;
  font-size: 13px;
}

.final-report__source summary {
  cursor: pointer;
  font-weight: 750;
}

.final-report__source pre {
  max-height: 360px;
  margin-top: 10px;
  overflow: auto;
  padding: 14px;
  color: #111827;
  background: #f8fafc;
  border: 1px solid #e4e7ec;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.final-report__compact-note {
  margin: 0;
  padding-top: 12px;
  color: #667085;
  font-size: 13px;
  border-top: 1px solid #eaecf0;
}

.final-report__pdf-error {
  padding: 12px;
  color: #b42318;
  background: #fef3f2;
  border: 1px solid #fecdca;
  border-radius: 6px;
  font-size: 13px;
}

@media (max-width: 1100px) {
  .final-report__paper {
    padding: 30px;
  }

  .final-report__kpis {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .final-report__facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .final-report__approval {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .final-report__cover,
  .final-report__section-head,
  .final-report__subhead {
    align-items: flex-start;
    flex-direction: column;
  }

  .final-report__kpis,
  .final-report__selected-action dl,
  .final-report__facts,
  .final-report__approval,
  .final-report__consensus dl {
    grid-template-columns: 1fr;
  }
}

:global(.is-pdf-mode) [data-pdf-ignore],
:global(.is-pdf-mode)[data-pdf-ignore] {
  display: none !important;
}

@media print {
  @page {
    size: A4;
    margin: 14mm;
  }

  .final-report {
    display: block;
  }

  .final-report__paper {
    width: 100%;
    padding: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  .final-report__section,
  .final-report__summary-stack,
  .final-report__kpis {
    break-inside: avoid;
  }

  [data-pdf-ignore] {
    display: none !important;
  }
}
</style>

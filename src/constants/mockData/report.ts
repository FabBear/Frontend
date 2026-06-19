import { MOCK_FINAL_BOTTLENECK_REPORT } from '@/constants/mockData/finalBottleneckReport';
import { MOCK_ARCHIVE_REPORTS, RAG_CASE_IDS } from '@/constants/mockData/ragCaseReports';

import type { BncReportPayload } from '@/types/bnc';
import type { ActionHistoryDetail, ActionHistoryItem, FinalBottleneckReport, ReportV1 } from '@/types/report';

type HistorySeed = {
  caseId: string;
  date: string;
  time: string;
  targetTgText: string;
  tgName: string;
  areaName: string;
  riskGrade: ActionHistoryItem['riskGrade'];
  selectedPlanTitle: string;
  planType: string;
  bottleneckProb: number;
  estAvgWaitDelta: number;
  estDeliveryComplianceDelta: number;
  comment: string;
  reportV1?: ReportV1;
  finalReport?: FinalBottleneckReport;
};

const RAG_CASE_AREA = 'Dry Etch';
const RAG_SELECTED_PLAN_TYPE: Record<string, string> = {
  conservative: '생산계획',
  standard: '스케줄링',
  aggressive: '스케줄링',
};

const DIVERSE_SEEDS: Array<Omit<HistorySeed, 'caseId' | 'bottleneckProb' | 'reportV1' | 'finalReport'>> = [
  {
    date: '2025-02-27',
    time: '10:20',
    targetTgText: 'LithoTrack_FE_115 · Coat/Develop Track',
    tgName: 'LithoTrack_FE_115',
    areaName: 'Lithography',
    riskGrade: 'HIGH',
    selectedPlanTitle: 'RETICLE_SETUP_SPLIT',
    planType: '장비운영',
    estAvgWaitDelta: -0.006,
    estDeliveryComplianceDelta: 0.7,
    comment: 'reticle setup 분산안 승인',
  },
  {
    date: '2025-03-31',
    time: '09:10',
    targetTgText: 'WE_FE_84 · Wet Etch/Clean',
    tgName: 'WE_FE_84',
    areaName: 'Wet Etch',
    riskGrade: 'CRITICAL',
    selectedPlanTitle: 'BATCH_SIZE_TUNE',
    planType: '공정조건',
    estAvgWaitDelta: -0.011,
    estDeliveryComplianceDelta: 1.4,
    comment: 'batch size 조정안 승인',
  },
  {
    date: '2025-05-08',
    time: '12:25',
    targetTgText: 'Dielectric_FE_112 · SiN Deposition',
    tgName: 'Dielectric_FE_112',
    areaName: 'Dielectric',
    riskGrade: 'CRITICAL',
    selectedPlanTitle: 'TOOL_RECOVERY_PRIORITY',
    planType: '장비운영',
    estAvgWaitDelta: -0.016,
    estDeliveryComplianceDelta: 2.2,
    comment: '복구 장비 우선 투입 승인',
  },
  {
    date: '2025-06-18',
    time: '08:55',
    targetTgText: 'Diffusion_FE_120 · Oxidation Furnace',
    tgName: 'Diffusion_FE_120',
    areaName: 'Diffusion',
    riskGrade: 'CRITICAL',
    selectedPlanTitle: 'HOT_LOT_DEFER',
    planType: '스케줄링',
    estAvgWaitDelta: -0.014,
    estDeliveryComplianceDelta: 1.6,
    comment: 'Hot lot defer + batch 재편성 승인',
  },
  {
    date: '2025-08-27',
    time: '14:35',
    targetTgText: 'DefMet_BE_42 · Barrier Metal',
    tgName: 'DefMet_BE_42',
    areaName: 'Metal Dep',
    riskGrade: 'HIGH',
    selectedPlanTitle: 'REWORK_GATE_BUFFER',
    planType: '품질/검사',
    estAvgWaitDelta: -0.004,
    estDeliveryComplianceDelta: 0.6,
    comment: 'rework gate buffer 확대 승인',
  },
];

function isoAt(date: string, time: string): string {
  return `${date}T${time}:00+09:00`;
}

function displayDay(date: string): string {
  return date.slice(5).replace('-', '/');
}

function selectedLabel(report: ReportV1): string {
  return report.actions.approved_label ?? report.approval?.selected_label ?? 'standard';
}

function planTitleFromReport(report: ReportV1): string {
  const label = selectedLabel(report);
  const approved = report.actions.candidates.find((candidate) => candidate.label === label);
  return approved?.kind ?? label.toUpperCase();
}

function waitDeltaFromReport(report: ReportV1): number {
  const label = selectedLabel(report);
  const approved = report.actions.candidates.find((candidate) => candidate.label === label);
  const qTime = approved?.kpi_impact.find((impact) => impact.kpi === 'q_time_min');
  return qTime ? qTime.delta / 1440 : 0;
}

function deliveryDeltaFromReport(report: ReportV1): number {
  const label = selectedLabel(report);
  if (label === 'aggressive') return 2;
  if (label === 'standard') return 1.3;
  return 0.5;
}

function buildRagSeed(caseId: (typeof RAG_CASE_IDS)[number]): HistorySeed {
  const payload = MOCK_ARCHIVE_REPORTS[caseId];
  const report = payload.reportV1;
  if (!report) {
    throw new Error(`Missing reportV1 for archive case ${caseId}`);
  }

  const label = selectedLabel(report);
  return {
    caseId,
    date: report.meta.detected_at.slice(0, 10),
    time: '02:30',
    targetTgText: `${report.meta.process_name} · Diffusion_FE_125 영향`,
    tgName: report.meta.process_name,
    areaName: RAG_CASE_AREA,
    riskGrade: 'CRITICAL',
    selectedPlanTitle: planTitleFromReport(report),
    planType: RAG_SELECTED_PLAN_TYPE[label] ?? '스케줄링',
    bottleneckProb: report.risk.probability,
    estAvgWaitDelta: waitDeltaFromReport(report),
    estDeliveryComplianceDelta: deliveryDeltaFromReport(report),
    comment: `${label} 대응안 승인`,
    reportV1: report,
  };
}

function cloneFinalReport(): FinalBottleneckReport {
  return JSON.parse(JSON.stringify(MOCK_FINAL_BOTTLENECK_REPORT)) as FinalBottleneckReport;
}

function cloneReportV1(): ReportV1 {
  const template = MOCK_ARCHIVE_REPORTS['demo-de-fe-1-s-20250902'].reportV1;
  if (!template) throw new Error('Missing ReportV1 archive template');
  return JSON.parse(JSON.stringify(template)) as ReportV1;
}

function patchKpi(report: ReportV1, key: string, value: number, delta: number | null = null) {
  const kpi = report.bottleneck_kpis.find((item) => item.key === key);
  if (!kpi) return;
  kpi.value = value;
  kpi.delta = delta;
  kpi.pct_change = delta && value !== 0 ? +((delta / value) * 100).toFixed(1) : null;
}

function buildDiverseReportV1(
  seed: Omit<HistorySeed, 'caseId' | 'bottleneckProb' | 'reportV1' | 'finalReport'>
): ReportV1 {
  const report = cloneReportV1();
  const generatedAt = `${seed.date} ${seed.time}`;
  const detectedAt = `${seed.date} 00:00`;
  const isCritical = seed.riskGrade === 'CRITICAL';
  const riskScore = isCritical ? 82.4 : 69.7;
  const qTimeMin = isCritical ? 74.5 : 43.2;
  const wip = isCritical ? 27 : 16;
  const utilization = isCritical ? 0.986 : 0.912;
  const waitRatio = isCritical ? 1.18 : 0.72;

  report.meta = {
    ...report.meta,
    toolgroup: seed.tgName,
    process_name: seed.tgName,
    severity: seed.riskGrade,
    severity_token: seed.riskGrade.toLowerCase(),
    severity_priority: isCritical ? 3 : 2,
    detected_at: detectedAt,
    generated_at: generatedAt,
    snapshot_time: Math.floor(new Date(isoAt(seed.date, seed.time)).getTime() / 1000),
  };

  report.approval = {
    ...report.approval,
    approved_at: generatedAt,
    comment: seed.comment,
    selected_label: seed.selectedPlanTitle,
  };
  report.risk = {
    ...report.risk,
    score: riskScore,
    probability: isCritical ? 0.963 : 0.873,
    composite_score: +(riskScore / 100).toFixed(3),
  };
  report.confidence = {
    ...report.confidence,
    g_star_probability: isCritical ? 0.74 : 0.61,
  };

  patchKpi(report, 'risk_score', riskScore);
  patchKpi(report, 'q_time_min', qTimeMin, Math.abs(seed.estAvgWaitDelta * 1440));
  patchKpi(report, 'wip', wip, isCritical ? 4 : 2);
  patchKpi(report, 'wait_ratio', waitRatio, isCritical ? 0.16 : 0.08);
  patchKpi(report, 'utilization_avg', utilization, isCritical ? 0.018 : 0.009);

  report.if_no_action = {
    ...report.if_no_action,
    will_get_worse: true,
    kpi_changes: [
      {
        kpi: 'q_time_min',
        unit: 'min',
        now: qTimeMin,
        after: +(qTimeMin + 18).toFixed(1),
        delta: 18,
        pct_change: +((18 / qTimeMin) * 100).toFixed(1),
        reliability_token: 'medium',
      },
      {
        kpi: 'wip',
        unit: 'Lot',
        now: wip,
        after: wip + 5,
        delta: 5,
        pct_change: +((5 / wip) * 100).toFixed(1),
        reliability_token: 'medium',
      },
    ],
  };

  report.cause = {
    ...report.cause,
    summary: `${seed.tgName}에서 WIP 유입 증가와 가용 설비 비율 하락이 동시에 관찰되어 ${seed.areaName} 병목 위험이 상승했습니다.`,
    primary: {
      ...report.cause.primary,
      category: isCritical ? 'WIP_누적' : '설비_포화',
      feature: isCritical ? 'wip_slope_h' : 'max_util',
      reasoning: `${seed.comment}. ${seed.tgName}의 queue와 utilization 변동이 같은 방향으로 수렴했습니다.`,
    },
    secondary_categories: ['대기_누적', '업스트림_유입'],
    shap_top: [
      {
        rank: 1,
        feature: isCritical ? 'wip_slope_h' : 'max_util',
        value: isCritical ? 4.2 : 0.94,
        shap: 1.72,
        contribution_pct: 38.4,
        direction_token: 'positive',
      },
      {
        rank: 2,
        feature: 'q_time_min',
        value: qTimeMin,
        shap: 1.21,
        contribution_pct: 27.1,
        direction_token: 'positive',
      },
      {
        rank: 3,
        feature: 'available_tool_ratio',
        value: isCritical ? 0.82 : 0.91,
        shap: 0.84,
        contribution_pct: 18.8,
        direction_token: 'positive',
      },
      {
        rank: 4,
        feature: 'wait_ratio',
        value: waitRatio,
        shap: 0.7,
        contribution_pct: 15.7,
        direction_token: 'positive',
      },
    ],
  };

  report.diffusion = {
    ...report.diffusion,
    bottleneck_location: seed.tgName,
    diffusion_path: [seed.tgName, 'DE_FE_1', 'Diffusion_FE_125'],
    high_impact_processes: [
      {
        toolgroup: seed.tgName,
        utilization_pct: +(utilization * 100).toFixed(1),
        wait_ratio: waitRatio,
        wip,
        impact_score: isCritical ? 0.86 : 0.64,
        data_quality_flags: [],
      },
      ...report.diffusion.high_impact_processes.slice(0, 2),
    ],
    line_stop_expected_min: isCritical ? 420 : 780,
    risk_level: seed.riskGrade,
    risk_level_token: seed.riskGrade.toLowerCase(),
  };

  const approvedCandidate = report.actions.candidates.find((candidate) => candidate.is_approved);
  if (approvedCandidate) {
    approvedCandidate.label = seed.selectedPlanTitle;
    approvedCandidate.kind = seed.planType;
    approvedCandidate.description = seed.comment;
    approvedCandidate.target_toolgroups = [seed.tgName];
    approvedCandidate.kpi_impact = approvedCandidate.kpi_impact.map((impact) => {
      if (impact.kpi === 'q_time_min') {
        return {
          ...impact,
          now: qTimeMin,
          after: +(qTimeMin + seed.estAvgWaitDelta * 1440).toFixed(1),
          delta: +(seed.estAvgWaitDelta * 1440).toFixed(1),
        };
      }
      if (impact.kpi === 'wip') return { ...impact, now: wip, after: Math.max(0, wip - 3), delta: -3 };
      return impact;
    });
  }

  report.actions = {
    ...report.actions,
    approved_label: seed.selectedPlanTitle,
    decision_caveat: `${seed.selectedPlanTitle} 적용이 승인되었습니다. 적용 후 ${seed.tgName}의 queue, WIP, utilization을 30분 단위로 확인하세요.`,
    recommendation: {
      ...report.actions.recommendation,
      headline: `${seed.selectedPlanTitle} 승인 - ${seed.tgName} 병목 완화`,
      primary_reason: `${seed.comment}. 현재 ${seed.tgName}의 평균 대기시간 ${qTimeMin}분과 WIP ${wip} Lot 기준으로 단기 완화 효과가 가장 안정적입니다.`,
      tradeoffs: ['단기 dispatch 변경으로 인접 TG의 queue 변동 가능성은 모니터링이 필요합니다.'],
      why_not_others: [
        { label: '보수안', reason: '변경 폭이 작아 현재 queue 증가 속도를 충분히 낮추기 어렵습니다.' },
        { label: '공격안', reason: '효과는 크지만 운영 부담과 downstream 영향 범위가 큽니다.' },
      ],
      caveats: ['시뮬레이션 horizon은 120분이며, 야간 교대 이후 조건 변화는 별도 확인이 필요합니다.'],
    },
  };
  report.sections = {
    ...report.sections,
    summary: `${seed.tgName} 병목 위험 점수 ${riskScore}로 ${seed.riskGrade} 상태가 확인되었습니다.`,
    action: `${seed.selectedPlanTitle} 적용으로 평균 대기시간과 WIP 증가를 완화합니다.`,
  };

  return report;
}

function buildDiverseFinalReport(
  seed: Omit<HistorySeed, 'bottleneckProb' | 'reportV1' | 'finalReport'>
): FinalBottleneckReport {
  const report = cloneFinalReport();
  const generatedAt = isoAt(seed.date, seed.time).replace('T', ' ').slice(0, 16);
  report.meta = {
    ...report.meta,
    process_name: seed.tgName,
    severity: seed.riskGrade,
    detected_at: `${seed.date} ${seed.time}`,
    generated_at: generatedAt,
  };
  report.bottleneck_info = {
    ...report.bottleneck_info,
    tool_group: seed.tgName,
    risk_score: seed.riskGrade === 'CRITICAL' ? 82.4 : 69.7,
    avg_queue_time_min: seed.riskGrade === 'CRITICAL' ? 74.5 : 43.2,
    peak_q_time_min: seed.riskGrade === 'CRITICAL' ? 112.8 : 68.4,
    utilization_pct: seed.riskGrade === 'CRITICAL' ? 98.6 : 91.2,
    wip_count: seed.riskGrade === 'CRITICAL' ? 27 : 16,
  };
  report.diffusion_analysis = {
    ...report.diffusion_analysis,
    bottleneck_location: seed.tgName,
    diffusion_path: [seed.tgName, 'DE_FE_1', 'Diffusion_FE_125'],
    risk_level: seed.riskGrade,
  };
  report.recommendation = {
    ...report.recommendation,
    action_label: seed.selectedPlanTitle,
    action_kind: seed.planType,
    reason: seed.comment,
  };
  report.approval_info = {
    ...report.approval_info,
    status: 'APPROVED',
    approved_at: generatedAt,
    comment: seed.comment,
  };
  report.full_markdown = `# FAB 병목 대응 보고서\n\n| 항목 | 내용 |\n|------|------|\n| 공정명 | \`${seed.tgName}\` |\n| 심각도 | **${seed.riskGrade}** |\n| 보고서 생성일시 | ${generatedAt} |\n\n## 승인된 대응안\n\n- 대응안: ${seed.selectedPlanTitle}\n- 근거: ${seed.comment}\n`;
  return report;
}

function buildDiverseSeed(
  seed: Omit<HistorySeed, 'caseId' | 'bottleneckProb' | 'reportV1' | 'finalReport'>
): HistorySeed {
  return {
    ...seed,
    caseId: `archive-${seed.tgName.toLowerCase().replaceAll('_', '-')}-${seed.date.replaceAll('-', '')}`,
    bottleneckProb: seed.riskGrade === 'CRITICAL' ? 0.96 : 0.87,
    reportV1: buildDiverseReportV1(seed),
    finalReport: buildDiverseFinalReport({
      ...seed,
      caseId: '',
    }),
  };
}

const MOCK_CASE_SEEDS: HistorySeed[] = [...RAG_CASE_IDS.map(buildRagSeed), ...DIVERSE_SEEDS.map(buildDiverseSeed)].sort(
  (a, b) => isoAt(b.date, b.time).localeCompare(isoAt(a.date, a.time))
);

function buildPlans(seed: HistorySeed): ActionHistoryDetail['actionPlans'] {
  return [
    {
      planSeq: 0,
      planTitle: '베이스라인',
      planType: '-',
      estThroughputDelta: 0,
      estAvgWaitDelta: 0,
      estDeliveryComplianceDelta: 0,
      estDelayDelta: 0,
      isSelected: false,
    },
    {
      planSeq: 1,
      planTitle: seed.selectedPlanTitle,
      planType: seed.planType,
      estThroughputDelta: 12,
      estAvgWaitDelta: seed.estAvgWaitDelta,
      estDeliveryComplianceDelta: seed.estDeliveryComplianceDelta,
      estDelayDelta: -0.03,
      isSelected: true,
    },
  ];
}

export const MOCK_ACTION_HISTORY_ITEMS: ActionHistoryItem[] = MOCK_CASE_SEEDS.map((seed) => ({
  caseId: seed.caseId,
  displayDay: displayDay(seed.date),
  targetTgText: seed.targetTgText,
  tgName: seed.tgName,
  areaName: seed.areaName,
  detectedAt: isoAt(seed.date, '00:00'),
  riskGrade: seed.riskGrade,
  selectedPlanTitle: seed.selectedPlanTitle,
  planType: seed.planType,
  decidedBy: { userId: 'system-auto', userName: 'AUTO' },
  decision: 'APPROVED',
  decidedAt: isoAt(seed.date, seed.time),
  estAvgWaitDelta: seed.estAvgWaitDelta,
  estDeliveryComplianceDelta: seed.estDeliveryComplianceDelta,
  status: 'RESOLVED',
  hasReport: true,
  reportTypes: ['ACTION'],
}));

export const MOCK_ACTION_HISTORY_DETAILS: Record<string, ActionHistoryDetail> = Object.fromEntries(
  MOCK_CASE_SEEDS.map((seed, index) => [
    seed.caseId,
    {
      caseId: seed.caseId,
      displayDay: displayDay(seed.date),
      targetTgText: seed.targetTgText,
      tgName: seed.tgName,
      areaName: seed.areaName,
      riskGrade: seed.riskGrade,
      bottleneckProb: seed.bottleneckProb,
      detectedAt: isoAt(seed.date, '00:00'),
      resolvedAt: isoAt(seed.date, seed.time),
      hitlDecision: {
        decisionId: `decision-${seed.caseId}`,
        decision: 'APPROVED',
        selectedPlanTitle: seed.selectedPlanTitle,
        comment: seed.comment,
        decidedBy: { userId: 'system-auto', userName: 'AUTO' },
        decidedAt: isoAt(seed.date, seed.time),
      },
      baseline: {
        throughput: 3400 - index * 35,
        avgWaitDay: 0.18 + index * 0.01,
        deliveryCompliance: 94.5 - index * 0.2,
      },
      actionPlans: buildPlans(seed),
      reportId: `report-${seed.caseId}`,
      hasPdf: true,
      finalReport: seed.finalReport,
    },
  ])
);

export const MOCK_ACTION_HISTORY_REPORTS: Record<string, BncReportPayload> = Object.fromEntries(
  MOCK_CASE_SEEDS.map((seed) => [
    seed.caseId,
    {
      reportId: `report-${seed.caseId}`,
      caseId: seed.caseId,
      summary: seed.reportV1?.sections.summary ?? seed.comment,
      rootCauseText: seed.reportV1?.cause.summary ?? seed.comment,
      actionComparisonText: seed.reportV1?.sections.action ?? seed.comment,
      timeline: [
        { time: isoAt(seed.date, '00:00'), event: `${seed.targetTgText} 병목 감지` },
        { time: isoAt(seed.date, seed.time), event: `${seed.selectedPlanTitle} 승인` },
      ],
      hasPdf: true,
      generatedAt: isoAt(seed.date, seed.time),
      regeneratedCount: 0,
      qdrantIndexed: Boolean(seed.reportV1),
      ...(seed.reportV1 ? { reportV1: seed.reportV1 } : {}),
    },
  ])
);

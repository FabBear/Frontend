import { BNC_AGENT_STEP_NAMES } from '@/constants/bnc';

import type { BncAlertCase, BncCaseDetail, BncCaseListData } from '@/types/bnc';

export const MOCK_BNC_ALERT_CASES: BncAlertCase[] = [
  {
    caseId: 'case-defmet-fe-118-clear-20260610-2118',
    tgId: 'tg-defmet-fe-118',
    tgName: 'DefMEt_FE_118 · clear winner',
    areaName: 'Defect Metrology',
    riskGrade: 'CRITICAL',
    bottleneckProb: 0.997,
    utilizationRate: 0.91,
    wipCount: 820,
    detectedAt: '2026-06-10T11:36:15Z',
    status: 'AWAITING_HITL',
    currentStepName: 'REPORT_AGENT',
    stepProgress: 5,
    totalSteps: 6,
  },
  {
    caseId: 'case-defmet-fe-118-equivalent-20260610-2118',
    tgId: 'tg-defmet-fe-118',
    tgName: 'DefMEt_FE_118 · equivalent',
    areaName: 'Defect Metrology',
    riskGrade: 'CRITICAL',
    bottleneckProb: 0.997,
    utilizationRate: 0.91,
    wipCount: 820,
    detectedAt: '2026-06-10T11:18:42Z',
    status: 'AWAITING_HITL',
    currentStepName: 'REPORT_AGENT',
    stepProgress: 5,
    totalSteps: 6,
  },
  {
    caseId: 'case-defmet-fe-118-no-effect-20260610-2117',
    tgId: 'tg-defmet-fe-118',
    tgName: 'DefMEt_FE_118 · no effect',
    areaName: 'Defect Metrology',
    riskGrade: 'CRITICAL',
    bottleneckProb: 0.997,
    utilizationRate: 0.91,
    wipCount: 820,
    detectedAt: '2026-06-10T11:17:35Z',
    status: 'AWAITING_HITL',
    currentStepName: 'REPORT_AGENT',
    stepProgress: 5,
    totalSteps: 6,
  },
  {
    caseId: 'case-defmet-fe-43-20260609-1721',
    tgId: 'tg-defmet-fe-43',
    tgName: 'DefMet_FE_43',
    areaName: 'Defect Metrology',
    riskGrade: 'CRITICAL',
    bottleneckProb: 0.981,
    utilizationRate: 0.689,
    wipCount: 10,
    detectedAt: '2026-06-09T08:21:00Z',
    status: 'AWAITING_HITL',
    currentStepName: 'REPORT_AGENT',
    stepProgress: 5,
    totalSteps: 6,
  },
  {
    caseId: 'case-de-fe-72-20260607-0115',
    tgId: 'tg-de-fe-72',
    tgName: 'DE_FE_72',
    areaName: 'Dry Etch',
    riskGrade: 'CRITICAL',
    bottleneckProb: 0.999,
    utilizationRate: 0.897,
    wipCount: 261,
    detectedAt: '2026-06-07T01:15:00Z',
    status: 'ANALYZING',
    currentStepName: 'CAUSE_ANALYZER',
    stepProgress: 2,
    totalSteps: 6,
  },
  {
    caseId: 'case-litho-be-110-20260607-0035',
    tgId: 'tg-litho-be-110',
    tgName: 'Litho_BE_110',
    areaName: 'Lithography',
    riskGrade: 'CRITICAL',
    bottleneckProb: 0.974,
    utilizationRate: 0.912,
    wipCount: 312,
    detectedAt: '2026-06-07T00:35:00Z',
    status: 'RESOLVED',
    currentStepName: null,
    stepProgress: 6,
    totalSteps: 6,
  },
  {
    caseId: 'case-de-be-67-20260606-2350',
    tgId: 'tg-de-be-67',
    tgName: 'DE_BE_67',
    areaName: 'Dry Etch',
    riskGrade: 'CRITICAL',
    bottleneckProb: 0.951,
    utilizationRate: 0.884,
    wipCount: 244,
    detectedAt: '2026-06-06T23:50:00Z',
    status: 'AWAITING_HITL',
    currentStepName: 'REPORT_AGENT',
    stepProgress: 5,
    totalSteps: 6,
  },
  {
    caseId: 'case-litho-reg-be-63-20260606-2310',
    tgId: 'tg-litho-reg-be-63',
    tgName: 'Litho_REG_BE_63',
    areaName: 'Lithography',
    riskGrade: 'HIGH',
    bottleneckProb: 0.823,
    utilizationRate: 0.861,
    wipCount: 198,
    detectedAt: '2026-06-06T23:10:00Z',
    status: 'ANALYZING',
    currentStepName: 'COMPARE_AGENT',
    stepProgress: 4,
    totalSteps: 6,
  },
];

export const MOCK_BNC_CASE_LIST: BncCaseListData = {
  items: MOCK_BNC_ALERT_CASES,
  pageInfo: {
    page: 0,
    size: 20,
    totalElements: MOCK_BNC_ALERT_CASES.length,
    totalPages: 1,
    sort: 'detectedAt,desc',
  },
};

export const MOCK_BNC_CASE_DETAILS: Record<string, BncCaseDetail> = Object.fromEntries(
  MOCK_BNC_ALERT_CASES.map((item) => [
    item.caseId,
    {
      caseId: item.caseId,
      tgId: item.tgId,
      tgName: item.tgName,
      areaName: item.areaName,
      riskGrade: item.riskGrade,
      bottleneckProb: item.bottleneckProb,
      detectedAt: item.detectedAt,
      status: item.status,
      resolvedAt: item.status === 'RESOLVED' ? '2026-06-07T02:40:00Z' : null,
      agentProgress: buildAgentProgress(item),
      agentSummary: {
        bottleneckCount: item.riskGrade === 'HIGH' ? 3 : 5,
        criticalCount: item.riskGrade === 'CRITICAL' ? 3 : 1,
        maxWipCount: Math.max(item.wipCount, 474),
        maxUtilizationRate: Math.max(item.utilizationRate, 0.9),
      },
    },
  ])
);

function buildAgentProgress(item: BncAlertCase): BncCaseDetail['agentProgress'] {
  return BNC_AGENT_STEP_NAMES.map((stepName, index) => {
    const stepOrder = index + 1;
    const isDone = stepOrder <= item.stepProgress;
    const isRunning = item.status !== 'RESOLVED' && stepOrder === item.stepProgress + 1;

    return {
      stepOrder,
      stepName,
      status: isDone ? 'DONE' : isRunning ? 'RUNNING' : 'WAITING',
      startedAt: isDone || isRunning ? item.detectedAt : null,
      completedAt: isDone ? item.detectedAt : null,
      outputSummary: isDone ? stepSummary(stepName, item) : null,
      attemptNo: 1,
    };
  });
}

function stepSummary(stepName: string, item: BncAlertCase): string {
  const summaries: Record<string, string> = {
    BOTTLENECK_DETECTOR: `${item.tgName} 병목 확률 ${Math.round(item.bottleneckProb * 100)}% 감지`,
    CASCADE_ANALYZER: `후속 영향 TG ${item.riskGrade === 'HIGH' ? 3 : 5}개와 Critical 알림 산출`,
    CAUSE_ANALYZER: 'SHAP, KPI trend, upstream, Forward Sim 기반 원인 후보 도출',
    SOLUTION_GENERATOR: 'REQUEUE_TOOL, LOT_HOLD, DISPATCH_RULE_OVERRIDE 대응 후보 생성',
    COMPARE_AGENT: '대응안별 queue time, WIP, throughput 개선폭 비교 및 추천안 선정',
    REPORT_AGENT: '분석 결과와 HITL 검토 정보를 리포트 초안으로 정리',
  };

  return summaries[stepName] ?? 'Agent 산출물 생성 완료';
}

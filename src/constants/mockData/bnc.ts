import { BNC_AGENT_STEP_NAMES } from '@/constants/bnc';

import type { BncAlertCase, BncCaseDetail, BncCaseListData } from '@/types/bnc';

// 이번 세션에서 만든 단일 데모 케이스만 유지: stage1_alert_t2520 / stage2_cause_t2520 의 Critical 병목.
export const MOCK_BNC_ALERT_CASES: BncAlertCase[] = [
  {
    caseId: 'case-diffusion-fe-125-t2520',
    tgId: 'tg-diffusion-fe-125',
    tgName: 'Diffusion_FE_125',
    areaName: 'Diffusion',
    riskGrade: 'CRITICAL',
    bottleneckProb: 0.9941,
    utilizationRate: 0.7914,
    wipCount: 5,
    detectedAt: '2026-06-14T09:56:57Z',
    status: 'AWAITING_HITL',
    currentStepName: 'REPORT_AGENT',
    stepProgress: 6,
    totalSteps: 6,
    // stage1_alert_t2520.json (Diffusion_FE_125) 실측값 그대로
    alertMetrics: {
      compositeScore: 0.7996,
      probability: 0.9941,
      impactScore: 0.6052,
      affectedCount: 93,
      ctIncreaseMin: 259.3,
      atRiskLots: 76,
    },
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

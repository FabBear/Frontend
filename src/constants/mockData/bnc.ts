import { BNC_AGENT_STEP_NAMES } from '@/constants/bnc';

import type { BncAlertCase, BncCaseDetail, BncCaseListData } from '@/types/bnc';

// report_DE_FE_1_20260614_231251 기준 Critical 병목 케이스.
export const MOCK_BNC_ALERT_CASES: BncAlertCase[] = [
  {
    caseId: 'case-de-fe-1-3780',
    tgId: 'tg-de-fe-1',
    tgName: 'DE_FE_1',
    areaName: 'Dry Etch',
    riskGrade: 'CRITICAL',
    bottleneckProb: 0.9958,
    riskScore: 0.8031,
    utilizationRate: 0.9943,
    wipCount: 10,
    detectedAt: '2026-06-14T14:12:00Z',
    status: 'AWAITING_HITL',
    currentStepName: 'HITL_WAITING',
    stepProgress: 5,
    totalSteps: 7,
    alertMetrics: {
      compositeScore: 0.8031,
      probability: 0.9958,
      impactScore: 0.6867,
      affectedCount: 2,
      ctIncreaseMin: 1670,
      atRiskLots: 12,
    },
  },
  {
    caseId: 'case-litho-fe-92-3641',
    tgId: 'tg-litho-fe-92',
    tgName: 'Litho_FE_92',
    areaName: 'Litho',
    riskGrade: 'CRITICAL',
    bottleneckProb: 0.9712,
    riskScore: 0.7548,
    utilizationRate: 0.9421,
    wipCount: 22,
    detectedAt: '2026-06-14T12:30:00Z',
    status: 'RESOLVED',
    currentStepName: 'HITL_WAITING',
    stepProgress: 7,
    totalSteps: 7,
    alertMetrics: {
      compositeScore: 0.7548,
      probability: 0.9712,
      impactScore: 0.6103,
      affectedCount: 3,
      ctIncreaseMin: 1240,
      atRiskLots: 22,
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

export function stepSummary(stepName: string): string {
  const summaries: Record<string, string> = {
    BOTTLENECK_DETECTOR: 'DE_FE_1 XGBoost 병목 확률 0.9958 감지 (CRITICAL), 종합 위험 점수 0.8031',
    DIFFUSION_ANALYSIS:
      'DE_FE_1 → Diffusion_FE_125 확산 경로 확인, 위험 Lot 12건, CT +1670분 예측, 병목 알림 2건 CRITICAL 1건',
    CAUSE_ANALYSIS: '설비_포화(SHAP 86.5%)를 주원인으로 판정하고 WIP_누적 및 DE_FE_86 업스트림 부담을 보조 근거로 분류',
    ACTION_PLAN_GEN: '대응안 3건 생성: conservative, standard, aggressive',
    ACTION_PLAN_COMPARE:
      'standard DISPATCH_RULE_OVERRIDE가 q_time -16.26분, WIP -4.0, wait_ratio -0.32 개선으로 명확한 1위',
    REPORT_GEN: '보고서 1건 생성',
    HITL_WAITING: '관리자 승인',
  };

  return summaries[stepName] ?? 'Agent 산출물 생성 완료';
}

const STEP_COMPLETED_TIMES = [
  '2026-06-14T14:12:00Z', // BOTTLENECK_DETECTOR
  '2026-06-14T14:12:00Z', // DIFFUSION_ANALYSIS
  '2026-06-14T14:12:00Z', // CAUSE_ANALYSIS
  '2026-06-14T14:13:00Z', // ACTION_PLAN_GEN
  '2026-06-14T14:16:00Z', // ACTION_PLAN_COMPARE
  '2026-06-14T14:17:00Z', // HITL_WAITING
  '2026-06-14T14:18:00Z', // REPORT_GEN
];

function buildAgentProgress(item: BncAlertCase): BncCaseDetail['agentProgress'] {
  return BNC_AGENT_STEP_NAMES.map((stepName, index) => {
    const stepOrder = index + 1;
    const isDone = stepOrder <= item.stepProgress;
    const isRunning = item.status !== 'RESOLVED' && stepOrder === item.stepProgress + 1;
    const completedAt = isDone ? (STEP_COMPLETED_TIMES[index] ?? item.detectedAt) : null;

    return {
      stepOrder,
      stepName,
      status: isDone ? 'DONE' : isRunning ? 'RUNNING' : 'WAITING',
      startedAt: isDone || isRunning ? item.detectedAt : null,
      completedAt,
      outputSummary: isDone ? stepSummary(stepName) : null,
      attemptNo: 1,
    };
  });
}

/** 데모 애니메이션용: DE_FE_1 케이스를 doneSteps 기준으로 재구성 */
export function buildDemoDetail(doneSteps: number): BncCaseDetail {
  const base = MOCK_BNC_ALERT_CASES[0]!;
  const agentProgress: BncCaseDetail['agentProgress'] = BNC_AGENT_STEP_NAMES.map((stepName, index) => {
    const stepOrder = index + 1;
    const isDone = stepOrder <= doneSteps;
    const isRunning =
      !isDone && ((doneSteps === 5 && stepName === 'HITL_WAITING') || (doneSteps === 6 && stepName === 'REPORT_GEN'));
    return {
      stepOrder,
      stepName,
      status: isDone ? 'DONE' : isRunning ? 'RUNNING' : 'WAITING',
      startedAt: isDone || isRunning ? base.detectedAt : null,
      completedAt: isDone ? (STEP_COMPLETED_TIMES[index] ?? base.detectedAt) : null,
      outputSummary: isDone ? stepSummary(stepName) : null,
      attemptNo: 1,
    };
  });

  const status: BncCaseDetail['status'] = doneSteps >= 7 ? 'RESOLVED' : doneSteps === 5 ? 'AWAITING_HITL' : 'ANALYZING';

  return {
    caseId: base.caseId,
    tgId: base.tgId,
    tgName: base.tgName,
    areaName: base.areaName,
    riskGrade: base.riskGrade,
    bottleneckProb: base.bottleneckProb,
    riskScore: base.riskScore,
    detectedAt: base.detectedAt,
    status,
    resolvedAt: null,
    agentProgress,
    agentSummary: {
      bottleneckCount: 3,
      criticalCount: 1,
      maxWipCount: base.wipCount,
      maxUtilizationRate: base.utilizationRate,
    },
  };
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
      riskScore: item.riskScore,
      detectedAt: item.detectedAt,
      status: item.status,
      resolvedAt: item.status === 'RESOLVED' ? '2026-06-14T14:12:46Z' : null,
      agentProgress: buildAgentProgress(item),
      agentSummary: {
        bottleneckCount: 3,
        criticalCount: item.riskGrade === 'CRITICAL' ? 1 : 0,
        maxWipCount: item.wipCount,
        maxUtilizationRate: item.utilizationRate,
      },
    },
  ])
);

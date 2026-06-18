import api from '@/services/api';

import { DEMO_CASE_ID, DEMO_DETECTED_AT } from '@/constants/mockData/demoAlert';
import { shouldUsePresentationScenario } from '@/constants/scenarioMode';

import type {
  AgentTaskProgressStep,
  AgentTaskRequest,
  AgentTaskResponse,
  AgentTaskResult,
  AgentTaskStatus,
  AgentTaskType,
} from '@/types/agentTask';

// 백엔드는 화면 호출 Agent를 용도별 엔드포인트로 분리(API 완전 분리):
//   FAB 브리핑  → /v1/fab-briefings   (tt_fab_briefing)
//   기간 리포트 → /v1/period-reports  (tt_period_report)
// 프론트는 기존 AgentTaskResponse 형태로 어댑트해 화면/챗 코드 변경을 최소화한다.

interface FabBriefingBackend {
  briefingId: string;
  status: AgentTaskStatus;
  progress: AgentTaskProgressStep[];
  result: AgentTaskResult | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface PeriodReportBackend {
  reportRunId: string;
  status: AgentTaskStatus;
  reportIntent: string;
  periodFrom: string | null;
  periodTo: string | null;
  progress: AgentTaskProgressStep[];
  result: AgentTaskResult | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface PageInfo {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  sort: string;
}

export interface AgentRunListItem {
  id: string;
  taskType: AgentTaskType;
  status: AgentTaskStatus;
  summary: string | null;
  reportIntent?: string;
  periodFrom?: string | null;
  periodTo?: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AgentRunListResult {
  items: AgentRunListItem[];
  pageInfo: PageInfo;
}

function adaptFabBriefing(b: FabBriefingBackend): AgentTaskResponse {
  return {
    taskId: b.briefingId,
    taskType: 'FAB_SNAPSHOT_BRIEFING',
    sourcePage: 'FAB3D',
    status: b.status,
    progress: b.progress,
    result: b.result,
    errorMessage: b.errorMessage,
    relatedCaseId: null,
    relatedTgId: null,
    createdAt: b.createdAt,
    startedAt: b.startedAt,
    completedAt: b.completedAt,
  };
}

function adaptPeriodReport(p: PeriodReportBackend): AgentTaskResponse {
  return {
    taskId: p.reportRunId,
    taskType: 'REPORT_PERIOD_SUMMARY',
    sourcePage: 'REPORT_ARCHIVE',
    status: p.status,
    progress: p.progress,
    result: p.result,
    errorMessage: p.errorMessage,
    relatedCaseId: null,
    relatedTgId: null,
    createdAt: p.createdAt,
    startedAt: p.startedAt,
    completedAt: p.completedAt,
  };
}

export async function createAgentTask(request: AgentTaskRequest): Promise<AgentTaskResponse> {
  if (shouldUsePresentationScenario()) return createMockAgentTask(request.taskType, request.sourcePage);

  const body = { context: request.context ?? {}, params: request.params ?? {} };
  if (request.taskType === 'REPORT_PERIOD_SUMMARY') {
    const { data } = await api.post<PeriodReportBackend>('/v1/period-reports', body);
    return adaptPeriodReport(data);
  }
  if (request.taskType === 'FAB_SNAPSHOT_BRIEFING') {
    const { data } = await api.post<FabBriefingBackend>('/v1/fab-briefings', body);
    return adaptFabBriefing(data);
  }
  // BNC_CASE_EXPLAIN / REPORT_CASE_QA 등은 더 이상 Agent task가 아니다(챗 전용 진입).
  throw new Error(`지원하지 않는 Agent task 유형입니다: ${request.taskType}`);
}

export async function fetchAgentTask(taskId: string, taskType: AgentTaskType): Promise<AgentTaskResponse> {
  if (shouldUsePresentationScenario())
    return createMockAgentTask(taskType, taskType === 'FAB_SNAPSHOT_BRIEFING' ? 'FAB3D' : 'REPORT_ARCHIVE', taskId);

  if (taskType === 'REPORT_PERIOD_SUMMARY') {
    const { data } = await api.get<PeriodReportBackend>(`/v1/period-reports/${taskId}`);
    return adaptPeriodReport(data);
  }
  const { data } = await api.get<FabBriefingBackend>(`/v1/fab-briefings/${taskId}`);
  return adaptFabBriefing(data);
}

/** 챗 재진입 복원: 종류를 모르는 실행 id로 union 조회(결과만 반환). */
export async function fetchAgentRunResult(runId: string): Promise<AgentTaskResult | null> {
  if (shouldUsePresentationScenario()) return createMockAgentTaskResult(runId);

  const { data } = await api.get<AgentTaskResult>(`/v1/agent-runs/${runId}`);
  return data ?? null;
}

export async function deleteFabBriefing(briefingId: string): Promise<void> {
  if (shouldUsePresentationScenario()) return;

  await api.delete(`/v1/fab-briefings/${briefingId}`);
}

export async function listFabBriefings(page = 0, size = 20): Promise<AgentRunListResult> {
  if (shouldUsePresentationScenario()) return createMockAgentRunList('FAB_SNAPSHOT_BRIEFING', page, size);

  const { data } = await api.get<{
    items: {
      briefingId: string;
      status: AgentTaskStatus;
      summary: string | null;
      createdAt: string;
      completedAt: string | null;
    }[];
    pageInfo: PageInfo;
  }>('/v1/fab-briefings', { params: { page, size } });
  return {
    items: data.items.map((it) => ({
      id: it.briefingId,
      taskType: 'FAB_SNAPSHOT_BRIEFING',
      status: it.status,
      summary: it.summary,
      createdAt: it.createdAt,
      completedAt: it.completedAt,
    })),
    pageInfo: data.pageInfo,
  };
}

export async function listPeriodReports(page = 0, size = 20, intent?: string): Promise<AgentRunListResult> {
  if (shouldUsePresentationScenario()) return createMockAgentRunList('REPORT_PERIOD_SUMMARY', page, size, intent);

  const { data } = await api.get<{
    items: {
      reportRunId: string;
      status: AgentTaskStatus;
      reportIntent: string;
      periodFrom: string | null;
      periodTo: string | null;
      summary: string | null;
      createdAt: string;
      completedAt: string | null;
    }[];
    pageInfo: PageInfo;
  }>('/v1/period-reports', { params: { page, size, intent } });
  return {
    items: data.items.map((it) => ({
      id: it.reportRunId,
      taskType: 'REPORT_PERIOD_SUMMARY',
      status: it.status,
      summary: it.summary,
      reportIntent: it.reportIntent,
      periodFrom: it.periodFrom,
      periodTo: it.periodTo,
      createdAt: it.createdAt,
      completedAt: it.completedAt,
    })),
    pageInfo: data.pageInfo,
  };
}

function createMockAgentTask(
  taskType: AgentTaskType,
  sourcePage: AgentTaskResponse['sourcePage'],
  taskId = `${taskType.toLowerCase()}-demo-de-fe-1`
): AgentTaskResponse {
  return {
    taskId,
    taskType,
    sourcePage,
    status: 'SUCCEEDED',
    progress: [
      {
        stepName: '컨텍스트 수집',
        status: 'SUCCEEDED',
        message: 'DE_FE_1 케이스와 스냅샷을 결합했습니다.',
        occurredAt: DEMO_DETECTED_AT,
      },
      {
        stepName: '근거 검증',
        status: 'SUCCEEDED',
        message: '원인·대응안·보고서 산출물을 대조했습니다.',
        occurredAt: DEMO_DETECTED_AT,
      },
      {
        stepName: '요약 생성',
        status: 'SUCCEEDED',
        message: 'Agent 요약을 완료했습니다.',
        occurredAt: DEMO_DETECTED_AT,
      },
    ],
    result: createMockAgentTaskResult(taskId),
    errorMessage: null,
    relatedCaseId: DEMO_CASE_ID,
    relatedTgId: 'DE_FE_1',
    createdAt: DEMO_DETECTED_AT,
    startedAt: DEMO_DETECTED_AT,
    completedAt: DEMO_DETECTED_AT,
  };
}

function createMockAgentTaskResult(runId: string): AgentTaskResult {
  // 브리핑 이력 카드별로 다른 스냅샷 결과 — 실제 rule_based.py 출력 구조와 동일하게 맞춤:
  //   evidence: 전체가동률 / 진행중WIP / 가동·대기·비가동 / 비가동설비 / 설비가용률
  //   responseDirections: 비가동확인 / 일감집중구역 점검 / 구역별 훑기
  //   watchToolGroups severity: lowercase (critical/warning/info)
  //   artifacts type: "BRIEF"

  if (runId.endsWith('-002')) {
    return {
      summary:
        'FAB 현재 전체 가동률 79.1%, 진행 중 WIP 1,189 Lot(증가)입니다. 설비 52대 중 가동 41 · 대기 6 · 셋업 0 · 비가동 5대. 일감은 주로 DRY_ETCH 구역에 몰려 있습니다. 우선 살펴볼 TG는 DE_FE_1입니다.',
      evidence: [
        { label: '전체 가동률', value: '79.1%', description: '현재 FAB 평균 설비 가동률입니다.', severity: 'warning' },
        {
          label: '진행 중 WIP',
          value: '1,189 Lot (증가)',
          description: '공정에 투입된 Lot 수와 최근 12시간 추세입니다.',
        },
        { label: '가동/대기/비가동', value: '41 / 6 / 5대', description: 'RUN / IDLE / DOWN 설비 수입니다.' },
        {
          label: '비가동 설비',
          value: '5대',
          description: 'PM/고장 등으로 멈춰 있는 설비입니다.',
          severity: 'warning',
        },
        { label: '설비 가용률', value: '90.4%', description: '정비/고장을 제외한 사용 가능 설비 비율입니다.' },
      ],
      propagation: {
        summary: '일감·가동이 있는 구역(라인 밸런스): DRY_ETCH, LITHO, DIFFUSION 순으로 활동이 많습니다.',
        affectedProcesses: ['DRY_ETCH', 'LITHO', 'DIFFUSION'],
        affectedToolGroups: [],
        horizon: '현재 스냅샷',
      },
      responseDirections: [
        {
          title: '비가동 설비 확인',
          description: '현재 비가동(DOWN) 설비 5대가 있습니다. PM/고장 여부와 복구 예정을 점검하세요.',
        },
        {
          title: '일감 집중 구역 점검',
          description: 'DRY_ETCH 구역에 WIP가 가장 많이 몰려 있습니다. 진행 상태와 대기 Lot을 확인하세요.',
        },
        {
          title: '구역별 가동 현황 훑기',
          description: '구역별 가동률과 가용 설비를 보고 바쁜 구역과 한가한 구역을 파악하세요.',
        },
      ],
      references: { caseIds: [], tgIds: ['de-fe-1', 'de-fe-56'], reportIds: [runId], docIds: [] },
      followUpPrompts: [
        '비가동(DOWN) 설비를 TG별로 정리해줘.',
        'WIP가 가장 많은 구역과 추세를 알려줘.',
        '셋업 비중이 높은 설비그룹을 보여줘.',
      ],
      artifacts: [{ type: 'BRIEF', title: 'FAB 현황 브리핑', description: '현재 스냅샷 기반 전체 현황 요약' }],
      watchToolGroups: [
        { tgName: 'DE_FE_1', areaName: 'DRY_ETCH', reason: 'WIP 420 Lot 집중 · 비가동 설비 2대', severity: 'critical' },
        { tgName: 'DE_FE_56', areaName: 'DRY_ETCH', reason: 'WIP 408 Lot 집중', severity: 'warning' },
        { tgName: 'PH_LITHO_3', areaName: 'LITHO', reason: '평균 대기 92분', severity: 'warning' },
      ],
    };
  }

  if (runId.endsWith('-003')) {
    return {
      summary:
        'FAB 현재 전체 가동률 85.7%, 진행 중 WIP 1,201 Lot(보합)입니다. 설비 52대 중 가동 44 · 대기 5 · 셋업 0 · 비가동 3대. 일감은 주로 DRY_ETCH 구역에 몰려 있습니다. 우선 살펴볼 TG는 DE_FE_1입니다.',
      evidence: [
        { label: '전체 가동률', value: '85.7%', description: '현재 FAB 평균 설비 가동률입니다.' },
        {
          label: '진행 중 WIP',
          value: '1,201 Lot (보합)',
          description: '공정에 투입된 Lot 수와 최근 12시간 추세입니다.',
        },
        { label: '가동/대기/비가동', value: '44 / 5 / 3대', description: 'RUN / IDLE / DOWN 설비 수입니다.' },
        {
          label: '비가동 설비',
          value: '3대',
          description: 'PM/고장 등으로 멈춰 있는 설비입니다. (IMP_ION 구역 PM 포함)',
          severity: 'warning',
        },
        { label: '설비 가용률', value: '94.2%', description: '정비/고장을 제외한 사용 가능 설비 비율입니다.' },
      ],
      propagation: {
        summary: '일감·가동이 있는 구역(라인 밸런스): DRY_ETCH, DIFFUSION, LITHO 순으로 활동이 많습니다.',
        affectedProcesses: ['DRY_ETCH', 'DIFFUSION', 'LITHO'],
        affectedToolGroups: [],
        horizon: '현재 스냅샷',
      },
      responseDirections: [
        {
          title: '비가동 설비 확인',
          description: '현재 비가동(DOWN) 설비 3대가 있습니다. PM/고장 여부와 복구 예정을 점검하세요.',
        },
        {
          title: '일감 집중 구역 점검',
          description: 'DRY_ETCH 구역에 WIP가 가장 많이 몰려 있습니다. 진행 상태와 대기 Lot을 확인하세요.',
        },
        {
          title: '구역별 가동 현황 훑기',
          description: '구역별 가동률과 가용 설비를 보고 바쁜 구역과 한가한 구역을 파악하세요.',
        },
      ],
      references: { caseIds: [], tgIds: ['de-fe-1', 'ph-litho-2'], reportIds: [runId], docIds: [] },
      followUpPrompts: [
        '비가동(DOWN) 설비를 TG별로 정리해줘.',
        'WIP가 가장 많은 구역과 추세를 알려줘.',
        '셋업 비중이 높은 설비그룹을 보여줘.',
      ],
      artifacts: [{ type: 'BRIEF', title: 'FAB 현황 브리핑', description: '현재 스냅샷 기반 전체 현황 요약' }],
      watchToolGroups: [
        { tgName: 'DE_FE_1', areaName: 'DRY_ETCH', reason: 'WIP 420 Lot 집중', severity: 'warning' },
        { tgName: 'PH_LITHO_2', areaName: 'LITHO', reason: '비가동 설비 1대', severity: 'warning' },
        { tgName: 'IMP_ION_1', areaName: 'IMPLANT', reason: '비가동 설비 2대 (PM)', severity: 'warning' },
      ],
    };
  }

  // 기본값 (demo-001 및 BNC/기타)
  return {
    summary:
      'FAB 현재 전체 가동률 82.4%, 진행 중 WIP 1,247 Lot(증가)입니다. 설비 52대 중 가동 38 · 대기 7 · 셋업 0 · 비가동 7대. 일감은 주로 DRY_ETCH 구역에 몰려 있습니다. 우선 살펴볼 TG는 DE_FE_1입니다.',
    evidence: [
      { label: '전체 가동률', value: '82.4%', description: '현재 FAB 평균 설비 가동률입니다.', severity: 'warning' },
      {
        label: '진행 중 WIP',
        value: '1,247 Lot (증가)',
        description: '공정에 투입된 Lot 수와 최근 12시간 추세입니다.',
      },
      { label: '가동/대기/비가동', value: '38 / 7 / 7대', description: 'RUN / IDLE / DOWN 설비 수입니다.' },
      {
        label: '비가동 설비',
        value: '7대',
        description: 'PM/고장 등으로 멈춰 있는 설비입니다. (사유 PM/BM·지속시간은 설비 상세에서 확인)',
        severity: 'warning',
      },
      { label: '설비 가용률', value: '86.5%', description: '정비/고장을 제외한 사용 가능 설비 비율입니다.' },
    ],
    propagation: {
      summary: '일감·가동이 있는 구역(라인 밸런스): DRY_ETCH, LITHO, DIFFUSION, IMPLANT 순으로 활동이 많습니다.',
      affectedProcesses: ['DRY_ETCH', 'LITHO', 'DIFFUSION', 'IMPLANT'],
      affectedToolGroups: [],
      horizon: '현재 스냅샷',
    },
    responseDirections: [
      {
        title: '비가동 설비 확인',
        description: '현재 비가동(DOWN) 설비 7대가 있습니다. PM/고장 여부와 복구 예정을 점검하세요.',
      },
      {
        title: '일감 집중 구역 점검',
        description: 'DRY_ETCH 구역에 WIP가 가장 많이 몰려 있습니다. 진행 상태와 대기 Lot을 확인하세요.',
      },
      {
        title: '구역별 가동 현황 훑기',
        description: '구역별 가동률과 가용 설비를 보고 바쁜 구역과 한가한 구역을 파악하세요.',
      },
    ],
    references: {
      caseIds: [DEMO_CASE_ID],
      tgIds: ['de-fe-1', 'de-fe-56', 'ph-litho-3'],
      reportIds: [runId],
      docIds: [],
    },
    followUpPrompts: [
      '비가동(DOWN) 설비를 TG별로 정리해줘.',
      'WIP가 가장 많은 구역과 추세를 알려줘.',
      '셋업 비중이 높은 설비그룹을 보여줘.',
    ],
    artifacts: [{ type: 'BRIEF', title: 'FAB 현황 브리핑', description: '현재 스냅샷 기반 전체 현황 요약' }],
    watchToolGroups: [
      { tgName: 'DE_FE_1', areaName: 'DRY_ETCH', reason: 'WIP 420 Lot 집중 · 비가동 설비 2대', severity: 'critical' },
      { tgName: 'DE_FE_56', areaName: 'DRY_ETCH', reason: 'WIP 408 Lot 집중', severity: 'warning' },
      { tgName: 'PH_LITHO_3', areaName: 'LITHO', reason: '평균 대기 88분', severity: 'warning' },
      { tgName: 'IMP_ION_1', areaName: 'IMPLANT', reason: '비가동 설비 3대', severity: 'warning' },
    ],
  };
}

function createMockAgentRunList(
  taskType: AgentTaskType,
  page: number,
  size: number,
  intent = taskType === 'REPORT_PERIOD_SUMMARY' ? 'WEEKLY_BOTTLENECK' : undefined
): AgentRunListResult {
  const isBriefing = taskType === 'FAB_SNAPSHOT_BRIEFING';
  const items: AgentRunListItem[] = isBriefing
    ? [
        {
          id: `${taskType.toLowerCase()}-demo-001`,
          taskType,
          status: 'SUCCEEDED',
          summary:
            '현재 FAB 라인 전체 가동률 82.4%, 총 WIP 1,247 Lot. Critical 구역 2개(DE_FE, PH_LITHO), 위험 TG 5개 감지.\n\n' +
            'DE_FE_1은 가동률 97.3%로 ML 위험 순위 1위를 기록 중이며, WIP 누적(현재 34 Lot)과 설비 2기 DOWN이 겹쳐 즉시 확인이 필요합니다. ' +
            'PH_LITHO_3은 Q-time 초과 Lot이 8건 발생하여 대기 시간 관리가 시급합니다.\n\n' +
            '비가동 설비는 전체 라인 기준 7기(DE_FE 2기, PH_LITHO 2기, IMP_ION 3기)이며, IMP_ION 구역은 PM 예정으로 계획 내 정지입니다. ' +
            '라인 전반 흐름은 주의 수준이나, DE_FE·PH_LITHO 구역은 오늘 교대 내 대응이 필요합니다.',
          reportIntent: intent,
          periodFrom: null,
          periodTo: null,
          createdAt: '2026-06-16T08:30:00+09:00',
          completedAt: '2026-06-16T08:30:45+09:00',
        },
        {
          id: `${taskType.toLowerCase()}-demo-002`,
          taskType,
          status: 'SUCCEEDED',
          summary:
            '전체 가동률 79.1%, WIP 1,189 Lot. Critical 구역 1개(DE_FE), 위험 TG 3개.\n\n' +
            'DE_FE_1 가동률 94.8%로 전 교대 대비 소폭 하락했으나 WIP 누적 지속(+6 Lot). ' +
            '설비 다운 1기(DE_FE_1_EQ04) 복구 완료, 현재 IDLE 상태로 재가동 확인 필요.\n\n' +
            'PH_LITHO 구역은 전 교대 위험에서 High로 완화, Q-time 초과 건수 8→3건으로 감소. ' +
            '라인 전반적으로 안정 추세이나 DE_FE 구역 WIP 빌드업 주시 요망.',
          reportIntent: intent,
          periodFrom: null,
          periodTo: null,
          createdAt: '2026-06-16T00:15:00+09:00',
          completedAt: '2026-06-16T00:15:52+09:00',
        },
        {
          id: `${taskType.toLowerCase()}-demo-003`,
          taskType,
          status: 'SUCCEEDED',
          summary:
            '전체 가동률 85.7%, WIP 1,201 Lot. 라인 전반 안정 상태, Critical 구역 없음.\n\n' +
            'DE_FE_1 WIP 28 Lot(적정 수준), 가동률 91.2%로 High 유지. ' +
            'ML 시스템 위험 순위 1위지만 현재 추세는 완만. IMP_ION PM 완료 후 라인 복귀 예정(예상 06:00).\n\n' +
            '전체 설비 다운 3기(계획 내 PM 2기 포함), 비계획 다운 1기(PH_LITHO_2_EQ07 — 원인 조사 중). ' +
            '금일 Hot Lot 4건 처리 완료, 현장 조치 필요 사항 없음.',
          reportIntent: intent,
          periodFrom: null,
          periodTo: null,
          createdAt: '2026-06-15T16:05:00+09:00',
          completedAt: '2026-06-15T16:05:38+09:00',
        },
      ]
    : [
        {
          id: `${taskType.toLowerCase()}-demo-de-fe-1`,
          taskType,
          status: 'SUCCEEDED',
          summary: 'DE_FE_1 Critical 병목과 standard 대응안 승인 근거 요약',
          reportIntent: intent,
          periodFrom: '2026-06-08T00:00:00+09:00',
          periodTo: '2026-06-14T23:59:59+09:00',
          createdAt: DEMO_DETECTED_AT,
          completedAt: DEMO_DETECTED_AT,
        },
      ];

  return {
    items: items.slice(page * size, page * size + size),
    pageInfo: {
      page,
      size,
      total: items.length,
      totalPages: 1,
      sort: 'createdAt,desc',
    },
  };
}

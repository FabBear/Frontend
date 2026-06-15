import api from '@/services/api';

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
  if (taskType === 'REPORT_PERIOD_SUMMARY') {
    const { data } = await api.get<PeriodReportBackend>(`/v1/period-reports/${taskId}`);
    return adaptPeriodReport(data);
  }
  const { data } = await api.get<FabBriefingBackend>(`/v1/fab-briefings/${taskId}`);
  return adaptFabBriefing(data);
}

/** 챗 재진입 복원: 종류를 모르는 실행 id로 union 조회(결과만 반환). */
export async function fetchAgentRunResult(runId: string): Promise<AgentTaskResult | null> {
  const { data } = await api.get<AgentTaskResult>(`/v1/agent-runs/${runId}`);
  return data ?? null;
}

export async function deleteFabBriefing(briefingId: string): Promise<void> {
  await api.delete(`/v1/fab-briefings/${briefingId}`);
}

export async function listFabBriefings(page = 0, size = 20): Promise<AgentRunListResult> {
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

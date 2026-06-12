export type AgentTaskType =
  | 'FAB_SNAPSHOT_BRIEFING'
  | 'FAB_TG_DIAGNOSIS'
  | 'REPORT_PERIOD_SUMMARY'
  | 'REPORT_CASE_QA'
  | 'BNC_CASE_EXPLAIN';

export type AgentTaskSourcePage = 'FAB3D' | 'REPORT_ARCHIVE' | 'RESPONSE_CENTER' | 'CHAT';

export type AgentTaskStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';

export interface AgentEvidenceItem {
  label: string;
  value: string;
  description: string;
  severity?: 'critical' | 'warning' | 'info' | string;
}

export interface AgentPropagation {
  summary: string;
  affectedProcesses: string[];
  affectedToolGroups: string[];
  horizon: string;
}

export interface AgentResponseDirection {
  title: string;
  description: string;
  owner?: string;
  caution?: string | null;
}

export interface AgentReferences {
  caseIds: string[];
  tgIds: string[];
  reportIds: string[];
  docIds: string[];
}

export interface AgentArtifact {
  type: string;
  title: string;
  description: string;
  refId?: string | null;
}

export interface AgentWatchToolGroup {
  tgName: string;
  areaName?: string | null;
  reason: string;
  severity: string;
}

export interface AgentTaskResult {
  summary: string;
  evidence: AgentEvidenceItem[];
  propagation: AgentPropagation;
  responseDirections: AgentResponseDirection[];
  references: AgentReferences;
  followUpPrompts: string[];
  artifacts: AgentArtifact[];
  watchToolGroups?: AgentWatchToolGroup[];
}

export interface AgentTaskProgressStep {
  stepName: string;
  status: AgentTaskStatus;
  message: string | null;
  occurredAt: string;
}

export interface AgentTaskResponse {
  taskId: string;
  taskType: AgentTaskType;
  sourcePage: AgentTaskSourcePage;
  status: AgentTaskStatus;
  progress: AgentTaskProgressStep[];
  result: AgentTaskResult | null;
  errorMessage: string | null;
  relatedCaseId: string | null;
  relatedTgId: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface AgentTaskRequest {
  taskType: AgentTaskType;
  sourcePage: AgentTaskSourcePage;
  context?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

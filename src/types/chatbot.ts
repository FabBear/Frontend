import type { AgentTaskResult } from '@/types/agentTask';

export type ChatRole = 'USER' | 'ASSISTANT';

export interface ChatReference {
  caseIds: string[];
  docIds: string[];
}

export interface ChatSource {
  title: string;
  sourcePath?: string | null;
  category?: string | null;
}

// Generative UI: LLM이 고른 카드 종류 + 도구 결과 실데이터(props). 프론트 레지스트리가 렌더.
export interface ChatUiCard {
  type: 'status' | 'trend' | 'lot' | 'cases' | 'navigation';
  props: Record<string, unknown>;
}

export interface ChatMessage {
  messageId: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  references: ChatReference;
  sources?: ChatSource[];
  spokenSummary?: string | null;
  ui?: ChatUiCard | null;
  /** 신뢰도 메타(스트리밍 응답 한정, UI 표시 전용 — DB 미저장). */
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  warnings?: string[];
  toolsUsed?: string[];
  followUps?: string[];
  /** SSE 스트리밍 중(미완성) — 자동읽기 등은 완성 후에만 동작. */
  pending?: boolean;
  agentResult?: AgentTaskResult | null;
  createdAt: string;
}

export interface ChatSession {
  sessionId: string;
  sessionTitle: string;
  isActive: boolean;
  lastMessageAt: string;
  createdAt: string;
  messages: ChatMessage[];
  agentContext?: {
    taskId: string;
    title: string;
    sourcePage: string;
    relatedCaseId: string | null;
    relatedTgId: string | null;
    taskType?: string;
    followUpPrompts?: string[];
  } | null;
  reportContext?: ChatReportContextInput | null;
}

export interface ChatReportContextInput {
  caseId?: string | null;
  reportId?: string | null;
  processName: string;
  severity: string;
  riskScore: number;
  detectedAt: string;
}

export interface ChatQuickPrompt {
  id: string;
  label: string;
  message: string;
}

export interface ChatDateRange {
  from: string;
  to: string;
}

export interface ChatSendRequest {
  sessionId: string | null;
  message: string;
  contextCaseId?: string | null;
  contextReportId?: string | null;
  contextTaskId?: string | null;
  contextTgId?: string | null;
  sourcePage?: string | null;
  dateRange?: ChatDateRange | null;
  /** AI 스트리밍으로 이미 받은 답변 — Spring은 저장만 수행(AI 재호출 X). */
  precomputed?: {
    answer: string;
    spokenSummary?: string | null;
    sources?: ChatSource[];
    followUps?: string[];
    ui?: ChatUiCard | null;
    title?: string | null;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
    warnings?: string[];
    toolsUsed?: string[];
  } | null;
}

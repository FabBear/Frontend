import axios from 'axios';

import api from '@/services/api';

import type { ChatAttachment, ChatQuickPrompt, ChatSendRequest, ChatSession } from '@/types/chatbot';

export interface ChatUploadRequest {
  sessionId: string;
  attachments: ChatAttachment[];
}

export interface RagEmbeddingModelCandidate {
  modelId: string;
  role: 'MVP' | 'FALLBACK' | 'QUALITY';
  reason: string;
}

export interface RagStoragePlan {
  fileStorage: 'DOCKER_VOLUME';
  metadataStorage: 'DATABASE';
  vectorStore: 'CHROMA' | 'FAISS' | 'PGVECTOR';
  harborUsage: 'CONTAINER_ARTIFACTS_ONLY';
}

export const FREE_EMBEDDING_MODEL_CANDIDATES: RagEmbeddingModelCandidate[] = [
  {
    modelId: 'intfloat/multilingual-e5-small',
    role: 'MVP',
    reason: '한국어/다국어 대응이 가능하고 비교적 가벼워 로컬 embedding service MVP에 적합합니다.',
  },
  {
    modelId: 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
    role: 'FALLBACK',
    reason: '품질보다 가벼운 실행과 빠른 fallback이 중요할 때 사용할 수 있습니다.',
  },
  {
    modelId: 'BAAI/bge-m3',
    role: 'QUALITY',
    reason: '다국어 검색 품질 후보지만 MVP 환경에서는 리소스 사용량을 먼저 확인해야 합니다.',
  },
];

export const LOCAL_RAG_STORAGE_PLAN: RagStoragePlan = {
  fileStorage: 'DOCKER_VOLUME',
  metadataStorage: 'DATABASE',
  vectorStore: 'CHROMA',
  harborUsage: 'CONTAINER_ARTIFACTS_ONLY',
};

export async function prepareChatAttachmentsForUpload(request: ChatUploadRequest): Promise<ChatAttachment[]> {
  // MVP 연결점: 실제 구현 시 POST /api/v1/chatbot/sessions/{sessionId}/attachments 로 교체한다.
  // 파일 원본은 S3/Harbor가 아니라 backend Docker volume에 저장하고 DB에 metadata를 기록한다.
  return request.attachments.map((attachment) => ({ ...attachment, status: 'DONE' }));
}

export async function requestLocalRagIndexing(
  attachments: ChatAttachment[]
): Promise<{ indexed: boolean; modelId: string }> {
  // 유료 embedding API 호출 금지. 로컬 embedding service가 준비되기 전까지는 mock 완료 상태만 반환한다.
  return {
    indexed: attachments.length > 0,
    modelId: FREE_EMBEDDING_MODEL_CANDIDATES[0].modelId,
  };
}

interface BackendChatSessionList {
  items: Array<{
    sessionId: string;
    sessionTitle: string;
    isActive: boolean;
    lastMessageAt: string;
    createdAt: string;
  }>;
  pageInfo: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    sort: string;
  };
}

interface BackendChatMessages {
  sessionId: string;
  items: Array<{
    messageId: string;
    role: 'USER' | 'ASSISTANT';
    content: string;
    refCaseIds: string[];
    refDocIds: string[];
    ui?: { type: 'status' | 'trend' | 'lot' | 'cases' | 'navigation'; props: Record<string, unknown> } | null;
    confidence?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
    warnings?: string[];
    toolsUsed?: string[];
    followUps?: string[];
    createdAt: string;
  }>;
  pageInfo: {
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
    sort: string;
  };
}

interface BackendChatMessage {
  sessionId: string;
  sessionTitle?: string | null;
  messageId: string;
  role: 'ASSISTANT';
  content: string;
  references: {
    caseIds: string[];
    docIds: string[];
  };
  sources?: Array<{ title: string; sourcePath?: string | null; category?: string | null }>;
  followUps?: string[];
  spokenSummary?: string | null;
  ui?: { type: 'status' | 'trend' | 'lot' | 'cases' | 'navigation'; props: Record<string, unknown> } | null;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  warnings?: string[];
  toolsUsed?: string[];
  createdAt: string;
}

interface BackendSuggestedQuestions {
  categories: Array<{
    category: string;
    questions: string[];
  }>;
}

export interface VoiceTranscribeResult {
  text: string;
  confidence: number | null;
}

export async function fetchChatSessions(): Promise<ChatSession[]> {
  const { data } = await api.get<BackendChatSessionList>('/v1/chatbot/sessions', {
    params: { page: 0, size: 20 },
  });

  return data.items.map((session) => ({
    ...session,
    messages: [],
  }));
}

export async function fetchChatSessionMessages(sessionId: string): Promise<ChatSession['messages']> {
  const pageSize = 100;
  let page = 0;
  const items: BackendChatMessages['items'] = [];

  for (;;) {
    const { data } = await api.get<BackendChatMessages>(`/v1/chatbot/sessions/${sessionId}/messages`, {
      params: { page, size: pageSize },
    });
    items.push(...data.items);
    if (page + 1 >= data.pageInfo.totalPages || data.items.length === 0) break;
    page += 1;
  }

  return items.map((message) => ({
    messageId: message.messageId,
    sessionId,
    role: message.role,
    content: message.content,
    references: { caseIds: message.refCaseIds ?? [], docIds: message.refDocIds ?? [] },
    ui: message.ui ?? null,
    confidence: message.confidence ?? null,
    warnings: message.warnings ?? [],
    toolsUsed: message.toolsUsed ?? [],
    followUps: message.followUps ?? [],
    createdAt: message.createdAt,
  }));
}

export async function sendChatMessage(request: ChatSendRequest): Promise<BackendChatMessage> {
  const { data } = await api.post<BackendChatMessage>('/v1/chatbot/messages', request);
  return data;
}

// ── AI 직접 SSE 스트리밍 (P1: 체감속도) ──────────────────────────────────────
// 프론트 → FastAPI /api/chat/stream (vite 프록시 /ai가 내부 토큰 주입).
// LLM 호출은 이 한 번뿐 — 완료 후 Spring에는 precomputed로 '저장만' 요청(비용 절감).

interface RawMesCurrent {
  fab?: {
    measuredAt?: string | null;
    utilizationRate?: number | null;
    wipCount?: number | null;
    avgAvailableToolRatio?: number | null;
    toolStatusSummary?: Record<string, number> | null;
  } | null;
  processSummaries?: Array<{
    areaName?: string | null;
    wipCount?: number | null;
    avgUtilizationRate?: number | null;
    avgAvailableToolRatio?: number | null;
  }> | null;
}

function fmtPct(v?: number | null): string {
  return v == null ? '-' : `${(v * 100).toFixed(1)}%`;
}

/** Spring buildLiveFabContext와 동일 형식의 실시간 현황 텍스트(AI status 카드 파서가 이 형식에 의존). */
export async function buildLiveFabContext(): Promise<string | null> {
  try {
    const { data } = await api.get<RawMesCurrent>('/v1/monitoring/mes/current');
    const fab = data.fab;
    const lines: string[] = [];
    lines.push(`[현재 FAB 실시간 현황${fab?.measuredAt ? ` · 기준 ${fab.measuredAt}` : ''}]`);
    if (fab) {
      const s = fab.toolStatusSummary ?? {};
      lines.push(
        `전체: 가동률 ${fmtPct(fab.utilizationRate)}, WIP ${fab.wipCount ?? 0} Lot, ` +
          `설비 가동 ${s.RUN ?? 0}/대기 ${s.IDLE ?? 0}/셋업 ${s.SETUP ?? 0}/비가동 ${s.DOWN ?? 0}, ` +
          `가용률 ${fmtPct(fab.avgAvailableToolRatio)}`
      );
    }
    const procs = [...(data.processSummaries ?? [])].sort((a, b) => (b.wipCount ?? 0) - (a.wipCount ?? 0));
    if (procs.length) {
      lines.push('구역별(WIP 많은 순):');
      for (const p of procs) {
        lines.push(
          `- ${p.areaName}: WIP ${p.wipCount ?? 0}, 평균가동률 ${fmtPct(p.avgUtilizationRate)}, 가용률 ${fmtPct(p.avgAvailableToolRatio)}`
        );
      }
    }
    return lines.join('\n');
  } catch {
    return null; // 현황 없이도 챗은 동작(도구가 "데이터 없음" 응답)
  }
}

export interface ChatStreamMeta {
  answer: string;
  sources?: Array<{ title: string; sourcePath?: string | null; category?: string | null }>;
  followUps?: string[];
  spokenSummary?: string | null;
  ui?: { type: 'status' | 'trend' | 'lot' | 'cases' | 'navigation'; props: Record<string, unknown> } | null;
  title?: string | null;
  /** 신뢰도 메타: 수치검증 기반 HIGH/MEDIUM/LOW + 경고 + 사용 도구. */
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW' | null;
  warnings?: string[];
  toolsUsed?: string[];
}

export interface ChatStreamCallbacks {
  onStage?: (label: string) => void;
  onToken: (text: string) => void;
  onMeta: (meta: ChatStreamMeta) => void;
}

/** SSE 스트리밍 호출. 성공 시 meta 반환, 실패 시 throw(호출측이 비스트리밍 폴백). */
export async function streamChatMessage(
  payload: {
    message: string;
    history: Array<{ role: string; content: string }>;
    context?: string | null;
    liveStatus?: string | null;
    fabId?: string | null;
    now?: string | null;
    generateTitle?: boolean;
  },
  callbacks: ChatStreamCallbacks
): Promise<ChatStreamMeta> {
  const res = await fetch('/ai/api/chat/message'.replace('/message', '/stream'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: payload.message,
      history: payload.history,
      context: payload.context ?? null,
      liveStatus: payload.liveStatus ?? null,
      fabId: payload.fabId ?? null,
      now: payload.now ?? null,
      generateTitle: payload.generateTitle ?? false,
    }),
  });
  if (!res.ok || !res.body) throw new Error(`stream HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let meta: ChatStreamMeta | null = null;
  let title: string | null = null;

  const handleEvent = (eventName: string, dataLine: string) => {
    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(dataLine);
    } catch {
      return;
    }
    if (eventName === 'token') callbacks.onToken(String(data.text ?? ''));
    else if (eventName === 'stage') callbacks.onStage?.(String(data.label ?? '조회 중'));
    else if (eventName === 'meta') meta = data as unknown as ChatStreamMeta;
    else if (eventName === 'title') title = (data.title as string) ?? null;
    else if (eventName === 'error') throw new Error(String(data.message ?? 'stream error'));
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      let eventName = 'message';
      let dataLine = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) eventName = line.slice(7).trim();
        else if (line.startsWith('data: ')) dataLine += line.slice(6);
      }
      if (dataLine) handleEvent(eventName, dataLine);
    }
  }
  if (!meta) throw new Error('stream ended without meta');
  const result = meta as ChatStreamMeta;
  if (title) result.title = title;
  callbacks.onMeta(result);
  return result;
}

export async function deleteChatSession(sessionId: string): Promise<void> {
  await api.delete(`/v1/chatbot/sessions/${sessionId}`);
}

/** 녹음 오디오를 온프렘 STT로 전사(우리 TG 어휘 보정). 오디오는 백엔드 경유, 외부로 안 나감. */
export async function transcribeAudio(blob: Blob): Promise<VoiceTranscribeResult> {
  const form = new FormData();
  form.append('audio', blob, createAudioFilename(blob));
  try {
    const { data } = await api.post<{ text: string; confidence?: number | null }>('/v1/chatbot/voice/transcribe', form);
    return { text: data.text ?? '', confidence: data.confidence ?? null };
  } catch (error) {
    throw new Error(resolveVoiceErrorMessage(error));
  }
}

function createAudioFilename(blob: Blob): string {
  if (blob.type.includes('mp4')) return 'audio.mp4';
  if (blob.type.includes('ogg')) return 'audio.ogg';
  if (blob.type.includes('wav')) return 'audio.wav';
  return 'audio.webm';
}

function resolveVoiceErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) return '전사 실패';

  const status = error.response?.status;
  const data = error.response?.data as
    | {
        error?: { code?: string; message?: string };
        errorCode?: string;
        message?: string;
      }
    | undefined;
  const code = data?.error?.code ?? data?.errorCode;
  const message = data?.error?.message ?? data?.message;

  if (status === 401) return '로그인이 만료되었습니다';
  if (status === 413) return '녹음이 너무 깁니다';
  if (status === 400 || status === 415) return message || '오디오 형식을 처리하지 못했습니다';
  if (status === 503 || code === 'E-EXT-001') return 'AI Agent 음성 서버 연결 실패';
  return message || '전사 실패';
}

export async function fetchSuggestedQuestions(): Promise<ChatQuickPrompt[]> {
  const { data } = await api.get<BackendSuggestedQuestions>('/v1/chatbot/suggested-questions');
  return data.categories.flatMap((category, categoryIndex) =>
    category.questions.map((question, index) => ({
      id: `${categoryIndex}-${index}`,
      label: question,
      message: question,
    }))
  );
}

import axios from 'axios';

import api from '@/services/api';

import { MOCK_CHAT_QUICK_PROMPTS, MOCK_CHAT_RESPONSES, MOCK_CHAT_SESSIONS } from '@/constants/mockData/chatbot';
import { DEMO_CASE_ID, DEMO_DETECTED_AT } from '@/constants/mockData/demoAlert';
import { shouldUsePresentationScenario } from '@/constants/scenarioMode';

import type { ChatQuickPrompt, ChatSendRequest, ChatSession, ChatUiCard } from '@/types/chatbot';

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
  if (shouldUsePresentationScenario())
    return MOCK_CHAT_SESSIONS.map((session) => ({ ...session, messages: [...session.messages] }));

  const { data } = await api.get<BackendChatSessionList>('/v1/chatbot/sessions', {
    params: { page: 0, size: 20 },
  });

  return data.items.map((session) => ({
    ...session,
    messages: [],
  }));
}

export async function fetchChatSessionMessages(sessionId: string): Promise<ChatSession['messages']> {
  if (shouldUsePresentationScenario()) {
    return (MOCK_CHAT_SESSIONS.find((session) => session.sessionId === sessionId)?.messages ?? []).map((message) => ({
      ...message,
      references: {
        ...message.references,
        caseIds: [...message.references.caseIds],
        docIds: [...message.references.docIds],
      },
    }));
  }

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
  if (shouldUsePresentationScenario()) return createScenarioChatMessage(request);

  const { data } = await api.post<BackendChatMessage>('/v1/chatbot/messages', request);
  return data;
}

// ── AI SSE 스트리밍 (P1: 체감속도) ──────────────────────────────────────────
// 프론트 → Spring /api/v1/chatbot/stream(JWT 인증) → FastAPI /api/chat/stream 중계.
// Spring이 인증 주체에서 fabId/내부 토큰을 주입하므로 dev/Docker 공통 경로다.
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
  if (shouldUsePresentationScenario()) {
    return [
      '[현재 FAB 현황 · 기준 2026-06-14 23:12]',
      '전체: DE_FE_1 Critical 병목, 병목 위험 점수 80.3',
      '확산 경로: DE_FE_1 → Diffusion_FE_125',
      '추천 대응: standard DISPATCH_RULE_OVERRIDE 승인안',
    ].join('\n');
  }

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
  if (shouldUsePresentationScenario()) {
    callbacks.onStage?.('DE_FE_1 산출물 확인 중');
    const answer = createScenarioChatAnswer(payload.message);
    const ui = createScenarioChatUi(payload.message);
    const toolsUsed = createScenarioToolsUsed(payload.message);
    callbacks.onToken(answer);
    const meta: ChatStreamMeta = {
      answer,
      sources: [{ title: 'DE_FE_1 병목 대응 보고서', category: 'REPORT', sourcePath: DEMO_CASE_ID }],
      followUps: ['승인안만 더 짧게 요약해줘', 'Diffusion_FE_125 영향만 따로 보여줘'],
      spokenSummary: 'DE_FE_1 병목은 설비 포화와 WIP 누적이 핵심이며 standard 대응안이 안정적입니다.',
      ui,
      confidence: 'HIGH',
      warnings: [],
      toolsUsed,
      title: 'DE_FE_1 병목 요약',
    };
    callbacks.onMeta(meta);
    return meta;
  }

  const res = await fetch('/api/v1/chatbot/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
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
  if (shouldUsePresentationScenario()) return;

  await api.delete(`/v1/chatbot/sessions/${sessionId}`);
}

/** 녹음 오디오를 온프렘 STT로 전사(우리 TG 어휘 보정). 오디오는 백엔드 경유, 외부로 안 나감. */
export async function transcribeAudio(blob: Blob): Promise<VoiceTranscribeResult> {
  if (shouldUsePresentationScenario()) return { text: 'DE_FE_1 병목 원인을 요약해줘', confidence: 0.98 };

  const form = new FormData();
  form.append('audio', blob, createAudioFilename(blob));
  try {
    const { data } = await api.post<{ text: string; confidence?: number | null }>('/v1/chatbot/voice/transcribe', form, {
      headers: { 'Content-Type': undefined },
    });
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
  if (shouldUsePresentationScenario()) return MOCK_CHAT_QUICK_PROMPTS;

  const { data } = await api.get<BackendSuggestedQuestions>('/v1/chatbot/suggested-questions');
  return data.categories.flatMap((category, categoryIndex) =>
    category.questions.map((question, index) => ({
      id: `${categoryIndex}-${index}`,
      label: question,
      message: question,
    }))
  );
}

function createScenarioChatAnswer(message: string, request?: ChatSendRequest): string {
  const normalized = message.toLowerCase();
  const hasReportContext = Boolean(request?.contextCaseId || request?.contextReportId);
  if (
    hasReportContext ||
    normalized.includes('report') ||
    normalized.includes('리포트') ||
    normalized.includes('보고')
  ) {
    return [
      '이 문서는 DE_FE_1 Critical 병목 대응 리포트입니다. 기준 케이스는 case-de-fe-1-3780이고, 보고서 생성 시각은 2026-06-14 23:12:46입니다.',
      '핵심 판단은 병목 위험 점수 80.3, 주원인 설비_포화(max_util), 확산 경로 DE_FE_1 → Diffusion_FE_125입니다.',
      '승인된 대응안은 standard DISPATCH_RULE_OVERRIDE이며 Release Interval Δ22.0% 조정과 Product_3/Product_4 우선순위 상향을 포함합니다.',
    ].join('\n\n');
  }
  if (normalized.includes('대응') || normalized.includes('승인') || normalized.includes('안')) {
    return 'standard 안이 선택된 이유는 개선 폭과 운영 리스크의 균형이 가장 좋기 때문입니다. DE_FE_1 Q-time은 58.0분, WIP는 8 Lot 수준으로 낮아지고, aggressive 안에서 나타나는 Diffusion_FE_125 가용성 저하와 WIP 편중 위험을 피합니다.';
  }
  if (normalized.includes('원인') || normalized.includes('why')) {
    return '원인은 설비_포화가 1순위입니다. max_util_delta_120, max_util, utilization_avg가 병목 방향으로 크게 기여했고, WIP 누적이 보조 원인으로 확인됐습니다. 업스트림 DE_FE_86 유입 부담도 DE_FE_1의 처리 여유를 압박합니다.';
  }
  if (normalized.includes('확산') || normalized.includes('diffusion')) {
    return '확산 경로는 DE_FE_1 → Diffusion_FE_125입니다. 무대응 120분 후 DE_FE_1은 WIP 12 Lot, Q-time 96.39분까지 악화될 수 있고, Diffusion_FE_125도 WIP 편중과 대기 누적을 같이 봐야 합니다.';
  }
  if (normalized.includes('tool') || normalized.includes('설비') || normalized.includes('장비')) {
    return 'DE_FE_1 내부 설비는 가동률이 한계권에 있어 개별 Tool 상태를 같이 봐야 합니다. 현재 분석 응답은 get_tool_status와 get_top_toolgroups 도구 기준으로 DE_FE_1, Diffusion_FE_125, DE_FE_86을 우선 확인하도록 구성했습니다.';
  }
  if (normalized.includes('3d') || normalized.includes('fab')) {
    return '3D FAB에서는 caseId=case-de-fe-1-3780과 tg=DE_FE_1 기준으로 감지 당시 스냅샷을 열어야 합니다. 확인 순서는 DE_FE_1, Diffusion_FE_125, 업스트림 DE_FE_86입니다.';
  }
  return MOCK_CHAT_RESPONSES[0];
}

function createScenarioToolsUsed(message: string): string[] {
  const normalized = message.toLowerCase();
  if (normalized.includes('원인') || normalized.includes('why'))
    return ['get_case_detail', 'get_kpi_trend', 'compare_periods'];
  if (normalized.includes('확산') || normalized.includes('diffusion')) return ['get_case_detail', 'get_top_toolgroups'];
  if (normalized.includes('tool') || normalized.includes('설비') || normalized.includes('장비')) {
    return ['get_tool_status', 'get_top_toolgroups'];
  }
  if (normalized.includes('현황') || normalized.includes('현재')) return ['get_fab_status', 'get_lot_status'];
  return ['get_case_detail', 'search_bottleneck_cases'];
}

function createScenarioChatUi(message: string): ChatUiCard | null {
  const normalized = message.toLowerCase();
  if (normalized.includes('원인') || normalized.includes('추세') || normalized.includes('why')) {
    return {
      type: 'trend',
      props: {
        title: 'DE_FE_1 주요 KPI 추세',
        labels: ['T-300', 'T-240', 'T-180', 'T-120', 'T-60', 'T-0'],
        series: [
          { name: 'Q-time', data: [0, 0, 22.24, 63.77, 76.22, 62.96] },
          { name: 'WIP', data: [4, 4, 10, 13, 13, 10] },
          { name: '가동률', data: [33.9, 50, 88.8, 100, 97.6, 99.4] },
        ],
      },
    };
  }

  if (
    normalized.includes('확산') ||
    normalized.includes('대응') ||
    normalized.includes('승인') ||
    normalized.includes('리포트')
  ) {
    return {
      type: 'lot',
      props: {
        title: 'DE_FE_1 승인안 적용 후 핵심 TG 전망',
        labelHeader: 'Tool Group',
        columns: [
          { key: 'qtime', label: 'Q-time', unit: '분' },
          { key: 'wip', label: 'WIP', unit: ' Lot' },
          { key: 'wait', label: 'Wait', unit: '%' },
          { key: 'util', label: '가동률', unit: '%' },
        ],
        rows: [
          { label: 'ETCH/DE_FE_1', qtime: 58, wip: 8, wait: 18, util: 88 },
          { label: 'OXIDATION/Diffusion_FE_125', qtime: 30, wip: 8, wait: 65, util: 82 },
        ],
      },
    };
  }

  if (normalized.includes('현황') || normalized.includes('현재')) {
    return {
      type: 'status',
      props: {
        title: '현재 FAB 현황 · DE_FE_1 케이스 기준',
        overall: { util: 83.1, wip: 10405, run: 300, idle: 1172, setup: 0, down: 63, avail: 93.5 },
        areas: [
          { name: 'ETCH', wip: 138, util: 21.9, avail: 98.2 },
          { name: 'DEPOSITION', wip: 207, util: 11.4, avail: 93.4 },
          { name: 'INSPECTION_PACKAGING', wip: 9884, util: 50, avail: 86.2 },
        ],
      },
    };
  }

  return {
    type: 'cases',
    props: {
      title: '최근 병목 케이스',
      rows: [
        {
          when: '06.14 23:12',
          where: 'ETCH/DE_FE_1',
          grade: 'CRITICAL',
          prob: 99.6,
          status: 'HITL 승인',
        },
      ],
    },
  };
}

function createScenarioChatMessage(request: ChatSendRequest): BackendChatMessage {
  const answer = createScenarioChatAnswer(request.message, request);
  const sessionId = request.sessionId ?? 'chat-de-fe-1-live';
  const ui = createScenarioChatUi(request.message);
  const toolsUsed = createScenarioToolsUsed(request.message);
  return {
    sessionId,
    sessionTitle: 'DE_FE_1 병목 대응 문의',
    messageId: `msg-demo-${Date.now()}`,
    role: 'ASSISTANT',
    content: answer,
    references: {
      caseIds: [request.contextCaseId ?? DEMO_CASE_ID].filter(Boolean) as string[],
      docIds: request.contextReportId ? [request.contextReportId] : ['report-de-fe-1'],
    },
    sources: [{ title: 'DE_FE_1 병목 대응 보고서', sourcePath: DEMO_CASE_ID, category: 'REPORT' }],
    followUps: ['대응안 비교표 기준으로 더 줄여줘', '3D FAB에서 봐야 할 TG를 알려줘', '후속 모니터링 KPI를 알려줘'],
    spokenSummary: 'DE_FE_1 병목은 설비 포화와 WIP 누적이 핵심이며 standard 대응안이 승인되었습니다.',
    ui,
    confidence: 'HIGH',
    warnings: [],
    toolsUsed,
    createdAt: DEMO_DETECTED_AT,
  };
}

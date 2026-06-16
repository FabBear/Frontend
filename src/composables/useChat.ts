import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

import { fetchAgentRunResult } from '@/services/agentTaskService';
import {
  buildLiveFabContext,
  deleteChatSession,
  fetchChatSessionMessages,
  fetchChatSessions,
  fetchSuggestedQuestions,
  sendChatMessage,
  streamChatMessage,
} from '@/services/chatbotService';
import { fetchPresentationNow } from '@/services/clockService';

import type { CasePromptPayload } from '@/composables/useChatDrawer';

import { MOCK_CHAT_QUICK_PROMPTS } from '@/constants/mockData/chatbot';

import type { AgentTaskResponse } from '@/types/agentTask';
import type { ChatMessage, ChatQuickPrompt, ChatReportContextInput, ChatSession } from '@/types/chatbot';
import type { FinalBottleneckReport } from '@/types/report';

const MAX_QUICK_PROMPTS = 4;

export interface ReportContext extends ChatReportContextInput {
  quickPrompts: ChatQuickPrompt[];
}

export interface AgentContext {
  taskId: string;
  title: string;
  sourcePage: string;
  relatedCaseId: string | null;
  relatedTgId: string | null;
  taskType?: string;
  followUpPrompts?: string[];
}

function nowIso() {
  return new Date().toISOString();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 새로고침 후엔 클라이언트가 시드했던 브리핑 카드가 사라진다(백엔드엔 텍스트만 저장).
// USER 메시지에 저장된 taskId(refDocIds)로 에이전트 결과를 다시 불러와 카드를 복원한다.
async function rehydrateAgentResult(
  sessionId: string,
  loadedMessages: ChatMessage[]
): Promise<{ message: ChatMessage; context: AgentContext } | null> {
  let taskId: string | undefined;
  let anchorMessage: ChatMessage | undefined;
  for (const message of loadedMessages) {
    taskId = message.references?.docIds?.find((id) => UUID_RE.test(id));
    if (taskId) {
      anchorMessage =
        message.role === 'ASSISTANT'
          ? message
          : loadedMessages.find(
              (candidate) => candidate.role === 'ASSISTANT' && candidate.references?.docIds?.includes(taskId as string)
            );
      break;
    }
  }
  if (!taskId) return null;
  try {
    // 종류를 모르는 id → union 조회(/v1/agent-runs/{id})로 결과만 복원.
    const result = await fetchAgentRunResult(taskId);
    if (!result) return null;
    const context: AgentContext = {
      taskId,
      title: result.artifacts?.[0]?.title ?? 'AI Agent 결과',
      sourcePage: 'CHAT',
      relatedCaseId: null,
      relatedTgId: null,
      taskType: undefined,
      followUpPrompts: result.followUpPrompts ?? [],
    };
    const message: ChatMessage = {
      messageId: anchorMessage?.messageId ?? `agent-result-${taskId}`,
      sessionId,
      role: 'ASSISTANT',
      content: anchorMessage?.content || result.summary,
      references: anchorMessage?.references ?? { caseIds: [], docIds: [taskId] },
      agentResult: result,
      followUps: result.followUpPrompts ?? [],
      createdAt: anchorMessage?.createdAt ?? nowIso(),
    };
    return { message, context };
  } catch {
    return null;
  }
}

function buildReportQuickPrompts(context: Omit<ReportContext, 'quickPrompts'>): ChatQuickPrompt[] {
  return [
    {
      id: 'rq-approved',
      label: '승인 대응안이 선택된 이유를 설명해줘',
      message: `${context.processName} 리포트에서 승인 대응안이 선택된 이유를 설명해줘.`,
    },
    {
      id: 'rq-no-action',
      label: '무대응 시 가장 위험한 KPI를 알려줘',
      message: `${context.processName} 리포트 기준으로 무대응 시 가장 위험한 KPI를 알려줘.`,
    },
    {
      id: 'rq-cause',
      label: '주요 원인과 근거를 요약해줘',
      message: `${context.processName} 리포트의 주요 원인과 근거를 요약해줘.`,
    },
    {
      id: 'rq-rag',
      label: '유사 사례 기반 근거만 정리해줘',
      message: `${context.processName} 리포트에서 유사 사례 기반 근거만 정리해줘.`,
    },
  ];
}

function limitQuickPrompts(prompts: ChatQuickPrompt[]): ChatQuickPrompt[] {
  return prompts.slice(0, MAX_QUICK_PROMPTS);
}

function buildAgentQuickPrompts(context: AgentContext): ChatQuickPrompt[] {
  // 결과가 제시한 후속 질문(followUpPrompts)이 있으면 그걸 칩으로 — 화면 카드와 일관되고
  // 브리핑/진단 등 맥락에 맞는 추천이 된다. 없을 때만 일반 기본 칩으로 폴백.
  if (context.followUpPrompts?.length) {
    return context.followUpPrompts.slice(0, MAX_QUICK_PROMPTS).map((prompt, index) => ({
      id: `agent-follow-${index}`,
      label: prompt,
      message: prompt,
    }));
  }
  const target = context.relatedTgId ? '선택 TG' : '현재 FAB';
  return [
    {
      id: 'agent-risk',
      label: '위험 근거',
      message: `${context.title} 결과에서 ${target}가 위험하다고 판단한 근거를 KPI 중심으로 설명해줘.`,
    },
    {
      id: 'agent-next',
      label: '다음 확인',
      message: `${context.title} 이후 현장 엔지니어가 바로 확인해야 할 항목을 우선순위로 정리해줘.`,
    },
    {
      id: 'agent-spread',
      label: '확산 경로',
      message: `${context.title} 기준 병목이 어느 공정/TG로 확산될 가능성이 큰지 설명해줘.`,
    },
    {
      id: 'agent-action',
      label: '대응 방향',
      message: `${context.title}에 대해 생산 스케줄 확정 없이 투입량/우선순위/설비 확인 관점의 대응 방향을 제안해줘.`,
    },
  ];
}

const sessions = ref<ChatSession[]>([]);
const activeSessionId = ref<string | null>(null);
const isResponding = ref(false);
const reportContext = ref<ReportContext | null>(null);
const agentContext = ref<AgentContext | null>(null);
const quickPromptState = ref<ChatQuickPrompt[]>(MOCK_CHAT_QUICK_PROMPTS);
const isInitialized = ref(false);

const activeSession = computed(() => sessions.value.find((s) => s.sessionId === activeSessionId.value) ?? null);
const messages = computed(() => activeSession.value?.messages ?? []);
const hasConversationHistory = computed(() => Boolean(activeSession.value?.messages.length));
const quickPromptTitle = computed(() => {
  if (reportContext.value) return '이 리포트에서 이어서 질문';
  return hasConversationHistory.value || agentContext.value ? '추천 후속 질문' : '시작 질문';
});
const quickPrompts = computed<ChatQuickPrompt[]>(() => {
  if (activeSession.value?.messages.length) return [];
  if (reportContext.value?.quickPrompts) return limitQuickPrompts(reportContext.value.quickPrompts);
  if (agentContext.value) return limitQuickPrompts(buildAgentQuickPrompts(agentContext.value));
  // 대화 시작 전에는 시작 질문 노출.
  return limitQuickPrompts(quickPromptState.value);
});

function isClientSessionId(sessionId: string) {
  return sessionId.startsWith('local-') || sessionId.startsWith('agent-');
}

function sessionHasCase(session: ChatSession, caseId: string | null | undefined) {
  if (!caseId) return false;
  return (
    session.agentContext?.relatedCaseId === caseId ||
    session.messages.some((message) => message.references?.caseIds?.includes(caseId))
  );
}

function sessionHasTg(session: ChatSession, context: AgentContext) {
  if (!context.relatedTgId) return false;
  return (
    session.agentContext?.relatedTgId === context.relatedTgId && session.agentContext?.sourcePage === context.sourcePage
  );
}

function shouldUseAgentContextForMessage(message: string, context: ChatSession['agentContext']) {
  if (!context) return false;
  const compact = message.toLowerCase().replace(/[\s_#-]+/g, '');
  if (!compact) return false;

  const liveDataTerms = [
    '현재',
    '지금',
    '전체',
    '구역',
    '공정',
    'wip',
    '윕',
    '대기',
    '가동률',
    '추이',
    '트렌드',
    '장비',
    '설비',
    '툴',
    'tg',
    'tool',
    'qtime',
    'q-time',
    'oee',
    'lot',
    '랏',
    '이력',
  ];
  const strongScopedTerms = [
    '이결과',
    '그결과',
    '위결과',
    '방금결과',
    '아까결과',
    '결과에서',
    '결과기준',
    '화면분석',
    '해당리포트',
    '이리포트',
    '그리포트',
    '리포트',
    '브리핑',
    '진단',
    '이케이스',
    '그케이스',
    '해당케이스',
    '이대응안',
    '그대응안',
    '승인된대응안',
    '이tg',
    '그tg',
    '해당tg',
  ];
  const weakScopedTerms = ['요약', '정리', '근거', '원인', '왜', '확산', '대응', '승인', '반려'];

  const hasLiveDataTerm = liveDataTerms.some((term) => compact.includes(term));
  const hasStrongScopedTerm = strongScopedTerms.some((term) => compact.includes(term));
  const hasWeakScopedTerm = weakScopedTerms.some((term) => compact.includes(term));

  if (hasLiveDataTerm && !hasStrongScopedTerm) return false;
  return hasStrongScopedTerm || hasWeakScopedTerm;
}

function mergeMessages(base: ChatMessage[], incoming: ChatMessage[]) {
  const byId = new Map<string, ChatMessage>();
  [...base, ...incoming].forEach((message) => {
    byId.set(message.messageId, { ...byId.get(message.messageId), ...message });
  });
  return [...byId.values()].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function normalizeVoiceActionText(text: string) {
  return text.toLowerCase().replace(/[\s_#.,?!，。！？-]+/g, '');
}

function is3dLocationRequest(text: string) {
  const compact = normalizeVoiceActionText(text);
  const hasMapTerm = compact.includes('3d맵') || compact.includes('3dmap') || compact.includes('쓰리디맵');
  const hasLocationTerm =
    compact.includes('위치') || compact.includes('찍어') || compact.includes('보여줘') || compact.includes('열어');
  return hasMapTerm && hasLocationTerm;
}

function pickTgFromText(value: unknown) {
  const text = String(value ?? '');
  const slashMatch = text.match(/\/([A-Za-z][A-Za-z0-9_]*_[A-Za-z0-9_]+)/);
  if (slashMatch?.[1]) return slashMatch[1];
  const tgMatch = text.match(/\b([A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]*_\d+)\b/);
  return tgMatch?.[1] ?? null;
}

export function useChat() {
  const router = useRouter();

  async function loadInitialChatData() {
    if (isResponding.value) return;
    try {
      const [loadedSessions, loadedPrompts] = await Promise.all([
        fetchChatSessions(),
        isInitialized.value
          ? Promise.resolve(quickPromptState.value)
          : fetchSuggestedQuestions().catch(() => MOCK_CHAT_QUICK_PROMPTS),
      ]);
      isInitialized.value = true;
      quickPromptState.value = loadedPrompts.length ? loadedPrompts : MOCK_CHAT_QUICK_PROMPTS;

      const previousActiveId = activeSessionId.value;
      const previousById = new Map(sessions.value.map((session) => [session.sessionId, session]));
      sessions.value = loadedSessions.map((session) => {
        const previous = previousById.get(session.sessionId);
        return {
          ...session,
          messages: previous?.messages ?? [],
          agentContext: previous?.agentContext ?? null,
          reportContext: previous?.reportContext ?? null,
        };
      });

      const canKeepActive = Boolean(
        previousActiveId &&
        !isClientSessionId(previousActiveId) &&
        sessions.value.some((s) => s.sessionId === previousActiveId)
      );
      activeSessionId.value = canKeepActive ? previousActiveId : (loadedSessions[0]?.sessionId ?? null);
      if (activeSessionId.value) {
        await loadMessages(activeSessionId.value);
      }
    } catch {
      sessions.value = [];
      activeSessionId.value = null;
      quickPromptState.value = MOCK_CHAT_QUICK_PROMPTS;
    }
  }

  async function loadMessages(sessionId: string) {
    // 아직 백엔드에 없는 클라이언트 임시 세션(UUID 아님)은 조회하지 않는다(불필요한 500 방지).
    if (sessionId.startsWith('local-') || sessionId.startsWith('agent-')) return;
    try {
      const loadedMessages = await fetchChatSessionMessages(sessionId);

      // rehydrateAgentResult를 불필요하게 호출하지 않도록 첫 번째 await 직후에 확인.
      const preAwaitSession = sessions.value.find((s) => s.sessionId === sessionId);
      const hasLocalAgentResult =
        preAwaitSession?.messages.some((m) => m.messageId.startsWith('agent-result-')) ?? false;
      const hasLoadedAgentResult = loadedMessages.some((m) => m.messageId.startsWith('agent-result-'));

      // 시드가 없으면(새로고침 등) 저장된 taskId로 브리핑 카드를 복원.
      let restored: { message: ChatMessage; context: AgentContext } | null = null;
      if (!hasLocalAgentResult && !hasLoadedAgentResult) {
        restored = await rehydrateAgentResult(sessionId, loadedMessages);
      }

      // seeds는 .map() 콜백 안에서 최신 session.messages를 참조해 계산한다.
      // 두 번의 await 사이에 유저 메시지가 추가되어도 유실되지 않는다.
      sessions.value = sessions.value.map((session) => {
        if (session.sessionId !== sessionId) return session;
        const seeds = session.messages.filter(
          (message) =>
            message.messageId.startsWith('agent-result-') &&
            !loadedMessages.some((loaded) => loaded.messageId === message.messageId)
        );
        if (restored) seeds.push(restored.message);
        return {
          ...session,
          agentContext: restored?.context ?? session.agentContext ?? null,
          messages: mergeMessages(loadedMessages, seeds),
        };
      });

      if (restored && activeSessionId.value === sessionId) {
        agentContext.value = restored.context;
      }
    } catch {
      // Keep the current local messages if history fetch fails.
    }
  }

  async function selectSession(sessionId: string) {
    activeSessionId.value = sessionId;
    sessions.value = sessions.value.map((session) => ({ ...session, isActive: session.sessionId === sessionId }));
    const session = activeSession.value;
    reportContext.value = session?.reportContext
      ? {
          ...session.reportContext,
          quickPrompts: buildReportQuickPrompts(session.reportContext),
        }
      : null;
    agentContext.value = session?.agentContext ?? null;
    await loadMessages(sessionId);
  }

  function createSession() {
    const createdAt = nowIso();
    const session: ChatSession = {
      sessionId: `local-${Date.now()}`,
      sessionTitle: '새 AI 대화',
      isActive: true,
      createdAt,
      lastMessageAt: createdAt,
      messages: [],
      agentContext: null,
      reportContext: null,
    };
    sessions.value = [session, ...sessions.value.map((item) => ({ ...item, isActive: false }))];
    activeSessionId.value = session.sessionId;
    reportContext.value = null;
    agentContext.value = null;
  }

  async function deleteSession(sessionId: string) {
    const wasActive = activeSessionId.value === sessionId;
    const remaining = sessions.value.filter((s) => s.sessionId !== sessionId);
    sessions.value = remaining;
    if (wasActive) {
      const next = remaining[0] ?? null;
      activeSessionId.value = next?.sessionId ?? null;
      reportContext.value = null;
      agentContext.value = null;
      if (next) await selectSession(next.sessionId);
    }
    // 백엔드에 존재하는 세션(UUID)만 삭제 요청. 로컬 임시 세션은 클라이언트에서만 제거.
    if (!isClientSessionId(sessionId)) {
      try {
        await deleteChatSession(sessionId);
      } catch {
        // 서버 삭제 실패해도 화면에서는 제거된 상태 유지(다음 새로고침 시 복원될 수 있음).
      }
    }
  }

  function initWithReportContext(context: ChatReportContextInput) {
    ensureLocalSession(`${context.processName} 리포트 분석`);
    const nextContext: ReportContext = {
      ...context,
      quickPrompts: buildReportQuickPrompts(context),
    };
    reportContext.value = nextContext;
    sessions.value = sessions.value.map((session) =>
      session.sessionId === activeSessionId.value
        ? {
            ...session,
            reportContext: {
              caseId: nextContext.caseId ?? null,
              reportId: nextContext.reportId ?? null,
              processName: nextContext.processName,
              severity: nextContext.severity,
              riskScore: nextContext.riskScore,
              detectedAt: nextContext.detectedAt,
            },
            agentContext: null,
          }
        : session
    );
    agentContext.value = null;
  }

  function initWithReport(report: FinalBottleneckReport) {
    initWithReportContext({
      processName: report.meta.process_name,
      severity: report.meta.severity,
      riskScore: report.bottleneck_info.risk_score,
      detectedAt: report.meta.detected_at,
    });
  }

  async function initWithAgentTask(task: AgentTaskResponse) {
    const title = task.result?.artifacts?.[0]?.title ?? 'AI Agent 결과';
    const context: AgentContext = {
      taskId: task.taskId,
      title,
      sourcePage: task.sourcePage,
      relatedCaseId: task.relatedCaseId,
      relatedTgId: task.relatedTgId,
      taskType: task.taskType,
      followUpPrompts: task.result?.followUpPrompts ?? [],
    };
    selectOrCreateAgentTaskSession(task, context);
    agentContext.value = context;
    reportContext.value = null;
    if (!task.result) return;

    const hasSeedMessage = activeSession.value?.messages.some(
      (message) =>
        message.messageId === `agent-result-${task.taskId}` ||
        message.references?.docIds?.includes(task.taskId) ||
        message.agentResult === task.result
    );
    if (hasSeedMessage) return;
    await persistAgentTaskSession(task, context);
  }

  async function persistAgentTaskSession(task: AgentTaskResponse, context: AgentContext) {
    const localSessionId = activeSessionId.value!;
    const prompt = `${context.title}에 대해 질문을 시작합니다.`;
    appendMessage({
      sessionId: localSessionId,
      role: 'USER',
      content: prompt,
      references: {
        caseIds: context.relatedCaseId ? [context.relatedCaseId] : [],
        docIds: [task.taskId],
      },
    });

    try {
      const response = await sendChatMessage({
        sessionId: isClientSessionId(localSessionId) ? null : localSessionId,
        message: prompt,
        contextTaskId: task.taskId,
        contextCaseId: context.relatedCaseId,
        contextTgId: context.relatedTgId,
        sourcePage: context.sourcePage,
        precomputed: {
          answer: task.result?.summary ?? '',
          spokenSummary: null,
          sources: [],
          followUps: task.result?.followUpPrompts ?? [],
          ui: null,
          title: context.title,
          warnings: [],
          toolsUsed: [],
        },
      });
      replaceLocalSessionId(localSessionId, response.sessionId);
      restoreContextAfterSessionIdReplace(response.sessionId, context);
      sessions.value = sessions.value.map((session) =>
        session.sessionId === response.sessionId
          ? { ...session, sessionTitle: response.sessionTitle || context.title }
          : session
      );
      appendMessage({
        sessionId: response.sessionId,
        messageId: response.messageId,
        role: 'ASSISTANT',
        content: response.content,
        references: response.references,
        sources: response.sources,
        spokenSummary: response.spokenSummary,
        ui: response.ui,
        confidence: response.confidence ?? null,
        warnings: response.warnings ?? [],
        toolsUsed: response.toolsUsed ?? [],
        agentResult: task.result,
        followUps: response.followUps ?? task.result?.followUpPrompts ?? [],
      });
    } catch {
      appendMessage({
        sessionId: localSessionId,
        messageId: `agent-result-${task.taskId}`,
        role: 'ASSISTANT',
        content: task.result?.summary ?? 'AI Agent 결과를 불러왔습니다.',
        references: {
          caseIds: context.relatedCaseId ? [context.relatedCaseId] : [],
          docIds: [task.taskId],
        },
        agentResult: task.result,
        followUps: task.result?.followUpPrompts ?? [],
      });
    }
  }

  async function initWithCasePrompt(payload: CasePromptPayload) {
    const sessionId = `local-case-${payload.caseId ?? Date.now()}`;
    const context: AgentContext = {
      taskId: sessionId,
      title: payload.title,
      sourcePage: payload.sourcePage,
      relatedCaseId: payload.caseId,
      relatedTgId: null,
      followUpPrompts: [],
    };
    const existing = sessions.value.find((session) => sessionHasCase(session, payload.caseId));
    if (existing) {
      activeSessionId.value = existing.sessionId;
      sessions.value = sessions.value.map((session) =>
        session.sessionId === existing.sessionId
          ? { ...session, isActive: true, agentContext: context, reportContext: null }
          : { ...session, isActive: false }
      );
    } else {
      const createdAt = nowIso();
      const session: ChatSession = {
        sessionId,
        sessionTitle: context.title,
        isActive: true,
        createdAt,
        lastMessageAt: createdAt,
        messages: [],
        agentContext: context,
        reportContext: null,
      };
      sessions.value = [session, ...sessions.value.map((item) => ({ ...item, isActive: false }))];
      activeSessionId.value = session.sessionId;
    }
    agentContext.value = context;
    reportContext.value = null;
    await sendMessage(payload.prompt);
  }

  function clearReportContext() {
    reportContext.value = null;
    sessions.value = sessions.value.map((session) =>
      session.sessionId === activeSessionId.value ? { ...session, reportContext: null } : session
    );
  }

  function clearAgentContext() {
    agentContext.value = null;
    sessions.value = sessions.value.map((session) =>
      session.sessionId === activeSessionId.value ? { ...session, agentContext: null } : session
    );
  }

  async function sendMessage(content: string) {
    const trimmedContent = content.trim();
    if (!trimmedContent || isResponding.value) return;
    ensureLocalSession(trimmedContent.slice(0, 28) || '새 AI 대화');
    const sessionId = activeSessionId.value!;

    if (is3dLocationRequest(trimmedContent)) {
      appendMessage({
        sessionId,
        role: 'USER',
        content: trimmedContent,
      });
      const tg = findLatestTgFor3d();
      if (tg) {
        await router.push({ path: '/monitoring/fab-3d', query: { tg } });
        appendMessage({
          sessionId,
          role: 'ASSISTANT',
          content: `${tg} 위치를 3D FAB 뷰에서 열었습니다.`,
        });
      } else {
        appendMessage({
          sessionId,
          role: 'ASSISTANT',
          content: '최근 대화에서 3D 맵에 표시할 TG를 찾지 못했습니다. 먼저 툴그룹을 조회한 뒤 다시 요청해 주세요.',
        });
      }
      return;
    }

    appendMessage({
      sessionId,
      role: 'USER',
      content: trimmedContent,
    });

    isResponding.value = true;
    try {
      // 'local-'·'agent-' 프리픽스는 클라이언트 임시 세션 id → 백엔드(UUID 기대)에 보내지 않는다.
      // 첫 전송 시 null로 보내면 백엔드가 UUID 세션을 만들어 반환하고, 이후 그 UUID로 이어간다.
      const clientSession = isClientSessionId(sessionId);
      const backendSessionId = clientSession ? null : sessionId;
      const userMessage = trimmedContent;
      const scopedAgentContext = shouldUseAgentContextForMessage(userMessage, agentContext.value)
        ? agentContext.value
        : null;
      const currentReportContext = reportContext.value;
      const hasDbReportContext = Boolean(currentReportContext?.reportId || currentReportContext?.caseId);

      // 1순위: AI 직접 SSE 스트리밍(체감속도) → 완료 후 Spring에 저장만 요청(LLM 1회 호출).
      const shouldStream = !hasDbReportContext && !requiresSpringGrounding(scopedAgentContext);
      const streamed = shouldStream
        ? await tryStreamingSend(sessionId, backendSessionId, userMessage, clientSession, scopedAgentContext)
        : false;
      if (streamed) return;

      // 폴백: 기존 비스트리밍 경로(Spring이 AI 호출).
      const response = await sendChatMessage({
        sessionId: backendSessionId,
        message: userMessage,
        contextReportId: currentReportContext?.reportId ?? null,
        contextTaskId: scopedAgentContext?.taskId ?? null,
        contextCaseId: currentReportContext?.caseId ?? scopedAgentContext?.relatedCaseId ?? null,
        contextTgId: scopedAgentContext?.relatedTgId ?? null,
        sourcePage: scopedAgentContext?.sourcePage ?? null,
      });
      replaceLocalSessionId(sessionId, response.sessionId);
      restoreContextAfterSessionIdReplace(response.sessionId, scopedAgentContext);
      // AI가 지어준 세션 제목이 있으면 목록에 즉시 반영(첫 메시지 한정).
      if (response.sessionTitle) {
        sessions.value = sessions.value.map((s) =>
          s.sessionId === response.sessionId ? { ...s, sessionTitle: response.sessionTitle as string } : s
        );
      }
      appendMessage({
        sessionId: response.sessionId,
        messageId: response.messageId,
        role: 'ASSISTANT',
        content: response.content,
        sources: response.sources,
        spokenSummary: response.spokenSummary,
        ui: response.ui,
        confidence: response.confidence ?? null,
        warnings: response.warnings ?? [],
        toolsUsed: response.toolsUsed ?? [],
        followUps: response.followUps ?? [],
      });
    } catch {
      appendMessage({
        sessionId,
        role: 'ASSISTANT',
        content: 'AI Agent 응답을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
      });
    } finally {
      isResponding.value = false;
    }
  }

  /** SSE 스트리밍 전송. 성공 시 true, 실패 시 false(호출측이 비스트리밍 폴백). */
  async function tryStreamingSend(
    localSessionId: string,
    backendSessionId: string | null,
    userMessage: string,
    isNewSession: boolean,
    currentAgentContext: ChatSession['agentContext']
  ): Promise<boolean> {
    const session = sessions.value.find((s) => s.sessionId === localSessionId);
    // 방금 추가한 USER 메시지는 제외하고 직전 12턴만 history로.
    const history = (session?.messages ?? [])
      .slice(0, -1)
      .slice(-12)
      .filter((m) => m.content)
      .map((m) => ({ role: m.role, content: m.content }));

    const streamingId = `stream-${Date.now()}`;
    appendMessage({ sessionId: localSessionId, role: 'ASSISTANT', content: '', messageId: streamingId, pending: true });
    let acc = '';
    try {
      const [liveStatus, fabId, now] = await Promise.all([
        buildLiveFabContext(),
        Promise.resolve(useAuthStore().user?.fabId ?? null),
        fetchPresentationNow().catch(() => null),
      ]);
      const meta = await streamChatMessage(
        {
          message: userMessage,
          history,
          context: currentAgentContext ? agentGroundingText(currentAgentContext) : null,
          liveStatus,
          fabId,
          now,
          generateTitle: isNewSession,
        },
        {
          onStage: (label) => patchMessage(localSessionId, streamingId, { content: acc || `_${label}..._` }),
          onToken: (text) => {
            acc += text;
            patchMessage(localSessionId, streamingId, { content: acc });
          },
          onMeta: () => {},
        }
      );
      // Spring에 저장만 요청(AI 재호출 X). 세션 UUID/제목도 여기서 확정.
      const saved = await sendChatMessage({
        sessionId: backendSessionId,
        message: userMessage,
        contextTaskId: currentAgentContext?.taskId ?? null,
        contextCaseId: currentAgentContext?.relatedCaseId ?? null,
        contextTgId: currentAgentContext?.relatedTgId ?? null,
        sourcePage: currentAgentContext?.sourcePage ?? null,
        precomputed: {
          answer: meta.answer || acc,
          spokenSummary: meta.spokenSummary ?? null,
          sources: meta.sources,
          followUps: meta.followUps,
          ui: meta.ui ?? null,
          title: meta.title ?? null,
          confidence: meta.confidence ?? null,
          warnings: meta.warnings ?? [],
          toolsUsed: meta.toolsUsed ?? [],
        },
      });
      replaceLocalSessionId(localSessionId, saved.sessionId);
      restoreContextAfterSessionIdReplace(saved.sessionId, currentAgentContext ?? null);
      if (saved.sessionTitle) {
        sessions.value = sessions.value.map((s) =>
          s.sessionId === saved.sessionId ? { ...s, sessionTitle: saved.sessionTitle as string } : s
        );
      }
      patchMessage(saved.sessionId, streamingId, {
        messageId: saved.messageId,
        content: meta.answer || acc,
        sources: meta.sources,
        spokenSummary: meta.spokenSummary,
        ui: meta.ui ?? null,
        confidence: meta.confidence ?? null,
        warnings: meta.warnings,
        toolsUsed: meta.toolsUsed,
        followUps: meta.followUps ?? [],
        pending: false,
      });
      return true;
    } catch {
      removeMessage(localSessionId, streamingId);
      return false; // 폴백 경로로
    }
  }

  function agentGroundingText(ctx: NonNullable<ChatSession['agentContext']>): string | null {
    return ctx.title
      ? `[화면 분석 결과에 이어진 대화] ${ctx.title}\n사용자 질문이 이 결과/리포트/진단을 명시적으로 가리킬 때만 이 컨텍스트를 우선 사용한다. 현재 WIP·대기·가동률·추세·툴 현황처럼 새 실시간 데이터를 묻는 질문은 도구로 다시 조회한다.`
      : null;
  }

  function requiresSpringGrounding(ctx: ChatSession['agentContext']) {
    return Boolean(ctx && ctx.sourcePage === 'REPORT_ARCHIVE' && ctx.taskType === 'REPORT_PERIOD_SUMMARY');
  }

  function findLatestTgFor3d() {
    const currentMessages = [...(activeSession.value?.messages ?? [])].reverse();
    for (const message of currentMessages) {
      const uiProps = message.ui?.props as Record<string, unknown> | undefined;
      const rows = (uiProps?.rows as Array<Record<string, unknown>> | undefined) ?? [];
      for (const row of rows) {
        const tg = pickTgFromText(row.label ?? row.where);
        if (tg) return tg;
      }
      const tgFromTitle = pickTgFromText(uiProps?.title);
      if (tgFromTitle) return tgFromTitle;
      const tgFromContent = pickTgFromText(message.content);
      if (tgFromContent) return tgFromContent;
    }
    return null;
  }

  function patchMessage(sessionId: string, messageId: string, patch: Partial<ChatMessage>) {
    sessions.value = sessions.value.map((s) =>
      s.sessionId !== sessionId
        ? s
        : { ...s, messages: s.messages.map((m) => (m.messageId === messageId ? { ...m, ...patch } : m)) }
    );
  }

  function removeMessage(sessionId: string, messageId: string) {
    sessions.value = sessions.value.map((s) =>
      s.sessionId !== sessionId ? s : { ...s, messages: s.messages.filter((m) => m.messageId !== messageId) }
    );
  }

  function appendMessage(
    input: Pick<ChatMessage, 'sessionId' | 'role' | 'content'> & {
      messageId?: string;
      references?: ChatMessage['references'];
      agentResult?: ChatMessage['agentResult'];
      sources?: ChatMessage['sources'];
      spokenSummary?: string | null;
      ui?: ChatMessage['ui'];
      confidence?: ChatMessage['confidence'];
      warnings?: ChatMessage['warnings'];
      toolsUsed?: ChatMessage['toolsUsed'];
      followUps?: ChatMessage['followUps'];
      pending?: boolean;
    }
  ) {
    const createdAt = nowIso();
    sessions.value = sessions.value.map((session) => {
      if (session.sessionId !== input.sessionId) return session;
      return {
        ...session,
        sessionTitle:
          session.messages.length === 0 && input.role === 'USER' ? input.content.slice(0, 28) : session.sessionTitle,
        lastMessageAt: createdAt,
        messages: [
          ...session.messages,
          {
            messageId: input.messageId ?? `msg-${Date.now()}-${session.messages.length}`,
            sessionId: input.sessionId,
            role: input.role,
            content: input.content,
            references: input.references ?? { caseIds: [], docIds: [] },
            sources: input.sources,
            spokenSummary: input.spokenSummary,
            ui: input.ui,
            confidence: input.confidence,
            warnings: input.warnings,
            toolsUsed: input.toolsUsed,
            followUps: input.followUps,
            pending: input.pending,
            agentResult: input.agentResult,
            createdAt,
          },
        ],
      };
    });
  }

  function ensureLocalSession(title: string) {
    if (activeSessionId.value && activeSession.value) return;
    const createdAt = nowIso();
    const session: ChatSession = {
      sessionId: `local-${Date.now()}`,
      sessionTitle: title || '새 AI 대화',
      isActive: true,
      createdAt,
      lastMessageAt: createdAt,
      messages: [],
      agentContext: null,
      reportContext: null,
    };
    sessions.value = [session, ...sessions.value.map((s) => ({ ...s, isActive: false }))];
    activeSessionId.value = session.sessionId;
  }

  function replaceLocalSessionId(oldId: string, newId: string) {
    if (oldId === newId) return;
    const source = sessions.value.find((session) => session.sessionId === oldId);
    const target = sessions.value.find((session) => session.sessionId === newId);
    if (source && target) {
      sessions.value = sessions.value
        .filter((session) => session.sessionId !== oldId)
        .map((session) =>
          session.sessionId === newId
            ? {
                ...session,
                messages: mergeMessages(session.messages, source.messages),
                agentContext: source.agentContext ?? session.agentContext,
                reportContext: source.reportContext ?? session.reportContext,
                lastMessageAt:
                  source.lastMessageAt > session.lastMessageAt ? source.lastMessageAt : session.lastMessageAt,
              }
            : session
        );
      if (activeSessionId.value === oldId) activeSessionId.value = newId;
      return;
    }
    sessions.value = sessions.value.map((session) => {
      if (session.sessionId !== oldId) return session;
      return {
        ...session,
        sessionId: newId,
        messages: session.messages.map((message) => ({ ...message, sessionId: newId })),
      };
    });
    if (activeSessionId.value === oldId) activeSessionId.value = newId;
  }

  function selectOrCreateAgentTaskSession(task: AgentTaskResponse, context: AgentContext) {
    const existing =
      sessions.value.find((session) => sessionHasCase(session, context.relatedCaseId)) ??
      sessions.value.find((session) => sessionHasTg(session, context)) ??
      sessions.value.find((session) => session.agentContext?.taskId === task.taskId);
    if (existing) {
      activeSessionId.value = existing.sessionId;
      sessions.value = sessions.value.map((session) =>
        session.sessionId === existing.sessionId
          ? { ...session, isActive: true, agentContext: context, reportContext: null }
          : { ...session, isActive: false }
      );
      return;
    }

    const createdAt = nowIso();
    const session: ChatSession = {
      sessionId: `agent-${task.taskId}`,
      sessionTitle: context.title,
      isActive: true,
      createdAt,
      lastMessageAt: createdAt,
      messages: [],
      agentContext: context,
      reportContext: null,
    };
    sessions.value = [session, ...sessions.value.map((item) => ({ ...item, isActive: false }))];
    activeSessionId.value = session.sessionId;
  }

  function restoreContextAfterSessionIdReplace(sessionId: string, context: AgentContext | null) {
    if (!context) return;
    sessions.value = sessions.value.map((session) =>
      session.sessionId === sessionId ? { ...session, agentContext: context } : session
    );
    agentContext.value = context;
  }

  return {
    sessions,
    activeSessionId,
    activeSession,
    messages,
    quickPrompts,
    quickPromptTitle,
    isResponding,
    reportContext,
    agentContext,
    loadInitialChatData,
    selectSession,
    createSession,
    deleteSession,
    sendMessage,
    initWithReport,
    initWithReportContext,
    initWithAgentTask,
    initWithCasePrompt,
    clearReportContext,
    clearAgentContext,
  };
}

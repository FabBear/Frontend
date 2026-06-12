import type { ChatQuickPrompt, ChatSession } from '@/types/chatbot';

export const MOCK_CHAT_SESSIONS: ChatSession[] = [
  {
    sessionId: 'chat-de-fe-72',
    sessionTitle: 'DE_FE_72 병목 분석 문의',
    isActive: true,
    createdAt: '2026-06-07T01:28:00Z',
    lastMessageAt: '2026-06-07T01:30:00Z',
    messages: [
      {
        messageId: 'msg-de-fe-72-user',
        sessionId: 'chat-de-fe-72',
        role: 'USER',
        content: 'DE_FE_72가 왜 병목으로 감지됐어?',
        references: { caseIds: ['case-de-fe-72-20260607-0115'], docIds: [] },
        createdAt: '2026-06-07T01:28:00Z',
      },
      {
        messageId: 'msg-de-fe-72-assistant',
        sessionId: 'chat-de-fe-72',
        role: 'ASSISTANT',
        content: '가동률 89.7%, 대기 Lot 261개, WIP 상승 추세가 동시에 커져 병목 기여도가 높게 잡혔습니다.',
        references: { caseIds: ['case-de-fe-72-20260607-0115'], docIds: ['cause-analysis'] },
        createdAt: '2026-06-07T01:30:00Z',
      },
    ],
  },
  {
    sessionId: 'chat-hitl-review',
    sessionTitle: 'HITL 승인 전 체크',
    isActive: false,
    createdAt: '2026-06-06T23:12:00Z',
    lastMessageAt: '2026-06-06T23:18:00Z',
    messages: [
      {
        messageId: 'msg-hitl-user',
        sessionId: 'chat-hitl-review',
        role: 'USER',
        content: 'REQUEUE_TOOL 승인 전에 확인할 리스크를 정리해줘.',
        references: { caseIds: ['case-de-be-67-20260606-2350'], docIds: [] },
        createdAt: '2026-06-06T23:12:00Z',
      },
    ],
  },
  {
    sessionId: 'chat-report-summary',
    sessionTitle: '리포트 요약 문장',
    isActive: false,
    createdAt: '2026-06-05T09:10:00Z',
    lastMessageAt: '2026-06-05T09:14:00Z',
    messages: [],
  },
];

export const MOCK_CHAT_QUICK_PROMPTS: ChatQuickPrompt[] = [
  { id: 'why', label: '원인 요약', message: '현재 화면의 병목 원인을 3줄로 요약해줘.' },
  { id: 'action', label: '대응 추천', message: '승인 가능한 대응안과 주의할 리스크를 비교해줘.' },
  { id: 'report', label: '보고 문장', message: '운영 회의에 공유할 리포트 문장으로 정리해줘.' },
];

export const MOCK_CHAT_RESPONSES = [
  '현재 화면 기준으로는 WIP 누적, 높은 가동률, 대기 Lot 증가가 핵심 신호입니다. 먼저 추천 대응안의 recipe 제약과 대체 Tool 가용 여부를 확인하는 것이 좋습니다.',
  '승인 전에는 처리량 개선폭뿐 아니라 Q-time 위반 가능성과 setup 전환 부담을 같이 봐야 합니다. 현 상태에서는 범위를 좁힌 REQUEUE_TOOL이 가장 안정적인 후보입니다.',
  '요약하면 병목 TG의 queue가 빠르게 증가하고 있고, 후속 공정 확산 가능성이 있어 단기 dispatch 조정과 승인 이력 기록이 필요합니다.',
];

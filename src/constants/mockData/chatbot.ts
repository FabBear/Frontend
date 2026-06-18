import { DEMO_CASE_ID, DEMO_DETECTED_AT } from '@/constants/mockData/demoAlert';

import type { ChatQuickPrompt, ChatSession } from '@/types/chatbot';

export const MOCK_CHAT_SESSIONS: ChatSession[] = [
  {
    sessionId: 'chat-de-fe-1-report',
    sessionTitle: 'DE_FE_1 리포트 후속 질의',
    isActive: true,
    createdAt: '2026-06-14T14:12:46Z',
    lastMessageAt: '2026-06-14T14:14:12Z',
    reportContext: {
      caseId: DEMO_CASE_ID,
      reportId: `report-${DEMO_CASE_ID}`,
      processName: 'DE_FE_1',
      severity: 'Critical',
      riskScore: 80.3,
      detectedAt: DEMO_DETECTED_AT,
    },
    messages: [
      {
        messageId: 'msg-de-fe-1-report-user',
        sessionId: 'chat-de-fe-1-report',
        role: 'USER',
        content: '이 리포트에서 standard 대응안을 선택한 이유를 설명해줘.',
        references: { caseIds: [DEMO_CASE_ID], docIds: [`report-${DEMO_CASE_ID}`] },
        createdAt: '2026-06-14T14:13:20Z',
      },
      {
        messageId: 'msg-de-fe-1-report-assistant',
        sessionId: 'chat-de-fe-1-report',
        role: 'ASSISTANT',
        content:
          'standard 안은 DE_FE_1과 Diffusion_FE_125를 동시에 안정화하는 균형안입니다. Release Interval 22% 조정과 Product_3/Product_4 우선순위 상향으로 DE_FE_1 WIP는 10에서 8 Lot, Q-time은 62.96분에서 58.0분 수준으로 낮아지고, aggressive 안에서 보이는 Diffusion_FE_125 가용성 저하 위험을 피합니다.',
        references: { caseIds: [DEMO_CASE_ID], docIds: [`report-${DEMO_CASE_ID}`] },
        sources: [{ title: 'DE_FE_1 병목 대응 보고서', sourcePath: DEMO_CASE_ID, category: 'REPORT' }],
        toolsUsed: ['get_case_detail', 'get_top_toolgroups'],
        confidence: 'HIGH',
        followUps: ['무대응 시 가장 위험한 KPI만 보여줘', '3D FAB에서 확인할 TG를 알려줘'],
        ui: {
          type: 'lot',
          props: {
            title: '승인안 적용 후 핵심 TG 전망',
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
        },
        createdAt: '2026-06-14T14:14:12Z',
      },
    ],
  },
  {
    sessionId: 'chat-de-fe-1-cause',
    sessionTitle: 'DE_FE_1 원인 분석',
    isActive: false,
    createdAt: '2026-06-14T14:09:00Z',
    lastMessageAt: '2026-06-14T14:11:30Z',
    messages: [
      {
        messageId: 'msg-de-fe-1-cause-user',
        sessionId: 'chat-de-fe-1-cause',
        role: 'USER',
        content: 'DE_FE_1 병목 원인을 KPI 기준으로 요약해줘.',
        references: { caseIds: [DEMO_CASE_ID], docIds: [] },
        createdAt: '2026-06-14T14:09:00Z',
      },
      {
        messageId: 'msg-de-fe-1-cause-assistant',
        sessionId: 'chat-de-fe-1-cause',
        role: 'ASSISTANT',
        content:
          '주원인은 설비_포화입니다. max_util과 utilization_avg가 병목 방향으로 강하게 기여했고, WIP 누적이 보조 원인으로 붙었습니다. 업스트림에서는 DE_FE_86 유입 부담이 관찰되어 DE_FE_1 처리 여유를 계속 압박합니다.',
        references: { caseIds: [DEMO_CASE_ID], docIds: ['cause-analysis-de-fe-1'] },
        toolsUsed: ['get_case_detail', 'get_kpi_trend', 'compare_periods'],
        confidence: 'HIGH',
        ui: {
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
        },
        createdAt: '2026-06-14T14:11:30Z',
      },
    ],
  },
];

export const MOCK_CHAT_QUICK_PROMPTS: ChatQuickPrompt[] = [
  { id: 'de-fe-1-cause', label: '원인 요약', message: 'DE_FE_1 병목 원인을 SHAP와 추세 기준으로 요약해줘.' },
  {
    id: 'de-fe-1-action',
    label: '승인안 근거',
    message: 'DE_FE_1 리포트에서 standard 대응안이 선택된 이유를 설명해줘.',
  },
  {
    id: 'de-fe-1-impact',
    label: '확산 영향',
    message: 'DE_FE_1이 Diffusion_FE_125에 주는 확산 영향을 보여줘.',
  },
  {
    id: 'de-fe-1-monitor',
    label: '후속 체크',
    message: 'standard 적용 후 30분 동안 어떤 KPI를 봐야 해?',
  },
];

export const MOCK_CHAT_RESPONSES = [
  'DE_FE_1 기준으로 병목 위험 점수 80.3, 주원인 설비_포화, 확산 경로 DE_FE_1 → Diffusion_FE_125가 핵심입니다. 승인된 standard 대응안은 Release Interval 22% 조정과 Product_3/Product_4 우선순위 상향입니다.',
  '현재 리포트 기준 후속 확인 대상은 DE_FE_1, Diffusion_FE_125, 업스트림 DE_FE_86입니다. 조치 후 30분에는 Q-time, WIP, wait_ratio가 목표 범위로 내려오는지 확인해야 합니다.',
  '현재 분석 응답은 최신 도구 기준으로 get_case_detail, get_kpi_trend, get_top_toolgroups, get_tool_status, compare_periods를 사용한 형태로 구성되어 있습니다.',
];

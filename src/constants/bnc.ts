import type { BncCaseStatus, BncTabId, BncTabOption } from '@/types/bnc';

export const BNC_TAB_OPTIONS: BncTabOption[] = [
  { id: 'progress', label: '에이전트 프로그레스', description: '분석 파이프라인 진행 상태' },
  { id: 'cause', label: '원인 분석', description: '주요 원인과 영향 지표' },
  { id: 'solutions', label: '대응안 비교', description: '실행 후보와 KPI 개선폭' },
  { id: 'report', label: '리포트', description: '의사결정 결과 요약' },
];

export const BNC_STATUS_META: Record<
  BncCaseStatus,
  { label: string; variant: 'info' | 'warning' | 'success' | 'danger'; priority: number }
> = {
  DETECTED: { label: '감지됨', variant: 'info', priority: 2 },
  ANALYZING: { label: 'Agent 실행 중', variant: 'info', priority: 1 },
  AWAITING_HITL: { label: '승인 대기', variant: 'warning', priority: 0 },
  RESOLVED: { label: '보고서 완료', variant: 'success', priority: 9 },
  EXPIRED: { label: '만료됨', variant: 'danger', priority: 10 },
  NOT_ACTIONABLE: { label: '대응 불필요', variant: 'info', priority: 11 },
};

export const BNC_AGENT_STEP_NAMES = [
  'BOTTLENECK_DETECTOR',
  'DIFFUSION_ANALYSIS',
  'CAUSE_ANALYSIS',
  'ACTION_PLAN_GEN',
  'ACTION_PLAN_COMPARE',
  'HITL_WAITING',
  'REPORT_GEN',
] as const;

export const BNC_STEP_META: Record<string, { label: string; description: string; sourcePath: string }> = {
  DIFFUSION_ANALYSIS: {
    label: '확산 영향 분석',
    description: '후속 TG 전파 경로와 영향 Lot 규모 산출',
    sourcePath: 'AI-Agent/agents/cascade_analyzer',
  },
  CAUSE_ANALYSIS: {
    label: '원인 분석',
    description: 'SHAP · trend · upstream · Forward Sim 기반 원인 후보 도출',
    sourcePath: 'AI-Agent/agents/cause_analyzer',
  },
  ACTION_PLAN_GEN: {
    label: '대응안 생성',
    description: 'RAG + LLM 기반 대응 후보 생성',
    sourcePath: 'AI-Agent/agents/solution_generator',
  },
  ACTION_PLAN_COMPARE: {
    label: '대응안 비교',
    description: '디지털 트윈 시뮬레이션으로 대응안별 KPI 개선폭 비교',
    sourcePath: 'AI-Agent/agents/compare_agent',
  },
  HITL_WAITING: {
    label: 'HITL 승인',
    description: '관리자 승인/보류 결정 기록',
    sourcePath: 'AI-Agent/app/services/agent_service.py',
  },
  REPORT_GEN: {
    label: '보고서 작성',
    description: 'HITL 검토 이력을 포함한 최종 대응 보고서 생성',
    sourcePath: 'AI-Agent/agents/report_agent',
  },
  BOTTLENECK_DETECTOR: {
    label: '병목 감지',
    description: 'XGBoost 기반 KPI 스냅샷에서 잠재 병목 TG 감지',
    sourcePath: 'AI-Agent/agents/bottleneck_detector',
  },
  CASCADE_ANALYZER: {
    label: '연쇄 영향 분석',
    description: '후속 TG 전파 경로와 영향 Lot 규모 산출',
    sourcePath: 'AI-Agent/agents/cascade_analyzer',
  },
  SOLUTION_GENERATOR: {
    label: '대응안 생성',
    description: 'RAG + LLM 기반 대응 후보 생성',
    sourcePath: 'AI-Agent/agents/solution_generator',
  },
};

export const BNC_STEP_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(BNC_STEP_META).map(([key, value]) => [key, value.label])
);

export const BNC_TAB_EMPTY_STATE: Record<BncTabId, { title: string; description: string }> = {
  progress: {
    title: '에이전트 프로그레스',
    description: '선택한 병목 케이스의 단계별 실행 로그와 산출물 요약이 표시됩니다.',
  },
  cause: {
    title: '원인 분석',
    description: '주요 원인, 영향 공정, 지표 기여도 분석 결과가 표시됩니다.',
  },
  solutions: {
    title: '대응안 비교',
    description: '실행 가능한 대응안과 KPI 개선폭, 승인/반려 액션이 표시됩니다.',
  },
  report: {
    title: '리포트',
    description: '최종 의사결정 요약, 실행 이력, 리포트 다운로드 액션이 표시됩니다.',
  },
};

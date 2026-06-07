import type { BncCaseStatus, BncTabId, BncTabOption } from '@/types/bnc';

export const BNC_TAB_OPTIONS: BncTabOption[] = [
  { id: 'progress', label: '에이전트 프로그레스', description: '분석 파이프라인 진행 상태' },
  { id: 'cause', label: '원인 분석', description: '주요 원인과 영향 지표' },
  { id: 'solutions', label: '대응안 비교', description: '실행 후보와 KPI 개선폭' },
  { id: 'report', label: '리포트', description: '의사결정 결과 요약' },
];

export const BNC_STATUS_META: Record<
  BncCaseStatus,
  { label: string; variant: 'info' | 'warning' | 'success'; priority: number }
> = {
  DETECTED: { label: '감지됨', variant: 'info', priority: 2 },
  ANALYZING: { label: 'Agent 실행 중', variant: 'info', priority: 1 },
  AWAITING_HITL: { label: '승인 대기', variant: 'warning', priority: 0 },
  RESOLVED: { label: '보고서 완료', variant: 'success', priority: 9 },
};

export const BNC_STEP_LABELS: Record<string, string> = {
  DIFFUSION_ANALYSIS: '확산 영향 분석',
  CAUSE_ANALYSIS: '원인 분석',
  ACTION_PLAN_GENERATION: '대응안 생성',
  HITL_REVIEW: '승인 검토',
  REPORT_GENERATION: '리포트 생성',
};

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

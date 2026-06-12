import type { FinalBottleneckReport } from '@/types/report';

export const MOCK_FINAL_BOTTLENECK_REPORT: FinalBottleneckReport = {
  meta: {
    process_name: 'DefMet',
    severity: 'CRITICAL',
    detected_at: '2026-06-09T17:22:10Z',
    generated_at: '2026-06-09T17:31:42Z',
  },
  bottleneck_info: {
    tool_group: 'DefMet_FE_43',
    risk_score: 0.981,
    delayed_orders: 18,
    avg_queue_time_min: 292,
    peak_q_time_min: 421,
    utilization_pct: 89.7,
    load_ratio: 1.184,
    wip_count: 261,
    available_tool_ratio: 0.76,
  },
  fab_kpi: {
    wip_total: 12840,
    utilization_avg_pct: 84.2,
    q_time_min: 292,
    wait_ratio: 1.184,
  },
  diffusion_analysis: {
    is_bottleneck: true,
    bottleneck_location: 'DefMet_FE_43',
    diffusion_path: ['DefMet_FE_43', 'Litho_BE_110', 'DE_BE_67'],
    affected_processes: [
      { process: 'Lithography', status: 'WATCH', utilization_pct: 86.1, wait_ratio: 1.08, wip: 198 },
      { process: 'Dry Etch', status: 'RISK', utilization_pct: 88.4, wait_ratio: 1.12, wip: 244 },
    ],
    forward_simulation: {
      horizon_min: 120,
      results: [
        { toolgroup: 'DefMet_FE_43', q_time_future: 334, wait_ratio_future: 1.24, wip_future: 279, y_bottleneck: 0.98 },
        { toolgroup: 'Litho_BE_110', q_time_future: 214, wait_ratio_future: 1.11, wip_future: 205, y_bottleneck: 0.74 },
      ],
    },
    line_stop_expected_min: 180,
    risk_level: 'CRITICAL',
  },
  cause_analysis: [
    {
      rank: 1,
      cause: 'WIP 유입 증가와 가용 설비 비율 하락이 동시에 발생했습니다.',
      contribution_pct: 42.1,
      recommended_action: '대기 Lot 재배정 및 투입 간격 조정',
      similar_case: 'hist-defmet-20260522',
    },
  ],
  action_effects: [
    {
      label: 'A. REQUEUE_TOOL',
      action_kind: 'DISPATCH',
      description: '[플랜 A] 대기 Lot 일부를 가용 Tool로 재배정 | 대상 TG: DefMet_FE_43',
      simulation_confidence: 0.91,
      kpi_delta: { avg_queue_time_min: -45, wip_count: -12, throughput_delta: 3 },
    },
    {
      label: 'B. LOT_RELEASE_THROTTLE',
      action_kind: 'PRODUCTION_CONTROL',
      description: '[플랜 B] 신규 Lot 투입 간격을 일시 조정 | 대상 TG: DefMet_FE_43',
      simulation_confidence: 0.84,
      kpi_delta: { avg_queue_time_min: -28, wip_count: -9, throughput_delta: -1 },
    },
  ],
  recommendation: {
    action_label: 'A',
    action_kind: 'DISPATCH',
    reason: '대기시간과 WIP를 동시에 낮추면서 처리량 손실이 가장 작습니다.',
  },
  approval_info: {
    status: '대기',
    approved_by: 'AUTO',
    approved_role: 'SYSTEM',
    approved_at: '',
    comment: 'JSON artifact 제외 상태의 fallback mock입니다.',
    rejection_reason: null,
  },
  full_markdown: [
    '# 병목 최종 리포트',
    '',
    'DefMet_FE_43에서 Critical 병목이 감지되었습니다.',
    '',
    '- 추천 대응: A. REQUEUE_TOOL',
    '- 주요 근거: WIP 유입 증가, 가용 설비 비율 하락',
  ].join('\n'),
};

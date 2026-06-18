import { demoPhase } from '@/composables/useDemoTimeline';

import { riskGradeToLevel } from '@/constants/riskLevel';

import type { BottleneckAlertItem, DashboardProcessAreaData } from '@/types/dashboard';
import type { DashboardPageInfo } from '@/types/dashboardApi';
import type { NotificationListData } from '@/types/notification';

export const DEMO_CASE_ID = 'case-de-fe-1-3780';
export const DEMO_TG_ID = 'tg-de-fe-1';
export const DEMO_TG_NAME = 'DE_FE_1';
export const DEMO_DETECTED_AT = '2026-06-14T14:12:00Z';

export const DEMO_BOTTLENECK_ALERT_2: BottleneckAlertItem = {
  caseId: 'case-litho-fe-92-3641',
  tgId: 'tg-litho-fe-92',
  tgName: 'Litho_FE_92',
  areaName: 'Litho',
  riskGrade: 'CRITICAL',
  riskLevel: riskGradeToLevel('CRITICAL'),
  bottleneckProb: 0.9712,
  riskScore: 0.7548,
  impactScore: 0.6103,
  alertMetrics: {
    compositeScore: 0.7548,
    probability: 0.9712,
    impactScore: 0.6103,
    affectedCount: 3,
    ctIncreaseMin: 1240,
    atRiskLots: 22,
  },
  estDelayHours: 20.7,
  affectedTgCount: 3,
  affectedLotCount: 22,
  mainCause: 'WIP_누적(wip) · 설비_포화(max_util)',
  status: 'RESOLVED',
  currentStepName: 'HITL_WAITING',
  canAnalyzeCause: true,
  canShowSolutions: true,
  detectedAt: '2026-06-14T12:30:00Z',
};

export const DEMO_BOTTLENECK_ALERT: BottleneckAlertItem = {
  caseId: DEMO_CASE_ID,
  tgId: DEMO_TG_ID,
  tgName: DEMO_TG_NAME,
  areaName: 'Dry Etch',
  riskGrade: 'CRITICAL',
  riskLevel: riskGradeToLevel('CRITICAL'),
  bottleneckProb: 0.9958,
  riskScore: 0.8031,
  impactScore: 0.6867,
  alertMetrics: {
    compositeScore: 0.8031,
    probability: 0.9958,
    impactScore: 0.6867,
    affectedCount: 2,
    ctIncreaseMin: 1670,
    atRiskLots: 12,
  },
  estDelayHours: 27.8,
  affectedTgCount: 2,
  affectedLotCount: 12,
  mainCause: '설비_포화(max_util) · WIP_누적',
  status: 'ANALYZING',
  currentStepName: 'DIFFUSION_ANALYSIS',
  canAnalyzeCause: true,
  canShowSolutions: true,
  detectedAt: DEMO_DETECTED_AT,
};

export function createDemoPageInfo(size: number, totalElements = 1): DashboardPageInfo {
  return {
    page: 0,
    size,
    totalElements,
    totalPages: Math.max(1, Math.ceil(totalElements / size)),
    sort: 'detectedAt,desc',
  };
}

export function getDemoBottleneckAlertsPage({
  size,
  detectedFrom,
  detectedTo,
}: {
  size: number;
  detectedFrom?: string | null;
  detectedTo?: string | null;
}) {
  const detectedAt = new Date(DEMO_DETECTED_AT).getTime();
  const from = detectedFrom ? new Date(detectedFrom).getTime() : null;
  const to = detectedTo ? new Date(detectedTo).getTime() : null;
  const inRange =
    (from === null || Number.isNaN(from) || detectedAt >= from) &&
    (to === null || Number.isNaN(to) || detectedAt <= to);
  // Phase 0: Litho_FE_92만 표시. Phase 1: DE_FE_1 추가.
  const allAlerts =
    demoPhase.value === 0 ? [DEMO_BOTTLENECK_ALERT_2] : [DEMO_BOTTLENECK_ALERT, DEMO_BOTTLENECK_ALERT_2];
  const items = inRange ? allAlerts.slice(0, size) : [];

  return {
    items,
    pageInfo: createDemoPageInfo(size, items.length),
  };
}

export const DEMO_DASHBOARD_PROCESS_AREAS: DashboardProcessAreaData[] = [
  {
    areaId: 'ETCH',
    areaCode: 'ETCH',
    areaName: 'ETCH',
    totalTgCount: 4,
    bottleneckTgCount: 2,
    tgSummary: { CRITICAL: 1, HIGH: 1, MEDIUM: 1, LOW: 1 },
    toolGroups: [
      {
        tgId: 'tg-de-fe-1',
        tgCode: 'DE_FE_1',
        tgName: 'DE_FE_1',
        riskGrade: 'CRITICAL',
        riskLevel: riskGradeToLevel('CRITICAL'),
        utilizationRate: 0.9943,
        bottleneckProb: 0.9958,
        riskScore: 0.8031,
        wipCount: 10,
      },
      {
        tgId: 'tg-de-fe-86',
        tgCode: 'DE_FE_86',
        tgName: 'DE_FE_86',
        riskGrade: 'HIGH',
        riskLevel: riskGradeToLevel('HIGH'),
        utilizationRate: 0.88,
        bottleneckProb: 0.6867,
        riskScore: 0.6867,
        wipCount: 38,
      },
      {
        tgId: 'tg-de-fe-59',
        tgCode: 'DE_FE_59',
        tgName: 'DE_FE_59',
        riskGrade: 'MEDIUM',
        riskLevel: riskGradeToLevel('MEDIUM'),
        utilizationRate: 0.76,
        bottleneckProb: 0.42,
        riskScore: 0.42,
        wipCount: 18,
      },
      {
        tgId: 'tg-de-be-11',
        tgCode: 'DE_BE_11',
        tgName: 'DE_BE_11',
        riskGrade: 'LOW',
        riskLevel: riskGradeToLevel('LOW'),
        utilizationRate: 0.52,
        bottleneckProb: 0.12,
        riskScore: null,
        wipCount: 4,
      },
    ],
  },
  {
    areaId: 'OXIDATION',
    areaCode: 'OXIDATION',
    areaName: 'OXIDATION',
    totalTgCount: 3,
    bottleneckTgCount: 1,
    tgSummary: { CRITICAL: 0, HIGH: 1, MEDIUM: 1, LOW: 1 },
    toolGroups: [
      {
        tgId: 'tg-diffusion-fe-125',
        tgCode: 'Diffusion_FE_125',
        tgName: 'Diffusion_FE_125',
        riskGrade: 'HIGH',
        riskLevel: riskGradeToLevel('HIGH'),
        utilizationRate: 0.8153,
        bottleneckProb: 0.6867,
        riskScore: 0.6867,
        wipCount: 5,
      },
      {
        tgId: 'tg-diffusion-fe-127',
        tgCode: 'Diffusion_FE_127',
        tgName: 'Diffusion_FE_127',
        riskGrade: 'MEDIUM',
        riskLevel: riskGradeToLevel('MEDIUM'),
        utilizationRate: 0.72,
        bottleneckProb: 0.37,
        riskScore: 0.37,
        wipCount: 8,
      },
      {
        tgId: 'tg-diffusion-fe-126',
        tgCode: 'Diffusion_FE_126',
        tgName: 'Diffusion_FE_126',
        riskGrade: 'LOW',
        riskLevel: riskGradeToLevel('LOW'),
        utilizationRate: 0.44,
        bottleneckProb: 0.18,
        riskScore: null,
        wipCount: 2,
      },
    ],
  },
];

export function getDemoNotifications(): NotificationListData {
  if (demoPhase.value === 0) {
    return { totalUnreadCount: 0, items: [] };
  }
  return DEMO_NOTIFICATION_LIST;
}

export const DEMO_NOTIFICATION_LIST: NotificationListData = {
  totalUnreadCount: 1,
  items: [
    {
      id: 'demo-noti-de-fe-1-critical',
      type: 'BOTTLENECK_CRITICAL',
      level: 'critical',
      title: 'DE_FE_1 Critical 병목',
      message:
        'standard DISPATCH_RULE_OVERRIDE 적용이 승인되었습니다. Release Interval Δ22.0% 조정 후 queue를 확인하세요.',
      refCaseId: DEMO_CASE_ID,
      createdAt: DEMO_DETECTED_AT,
      unread: true,
      detailItems: [
        { label: '위험 점수', value: '80.3' },
        { label: '주원인', value: '설비_포화(max_util)' },
        { label: '승인안', value: 'standard · DISPATCH_RULE_OVERRIDE' },
      ],
    },
    {
      id: 'demo-noti-de-fe-1-approved',
      type: 'HITL_PENDING',
      level: 'success',
      title: '표준 대응안 승인 완료',
      message: '은비(팀원)가 DE_FE_1 standard 안을 즉시 적용 승인했습니다.',
      refCaseId: DEMO_CASE_ID,
      createdAt: '2026-06-14T14:12:46Z',
      unread: false,
    },
  ],
};

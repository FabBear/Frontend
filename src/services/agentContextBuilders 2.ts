import type {
  BncActionPlansPayload,
  BncAlertCase,
  BncCaseDetail,
  BncCauseAnalysis,
  BncReportPayload,
} from '@/types/bnc';
import type { Fab3dArea, Fab3dToolDetail, Fab3dToolGroup, TgRouteStep } from '@/types/fab3d';
import type { ActionHistoryDetail, ActionHistoryFilters, ActionHistoryItem } from '@/types/report';

function compactToolGroup(tg: Fab3dToolGroup, areaName?: string) {
  return {
    tgId: tg.tgId,
    tgName: tg.tgName,
    areaCode: tg.areaCode,
    areaName: areaName ?? tg.areaCode,
    riskGrade: tg.risk,
    utilizationRate: tg.utilizationRate,
    wipCount: tg.wipCount,
    waitingLots: tg.waitingLots,
    bottleneckProb: tg.bottleneckProb,
    toolCount: tg.toolCount,
    measuredAt: tg.measuredAt,
  };
}

function compactTool(tool: Fab3dToolDetail) {
  return {
    toolId: tool.toolId,
    toolCode: tool.toolCode,
    toolName: tool.toolName,
    tgId: tool.tgId,
    tgCode: tool.tgCode,
    status: tool.status,
    utilizationRate: tool.utilizationRate,
    queueLotCount: tool.queueLotCount,
    setupRatio: tool.setupRatio,
    downRatio: tool.downRatio,
    measuredAt: tool.measuredAt,
  };
}

export function buildFabSnapshotContext(input: {
  areas: Fab3dArea[];
  tools: Fab3dToolDetail[];
  measuredAt: string | null;
  source: 'current' | 'mock';
}) {
  const toolGroups = input.areas.flatMap((area) =>
    area.toolGroups.map((tg) => compactToolGroup(tg, area.areaName)),
  );
  return {
    measuredAt: input.measuredAt,
    dataSource: input.source,
    areas: input.areas.map((area) => ({
      areaId: area.areaId,
      areaCode: area.areaCode,
      areaName: area.areaName,
      toolGroups: area.toolGroups.map((tg) => compactToolGroup(tg, area.areaName)),
    })),
    toolGroups,
    tools: input.tools.slice(0, 300).map(compactTool),
  };
}

export function buildFabTgContext(input: {
  selectedTg: Fab3dToolGroup;
  selectedTool?: Fab3dToolDetail | null;
  routeSteps: TgRouteStep[];
  tools: Fab3dToolDetail[];
  measuredAt: string | null;
  source: 'current' | 'mock';
}) {
  return {
    measuredAt: input.measuredAt,
    dataSource: input.source,
    selectedTg: compactToolGroup(input.selectedTg),
    selectedTool: input.selectedTool ? compactTool(input.selectedTool) : null,
    routeSteps: input.routeSteps,
    tools: input.tools
      .filter((tool) => tool.tgId === input.selectedTg.tgId || tool.tgCode === input.selectedTg.tgName)
      .map(compactTool),
  };
}

export function buildReportPeriodContext(input: {
  filters: ActionHistoryFilters;
  dateRange: { from: string; to: string };
  items: ActionHistoryItem[];
  selectedDetail?: ActionHistoryDetail | null;
}) {
  return {
    filters: input.filters,
    dateRange: input.dateRange,
    items: input.items.map((item) => ({
      caseId: item.caseId,
      tgName: item.tgName,
      areaName: item.areaName,
      riskGrade: item.riskGrade,
      detectedAt: item.detectedAt,
      decidedAt: item.decidedAt,
      decision: item.decision,
      selectedPlanTitle: item.selectedPlanTitle,
      estAvgWaitDelta: item.estAvgWaitDelta,
      estDeliveryComplianceDelta: item.estDeliveryComplianceDelta,
      status: item.status,
      hasReport: item.hasReport,
    })),
    selectedCase: input.selectedDetail
      ? {
          caseId: input.selectedDetail.caseId,
          tgName: input.selectedDetail.tgName,
          areaName: input.selectedDetail.areaName,
          riskGrade: input.selectedDetail.riskGrade,
          bottleneckProb: input.selectedDetail.bottleneckProb,
          selectedPlanTitle: input.selectedDetail.hitlDecision.selectedPlanTitle,
          reportId: input.selectedDetail.reportId,
        }
      : null,
  };
}

export function buildBncCaseContext(input: {
  selectedCase: BncAlertCase | null;
  selectedCaseDetail: BncCaseDetail | null;
  causeAnalysis: BncCauseAnalysis | null;
  actionPlans: BncActionPlansPayload | null;
  report: BncReportPayload | null;
  activeTab?: string;
  stepName?: string | null;
}) {
  return {
    activeTab: input.activeTab,
    stepName: input.stepName,
    selectedCase: input.selectedCase
      ? {
          caseId: input.selectedCase.caseId,
          tgId: input.selectedCase.tgId,
          tgName: input.selectedCase.tgName,
          areaName: input.selectedCase.areaName,
          riskGrade: input.selectedCase.riskGrade,
          bottleneckProb: input.selectedCase.bottleneckProb,
          utilizationRate: input.selectedCase.utilizationRate,
          wipCount: input.selectedCase.wipCount,
          status: input.selectedCase.status,
        }
      : null,
    agentProgress: input.selectedCaseDetail?.agentProgress ?? [],
    causeSummary: input.causeAnalysis?.causeSummary ?? [],
    shapFeatures: input.causeAnalysis?.shapFeatures ?? [],
    actionPlans:
      input.actionPlans?.plans.map((plan) => ({
        planId: plan.planId,
        actionLabel: plan.actionLabel,
        title: plan.title,
        summary: plan.summary,
        expectedImpact: plan.expectedImpact,
        recommended: plan.recommended,
        targetToolGroups: plan.targetToolGroups,
        tradeoffs: plan.tradeoffs,
      })) ?? [],
    recommendation: input.actionPlans?.recommendation ?? null,
    reportSummary: input.report?.summary ?? null,
  };
}

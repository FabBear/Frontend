<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import type { BncActionPlan, BncActionPlansPayload } from '@/types/bnc';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BaseButton from '@/components/base/BaseButton.vue';
import BncTargetMap from '@/components/bnc/BncTargetMap.vue';

const props = defineProps<{
  payload: BncActionPlansPayload | null;
  loading?: boolean;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  decide: [payload: { decision: 'APPROVED' | 'REJECTED'; selectedPlanId: string; comment?: string | null }];
}>();

const CURRENT_OPTION_ID = 'current-baseline';
type RecommendationTone = 'success' | 'info' | 'warning';
type DecisionSummaryItem = { label: string; value: string; caption: string | null };
type ExclusionReasonItem = {
  label: string;
  reason: string;
  evidence: string[];
};

const selectedOptionId = ref<string>(CURRENT_OPTION_ID);
const selectedPlanId = ref<string | null>(null);
const decisionPlanId = ref<string | null>(null);
const selectedMapToolGroup = ref<string | null>(null);
const localDecision = ref<'APPROVED' | 'REJECTED' | null>(null);
const isPendingReject = ref(false);
const rejectionNote = ref('');
const approvalNote = ref('');

const sortedPlans = computed(() =>
  [...(props.payload?.plans ?? [])].sort((a, b) => Number(b.recommended) - Number(a.recommended))
);

const selectedPlan = computed<BncActionPlan | null>(
  () => sortedPlans.value.find((p) => p.planId === selectedPlanId.value) ?? null
);
const decisionPlan = computed<BncActionPlan | null>(
  () => sortedPlans.value.find((p) => p.planId === decisionPlanId.value) ?? null
);
const isCurrentOptionSelected = computed(() => selectedOptionId.value === CURRENT_OPTION_ID);

const baselineMetrics = computed(() => sortedPlans.value[0]?.metrics ?? []);
const baselineSnapshot = computed(
  () =>
    props.payload?.baselineSnapshot ??
    baselineMetrics.value.map((metric) => ({
      label: metric.label,
      value: metric.before,
      caption: '현재 기준',
    }))
);
const currentOptionMetrics = computed(() =>
  props.payload?.currentOption?.metrics?.length ? props.payload.currentOption.metrics : baselineSnapshot.value
);
const currentOptionTitle = computed(() => props.payload?.currentOption?.title ?? '현재 유지');
const compareContext = computed(() => props.payload?.compareContext ?? null);
const dataQualityWarnings = computed(() => compareContext.value?.dataQuality?.warnings ?? []);
const noActionForecast = computed(() => compareContext.value?.naturalForecast ?? null);
const recommendedPlan = computed<BncActionPlan | null>(() => sortedPlans.value.find((p) => p.recommended) ?? null);
const isSelectionOffRecommendation = computed(
  () =>
    !!(
      !isCurrentOptionSelected.value &&
      selectedPlan.value &&
      recommendedPlan.value &&
      selectedPlan.value.planId !== recommendedPlan.value.planId
    )
);
const recommendationReasonParagraphs = computed(() =>
  (props.payload?.recommendation?.reason ?? '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
);
const rawRecommendationWhyNotOthers = computed(() => props.payload?.recommendation?.structured?.whyNotOthers ?? {});
const recommendationCaveats = computed(() => props.payload?.recommendation?.structured?.caveats ?? []);
const recommendationImmediateActions = computed(
  () => props.payload?.recommendation?.structured?.immediateActions ?? []
);
const recommendationMonitoringKpis = computed(() => props.payload?.recommendation?.structured?.monitoringKpis ?? []);
const recommendationRollbackCondition = computed(
  () => props.payload?.recommendation?.structured?.rollbackCondition ?? null
);
const recommendationWhyRecommended = computed(() => props.payload?.recommendation?.structured?.whyRecommended ?? null);
const recommendationStatus = computed(() => props.payload?.recommendation?.structured?.recommendationStatus ?? null);
const hasSimWarning = computed(
  () => compareContext.value?.dataQuality?.status === 'warning' || dataQualityWarnings.value.length > 0
);
const noMeaningfulEffect = computed(() => props.payload?.decisionInfo?.decisionStatus === 'no_meaningful_effect');
const isEquivalentDecision = computed(() => props.payload?.decisionInfo?.decisionStatus === 'equivalent_candidates');
const hasMonitoringRule = computed(
  () => recommendationMonitoringKpis.value.length > 0 && !!recommendationRollbackCondition.value?.trim()
);
const hasRecommendationRunbook = computed(
  () =>
    recommendationImmediateActions.value.length > 0 ||
    recommendationMonitoringKpis.value.length > 0 ||
    !!recommendationRollbackCondition.value ||
    !!recommendationStatus.value
);
const shouldShowMonitoringGap = computed(() => !!recommendedPlan.value && !hasMonitoringRule.value);
// 비추천안 선택 시: 그 후보를 선택하지 않은 이유(why_not_others[label])
const selectedPlanExclusionReason = computed(() => {
  const plan = selectedPlan.value;
  if (!plan) return null;
  return buildExclusionReasonItem(
    plan.actionLabel ?? '',
    rawRecommendationWhyNotOthers.value[plan.actionLabel ?? ''],
    plan
  ).reason;
});
const recommendationWhyNotOthers = computed<ExclusionReasonItem[]>(() =>
  Object.entries(rawRecommendationWhyNotOthers.value).map(([label, reason]) =>
    buildExclusionReasonItem(label, reason, findPlanByActionLabel(label))
  )
);

// 비교 결론(에이전트 산출 핵심) — 카드 위에서 먼저 읽히도록 요약
const conclusionHeadline = computed(
  () => props.payload?.recommendation?.structured?.headline ?? recommendationReasonParagraphs.value[0] ?? ''
);
const recommendationConfidenceLevel = computed(
  () => props.payload?.recommendation?.structured?.confidenceLevel ?? null
);
const hasConclusion = computed(() => !!(conclusionHeadline.value || props.payload?.decisionInfo));
const decisionSummaryTitle = computed(() => {
  const target = compareContext.value?.anchorToolgroup;
  if (target && noActionForecast.value?.getsWorse) return `${target} 병목 악화 예상`;
  if (target) return `${target} 대응 판단`;
  return '대응 판단 요약';
});
const decisionSummaryDescription = computed(() => {
  if (hasSimWarning.value && noMeaningfulEffect.value) {
    return '현재 병목은 악화 가능성이 있지만 후보 대응안의 시뮬레이션 효과가 확인되지 않았습니다. 상세 KPI는 현재 유지 카드를 선택해 확인하세요.';
  }
  if (noActionForecast.value?.getsWorse) {
    return '무조치 시나리오가 악화로 예측됩니다. 현재 유지 카드를 선택하면 현재 KPI와 예측 변화를 한 번에 확인할 수 있습니다.';
  }
  return '현재 기준선과 후보 대응안을 비교해 실행할 안을 검토합니다.';
});
const decisionSummaryItems = computed<DecisionSummaryItem[]>(() => {
  const decision = props.payload?.decisionInfo;
  const items: Array<DecisionSummaryItem | null> = [
    compareContext.value?.severity
      ? {
          label: '위험도',
          value: `${compareContext.value.severity} 병목`,
          caption: compareContext.value.anchorToolgroup ?? null,
        }
      : null,
    noActionForecast.value
      ? {
          label: '무조치 전망',
          value: noActionForecast.value.getsWorse
            ? `${compareContext.value?.horizonMin ?? 120}분 후 악화`
            : noActionForecast.value.label,
          caption: noActionForecast.value.label ?? null,
        }
      : null,
    decision
      ? {
          label: '비교 판정',
          value: formatDecisionStatus(decision.decisionStatus),
          caption: decision.tiebreakerUsed
            ? `기준 ${formatTiebreaker(decision.tiebreakerUsed)}`
            : `Top ${decision.topLabel}`,
        }
      : recommendedPlan.value
        ? {
            label: '기준 선택안',
            value:
              `${recommendationBadgeLabel(recommendedPlan.value)} ${recommendedPlan.value.actionLabel ?? ''}`.trim(),
            caption: recommendedPlan.value.actionKind ?? null,
          }
        : null,
    {
      label: '검증 상태',
      value: hasSimWarning.value ? '확인 필요' : '경고 없음',
      caption:
        dataQualityWarnings.value[0]?.code ??
        (recommendationConfidenceLevel.value
          ? `신뢰도 ${formatConfidenceLevel(recommendationConfidenceLevel.value)}`
          : null),
    },
  ];
  return items.filter((item): item is DecisionSummaryItem => item !== null);
});
const selectedOperationItems = computed(() => selectedPlan.value?.operationItems ?? []);
const selectedTargetToolGroups = computed(() => selectedPlan.value?.targetToolGroups ?? []);
const baselineTargetToolGroups = computed(
  () => recommendedPlan.value?.targetToolGroups ?? sortedPlans.value[0]?.targetToolGroups ?? []
);
const visibleMapTargetToolGroups = computed(() => {
  if (!isCurrentOptionSelected.value && selectedPlan.value) return selectedTargetToolGroups.value;
  return compareContext.value?.targetToolgroups?.length
    ? compareContext.value.targetToolgroups
    : baselineTargetToolGroups.value;
});
const visibleMapCauseToolGroups = computed(() => compareContext.value?.upstreamSuspects ?? []);
const visibleMapAffectedToolGroups = computed(() => compareContext.value?.cascade?.affectedToolgroups ?? []);
const hasTargetMapData = computed(
  () =>
    Boolean(compareContext.value?.anchorToolgroup) ||
    visibleMapTargetToolGroups.value.length > 0 ||
    visibleMapCauseToolGroups.value.length > 0 ||
    visibleMapAffectedToolGroups.value.length > 0
);
const targetMapTitle = computed(() => {
  if (!isCurrentOptionSelected.value && selectedPlan.value)
    return `${selectedPlan.value.actionLabel ?? '선택안'} 적용 대상 위치`;
  return '병목/원인/확산 위치';
});
const selectedPlanImpactText = computed(() => {
  if (!selectedPlan.value) return '-';
  if (isNeutralImpact(selectedPlan.value)) return 'KPI 변화 없음';
  return selectedPlan.value.expectedImpact;
});
const selectedPlanRecommendationText = computed(() => {
  if (!selectedPlan.value || !recommendedPlan.value) return '';
  const recommendedLabel = recommendationBadgeLabel(recommendedPlan.value);
  if (selectedPlan.value.planId === recommendedPlan.value.planId) {
    if (noMeaningfulEffect.value || recommendationStatus.value === 'tentative_no_effect') {
      return '선택한 대응안은 효과 우위가 아니라 운영 변경폭이 작은 잠정 선택안입니다.';
    }
    if (isEquivalentDecision.value || recommendationStatus.value === 'equivalent_tiebreak') {
      return '선택한 대응안은 동등 후보 중 타이브레이커로 선택된 안입니다.';
    }
    return `선택한 대응안이 ${recommendedLabel}입니다.`;
  }
  return `기준 선택안은 ${recommendedPlan.value.actionLabel ?? '-'}(${recommendedLabel})입니다. 현재 선택안은 기준 선택안과 다르므로 운영상 선택 사유를 별도로 남기는 것이 좋습니다.`;
});
const decisionMeta = computed(() => {
  const approvalInfo = props.payload?.approvalInfo;

  if (!localDecision.value) {
    if ((approvalInfo?.approvedBy ?? '').toUpperCase() === 'AUTO') {
      return {
        status: '시스템 자동 승인',
        by: approvalInfo?.approvedBy ?? 'AUTO',
        role: approvalInfo?.approvedRole ?? 'SYSTEM',
        isAuto: true,
        at: approvalInfo?.approvedAt ?? '-',
        comment:
          approvalInfo?.comment ??
          '에이전트 내부 플로우에서 선택안이 자동 승인되었습니다. 운영 실행 전 현업 확인이 필요합니다.',
        rejectionReason: approvalInfo?.rejectionReason ?? null,
      };
    }
    return null;
  }

  if (localDecision.value === 'APPROVED') {
    return {
      status: approvalInfo?.status ?? '승인',
      by: approvalInfo?.approvedBy ?? '현재 사용자',
      role: approvalInfo?.approvedRole ?? null,
      isAuto: (approvalInfo?.approvedBy ?? '').toUpperCase() === 'AUTO',
      at: approvalInfo?.approvedAt ?? '방금',
      comment: approvalInfo?.comment ?? '선택 대응안을 승인했습니다.',
      rejectionReason: approvalInfo?.rejectionReason ?? null,
    };
  }

  return {
    status: '반려',
    by: '현재 사용자',
    role: null,
    isAuto: false,
    at: '방금',
    comment: rejectionNote.value,
    rejectionReason: rejectionNote.value,
  };
});

function recommendationBadgeLabel(plan: BncActionPlan | null): string {
  if (!plan?.recommended) return '';
  if (noMeaningfulEffect.value || recommendationStatus.value === 'tentative_no_effect') return '잠정 선택';
  if (isEquivalentDecision.value || recommendationStatus.value === 'equivalent_tiebreak') return '동률 선택';
  if (hasSimWarning.value) return '검증 필요';
  return 'AI 추천';
}

function recommendationBadgeTone(plan: BncActionPlan | null): RecommendationTone {
  if (!plan?.recommended) return 'success';
  if (noMeaningfulEffect.value || recommendationStatus.value === 'tentative_no_effect' || hasSimWarning.value)
    return 'warning';
  if (isEquivalentDecision.value || recommendationStatus.value === 'equivalent_tiebreak') return 'info';
  return 'success';
}

function findPlanByActionLabel(label: string): BncActionPlan | null {
  return sortedPlans.value.find((plan) => plan.actionLabel === label) ?? null;
}

function isScoreOnlyReason(reason: string | undefined): boolean {
  if (!reason) return true;
  return /^(score|점수)\s*[:=]?\s*[-+]?\d+(\.\d+)?$/i.test(reason.trim());
}

function planScoreEvidence(plan: BncActionPlan | null): string | null {
  if (plan?.compositeScore === undefined || plan.compositeScore === null) return null;
  return `종합 점수 ${formatScore(plan.compositeScore)}`;
}

function buildFallbackExclusionReason(label: string, plan: BncActionPlan | null): string {
  const decision = props.payload?.decisionInfo;
  if (noMeaningfulEffect.value || recommendationStatus.value === 'tentative_no_effect') {
    return `${label}도 유의미한 KPI 개선 효과가 확인되지 않아 실행 우선순위에서 제외했습니다.`;
  }
  if (hasSimWarning.value) {
    return `${label}은 시뮬레이션 검증 경고가 있어 효과를 확정하기 어렵기 때문에 우선 선택하지 않았습니다.`;
  }
  if (isEquivalentDecision.value || recommendationStatus.value === 'equivalent_tiebreak') {
    return `${label}은 기준 선택안과 효과가 동등하지만 ${formatTiebreaker(decision?.tiebreakerUsed)} 기준에서 밀렸습니다.`;
  }
  if (plan && isNeutralImpact(plan)) {
    return `${label}은 기준선 대비 KPI 개선이 확인되지 않아 제외했습니다.`;
  }
  if (
    plan?.compositeScore !== undefined &&
    recommendedPlan.value?.compositeScore !== undefined &&
    plan.compositeScore < recommendedPlan.value.compositeScore
  ) {
    return `${label}은 기준 선택안보다 종합 점수가 낮아 제외했습니다.`;
  }
  return `${label}은 기준 선택안 대비 우위가 확인되지 않아 제외했습니다.`;
}

function buildExclusionReasonItem(
  label: string,
  rawReason: string | undefined,
  plan: BncActionPlan | null
): ExclusionReasonItem {
  const normalizedReason = rawReason?.trim();
  const shouldUseFallback = isScoreOnlyReason(normalizedReason);
  const evidence = [
    shouldUseFallback && normalizedReason ? `에이전트 원문: ${normalizedReason}` : null,
    planScoreEvidence(plan),
    plan?.scoreVerdict ? `판정: ${plan.scoreVerdict}` : null,
  ].filter((item): item is string => !!item);

  return {
    label,
    reason: shouldUseFallback
      ? buildFallbackExclusionReason(label, plan)
      : (normalizedReason ?? buildFallbackExclusionReason(label, plan)),
    evidence,
  };
}

const recommendationEvidenceLabel = computed(() => {
  if (noMeaningfulEffect.value || recommendationStatus.value === 'tentative_no_effect') return '잠정 선택 근거';
  if (isEquivalentDecision.value || recommendationStatus.value === 'equivalent_tiebreak') return '동률 선택 근거';
  if (hasSimWarning.value) return '검증 필요 근거';
  return 'AI 추천 근거';
});

const recommendationEvidenceVariant = computed<RecommendationTone>(() => {
  if (noMeaningfulEffect.value || recommendationStatus.value === 'tentative_no_effect' || hasSimWarning.value)
    return 'warning';
  if (isEquivalentDecision.value || recommendationStatus.value === 'equivalent_tiebreak') return 'info';
  return 'success';
});

function isImprovement(label: string, delta: string): boolean | null {
  if (!delta || delta === '-') return null;
  const numericDelta = parseDelta(delta);
  if (numericDelta === null || numericDelta === 0) return null;
  if (label.toLowerCase().includes('throughput') || label.includes('처리')) return numericDelta > 0;
  return numericDelta < 0;
}

function parseDelta(delta: string): number | null {
  const match = delta.replaceAll(',', '').match(/[+-]?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

// 기준선 대비 변화 = 0 / "변화 없음" 인지
function isFlatDelta(delta: string | null | undefined): boolean {
  if (!delta) return true;
  if (delta.includes('변화 없음') || delta.includes('변동 없음')) return true;
  return parseDelta(delta) === 0;
}

function deltaArrow(delta: string): string {
  const n = parseDelta(delta);
  if (n === null || n === 0) return '';
  return n > 0 ? '▲' : '▼';
}

// compare 데이터는 절대값이 없어 after==delta로 중복될 수 있음 → 의미 있는 절대값일 때만 결과값 표시
function showMetricAfter(metric: { after: string; delta: string }): boolean {
  return /\d/.test(metric.after) && metric.after !== metric.delta;
}

function targetGroupCount(plan: BncActionPlan): number {
  return plan.targetToolGroups?.length ?? 0;
}

function isNeutralImpact(plan: BncActionPlan) {
  if (plan.impactTone === 'neutral') return true;
  return plan.metrics.length > 0 && plan.metrics.every((metric) => parseDelta(metric.delta) === 0);
}

function planLabel(idx: number) {
  return String.fromCharCode(65 + idx);
}

function cardMainChange(plan: BncActionPlan) {
  return plan.operationItems?.[0] ?? plan.summary;
}

// 카드에 노출할 KPI 행 — 종합 점수는 상세 '점수 분해'에서 다루므로 제외
function kpiCardMetrics(plan: BncActionPlan) {
  return (plan.metrics ?? []).filter((metric) => !metric.label.includes('종합'));
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString('ko-KR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
}

function formatWeight(value: number | null | undefined) {
  if (value === null || value === undefined) return '-';
  return `${Math.round(value * 100)}%`;
}

function formatScoreBreakdownMeta(item: NonNullable<BncActionPlan['scoreBreakdown']>[number]) {
  if (item.weight !== null && item.weight !== undefined) return `가중치 ${formatWeight(item.weight)}`;
  const parts = [
    item.confidence !== null && item.confidence !== undefined ? `신뢰도 ${formatWeight(item.confidence)}` : null,
    item.pctChange !== null && item.pctChange !== undefined ? `변화율 ${item.pctChange.toFixed(1)}%` : null,
    item.ciWidth !== null && item.ciWidth !== undefined ? `CI ${item.ciWidth}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '-';
}

function formatVerdict(value: string | null | undefined) {
  const labels: Record<string, string> = {
    baseline: '현재 기준',
    unchanged: '변화 없음',
    improved: '개선',
    degraded: '악화',
  };
  return value ? (labels[value] ?? value) : '-';
}

function formatDecisionStatus(value: string | null | undefined) {
  const labels: Record<string, string> = {
    clear_winner: '명확한 추천안',
    equivalent_candidates: '동등 후보',
    no_meaningful_effect: '유의미한 개선 없음',
    approved: '승인',
    rejected: '반려',
  };
  return value ? (labels[value] ?? value.replaceAll('_', ' ')) : '-';
}

function formatConfidenceLevel(value: string | null | undefined) {
  const labels: Record<string, string> = { low: '낮음', medium: '보통', high: '높음' };
  return value ? (labels[value] ?? value) : '-';
}

function formatTiebreaker(value: string | null | undefined) {
  const labels: Record<string, string> = {
    operational_effort: '운영 부담',
    release_interval_delta: 'Release Interval 변경폭',
    composite_score: '종합 점수',
    confidence: '신뢰도',
  };
  return value ? (labels[value] ?? value.replaceAll('_', ' ')) : '-';
}

function planDisplayLabel(plan: BncActionPlan, index: number) {
  return plan.actionLabel ?? planLabel(index);
}

const currentOptionSummary = computed(() => {
  if (props.payload?.currentOption?.summary) return props.payload.currentOption.summary;
  if (props.payload?.decisionInfo?.decisionCaveat) return props.payload.decisionInfo.decisionCaveat;
  return '현재 운영 조건을 유지하고 추가 대응안을 적용하지 않는 비교 기준입니다.';
});
const currentScenarioMetrics = computed(() => {
  if (noActionForecast.value?.metrics?.length) return noActionForecast.value.metrics;
  return currentOptionMetrics.value;
});

watch(
  () => props.payload,
  (payload) => {
    selectedPlanId.value =
      payload?.hitlStatus.selectedPlanId ?? payload?.plans.find((p) => p.recommended)?.planId ?? null;
    selectedOptionId.value = selectedPlanId.value ?? CURRENT_OPTION_ID;
    decisionPlanId.value = payload?.hitlStatus.selectedPlanId ?? selectedPlanId.value;
    selectedMapToolGroup.value = payload?.compareContext?.anchorToolgroup ?? null;
    localDecision.value = payload?.hitlStatus.latestDecision ?? null;
    rejectionNote.value = payload?.hitlStatus.comment ?? '';
    approvalNote.value = '';
    isPendingReject.value = false;
  },
  { immediate: true }
);

function handleSelectCurrentOption() {
  selectedOptionId.value = CURRENT_OPTION_ID;
  isPendingReject.value = false;
}

function handleSelectPlan(planId: string) {
  selectedOptionId.value = planId;
  selectedPlanId.value = planId;
  isPendingReject.value = false;
}

function handleSelectMapToolGroup(toolGroupName: string) {
  selectedMapToolGroup.value = toolGroupName;
}

function handleApprove() {
  if (!selectedPlanId.value || isCurrentOptionSelected.value) return;
  decisionPlanId.value = selectedPlanId.value;
  emit('decide', {
    decision: 'APPROVED',
    selectedPlanId: selectedPlanId.value,
    comment: approvalNote.value.trim() || null,
  });
  isPendingReject.value = false;
}

function handleRejectStart() {
  if (!selectedPlanId.value || isCurrentOptionSelected.value) return;
  isPendingReject.value = true;
}

function handleRejectCancel() {
  isPendingReject.value = false;
  rejectionNote.value = '';
}

function handleRejectConfirm() {
  if (!selectedPlanId.value || isCurrentOptionSelected.value || !rejectionNote.value.trim()) return;
  decisionPlanId.value = selectedPlanId.value;
  emit('decide', { decision: 'REJECTED', selectedPlanId: selectedPlanId.value, comment: rejectionNote.value.trim() });
  isPendingReject.value = false;
}
</script>

<template>
  <section class="bnc-solutions">
    <p v-if="loading" class="bnc-solutions__state">대응안을 불러오는 중입니다.</p>
    <p v-else-if="errorMessage" class="bnc-solutions__state bnc-solutions__state--error">{{ errorMessage }}</p>
    <p v-else-if="!payload" class="bnc-solutions__state">
      대응안이 아직 생성되지 않았습니다. Compare Agent 완료 후 표시됩니다.
    </p>

    <template v-else>
      <section class="bnc-solutions__baseline bnc-solutions__baseline--summary">
        <div class="bnc-solutions__baseline-hd">
          <span class="bnc-solutions__card-label bnc-solutions__card-label--base">판단</span>
          <div class="bnc-solutions__baseline-title">
            <h3>{{ decisionSummaryTitle }}</h3>
            <p>{{ decisionSummaryDescription }}</p>
          </div>
        </div>

        <div v-if="hasConclusion" class="bnc-solutions__conclusion-hd">
          <BaseBadge v-if="payload.decisionInfo" variant="info">
            {{ formatDecisionStatus(payload.decisionInfo.decisionStatus) }}
          </BaseBadge>
          <p v-if="conclusionHeadline" class="bnc-solutions__conclusion-headline">{{ conclusionHeadline }}</p>
        </div>

        <div class="bnc-solutions__conclusion-meta">
          <span
            v-if="compareContext?.severity"
            class="bnc-solutions__conclusion-chip bnc-solutions__conclusion-chip--danger"
          >
            {{ compareContext.severity }} 병목
          </span>
          <span
            v-if="noActionForecast?.getsWorse"
            class="bnc-solutions__conclusion-chip bnc-solutions__conclusion-chip--warn"
          >
            무조치 악화 예상
          </span>
          <span v-if="hasSimWarning" class="bnc-solutions__conclusion-chip bnc-solutions__conclusion-chip--warn">
            시뮬 검증 경고
          </span>
          <span v-if="recommendedPlan" class="bnc-solutions__conclusion-chip bnc-solutions__conclusion-chip--rec">
            {{ recommendationBadgeLabel(recommendedPlan) }} {{ recommendedPlan.actionLabel ?? '-' }}
          </span>
        </div>

        <ul class="bnc-solutions__metrics bnc-solutions__metrics--baseline">
          <li v-for="item in decisionSummaryItems" :key="item.label" class="bnc-solutions__metric-row">
            <span class="bnc-solutions__metric-name">{{ item.label }}</span>
            <span class="bnc-solutions__metric-result">
              <span class="bnc-solutions__metric-val">{{ item.value }}</span>
              <span v-if="item.caption" class="bnc-solutions__metric-delta">{{ item.caption }}</span>
            </span>
          </li>
        </ul>

        <div class="bnc-solutions__card-warn">
          <span aria-hidden="true">!</span>
          <p>
            숫자 상세는 중복 노출하지 않습니다. 현재 유지 카드를 선택하면 현재 KPI와 무조치 예측을 확인할 수 있습니다.
          </p>
        </div>
      </section>

      <section class="bnc-solutions__compare">
        <div class="bnc-solutions__compare-hd">
          <h3>대응안 비교</h3>
          <p>후보별 핵심 변경과 KPI 방향을 먼저 비교합니다.</p>
        </div>

        <div class="bnc-solutions__cards">
          <button
            type="button"
            class="bnc-solutions__card bnc-solutions__card--current"
            :class="{ 'bnc-solutions__card--selected': isCurrentOptionSelected }"
            @click="handleSelectCurrentOption"
          >
            <div class="bnc-solutions__card-hd">
              <div class="bnc-solutions__card-hd-main">
                <span
                  class="bnc-solutions__card-label bnc-solutions__card-label--base"
                  :class="{ 'bnc-solutions__card-label--sel': isCurrentOptionSelected }"
                  >현재</span
                >
                <span class="bnc-solutions__card-title">현재 유지</span>
              </div>
              <div class="bnc-solutions__card-badges">
                <span class="bnc-solutions__neutral-badge">비교 기준</span>
              </div>
            </div>

            <div class="bnc-solutions__card-body">
              <p class="bnc-solutions__card-change">
                추가 dispatch 변경 없이 현재 운영 조건을 유지하는 기준 시나리오입니다.
              </p>
              <p class="bnc-solutions__card-target">클릭하면 현재 KPI, 무조치 예측, 원인/확산 근거를 확인합니다.</p>
              <p v-if="baselineTargetToolGroups.length" class="bnc-solutions__card-target">
                대상 Tool Group {{ baselineTargetToolGroups.length.toLocaleString('ko-KR') }}개
              </p>
            </div>

            <div class="bnc-solutions__card-foot">
              <span v-if="isCurrentOptionSelected" class="bnc-solutions__card-selected-mark">✓ 선택됨</span>
              <span v-else class="bnc-solutions__card-hint">클릭하여 기준 확인</span>
            </div>
          </button>

          <!-- 대응안 카드 A / B / C -->
          <button
            v-for="(plan, i) in sortedPlans"
            :key="plan.planId"
            type="button"
            class="bnc-solutions__card bnc-solutions__card--plan"
            :class="[
              {
                'bnc-solutions__card--selected': plan.planId === selectedOptionId,
                'bnc-solutions__card--recommended': plan.recommended,
              },
              plan.recommended ? `bnc-solutions__card--recommended-${recommendationBadgeTone(plan)}` : '',
            ]"
            @click="handleSelectPlan(plan.planId)"
          >
            <div class="bnc-solutions__card-hd">
              <div class="bnc-solutions__card-hd-main">
                <span
                  class="bnc-solutions__card-label"
                  :class="{ 'bnc-solutions__card-label--sel': plan.planId === selectedOptionId }"
                  >{{ planDisplayLabel(plan, i) }}</span
                >
                <span class="bnc-solutions__card-title">{{ plan.actionKind ?? plan.title }}</span>
              </div>
              <div class="bnc-solutions__card-badges">
                <span v-if="isNeutralImpact(plan)" class="bnc-solutions__neutral-badge">KPI 변화 없음</span>
              </div>
            </div>

            <ul class="bnc-solutions__metrics">
              <li class="bnc-solutions__metrics-head">기준선 대비 변화</li>
              <li v-for="m in kpiCardMetrics(plan)" :key="m.label" class="bnc-solutions__metric-row">
                <span class="bnc-solutions__metric-name">{{ m.label }}</span>
                <span class="bnc-solutions__metric-result">
                  <span v-if="showMetricAfter(m)" class="bnc-solutions__metric-val">{{ m.after }}</span>
                  <span
                    v-if="isFlatDelta(m.delta)"
                    class="bnc-solutions__metric-delta bnc-solutions__metric-delta--flat"
                  >
                    변동 없음
                  </span>
                  <span
                    v-else
                    class="bnc-solutions__metric-delta"
                    :class="{
                      'bnc-solutions__metric-delta--good': isImprovement(m.label, m.delta) === true,
                      'bnc-solutions__metric-delta--bad': isImprovement(m.label, m.delta) === false,
                    }"
                    >{{ deltaArrow(m.delta) }} {{ m.delta }}</span
                  >
                </span>
              </li>
            </ul>

            <div class="bnc-solutions__card-body">
              <p class="bnc-solutions__card-change">{{ cardMainChange(plan) }}</p>
              <p v-if="targetGroupCount(plan)" class="bnc-solutions__card-target">
                대상 Tool Group {{ targetGroupCount(plan).toLocaleString('ko-KR') }}개
              </p>
            </div>

            <span
              v-if="plan.recommended"
              class="bnc-solutions__rec-flag"
              :class="`bnc-solutions__rec-flag--${recommendationBadgeTone(plan)}`"
            >
              {{ recommendationBadgeLabel(plan) }}
            </span>

            <div class="bnc-solutions__card-foot">
              <span v-if="plan.planId === selectedOptionId" class="bnc-solutions__card-selected-mark">✓ 선택됨</span>
              <span v-else class="bnc-solutions__card-hint">클릭하여 선택</span>
            </div>
          </button>
        </div>
      </section>

      <section v-if="isCurrentOptionSelected || selectedPlan" class="bnc-solutions__selected-detail">
        <template v-if="isCurrentOptionSelected">
          <div class="bnc-solutions__selected-detail-hd">
            <BaseBadge :variant="noActionForecast?.getsWorse ? 'warning' : 'info'">무조치 시나리오</BaseBadge>
            <strong class="bnc-solutions__selected-plan">{{ currentOptionTitle }} · 현재 유지 상세</strong>
            <div v-if="payload.currentOption?.compositeScore !== undefined" class="bnc-solutions__selected-score">
              <span>기준 점수</span>
              <strong>{{ formatScore(payload.currentOption?.compositeScore) }}</strong>
              <small>{{ payload.currentOption?.scoreVerdict ?? '비교 기준' }}</small>
            </div>
          </div>

          <div class="bnc-solutions__detail-grid">
            <article class="bnc-solutions__detail-card bnc-solutions__detail-card--current">
              <span class="bnc-solutions__detail-label">현재 유지 의미</span>
              <p>{{ currentOptionSummary }}</p>
              <p class="bnc-solutions__detail-note">
                이 항목은 조치 전 기준선입니다. 아래 표에서 현재 값과 무조치 예측을 확인한 뒤 A/B 대응안의 변화량을
                비교합니다.
              </p>
            </article>

            <article
              v-if="currentScenarioMetrics.length"
              class="bnc-solutions__detail-card bnc-solutions__detail-card--forecast bnc-solutions__detail-card--wide"
            >
              <span class="bnc-solutions__detail-label">
                {{
                  noActionForecast
                    ? `현재 유지 시 ${compareContext?.horizonMin ?? 120}분 예측 · ${noActionForecast.label}`
                    : '현재 상태 지표'
                }}
              </span>
              <dl class="bnc-solutions__detail-facts bnc-solutions__detail-facts--scenario">
                <div v-for="item in currentScenarioMetrics" :key="item.label">
                  <dt>{{ item.label }}</dt>
                  <dd>{{ item.value }}</dd>
                  <small v-if="item.caption">{{ item.caption }}</small>
                </div>
              </dl>
            </article>

            <BncTargetMap
              v-if="hasTargetMapData"
              class="bnc-solutions__detail-card--wide"
              :title="targetMapTitle"
              :anchor-tool-group="compareContext?.anchorToolgroup"
              :target-tool-groups="visibleMapTargetToolGroups"
              :cause-tool-groups="visibleMapCauseToolGroups"
              :affected-tool-groups="visibleMapAffectedToolGroups"
              :selected-tool-group="selectedMapToolGroup"
              @select="handleSelectMapToolGroup"
            />

            <article
              v-if="compareContext?.causeSummary || compareContext?.cascade"
              class="bnc-solutions__detail-card bnc-solutions__detail-card--cause"
            >
              <span class="bnc-solutions__detail-label">원인 및 확산 요약</span>
              <p v-if="compareContext.causeSummary">{{ compareContext.causeSummary }}</p>
              <div v-if="compareContext.upstreamSuspects?.length" class="bnc-solutions__target-chip-list">
                <span v-for="target in compareContext.upstreamSuspects" :key="target">원인 후보 {{ target }}</span>
              </div>
              <dl v-if="compareContext.cascade" class="bnc-solutions__detail-facts">
                <div>
                  <dt>영향 TG</dt>
                  <dd>{{ compareContext.cascade.affectedToolgroups.join(', ') || '-' }}</dd>
                </div>
                <div>
                  <dt>위험 Lot</dt>
                  <dd>{{ compareContext.cascade.atRiskLots?.toLocaleString('ko-KR') ?? '-' }}</dd>
                </div>
                <div>
                  <dt>CT 증가</dt>
                  <dd>{{ compareContext.cascade.ctIncreaseMin ?? '-' }}분</dd>
                </div>
                <div>
                  <dt>영향 점수</dt>
                  <dd>{{ compareContext.cascade.impactScore ?? '-' }}</dd>
                </div>
              </dl>
            </article>

            <article
              v-if="dataQualityWarnings.length"
              class="bnc-solutions__detail-card bnc-solutions__detail-card--warning"
            >
              <span class="bnc-solutions__detail-label">데이터 품질 경고</span>
              <ul class="bnc-solutions__detail-list">
                <li v-for="warning in dataQualityWarnings" :key="`${warning.code ?? warning.message}`">
                  {{ warning.message }}
                  <small v-if="warning.suspectComponent">{{ warning.suspectComponent }}</small>
                </li>
              </ul>
            </article>
          </div>

          <article v-if="payload.decisionInfo" class="bnc-solutions__detail-card bnc-solutions__detail-card--decision">
            <span class="bnc-solutions__detail-label">현재 기준 비교 판정</span>
            <p>{{ payload.decisionInfo.decisionCaveat }}</p>
            <dl class="bnc-solutions__detail-facts">
              <div>
                <dt>판정 상태</dt>
                <dd>{{ formatDecisionStatus(payload.decisionInfo.decisionStatus) }}</dd>
              </div>
              <div>
                <dt>Top 후보</dt>
                <dd>{{ payload.decisionInfo.topLabel }}</dd>
              </div>
              <div>
                <dt>동률 후보</dt>
                <dd>{{ payload.decisionInfo.equivalentSet.join(', ') }}</dd>
              </div>
              <div>
                <dt>타이브레이커</dt>
                <dd>{{ formatTiebreaker(payload.decisionInfo.tiebreakerUsed) }}</dd>
              </div>
            </dl>
          </article>

          <details v-if="payload.currentOption?.scoreBreakdown?.length" class="bnc-solutions__model-evidence">
            <summary>
              <span>모델 평가 근거 보기</span>
              <small>현재 기준 점수 산출 내역</small>
            </summary>
            <p class="bnc-solutions__detail-note">
              운영 판단용 핵심 지표는 위에서 확인하고, 이 영역은 모델 산출값을 추적하거나 검증할 때 참고합니다.
            </p>
            <ul class="bnc-solutions__score-list">
              <li v-for="item in payload.currentOption.scoreBreakdown" :key="item.key">
                <span>{{ item.label }}</span>
                <strong>{{ formatVerdict(item.verdict) }}</strong>
                <small>{{ formatScoreBreakdownMeta(item) }}</small>
              </li>
            </ul>
          </details>
        </template>

        <template v-else-if="selectedPlan">
          <div class="bnc-solutions__selected-detail-hd">
            <BaseBadge :variant="selectedPlan.recommended ? recommendationEvidenceVariant : 'info'">
              {{ selectedPlan.recommended ? recommendationBadgeLabel(selectedPlan) : '선택안' }}
            </BaseBadge>
            <strong class="bnc-solutions__selected-plan">
              {{ selectedPlan.actionLabel ?? '-' }} · {{ selectedPlan.actionKind ?? selectedPlan.title }}
            </strong>
            <div class="bnc-solutions__selected-score">
              <span>종합 점수</span>
              <strong>{{ formatScore(selectedPlan.compositeScore) }}</strong>
              <small>{{ selectedPlan.scoreVerdict ?? selectedPlanImpactText }}</small>
            </div>
          </div>

          <div class="bnc-solutions__detail-grid">
            <article class="bnc-solutions__detail-card">
              <span class="bnc-solutions__detail-label">적용 변경</span>
              <ul v-if="selectedOperationItems.length" class="bnc-solutions__detail-list">
                <li v-for="item in selectedOperationItems" :key="item">{{ item }}</li>
              </ul>
              <p v-else>{{ selectedPlan.summary }}</p>
              <div v-if="selectedPlan.actionMetadata" class="bnc-solutions__plan-meta">
                <span v-if="selectedPlan.actionMetadata.descriptionKo">{{
                  selectedPlan.actionMetadata.descriptionKo
                }}</span>
                <span>운영 부담 {{ selectedPlan.actionMetadata.effort ?? '-' }}</span>
                <span>범위 {{ selectedPlan.actionMetadata.scope ?? '-' }}</span>
                <span>되돌림 {{ selectedPlan.actionMetadata.reversibility ?? '-' }}</span>
              </div>
            </article>

            <BncTargetMap
              v-if="hasTargetMapData"
              class="bnc-solutions__detail-card--wide"
              :title="targetMapTitle"
              :anchor-tool-group="compareContext?.anchorToolgroup"
              :target-tool-groups="visibleMapTargetToolGroups"
              :cause-tool-groups="visibleMapCauseToolGroups"
              :affected-tool-groups="visibleMapAffectedToolGroups"
              :selected-tool-group="selectedMapToolGroup"
              @select="handleSelectMapToolGroup"
            />
          </div>

          <!-- 기준 선택안 선택 시: 선택 근거 -->
          <article
            v-if="!isSelectionOffRecommendation && recommendationReasonParagraphs.length"
            class="bnc-solutions__detail-card bnc-solutions__detail-card--recommendation"
          >
            <div class="bnc-solutions__detail-card-hd">
              <BaseBadge :variant="recommendationEvidenceVariant">{{ recommendationEvidenceLabel }}</BaseBadge>
              <strong
                >{{ recommendedPlan?.actionLabel ?? '-' }} ·
                {{ recommendedPlan?.actionKind ?? recommendedPlan?.title }}</strong
              >
            </div>
            <p class="bnc-solutions__recommendation-context">{{ selectedPlanRecommendationText }}</p>
            <div
              v-if="recommendationWhyRecommended?.explanation || recommendationWhyRecommended?.tiebreakerChain?.length"
              class="bnc-solutions__reason-detail"
            >
              <span>선택 로직</span>
              <p v-if="recommendationWhyRecommended?.explanation">{{ recommendationWhyRecommended.explanation }}</p>
              <p v-if="recommendationWhyRecommended?.tiebreakerChain?.length">
                <strong>타이브레이커</strong> {{ recommendationWhyRecommended.tiebreakerChain.join(' → ') }}
              </p>
            </div>
            <div class="bnc-solutions__reason-body">
              <p v-for="paragraph in recommendationReasonParagraphs" :key="paragraph">{{ paragraph }}</p>
            </div>
            <div v-if="recommendationWhyNotOthers.length" class="bnc-solutions__reason-detail">
              <span>다른 후보 제외 사유</span>
              <div v-for="item in recommendationWhyNotOthers" :key="item.label" class="bnc-solutions__exclusion-reason">
                <p>
                  <strong>{{ item.label }}</strong> {{ item.reason }}
                </p>
                <small v-if="item.evidence.length">{{ item.evidence.join(' · ') }}</small>
              </div>
            </div>
            <div v-if="recommendationCaveats.length" class="bnc-solutions__reason-detail">
              <span>주의 사항</span>
              <p v-for="caveat in recommendationCaveats" :key="caveat">{{ caveat }}</p>
            </div>
          </article>

          <!-- 비추천안 선택 시: 이 대응안을 선택하지 않은 이유만 -->
          <article
            v-else-if="isSelectionOffRecommendation && selectedPlan"
            class="bnc-solutions__detail-card bnc-solutions__detail-card--exclusion"
          >
            <div class="bnc-solutions__detail-card-hd">
              <BaseBadge variant="warning">선택안 검토</BaseBadge>
              <strong
                >{{ selectedPlan.actionLabel ?? '-' }} · {{ selectedPlan.actionKind ?? selectedPlan.title }}</strong
              >
            </div>
            <p class="bnc-solutions__recommendation-context">
              기준 선택안은 {{ recommendedPlan?.actionLabel ?? '-' }}입니다. 이 대응안을 선택하지 않은 이유는 다음과
              같습니다.
            </p>
            <div class="bnc-solutions__reason-body">
              <p v-if="selectedPlanExclusionReason">{{ selectedPlanExclusionReason }}</p>
              <p v-else>이 대응안에 대한 별도 제외 사유가 제공되지 않았습니다.</p>
            </div>
            <div v-if="recommendationCaveats.length" class="bnc-solutions__reason-detail">
              <span>주의 사항</span>
              <p v-for="caveat in recommendationCaveats" :key="caveat">{{ caveat }}</p>
            </div>
          </article>

          <article
            v-if="hasRecommendationRunbook"
            class="bnc-solutions__detail-card bnc-solutions__detail-card--runbook"
          >
            <div class="bnc-solutions__detail-card-hd">
              <BaseBadge variant="info">운영 체크</BaseBadge>
              <strong>추천안 적용 후 확인 항목</strong>
            </div>

            <div class="bnc-solutions__runbook-grid">
              <section v-if="recommendationImmediateActions.length">
                <span class="bnc-solutions__detail-label">즉시 조치</span>
                <ul class="bnc-solutions__detail-list">
                  <li v-for="item in recommendationImmediateActions" :key="item">{{ item }}</li>
                </ul>
              </section>

              <section v-if="recommendationMonitoringKpis.length">
                <span class="bnc-solutions__detail-label">모니터링 KPI</span>
                <ul class="bnc-solutions__detail-list">
                  <li v-for="item in recommendationMonitoringKpis" :key="item">{{ item }}</li>
                </ul>
              </section>
            </div>

            <p v-if="recommendationRollbackCondition" class="bnc-solutions__rollback-note">
              <strong>원복 조건</strong>
              {{ recommendationRollbackCondition }}
            </p>
            <p v-if="shouldShowMonitoringGap" class="bnc-solutions__rollback-note bnc-solutions__rollback-note--danger">
              <strong>운영 실행 전 확인 필요</strong>
              조치 후 모니터링 KPI 또는 원복 조건이 충분히 제공되지 않았습니다. 현업 승인 전 기준을 지정해야 합니다.
            </p>
          </article>

          <div class="bnc-solutions__detail-bottom-grid">
            <article
              v-if="payload.decisionInfo"
              class="bnc-solutions__detail-card bnc-solutions__detail-card--decision"
            >
              <span class="bnc-solutions__detail-label">비교 판정</span>
              <p>{{ payload.decisionInfo.decisionCaveat }}</p>
              <dl class="bnc-solutions__detail-facts">
                <div>
                  <dt>판정 상태</dt>
                  <dd>{{ formatDecisionStatus(payload.decisionInfo.decisionStatus) }}</dd>
                </div>
                <div>
                  <dt>Top 후보</dt>
                  <dd>{{ payload.decisionInfo.topLabel }}</dd>
                </div>
                <div>
                  <dt>동률 후보</dt>
                  <dd>{{ payload.decisionInfo.equivalentSet.join(', ') }}</dd>
                </div>
                <div>
                  <dt>타이브레이커</dt>
                  <dd>{{ formatTiebreaker(payload.decisionInfo.tiebreakerUsed) }}</dd>
                </div>
              </dl>
            </article>

            <article v-if="decisionMeta" class="bnc-solutions__detail-card bnc-solutions__detail-card--approval">
              <div class="bnc-solutions__detail-card-hd">
                <span class="bnc-solutions__detail-label">승인 정보</span>
                <BaseBadge :variant="decisionMeta.status.includes('반려') ? 'danger' : 'success'">
                  {{ decisionMeta.status }}
                </BaseBadge>
                <span v-if="decisionMeta.isAuto" class="bnc-solutions__auto-chip">자동 처리</span>
              </div>
              <p>
                <strong
                  >{{ decisionPlan?.actionLabel ?? '-' }} ·
                  {{ decisionPlan?.actionKind ?? decisionPlan?.title }}</strong
                >
                대응안이 {{ decisionMeta.status }} 처리되었습니다.
                <span v-if="decisionMeta.isAuto"> 운영 실행 전 현업 확인은 별도로 필요합니다.</span>
              </p>
              <dl class="bnc-solutions__detail-facts">
                <div>
                  <dt>결정자</dt>
                  <dd>{{ decisionMeta.by }}</dd>
                </div>
                <div v-if="decisionMeta.role">
                  <dt>역할</dt>
                  <dd>{{ decisionMeta.role }}</dd>
                </div>
                <div>
                  <dt>결정시각</dt>
                  <dd>{{ decisionMeta.at }}</dd>
                </div>
                <div>
                  <dt>의견</dt>
                  <dd>{{ decisionMeta.comment }}</dd>
                </div>
                <div v-if="decisionMeta.status.includes('반려') && decisionMeta.rejectionReason">
                  <dt>반려 사유</dt>
                  <dd>{{ decisionMeta.rejectionReason }}</dd>
                </div>
              </dl>
            </article>
          </div>

          <details v-if="selectedPlan.scoreBreakdown?.length" class="bnc-solutions__model-evidence">
            <summary>
              <span>모델 평가 근거 보기</span>
              <small>점수 산출/검증용</small>
            </summary>
            <p class="bnc-solutions__detail-note">
              현장 실행 판단은 위의 KPI 변화, 선택 로직, 운영 체크를 우선합니다. 이 내역은 에이전트 점수 산출을 검증할
              때 확인합니다.
            </p>
            <ul class="bnc-solutions__score-list">
              <li v-for="item in selectedPlan.scoreBreakdown" :key="item.key">
                <span>{{ item.label }}</span>
                <strong>{{ formatVerdict(item.verdict) }}</strong>
                <small>{{ formatScoreBreakdownMeta(item) }}</small>
              </li>
            </ul>
          </details>
        </template>
      </section>

      <!-- HITL 섹션 -->
      <section
        v-if="localDecision === null"
        class="bnc-solutions__hitl"
        :class="{
          'bnc-solutions__hitl--pending-reject': isPendingReject,
        }"
      >
        <!-- 반려 사유 입력 중 -->
        <template v-if="isPendingReject">
          <div class="bnc-solutions__hitl-header">
            <div>
              <h3>반려 사유 입력</h3>
              <p>
                선택된 대응안: <strong>{{ selectedPlan?.title }}</strong>
              </p>
            </div>
          </div>
          <div class="bnc-solutions__hitl-reject-form">
            <label class="bnc-solutions__hitl-label" for="bnc-rejection-note">
              반려 사유 <span class="bnc-solutions__hitl-required" aria-hidden="true">*</span>
            </label>
            <textarea
              id="bnc-rejection-note"
              v-model="rejectionNote"
              class="bnc-solutions__hitl-textarea"
              placeholder="현장 담당자 확인 후 반려 사유를 작성하세요"
              rows="3"
            />
            <div class="bnc-solutions__hitl-actions">
              <BaseButton variant="ghost" @click="handleRejectCancel">취소</BaseButton>
              <button
                type="button"
                class="bnc-solutions__btn-reject-confirm"
                :disabled="!rejectionNote.trim()"
                @click="handleRejectConfirm"
              >
                ✗ 반려 확정
              </button>
            </div>
          </div>
        </template>

        <!-- 대기 중 -->
        <template v-else>
          <div class="bnc-solutions__hitl-header">
            <div>
              <h3>HITL 검토 및 승인</h3>
              <p v-if="isCurrentOptionSelected" class="bnc-solutions__hitl-hint">
                현재 유지는 비교 기준입니다. 승인할 A/B 대응안을 선택하세요.
              </p>
              <p v-else-if="selectedPlan">
                선택된 대응안: <strong>{{ selectedPlan.title }}</strong>
              </p>
              <p v-else class="bnc-solutions__hitl-hint">위 카드에서 대응안을 선택하세요.</p>
              <p v-if="isSelectionOffRecommendation" class="bnc-solutions__hitl-warn">
                ⚠ 기준 선택안({{ recommendedPlan?.actionLabel ?? '-' }})과 다른 대응안을 선택했습니다.
              </p>
            </div>
          </div>
          <div class="bnc-solutions__hitl-approve-form">
            <label class="bnc-solutions__hitl-label" for="bnc-approval-note">
              비고 <span class="bnc-solutions__hitl-optional">(선택)</span>
            </label>
            <textarea
              id="bnc-approval-note"
              v-model="approvalNote"
              class="bnc-solutions__hitl-textarea"
              placeholder="승인 비고를 남길 수 있습니다 (선택)"
              rows="2"
              :disabled="!selectedPlanId || isCurrentOptionSelected"
            />
            <div class="bnc-solutions__hitl-actions">
              <BaseButton :disabled="!selectedPlanId || isCurrentOptionSelected" @click="handleApprove"
                >✓ 승인</BaseButton
              >
              <BaseButton
                variant="ghost"
                :disabled="!selectedPlanId || isCurrentOptionSelected"
                @click="handleRejectStart"
              >
                ✗ 반려
              </BaseButton>
            </div>
          </div>
        </template>
      </section>
    </template>
  </section>
</template>

<style scoped>
.bnc-solutions {
  display: grid;
  grid-template-columns: minmax(0, 1fr); /* 단일 컬럼을 0~1fr로 묶어 내부 카드 그리드가 셀 폭에 맞게 수축 */
  min-width: 0;
  gap: var(--space-4);
  padding: var(--space-5);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-top: none;
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

.bnc-solutions__state {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
}
.bnc-solutions__state--error {
  color: var(--color-status-danger);
}

/* ── 현재 상태 기준선 ───────────────────────────────────────── */
.bnc-solutions__baseline {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-bg-page);
}

.bnc-solutions__baseline--summary {
  border-color: color-mix(in srgb, var(--color-action-primary) 18%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-action-primary) 3%, var(--color-bg-page));
}

.bnc-solutions__baseline-hd {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  min-width: 0;
}

.bnc-solutions__baseline-title {
  min-width: 0;
}

.bnc-solutions__baseline-title h3 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  line-height: 1.35;
}

.bnc-solutions__baseline-title p {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
  word-break: keep-all;
}

.bnc-solutions__metrics--baseline {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
  padding: 0;
  border: none;
}

.bnc-solutions__metrics--baseline .bnc-solutions__metric-row {
  align-items: flex-start;
  min-width: 0;
  padding: var(--space-2);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
}

.bnc-solutions__metrics--baseline .bnc-solutions__metric-name {
  white-space: normal;
}

.bnc-solutions__metrics--baseline .bnc-solutions__metric-delta {
  font-size: var(--font-size-xs);
  font-weight: 400;
  color: var(--color-fg-muted);
}

.bnc-solutions__baseline .bnc-solutions__card-warn {
  padding: var(--space-2) var(--space-3);
  border: 1px solid color-mix(in srgb, var(--color-status-warning) 24%, transparent);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-status-warning) 8%, var(--color-bg-surface));
}

/* ── 대응안 비교 영역 ───────────────────────────────────────── */
.bnc-solutions__compare {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.bnc-solutions__compare-hd {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
  min-width: 0;
}

.bnc-solutions__compare-hd h3 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.bnc-solutions__compare-hd p {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
  text-align: right;
  word-break: keep-all;
}

/* ── 비교 결론 요약 ───────────────────────────────────────── */
.bnc-solutions__conclusion {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-3) var(--space-4);
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 22%, var(--color-border-default));
  border-left: 4px solid var(--color-action-primary);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-action-primary) 5%, var(--color-bg-surface));
}

.bnc-solutions__conclusion-hd {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-2);
  min-width: 0;
}

.bnc-solutions__conclusion-headline {
  margin: 0;
  min-width: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.bnc-solutions__conclusion-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.bnc-solutions__conclusion-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-pill);
  background: var(--color-bg-surface);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}
.bnc-solutions__conclusion-chip--rec {
  border-color: color-mix(in srgb, var(--color-status-success) 40%, transparent);
  background: color-mix(in srgb, var(--color-status-success) 10%, var(--color-bg-surface));
  color: var(--color-status-success);
}

.bnc-solutions__conclusion-chip--warn {
  border-color: color-mix(in srgb, var(--color-status-warning) 45%, transparent);
  background: color-mix(in srgb, var(--color-status-warning) 12%, var(--color-bg-surface));
  color: var(--color-status-warning);
}

.bnc-solutions__conclusion-chip--danger {
  border-color: color-mix(in srgb, var(--color-status-danger) 38%, transparent);
  background: color-mix(in srgb, var(--color-status-danger) 9%, var(--color-bg-surface));
  color: var(--color-status-danger);
}

/* ── 카드 그리드 ───────────────────────────────────────── */
.bnc-solutions__cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
  align-items: stretch; /* 같은 행 카드 높이 통일 */
}

/* ── 공통 카드 ───────────────────────────────────────── */
.bnc-solutions__card {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 0;
  min-width: 0; /* grid item이 트랙에 맞게 축소되도록 보장 */
  border-radius: var(--radius-lg);
  overflow: visible;
  font: inherit;
  text-align: left;
}

/* 베이스라인 카드 */
.bnc-solutions__card--baseline {
  border: 1px solid var(--color-border-subtle);
  background: var(--color-bg-page);
}

/* 현재 유지 비교 카드 */
.bnc-solutions__card--current {
  position: relative;
  grid-template-rows: auto auto 1fr auto;
  border: 1.5px solid color-mix(in srgb, var(--color-status-warning) 30%, var(--color-border-default));
  background: color-mix(in srgb, var(--color-status-warning) 5%, var(--color-bg-card));
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-fast);
}
.bnc-solutions__card--current:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--color-status-warning) 56%, var(--color-border-default));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-status-warning) 16%, transparent);
}

/* 플랜 카드 */
.bnc-solutions__card--plan {
  position: relative;
  grid-template-rows: auto auto 1fr auto; /* hd · KPI · 본문(가변) · foot */
  border: 1.5px solid var(--color-border-default);
  background: var(--color-bg-card);
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-fast);
}
.bnc-solutions__card--plan:hover:not(:disabled) {
  border-color: var(--color-action-primary-border);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-action-primary) 12%, transparent);
}
.bnc-solutions__card--plan:disabled {
  cursor: default;
}

/* 추천/잠정 선택 카드 — 판정 성격에 따라 accent 색상 분리 */
.bnc-solutions__card--recommended {
  border-color: color-mix(in srgb, var(--color-status-success) 45%, var(--color-border-default));
  border-top: 3px solid var(--color-status-success);
  background: color-mix(in srgb, var(--color-status-success) 4%, var(--color-bg-card));
}

.bnc-solutions__card--recommended-success {
  border-color: color-mix(in srgb, var(--color-status-success) 45%, var(--color-border-default));
  border-top-color: var(--color-status-success);
  background: color-mix(in srgb, var(--color-status-success) 4%, var(--color-bg-card));
}

.bnc-solutions__card--recommended-info {
  border-color: color-mix(in srgb, #2563eb 48%, var(--color-border-default));
  border-top-color: #2563eb;
  background: color-mix(in srgb, #2563eb 5%, var(--color-bg-card));
}

.bnc-solutions__card--recommended-warning {
  border-color: color-mix(in srgb, var(--color-status-warning) 48%, var(--color-border-default));
  border-top-color: var(--color-status-warning);
  background: color-mix(in srgb, var(--color-status-warning) 6%, var(--color-bg-card));
}

/* 추천/잠정 선택 코너 플래그 */
.bnc-solutions__rec-flag {
  position: absolute;
  top: calc(-1 * var(--space-2));
  right: var(--space-3);
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px var(--space-2);
  border-radius: var(--radius-pill);
  background: var(--color-status-success);
  color: #fff;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.01em;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-status-success) 38%, transparent);
}

.bnc-solutions__rec-flag--success {
  background: var(--color-status-success);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-status-success) 38%, transparent);
}

.bnc-solutions__rec-flag--info {
  background: #2563eb;
  box-shadow: 0 2px 8px #1d4ed840;
}

.bnc-solutions__rec-flag--warning {
  background: var(--color-status-warning);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-status-warning) 36%, transparent);
}

/* 선택된 카드 */
.bnc-solutions__card--selected {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow:
    0 0 0 2px #2563eb,
    0 10px 24px #1d4ed81f;
}

/* ── 카드 헤더 ───────────────────────────────────────── */
.bnc-solutions__card-hd {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding: var(--space-3) var(--space-3) var(--space-2);
  min-height: auto;
  box-sizing: border-box;
}

.bnc-solutions__card-hd-main {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  flex: 1 1 150px;
}

.bnc-solutions__card-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
  border: 1px solid var(--color-border-default);
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.bnc-solutions__card-label--base {
  font-size: var(--font-size-xs);
  letter-spacing: 0;
}

.bnc-solutions__card-label--sel {
  background: #2563eb;
  border-color: #2563eb;
  color: #fff;
}

.bnc-solutions__card-title {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.3;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.bnc-solutions__card-badges {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: var(--space-1);
  flex: 0 1 120px;
  max-width: 100%;
}

.bnc-solutions__neutral-badge {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-pill);
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

/* ── 지표 행 ───────────────────────────────────────── */
.bnc-solutions__metrics {
  list-style: none;
  margin: 0;
  padding: var(--space-1) var(--space-3) var(--space-2);
  border-top: 1px solid var(--color-border-subtle);
  border-bottom: 1px solid var(--color-border-subtle);
  display: grid;
  gap: 1px;
}

.bnc-solutions__metric-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
  padding: var(--space-1) 0;
}

.bnc-solutions__metric-name {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
  flex-shrink: 0;
}

.bnc-solutions__metric-result {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: var(--space-1);
  min-width: 0;
  flex: 1 1 140px;
  flex-wrap: wrap;
  text-align: right;
}

.bnc-solutions__metric-val {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  text-align: right;
  overflow-wrap: anywhere;
}

.bnc-solutions__metrics-head {
  margin-bottom: 2px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__metric-delta {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-fg-strong);
  overflow-wrap: anywhere;
}
.bnc-solutions__metric-delta--good {
  color: var(--color-status-success);
}
.bnc-solutions__metric-delta--bad {
  color: var(--color-status-danger);
}
.bnc-solutions__metric-delta--flat {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: 400;
}

/* ── 카드 하단 영역 ───────────────────────────────────────── */
.bnc-solutions__card-body {
  padding: var(--space-3);
  display: grid;
  gap: var(--space-3);
}

.bnc-solutions__card-summary {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
  overflow-wrap: anywhere;
  word-break: keep-all;
}

.bnc-solutions__card-change {
  min-height: 44px;
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.55;
  overflow-wrap: anywhere;
  word-break: keep-all;
}

.bnc-solutions__card-target {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__mini-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__operation-block,
.bnc-solutions__target-block {
  display: grid;
  gap: var(--space-1);
}

.bnc-solutions__operation-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-1);
}

.bnc-solutions__operation-list li {
  position: relative;
  padding-left: var(--space-3);
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: keep-all;
}

.bnc-solutions__operation-list li::before {
  position: absolute;
  left: 0;
  top: 0.62em;
  width: 4px;
  height: 4px;
  border-radius: 999px;
  background: var(--color-action-primary);
  content: '';
}

.bnc-solutions__target-block p {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.bnc-solutions__plan-meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.bnc-solutions__plan-meta span {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-pill);
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__score-block {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-2);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
}

.bnc-solutions__score-block-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.bnc-solutions__score-block-hd strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
}

.bnc-solutions__score-block ul {
  display: grid;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.bnc-solutions__score-block li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: var(--space-1);
  align-items: center;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-solutions__score-block li > span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.bnc-solutions__score-block li > strong {
  color: var(--color-fg-strong);
}

.bnc-solutions__score-block li > small {
  color: var(--color-fg-muted);
  font: inherit;
}

.bnc-solutions__card-foot {
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border-subtle);
  min-height: 32px;
  display: flex;
  align-items: center;
}

.bnc-solutions__card-selected-mark {
  color: #1d4ed8;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__card-hint {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.bnc-solutions__card--plan:hover .bnc-solutions__card-hint,
.bnc-solutions__card--current:hover .bnc-solutions__card-hint {
  opacity: 1;
}

/* ── 베이스라인 경고 ───────────────────────────────────────── */
.bnc-solutions__card-warn {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  color: var(--color-status-warning);
  font-size: var(--font-size-xs);
}

.bnc-solutions__card-warn p {
  margin: 0;
  line-height: 1.4;
}

/* ── 선택 대응안 상세 ───────────────────────────────────────── */
.bnc-solutions__selected-detail {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
  padding: var(--space-4);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-surface);
}

.bnc-solutions__selected-detail-hd {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2) var(--space-3);
}

.bnc-solutions__selected-plan {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  word-break: keep-all;
}

.bnc-solutions__selected-score {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-left: auto;
  padding: var(--space-1) var(--space-3);
  border: 1px solid color-mix(in srgb, #2563eb 22%, var(--color-border-subtle));
  border-radius: var(--radius-pill);
  background: #eff6ff;
}

.bnc-solutions__selected-score span,
.bnc-solutions__selected-score small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__selected-score strong {
  color: #1d4ed8;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-black);
}

.bnc-solutions__detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--space-3);
}

.bnc-solutions__detail-bottom-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr); /* 판정·승인 정보를 가로로 길게(풀폭) 적층 */
  gap: var(--space-3);
}

.bnc-solutions__detail-card {
  display: grid;
  align-content: start;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
}

.bnc-solutions__target-text {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  word-break: keep-all;
  overflow-wrap: anywhere;
}

.bnc-solutions__target-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  min-width: 0;
  max-height: 220px;
  overflow: auto;
}

.bnc-solutions__target-chip-list span {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  max-width: 100%;
  padding: 0 var(--space-2);
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 16%, var(--color-border-default));
  border-radius: var(--radius-pill);
  background: color-mix(in srgb, var(--color-action-primary) 5%, var(--color-bg-surface));
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  overflow-wrap: anywhere;
}

.bnc-solutions__detail-card--current {
  border-color: color-mix(in srgb, var(--color-status-warning) 24%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-status-warning) 5%, var(--color-bg-card));
}

.bnc-solutions__detail-card--forecast {
  border-color: color-mix(in srgb, var(--color-status-warning) 24%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-status-warning) 5%, var(--color-bg-card));
}

.bnc-solutions__detail-card--wide {
  grid-column: span 2;
}

.bnc-solutions__detail-card--cause {
  border-color: color-mix(in srgb, var(--color-action-primary) 20%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-action-primary) 4%, var(--color-bg-card));
}

.bnc-solutions__detail-card--warning {
  border-color: color-mix(in srgb, var(--color-status-danger) 30%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-status-danger) 5%, var(--color-bg-card));
}

.bnc-solutions__detail-card--recommendation {
  border-color: color-mix(in srgb, var(--color-status-success) 28%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-status-success) 6%, var(--color-bg-card));
}

.bnc-solutions__detail-card--exclusion {
  border-color: color-mix(in srgb, var(--color-status-warning) 26%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-status-warning) 6%, var(--color-bg-card));
}

.bnc-solutions__detail-card--decision {
  border-color: color-mix(in srgb, #2563eb 22%, var(--color-border-subtle));
}

.bnc-solutions__detail-card--runbook {
  border-color: color-mix(in srgb, var(--color-action-primary) 24%, var(--color-border-subtle));
  background: color-mix(in srgb, var(--color-action-primary) 4%, var(--color-bg-card));
}

.bnc-solutions__detail-card--approval {
  border-color: color-mix(in srgb, var(--color-status-success) 24%, var(--color-border-subtle));
}

.bnc-solutions__detail-card p {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.65;
  word-break: keep-all;
}

.bnc-solutions__detail-card-hd {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.bnc-solutions__detail-card-hd strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

.bnc-solutions__detail-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.bnc-solutions__auto-chip {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-pill);
  background: var(--color-bg-page);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__detail-list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.bnc-solutions__detail-list li {
  position: relative;
  padding-left: var(--space-4);
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  line-height: 1.55;
  word-break: keep-all;
}

.bnc-solutions__detail-list li::before {
  position: absolute;
  top: 0.7em;
  left: 0;
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: #2563eb;
  content: '';
}

.bnc-solutions__detail-list small {
  display: block;
  margin-top: 2px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.bnc-solutions__runbook-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

.bnc-solutions__runbook-grid section {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  min-width: 0;
}

.bnc-solutions__rollback-note {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3);
  border: 1px solid color-mix(in srgb, var(--color-status-warning) 28%, transparent);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-status-warning) 8%, var(--color-bg-card));
}

.bnc-solutions__rollback-note strong {
  color: var(--color-status-warning);
}

.bnc-solutions__rollback-note--danger {
  border-color: color-mix(in srgb, var(--color-status-danger) 28%, transparent);
  background: color-mix(in srgb, var(--color-status-danger) 7%, var(--color-bg-card));
}

.bnc-solutions__rollback-note--danger strong {
  color: var(--color-status-danger);
}

.bnc-solutions__detail-note {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

.bnc-solutions__score-list {
  display: grid;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.bnc-solutions__score-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-solutions__score-list strong {
  color: var(--color-fg-strong);
}

.bnc-solutions__score-list small {
  font: inherit;
}

.bnc-solutions__model-evidence {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px dashed var(--color-border-default);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-bg-page) 70%, var(--color-bg-card));
}

.bnc-solutions__model-evidence summary {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  list-style: none;
}

.bnc-solutions__model-evidence summary::-webkit-details-marker {
  display: none;
}

.bnc-solutions__model-evidence summary::after {
  content: '+';
  flex-shrink: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.bnc-solutions__model-evidence[open] summary::after {
  content: '-';
}

.bnc-solutions__model-evidence summary small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__model-evidence[open] {
  border-style: solid;
  background: var(--color-bg-card);
}

.bnc-solutions__recommendation-context {
  padding: var(--space-2) var(--space-3);
  border: 1px solid color-mix(in srgb, var(--color-status-success) 18%, transparent);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-status-success) 8%, var(--color-bg-card));
  color: var(--color-fg-strong) !important;
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__detail-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); /* 풀폭에서 항목을 가로로 펼침 */
  gap: var(--space-2);
  margin: 0;
}

.bnc-solutions__detail-facts--scenario {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.bnc-solutions__detail-facts div {
  min-width: 0;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
}

.bnc-solutions__detail-facts dt {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-solutions__detail-facts dd {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.bnc-solutions__detail-facts small {
  display: block;
  margin-top: 2px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.35;
}

/* ── HITL 섹션 ───────────────────────────────────────── */
.bnc-solutions__hitl {
  padding: var(--space-4);
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  display: grid;
  gap: var(--space-3);
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.bnc-solutions__hitl--approved {
  background: color-mix(in srgb, var(--color-status-success) 6%, var(--color-bg-surface));
  border-color: color-mix(in srgb, var(--color-status-success) 30%, var(--color-border-default));
}

.bnc-solutions__hitl--rejected {
  background: color-mix(in srgb, var(--color-status-danger) 5%, var(--color-bg-surface));
  border-color: color-mix(in srgb, var(--color-status-danger) 25%, var(--color-border-default));
}

.bnc-solutions__hitl--pending-reject {
  border-color: color-mix(in srgb, var(--color-status-danger) 35%, var(--color-border-default));
}

/* 결정 완료 레이아웃 */
.bnc-solutions__hitl-result {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.bnc-solutions__hitl-result-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bnc-solutions__hitl-plan-name {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__hitl-note-preview {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

/* 헤더 row */
.bnc-solutions__hitl-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.bnc-solutions__hitl-header h3 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}

.bnc-solutions__hitl-header p {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.bnc-solutions__hitl-header strong {
  color: var(--color-fg-strong);
}

.bnc-solutions__hitl-hint {
  color: var(--color-fg-muted);
  font-style: italic;
}

.bnc-solutions__hitl-warn {
  margin: var(--space-1) 0 0;
  color: var(--color-status-warning);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

/* 반려 사유 / 승인 비고 폼 */
.bnc-solutions__hitl-reject-form,
.bnc-solutions__hitl-approve-form {
  display: grid;
  gap: var(--space-2);
  margin-top: var(--space-3);
}

.bnc-solutions__hitl-optional {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__hitl-label {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__hitl-required {
  color: var(--color-status-danger);
  margin-left: 2px;
}

.bnc-solutions__hitl-textarea {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-surface);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-md);
  color: var(--color-fg);
  font: inherit;
  font-size: var(--font-size-sm);
  resize: vertical;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.bnc-solutions__hitl-textarea:focus {
  outline: none;
  border-color: var(--color-action-primary-border);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-action-primary) 15%, transparent);
}

.bnc-solutions__hitl-textarea::placeholder {
  color: var(--color-fg-muted);
}

/* 액션 버튼 행 */
.bnc-solutions__hitl-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.bnc-solutions__review-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
}

.bnc-solutions__review-item {
  min-width: 0;
  padding: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
}

.bnc-solutions__review-item span {
  display: block;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__review-item strong {
  display: block;
  margin-top: var(--space-1);
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  line-height: 1.35;
}

.bnc-solutions__review-box {
  padding: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
}

.bnc-solutions__review-box h4 {
  margin: 0 0 var(--space-2);
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

.bnc-solutions__review-box ul {
  margin: 0;
  padding-left: var(--space-4);
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.55;
}

/* ── AI 추천 근거 (독립 섹션) ───────────────────────────── */
.bnc-solutions__reason {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-4);
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 24%, var(--color-border-default));
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-action-primary) 5%, var(--color-bg-surface));
}

.bnc-solutions__reason-hd {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.bnc-solutions__reason-hd h3 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}

.bnc-solutions__reason-plan {
  color: var(--color-action-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__reason-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.bnc-solutions__reason-chip {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-pill);
  background: var(--color-bg-surface);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}
.bnc-solutions__reason-chip--good {
  border-color: color-mix(in srgb, var(--color-status-success) 40%, transparent);
  background: color-mix(in srgb, var(--color-status-success) 10%, var(--color-bg-surface));
  color: var(--color-status-success);
}
.bnc-solutions__reason-chip--bad {
  border-color: color-mix(in srgb, var(--color-status-danger) 40%, transparent);
  background: color-mix(in srgb, var(--color-status-danger) 10%, var(--color-bg-surface));
  color: var(--color-status-danger);
}

.bnc-solutions__reason-body p {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.6;
}

.bnc-solutions__reason-body p + p {
  margin-top: var(--space-2);
}

.bnc-solutions__reason-detail {
  display: grid;
  gap: var(--space-1);
  padding-top: var(--space-2);
  border-top: 1px solid color-mix(in srgb, var(--color-action-primary) 16%, transparent);
}

.bnc-solutions__reason-detail span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__reason-detail p {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.55;
}

.bnc-solutions__reason-detail strong {
  margin-right: var(--space-1);
  color: var(--color-fg-strong);
}

.bnc-solutions__exclusion-reason {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-2);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
}

.bnc-solutions__exclusion-reason small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.45;
}

.bnc-solutions__compare-decision {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  background: var(--color-bg-page);
}

.bnc-solutions__compare-decision h3 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}

.bnc-solutions__compare-decision p {
  margin: var(--space-1) 0 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.6;
  word-break: keep-all;
}

.bnc-solutions__compare-decision dl {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
}

.bnc-solutions__compare-decision div {
  min-width: 0;
}

.bnc-solutions__compare-decision dl > div {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
}

.bnc-solutions__compare-decision dt {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-solutions__compare-decision dd {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.bnc-solutions__decision-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
}

.bnc-solutions__decision-grid div {
  min-width: 0;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
}

.bnc-solutions__decision-grid dt {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-solutions__decision-grid dd {
  margin: var(--space-1) 0 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.4;
}

/* 반려 확정 버튼 (danger 스타일, BaseButton에 없으므로 직접) */
.bnc-solutions__btn-reject-confirm {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 0 var(--space-4);
  min-height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-status-danger);
  border: 1px solid var(--color-status-danger);
  color: #fff;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.bnc-solutions__btn-reject-confirm:disabled {
  opacity: var(--opacity-disabled);
  cursor: not-allowed;
}

.bnc-solutions__btn-reject-confirm:not(:disabled):hover {
  opacity: 0.88;
}

/* ── 반응형 ───────────────────────────────────────── */
@media (max-width: 900px) {
  .bnc-solutions__cards {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  }

  .bnc-solutions__metrics--baseline,
  .bnc-solutions__detail-grid,
  .bnc-solutions__review-grid,
  .bnc-solutions__compare-decision dl,
  .bnc-solutions__decision-grid {
    grid-template-columns: 1fr 1fr;
  }

  .bnc-solutions__compare-hd {
    align-items: flex-start;
    flex-direction: column;
  }

  .bnc-solutions__compare-hd p {
    text-align: left;
  }
}

@media (max-width: 580px) {
  .bnc-solutions__cards,
  .bnc-solutions__metrics--baseline,
  .bnc-solutions__selected-detail-hd,
  .bnc-solutions__detail-grid,
  .bnc-solutions__detail-bottom-grid,
  .bnc-solutions__detail-facts,
  .bnc-solutions__runbook-grid,
  .bnc-solutions__review-grid,
  .bnc-solutions__compare-decision dl,
  .bnc-solutions__decision-grid {
    grid-template-columns: 1fr;
  }

  .bnc-solutions__selected-score {
    text-align: left;
  }

  .bnc-solutions__detail-card--wide {
    grid-column: auto;
  }
}
</style>

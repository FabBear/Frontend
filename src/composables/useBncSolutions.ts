import { type InjectionKey, computed, inject, provide, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { ROUTE_NAMES } from '@/constants/routes';

import type { BncActionPlan, BncActionPlansPayload } from '@/types/bnc';

import { isNeutralImpact } from '@/components/bnc/bncCardMetrics';

interface UseBncSolutionsProps {
  payload: BncActionPlansPayload | null;
  loading?: boolean;
  errorMessage?: string | null;
}

type DecideEmit = (
  event: 'decide',
  payload: { decision: 'APPROVED' | 'REJECTED'; selectedPlanId: string | null; comment?: string | null }
) => void;

/**
 * BncSolutionsTab의 파생 상태·판정 로직·HITL 핸들러를 모은 composable.
 * 탭 컴포넌트는 이걸 destructure해 템플릿 바인딩만 담당하고, 향후 카드/상세 컴포넌트도 이 상태를 공유한다.
 */
export function useBncSolutions(props: UseBncSolutionsProps, emit: DecideEmit) {
  const CURRENT_OPTION_ID = 'current-baseline';
  type RecommendationTone = 'success' | 'info' | 'warning';
  type DecisionSummaryItem = { label: string; value: string; caption: string | null };
  type ExclusionReasonItem = {
    label: string;
    reason: string;
    evidence: string[];
  };

  const router = useRouter();

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
  const recommendationWhyRecommended = computed(
    () => props.payload?.recommendation?.structured?.whyRecommended ?? null
  );
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

  const currentOptionSummary = computed(() => {
    if (props.payload?.currentOption?.summary) return props.payload.currentOption.summary;
    if (props.payload?.decisionInfo?.decisionCaveat) return props.payload.decisionInfo.decisionCaveat;
    return '현재 운영 조건을 유지하고 추가 대응안을 적용하지 않는 비교 기준입니다.';
  });
  const currentScenarioMetrics = computed(() => {
    if (noActionForecast.value?.metrics?.length) return noActionForecast.value.metrics;
    return currentOptionMetrics.value;
  });

  // ── RAG 근거 ────────────────────────────────────────────────
  const ragHits = computed(() => props.payload?.ragEvidence?.commonHits ?? []);
  const selectedPlanEvidence = computed(() => {
    const id = selectedPlanId.value;
    if (!id) return null;
    return props.payload?.ragEvidence?.perPlan?.[id] ?? null;
  });

  function openInArchive(caseId: string) {
    void router.push({ name: ROUTE_NAMES.reportArchive, query: { caseId } });
  }

  // ── 선택한 plan의 즉시 실행 항목 ─────────────────────────
  const selectedImmediateActions = computed(() => props.payload?.recommendation?.structured?.immediateActions ?? []);
  const selectedMonitoringKpis = computed(() => props.payload?.recommendation?.structured?.monitoringKpis ?? []);
  const selectedRollbackCondition = computed(
    () => props.payload?.recommendation?.structured?.rollbackCondition ?? null
  );
  const showImmediateActions = computed(
    () => selectedPlan.value?.recommended && !isCurrentOptionSelected.value && selectedImmediateActions.value.length > 0
  );

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
    if (isCurrentOptionSelected.value) return;
    isPendingReject.value = true;
  }

  function handleRejectCancel() {
    isPendingReject.value = false;
    rejectionNote.value = '';
  }

  function handleRejectConfirm() {
    if (isCurrentOptionSelected.value || !rejectionNote.value.trim()) return;
    decisionPlanId.value = null;
    emit('decide', { decision: 'REJECTED', selectedPlanId: null, comment: rejectionNote.value.trim() });
    isPendingReject.value = false;
  }

  // 카드 컴포넌트로 내려줄 plan별 추천 배지(label/tone) 맵 — 배지 로직을 한 곳에서 계산해 공유한다.
  const planBadges = computed<Record<string, { label: string; tone: RecommendationTone }>>(() =>
    Object.fromEntries(
      sortedPlans.value.map((plan) => [
        plan.planId,
        { label: recommendationBadgeLabel(plan), tone: recommendationBadgeTone(plan) },
      ])
    )
  );

  return {
    payload: computed(() => props.payload),
    planBadges,
    selectedOptionId,
    selectedPlanId,
    decisionPlanId,
    selectedMapToolGroup,
    localDecision,
    isPendingReject,
    rejectionNote,
    approvalNote,
    sortedPlans,
    selectedPlan,
    decisionPlan,
    isCurrentOptionSelected,
    baselineMetrics,
    baselineSnapshot,
    currentOptionMetrics,
    currentOptionTitle,
    compareContext,
    dataQualityWarnings,
    noActionForecast,
    recommendedPlan,
    isSelectionOffRecommendation,
    recommendationReasonParagraphs,
    rawRecommendationWhyNotOthers,
    recommendationCaveats,
    recommendationImmediateActions,
    recommendationMonitoringKpis,
    recommendationRollbackCondition,
    recommendationWhyRecommended,
    recommendationStatus,
    hasSimWarning,
    noMeaningfulEffect,
    isEquivalentDecision,
    hasMonitoringRule,
    hasRecommendationRunbook,
    shouldShowMonitoringGap,
    selectedPlanExclusionReason,
    recommendationWhyNotOthers,
    conclusionHeadline,
    recommendationConfidenceLevel,
    hasConclusion,
    decisionSummaryTitle,
    decisionSummaryDescription,
    decisionSummaryItems,
    selectedOperationItems,
    selectedTargetToolGroups,
    baselineTargetToolGroups,
    visibleMapTargetToolGroups,
    visibleMapCauseToolGroups,
    visibleMapAffectedToolGroups,
    hasTargetMapData,
    targetMapTitle,
    selectedPlanImpactText,
    selectedPlanRecommendationText,
    decisionMeta,
    recommendationBadgeLabel,
    recommendationBadgeTone,
    recommendationEvidenceLabel,
    recommendationEvidenceVariant,
    formatScore,
    formatWeight,
    formatScoreBreakdownMeta,
    formatVerdict,
    formatDecisionStatus,
    formatConfidenceLevel,
    formatTiebreaker,
    currentOptionSummary,
    currentScenarioMetrics,
    ragHits,
    selectedPlanEvidence,
    openInArchive,
    selectedImmediateActions,
    selectedMonitoringKpis,
    selectedRollbackCondition,
    showImmediateActions,
    handleSelectCurrentOption,
    handleSelectPlan,
    handleSelectMapToolGroup,
    handleApprove,
    handleRejectStart,
    handleRejectCancel,
    handleRejectConfirm,
  };
}

export type BncSolutionsContext = ReturnType<typeof useBncSolutions>;

const BncSolutionsKey: InjectionKey<BncSolutionsContext> = Symbol('bncSolutions');

/** 부모(BncSolutionsTab)에서 호출 — 컨텍스트를 생성하고 자식 트리에 provide한 뒤 반환한다. */
export function provideBncSolutions(props: UseBncSolutionsProps, emit: DecideEmit): BncSolutionsContext {
  const ctx = useBncSolutions(props, emit);
  provide(BncSolutionsKey, ctx);
  return ctx;
}

/** 자식 컴포넌트(SelectedDetail 등)에서 호출 — provide된 컨텍스트를 주입받는다. */
export function useBncSolutionsContext(): BncSolutionsContext {
  const ctx = inject(BncSolutionsKey);
  if (!ctx) {
    throw new Error('useBncSolutionsContext()는 BncSolutionsTab 하위에서만 사용할 수 있습니다.');
  }
  return ctx;
}

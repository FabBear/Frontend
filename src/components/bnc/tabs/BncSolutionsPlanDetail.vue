<script setup lang="ts">
import { useBncSolutionsContext } from '@/composables/useBncSolutions';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BncTargetMap from '@/components/bnc/BncTargetMap.vue';

const {
  selectedPlan,
  recommendedPlan,
  decisionPlan,
  selectedOperationItems,
  selectedPlanRecommendationText,
  recommendationEvidenceVariant,
  recommendationEvidenceLabel,
  recommendationBadgeLabel,
  recommendationReasonParagraphs,
  recommendationWhyRecommended,
  recommendationWhyNotOthers,
  recommendationCaveats,
  recommendationImmediateActions,
  recommendationMonitoringKpis,
  isSelectionOffRecommendation,
  selectedPlanExclusionReason,
  hasRecommendationRunbook,
  decisionMeta,
  formatVerdict,
  formatScoreBreakdownMeta,
  compareContext,
  hasTargetMapData,
  targetMapTitle,
  visibleMapTargetToolGroups,
  visibleMapCauseToolGroups,
  visibleMapAffectedToolGroups,
  selectedMapToolGroup,
  handleSelectMapToolGroup,
} = useBncSolutionsContext();
</script>

<template>
  <section v-if="selectedPlan" class="bnc-solutions__selected-detail">
    <div class="bnc-solutions__selected-detail-hd">
      <BaseBadge :variant="selectedPlan.recommended ? recommendationEvidenceVariant : 'info'">
        {{ selectedPlan.recommended ? recommendationBadgeLabel(selectedPlan) : '선택안' }}
      </BaseBadge>
      <strong class="bnc-solutions__selected-plan">
        {{ selectedPlan.actionLabel ?? '-' }} · {{ selectedPlan.actionKind ?? selectedPlan.title }}
      </strong>
    </div>

    <div class="bnc-solutions__detail-grid">
      <article class="bnc-solutions__detail-card">
        <span class="bnc-solutions__detail-label">적용 변경</span>
        <ul v-if="selectedOperationItems.length" class="bnc-solutions__detail-list">
          <li v-for="item in selectedOperationItems" :key="item">{{ item }}</li>
        </ul>
        <p v-else>{{ selectedPlan.summary }}</p>
        <div v-if="selectedPlan.actionMetadata" class="bnc-solutions__plan-meta">
          <span v-if="selectedPlan.actionMetadata.descriptionKo">{{ selectedPlan.actionMetadata.descriptionKo }}</span>
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
        <strong>{{ selectedPlan.actionLabel ?? '-' }} · {{ selectedPlan.actionKind ?? selectedPlan.title }}</strong>
      </div>
      <p class="bnc-solutions__recommendation-context">
        기준 선택안은 {{ recommendedPlan?.actionLabel ?? '-' }}입니다. 이 대응안을 선택하지 않은 이유는 다음과 같습니다.
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

    <article v-if="hasRecommendationRunbook" class="bnc-solutions__detail-card bnc-solutions__detail-card--runbook">
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
        <strong>{{ decisionPlan?.actionLabel ?? '-' }} · {{ decisionPlan?.actionKind ?? decisionPlan?.title }}</strong>
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

    <details v-if="selectedPlan.scoreBreakdown?.length" class="bnc-solutions__model-evidence">
      <summary>
        <span>모델 평가 근거 보기</span>
        <small>점수 산출/검증용</small>
      </summary>
      <p class="bnc-solutions__detail-note">
        현장 실행 판단은 위의 KPI 변화, 선택 로직, 운영 체크를 우선합니다. 이 내역은 에이전트 점수 산출을 검증할 때
        확인합니다.
      </p>
      <ul class="bnc-solutions__score-list">
        <li v-for="item in selectedPlan.scoreBreakdown" :key="item.key">
          <span>{{ item.label }}</span>
          <strong>{{ formatVerdict(item.verdict) }}</strong>
          <small>{{ formatScoreBreakdownMeta(item) }}</small>
        </li>
      </ul>
    </details>
  </section>
</template>

<style scoped src="./bncSolutionsDetail.css"></style>

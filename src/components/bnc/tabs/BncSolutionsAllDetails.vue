<script setup lang="ts">
import type { BncActionPlan, BncActionPlansPayload } from '@/types/bnc';

import BaseBadge from '@/components/base/BaseBadge.vue';

defineProps<{
  payload: BncActionPlansPayload;
  plans: BncActionPlan[];
  selectedOptionId: string;
  isCurrentOptionSelected: boolean;
}>();

function planBadgeVariant(plan: BncActionPlan) {
  return plan.recommended ? 'success' : 'info';
}
</script>

<template>
  <section class="bnc-solutions__selected-detail">
    <div class="bnc-solutions__selected-detail-hd">
      <BaseBadge variant="info">전체 상세</BaseBadge>
      <strong class="bnc-solutions__selected-plan">현재 유지 및 대응안별 상세</strong>
    </div>

    <article
      class="bnc-solutions__detail-card bnc-solutions__detail-card--forecast"
      :class="{ 'bnc-solutions__detail-card--active': isCurrentOptionSelected }"
    >
      <div class="bnc-solutions__detail-card-hd">
        <BaseBadge variant="warning">현재 유지</BaseBadge>
        <strong>{{ payload.currentOption?.title ?? '현재 유지' }}</strong>
      </div>
      <p>
        {{
          payload.currentOption?.summary ?? payload.decisionInfo?.decisionCaveat ?? '추가 대응안을 적용하지 않습니다.'
        }}
      </p>
      <dl
        v-if="payload.currentOption?.metrics?.length"
        class="bnc-solutions__detail-facts bnc-solutions__detail-facts--scenario"
      >
        <div v-for="metric in payload.currentOption.metrics" :key="metric.label">
          <dt>{{ metric.label }}</dt>
          <dd>{{ metric.value }}</dd>
          <small v-if="metric.caption">{{ metric.caption }}</small>
        </div>
      </dl>
    </article>

    <div class="bnc-solutions__detail-grid">
      <article
        v-for="plan in plans"
        :key="plan.planId"
        class="bnc-solutions__detail-card"
        :class="{ 'bnc-solutions__detail-card--active': plan.planId === selectedOptionId && !isCurrentOptionSelected }"
      >
        <div class="bnc-solutions__detail-card-hd">
          <BaseBadge :variant="planBadgeVariant(plan)">
            {{ plan.recommended ? 'AI 추천' : '후보' }}
          </BaseBadge>
          <strong>{{ plan.actionLabel ?? '-' }} · {{ plan.actionKind ?? plan.title }}</strong>
        </div>

        <span class="bnc-solutions__detail-label">적용 변경</span>
        <ul v-if="plan.operationItems?.length" class="bnc-solutions__detail-list">
          <li v-for="item in plan.operationItems" :key="item">{{ item }}</li>
        </ul>
        <p v-else>{{ plan.summary }}</p>

        <div v-if="plan.actionMetadata" class="bnc-solutions__plan-meta">
          <span v-if="plan.actionMetadata.descriptionKo">{{ plan.actionMetadata.descriptionKo }}</span>
          <span>운영 부담 {{ plan.actionMetadata.effort ?? '-' }}</span>
          <span>범위 {{ plan.actionMetadata.scope ?? '-' }}</span>
          <span>되돌림 {{ plan.actionMetadata.reversibility ?? '-' }}</span>
        </div>

        <details v-if="plan.scoreBreakdown?.length" class="bnc-solutions__model-evidence">
          <summary>
            <span>모델 평가 근거 보기</span>
            <small>점수 산출/검증용</small>
          </summary>
          <ul class="bnc-solutions__score-list">
            <li v-for="item in plan.scoreBreakdown" :key="item.key">
              <span>{{ item.label }}</span>
              <strong>{{ item.verdict }}</strong>
              <small>{{ item.label }}</small>
            </li>
          </ul>
        </details>
      </article>
    </div>
  </section>
</template>

<style scoped src="./bncSolutionsDetail.css"></style>

<style scoped>
.bnc-solutions__detail-card--active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow:
    0 0 0 2px #2563eb,
    0 4px 16px #1d4ed81a;
}
</style>

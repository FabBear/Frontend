<script setup lang="ts">
import { useBncSolutionsContext } from '@/composables/useBncSolutions';

import BncSolutionsCurrentDetail from '@/components/bnc/tabs/BncSolutionsCurrentDetail.vue';
import BncSolutionsPlanDetail from '@/components/bnc/tabs/BncSolutionsPlanDetail.vue';

const { payload, isCurrentOptionSelected, selectedPlan, formatDecisionStatus } = useBncSolutionsContext();
</script>

<template>
  <template v-if="payload">
    <!-- 현재 유지 상세 / 선택 대응안 상세 -->
    <BncSolutionsCurrentDetail v-if="isCurrentOptionSelected" />
    <BncSolutionsPlanDetail v-else-if="selectedPlan" />

    <!-- 비교 판정 (공통 — 선택안과 무관하게 동일) -->
    <article v-if="payload.decisionInfo" class="bnc-solutions__detail-card bnc-solutions__detail-card--decision">
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
      </dl>
    </article>
  </template>
</template>

<style scoped src="./bncSolutionsDetail.css"></style>

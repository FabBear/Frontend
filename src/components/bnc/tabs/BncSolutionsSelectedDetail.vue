<script setup lang="ts">
import { useBncSolutionsContext } from '@/composables/useBncSolutions';

import BncSolutionsCurrentDetail from '@/components/bnc/tabs/BncSolutionsCurrentDetail.vue';
import BncSolutionsPlanDetail from '@/components/bnc/tabs/BncSolutionsPlanDetail.vue';

const { payload, isCurrentOptionSelected, selectedPlan } = useBncSolutionsContext();
</script>

<template>
  <template v-if="payload">
    <!-- 현재 유지 상세 / 선택 대응안 상세 -->
    <BncSolutionsCurrentDetail v-if="isCurrentOptionSelected" />
    <BncSolutionsPlanDetail v-else-if="selectedPlan" />
  </template>
</template>

<style scoped src="./bncSolutionsDetail.css"></style>

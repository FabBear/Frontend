<script setup lang="ts">
import { useBncSolutionsContext } from '@/composables/useBncSolutions';

import BaseBadge from '@/components/base/BaseBadge.vue';
import BncTargetMap from '@/components/bnc/BncTargetMap.vue';

const {
  payload,
  compareContext,
  noActionForecast,
  currentOptionTitle,
  currentOptionSummary,
  currentScenarioMetrics,
  hasTargetMapData,
  targetMapTitle,
  visibleMapTargetToolGroups,
  visibleMapCauseToolGroups,
  visibleMapAffectedToolGroups,
  selectedMapToolGroup,
  handleSelectMapToolGroup,
  dataQualityWarnings,
  formatVerdict,
  formatScoreBreakdownMeta,
} = useBncSolutionsContext();
</script>

<template>
  <section v-if="payload" class="bnc-solutions__selected-detail">
    <div class="bnc-solutions__selected-detail-hd">
      <BaseBadge :variant="noActionForecast?.getsWorse ? 'warning' : 'info'">무조치 시나리오</BaseBadge>
      <strong class="bnc-solutions__selected-plan">{{ currentOptionTitle }} · 현재 유지 상세</strong>
    </div>

    <p class="bnc-solutions__current-summary">{{ currentOptionSummary }}</p>

    <!-- 악화 예상 | 위치 -->
    <div class="bnc-solutions__current-main-row">
      <article
        v-if="currentScenarioMetrics.length"
        class="bnc-solutions__detail-card bnc-solutions__detail-card--forecast"
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
        :title="targetMapTitle"
        :anchor-tool-group="compareContext?.anchorToolgroup"
        :target-tool-groups="visibleMapTargetToolGroups"
        :cause-tool-groups="visibleMapCauseToolGroups"
        :affected-tool-groups="visibleMapAffectedToolGroups"
        :selected-tool-group="selectedMapToolGroup"
        @select="handleSelectMapToolGroup"
      />
    </div>

    <div
      v-if="compareContext?.causeSummary || compareContext?.cascade || dataQualityWarnings.length"
      class="bnc-solutions__detail-grid"
    >
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

      <article v-if="dataQualityWarnings.length" class="bnc-solutions__detail-card bnc-solutions__detail-card--warning">
        <span class="bnc-solutions__detail-label">데이터 품질 경고</span>
        <ul class="bnc-solutions__detail-list">
          <li v-for="warning in dataQualityWarnings" :key="`${warning.code ?? warning.message}`">
            {{ warning.message }}
            <small v-if="warning.suspectComponent">{{ warning.suspectComponent }}</small>
          </li>
        </ul>
      </article>
    </div>

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
  </section>
</template>

<style scoped src="./bncSolutionsDetail.css"></style>

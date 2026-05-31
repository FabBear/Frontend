<script setup lang="ts">
import { computed } from 'vue';

import { RISK_LEVEL_META, type RiskLevel } from '@/constants/riskLevel';

import type { BottleneckRiskGrade } from '@/types/bottleneckMonitoring';

import { formatRatioPercent } from '@/utils/format';

interface Props {
  probability: number;
  riskGrade: BottleneckRiskGrade;
}

const props = defineProps<Props>();

const riskLevel = computed(() => props.riskGrade.toLowerCase() as RiskLevel);
const riskMeta = computed(() => RISK_LEVEL_META[riskLevel.value]);
const probabilityText = computed(() => formatRatioPercent(props.probability));
</script>

<template>
  <section class="tool-group-risk-probability" aria-label="병목 예측 확률">
    <p class="tool-group-risk-probability__label">병목 예측 확률 <span>(ML 모델)</span></p>
    <div class="tool-group-risk-probability__bar-row">
      <div class="tool-group-risk-probability__bar">
        <span
          class="tool-group-risk-probability__bar-value"
          :style="{ width: probabilityText, backgroundColor: riskMeta.color }"
        />
      </div>
      <strong class="tool-group-risk-probability__bar-pct" :style="{ color: riskMeta.color }">
        {{ probabilityText }}
      </strong>
    </div>
    <div class="tool-group-risk-probability__risk-badge">
      <i
        class="tool-group-risk-probability__risk-dot"
        :style="{ backgroundColor: riskMeta.color }"
        aria-hidden="true"
      />
      <span :style="{ color: riskMeta.color }">{{ riskMeta.label.toUpperCase() }} - {{ riskMeta.description }}</span>
    </div>
  </section>
</template>

<style scoped>
.tool-group-risk-probability {
  display: grid;
  gap: var(--space-2);
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: var(--space-3);
}

.tool-group-risk-probability__label {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.tool-group-risk-probability__label span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-normal);
}

.tool-group-risk-probability__bar-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.tool-group-risk-probability__bar {
  flex: 1;
  height: 8px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--color-border-subtle);
}

.tool-group-risk-probability__bar-value {
  display: block;
  height: 100%;
  border-radius: inherit;
}

.tool-group-risk-probability__bar-pct {
  flex-shrink: 0;
  min-width: 44px;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  text-align: right;
}

.tool-group-risk-probability__risk-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.tool-group-risk-probability__risk-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}
</style>

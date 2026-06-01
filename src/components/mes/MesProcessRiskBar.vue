<script setup lang="ts">
import { toMesRiskLevel } from '@/composables/useMesMonitoring';

import { RISK_LEVEL_META } from '@/constants/riskLevel';

import type { MesRiskGrade } from '@/types/mes';

interface Props {
  counts: Record<MesRiskGrade, number>;
}

defineProps<Props>();

const RISK_GRADES: MesRiskGrade[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
</script>

<template>
  <section class="mes-process-risk-bar">
    <span>TG 등급 분포</span>
    <div class="mes-process-risk-bar__track">
      <span
        v-for="grade in RISK_GRADES"
        :key="grade"
        :style="{
          flex: counts[grade] || 0,
          backgroundColor: RISK_LEVEL_META[toMesRiskLevel(grade)].color,
        }"
      />
    </div>
    <div class="mes-process-risk-bar__labels">
      <template v-for="grade in RISK_GRADES" :key="grade">
        <span v-if="counts[grade] > 0" class="mes-process-risk-bar__label">
          <i :style="{ backgroundColor: RISK_LEVEL_META[toMesRiskLevel(grade)].color }" />
          {{ RISK_LEVEL_META[toMesRiskLevel(grade)].label[0] }}: {{ counts[grade] }}
        </span>
      </template>
    </div>
  </section>
</template>

<style scoped>
.mes-process-risk-bar {
  display: grid;
  gap: var(--space-1);
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  padding: var(--space-2);
}

.mes-process-risk-bar > span,
.mes-process-risk-bar__label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.mes-process-risk-bar__track {
  display: flex;
  gap: 1px;
  height: 6px;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
}

.mes-process-risk-bar__labels {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-2);
  margin-top: var(--space-1);
}

.mes-process-risk-bar__label {
  display: flex;
  align-items: center;
  gap: 4px;
}

.mes-process-risk-bar__label i {
  display: inline-block;
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 2px;
}
</style>

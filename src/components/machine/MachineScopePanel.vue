<script setup lang="ts">
import type { MachineScopeMode, MachineScopeOption } from '@/types/machine';

import BaseButton from '@/components/base/BaseButton.vue';

import { formatNumber, formatRatioPercent } from '@/utils/format';

interface Props {
  scopeMode: MachineScopeMode;
  selectedCode: string | null;
  options: MachineScopeOption[];
}

defineProps<Props>();

const emit = defineEmits<{
  'update:scopeMode': [value: MachineScopeMode];
  select: [code: string];
}>();
</script>

<template>
  <section class="machine-scope-panel" aria-label="장비 범위 선택">
    <div class="machine-scope-panel__head">
      <div>
        <h2>1. 범위 선택</h2>
        <p>기본은 역할 기준입니다. 같은 역할 TG를 바로 비교할 수 있습니다.</p>
      </div>
      <div class="machine-scope-panel__mode">
        <BaseButton
          :variant="scopeMode === 'role' ? 'primary' : 'ghost'"
          size="sm"
          @click="emit('update:scopeMode', 'role')"
        >
          역할
        </BaseButton>
        <BaseButton
          :variant="scopeMode === 'process' ? 'primary' : 'ghost'"
          size="sm"
          @click="emit('update:scopeMode', 'process')"
        >
          공정
        </BaseButton>
      </div>
    </div>

    <div class="machine-scope-panel__list">
      <button
        v-for="option in options"
        :key="option.code"
        class="machine-scope-panel__item"
        :class="{ 'machine-scope-panel__item--active': option.code === selectedCode }"
        type="button"
        @click="emit('select', option.code)"
      >
        <strong>{{ option.label }}</strong>
        <span>{{ formatNumber(option.toolGroupCount) }} TG · {{ formatNumber(option.toolCount) }}대</span>
        <small
          >가동률 {{ formatRatioPercent(option.avgUtilizationRate) }} · 위험
          {{ formatNumber(option.dangerCount) }}</small
        >
      </button>
    </div>
  </section>
</template>

<style scoped>
.machine-scope-panel {
  display: grid;
  gap: var(--space-2);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
}

.machine-scope-panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-2);
}

.machine-scope-panel h2 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.machine-scope-panel p,
.machine-scope-panel span,
.machine-scope-panel small {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.machine-scope-panel__mode {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
}

.machine-scope-panel__list {
  display: flex;
  gap: var(--space-1);
  padding-bottom: 2px;
  overflow: auto;
}

.machine-scope-panel__item {
  display: grid;
  gap: 3px;
  min-width: 148px;
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-card);
  padding: var(--space-2);
  text-align: left;
  cursor: pointer;
}

.machine-scope-panel__item:hover,
.machine-scope-panel__item--active {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
}

.machine-scope-panel__item strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
}

@media (max-width: 900px) {
  .machine-scope-panel__head {
    display: grid;
  }
}
</style>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  variant?: 'primary' | 'ghost' | 'soft';
  size?: 'sm' | 'md';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false,
  type: 'button',
});

const isDisabled = computed(() => props.disabled || props.loading);
</script>

<template>
  <button
    class="button base-button"
    :class="[`button--${variant}`, `base-button--${size}`]"
    :type="type"
    :disabled="isDisabled"
    :aria-busy="loading"
  >
    <span v-if="loading" class="base-button__spinner" aria-hidden="true" />
    <span class="base-button__content">
      <slot />
    </span>
  </button>
</template>

<style scoped>
.base-button {
  position: relative;
}

.base-button--sm {
  min-height: 28px;
  padding: 4px 10px;
  font-size: var(--font-size-sm);
}

.base-button--md {
  min-height: 32px;
}

.base-button:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.base-button__content {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-control-gap);
}

.button--soft {
  border-color: var(--color-login-panel-border);
  background: var(--color-login-panel-bg);
  color: var(--color-action-primary);
}

.button--soft:hover:not(:disabled) {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
}

.base-button__spinner {
  width: 12px;
  height: 12px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: var(--radius-pill);
  animation: base-button-spin 700ms linear infinite;
}

@keyframes base-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

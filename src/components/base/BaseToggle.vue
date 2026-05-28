<script setup lang="ts">
interface Props {
  modelValue: boolean;
  disabled?: boolean;
  label?: string;
}

withDefaults(defineProps<Props>(), {
  disabled: false,
  label: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
}>();

function handleChange(event: Event) {
  emit('update:modelValue', (event.target as HTMLInputElement).checked);
}
</script>

<template>
  <label class="base-toggle" :class="{ 'base-toggle--disabled': disabled }">
    <input
      class="base-toggle__input"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      @change="handleChange"
    />
    <span class="base-toggle__track" aria-hidden="true">
      <span class="base-toggle__thumb" />
    </span>
    <span v-if="label" class="base-toggle__label">{{ label }}</span>
  </label>
</template>

<style scoped>
.base-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-control-gap);
  color: var(--color-fg);
  font-size: var(--font-size-md);
}

.base-toggle--disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.base-toggle__input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.base-toggle__track {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: var(--radius-pill);
  background: var(--color-border-default);
  transition: background-color var(--transition-fast);
}

.base-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: var(--radius-pill);
  background: var(--color-bg-surface);
  box-shadow: var(--shadow-panel);
  transition: transform var(--transition-fast);
}

.base-toggle__input:checked + .base-toggle__track {
  background: var(--color-action-primary);
}

.base-toggle__input:checked + .base-toggle__track .base-toggle__thumb {
  transform: translateX(16px);
}

.base-toggle__input:focus-visible + .base-toggle__track {
  outline: 3px solid var(--color-focus-ring);
  outline-offset: 2px;
}
</style>

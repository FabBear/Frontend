<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';

interface Props {
  modelValue: boolean;
  title: string;
  width?: string;
}

const props = withDefaults(defineProps<Props>(), {
  width: '520px',
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  close: [];
}>();

function closeModal() {
  emit('update:modelValue', false);
  emit('close');
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.modelValue) {
    closeModal();
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (isOpen) {
      window.addEventListener('keydown', handleKeydown);
      return;
    }

    window.removeEventListener('keydown', handleKeydown);
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (typeof window === 'undefined') {
    return;
  }

  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport v-if="modelValue" to="body">
    <div class="base-modal" role="presentation">
      <div class="base-modal__overlay" @click="closeModal" />
      <section
        class="base-modal__panel surface-card"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        :style="{ '--base-modal-width': width }"
      >
        <header class="base-modal__header">
          <h2 class="section-title">{{ title }}</h2>
          <button class="base-modal__close button button--ghost" type="button" aria-label="닫기" @click="closeModal">
            ×
          </button>
        </header>
        <div class="base-modal__body">
          <slot />
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.base-modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-index-modal);
  display: grid;
  place-items: center;
  padding: var(--spacing-page);
}

.base-modal__overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
}

.base-modal__panel {
  position: relative;
  z-index: 1;
  width: min(var(--base-modal-width), 100%);
  max-height: calc(100svh - 48px);
  overflow: auto;
  box-shadow: var(--shadow-panel);
}

.base-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-card);
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
  padding: var(--spacing-card);
}

.base-modal__close {
  min-width: 32px;
  padding: 0;
  font-size: var(--font-size-xl);
  line-height: 1;
}

.base-modal__body {
  padding: var(--spacing-card);
}
</style>

<script setup lang="ts">
type InsightVariant = 'info' | 'warning' | 'danger' | 'success' | 'neutral';

withDefaults(
  defineProps<{
    variant?: InsightVariant;
    title?: string;
  }>(),
  {
    variant: 'info',
    title: undefined,
  }
);
</script>

<template>
  <section class="insight-callout" :class="`insight-callout--${variant}`">
    <div v-if="$slots.icon" class="insight-callout__icon" aria-hidden="true">
      <slot name="icon" />
    </div>
    <div class="insight-callout__body">
      <strong v-if="title" class="insight-callout__title">{{ title }}</strong>
      <div class="insight-callout__content">
        <slot />
      </div>
    </div>
  </section>
</template>

<style scoped>
.insight-callout {
  display: flex;
  gap: var(--space-3);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  color: var(--color-fg);
}

.insight-callout__icon {
  display: grid;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--color-bg-subtle);
}

.insight-callout__body {
  min-width: 0;
}

.insight-callout__title {
  display: block;
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-bold);
}

.insight-callout__content {
  display: grid;
  gap: 4px;
  margin-top: 4px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  line-height: 1.55;
}

.insight-callout__content :deep(p) {
  margin: 0;
}

.insight-callout--warning {
  border-color: color-mix(in srgb, var(--color-status-warning) 45%, var(--color-border-default));
  background: color-mix(in srgb, var(--color-status-warning) 9%, var(--color-bg-card));
}

.insight-callout--warning .insight-callout__icon {
  background: var(--color-status-warning-soft);
  color: var(--color-status-warning-strong);
}

.insight-callout--danger {
  border-color: color-mix(in srgb, var(--color-status-danger) 38%, var(--color-border-default));
  background: color-mix(in srgb, var(--color-status-danger) 7%, var(--color-bg-card));
}

.insight-callout--danger .insight-callout__icon {
  background: color-mix(in srgb, var(--color-status-danger) 12%, var(--color-bg-card));
  color: var(--color-status-danger);
}

.insight-callout--success {
  border-color: color-mix(in srgb, var(--color-status-success) 35%, var(--color-border-default));
  background: color-mix(in srgb, var(--color-status-success) 7%, var(--color-bg-card));
}

.insight-callout--success .insight-callout__icon {
  background: var(--color-status-success-soft);
  color: var(--color-status-success);
}

.insight-callout--info {
  border-color: color-mix(in srgb, var(--color-status-info) 35%, var(--color-border-default));
  background: color-mix(in srgb, var(--color-status-info) 7%, var(--color-bg-card));
}

.insight-callout--info .insight-callout__icon {
  background: color-mix(in srgb, var(--color-status-info) 12%, var(--color-bg-card));
  color: var(--color-status-info);
}

.insight-callout--neutral {
  background: var(--color-bg-subtle);
}
</style>

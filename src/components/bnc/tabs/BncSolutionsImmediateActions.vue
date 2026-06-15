<script setup lang="ts">
defineProps<{
  actionLabel: string | null;
  immediateActions: string[];
  monitoringKpis: string[];
  rollbackCondition: string | null;
}>();
</script>

<template>
  <section class="bnc-solutions__section bnc-solutions__section--now">
    <div class="bnc-solutions__section-hd">
      <h3>지금 할 것들</h3>
      <span>{{ actionLabel }} 선택 시 즉각 실행 항목</span>
    </div>
    <ol class="bnc-solutions__now-list">
      <li v-for="(action, i) in immediateActions" :key="i">
        <span class="bnc-solutions__now-num">{{ i + 1 }}</span>
        <span>{{ action }}</span>
      </li>
    </ol>
    <div v-if="monitoringKpis.length" class="bnc-solutions__now-monitor">
      <span class="bnc-solutions__now-monitor-label">30–60분 후 확인</span>
      <div class="bnc-solutions__now-chips">
        <span v-for="kpi in monitoringKpis" :key="kpi" class="bnc-solutions__now-chip">{{ kpi }}</span>
      </div>
    </div>
    <p v-if="rollbackCondition" class="bnc-solutions__now-rollback">
      <strong>원복 조건</strong> {{ rollbackCondition }}
    </p>
  </section>
</template>

<style scoped>
.bnc-solutions__section {
  display: grid;
  gap: var(--space-3);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
}

.bnc-solutions__section-hd {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  min-width: 0;
}

.bnc-solutions__section-hd h3 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.bnc-solutions__section-hd span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
}

.bnc-solutions__section--now {
  padding: var(--space-4);
  border: 1.5px solid color-mix(in srgb, var(--color-status-success) 35%, var(--color-border-subtle));
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-status-success) 5%, var(--color-bg-page));
  border-top: 1.5px solid color-mix(in srgb, var(--color-status-success) 35%, var(--color-border-subtle));
}

.bnc-solutions__section--now .bnc-solutions__section-hd h3 {
  color: color-mix(in srgb, var(--color-status-success) 70%, var(--color-fg-strong));
}

.bnc-solutions__now-list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.bnc-solutions__now-list li {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.5;
}

.bnc-solutions__now-num {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--color-status-success) 18%, var(--color-bg-page));
  color: color-mix(in srgb, var(--color-status-success) 80%, var(--color-fg-strong));
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.bnc-solutions__now-monitor {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding-top: var(--space-2);
}

.bnc-solutions__now-monitor-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  white-space: nowrap;
}

.bnc-solutions__now-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.bnc-solutions__now-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px var(--space-2);
  border: 1px solid color-mix(in srgb, var(--color-action-primary) 30%, var(--color-border-subtle));
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-action-primary) 8%, var(--color-bg-surface));
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
}

.bnc-solutions__now-rollback {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-status-warning) 8%, var(--color-bg-surface));
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

.bnc-solutions__now-rollback strong {
  color: var(--color-fg-strong);
  font-weight: var(--font-weight-semibold);
  margin-right: var(--space-1);
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue';

import type { AgentTaskProgressStep } from '@/types/agentTask';

const props = defineProps<{ steps: AgentTaskProgressStep[] }>();

const collapsed = ref(false);
const visible = computed(() => (props.steps ?? []).filter((s) => s.message));

const META: Record<string, { icon: string }> = {
  PLAN: { icon: '◆' },
  TOOL_CALL: { icon: '→' },
  COMPOSE: { icon: '✓' },
  RULE_BASED: { icon: '▸' },
  FALLBACK: { icon: '!' },
};

function icon(name: string): string {
  return META[name]?.icon ?? '·';
}
</script>

<template>
  <div v-if="visible.length" class="agent-trace">
    <button type="button" class="agent-trace__head" @click="collapsed = !collapsed">
      <span>에이전트 진행 과정 · {{ visible.length }}단계</span>
      <span class="agent-trace__chevron">{{ collapsed ? '▸' : '▾' }}</span>
    </button>
    <ol v-show="!collapsed" class="agent-trace__list">
      <li v-for="(step, i) in visible" :key="i" class="agent-trace__step" :class="`is-${step.stepName.toLowerCase()}`">
        <span class="agent-trace__icon">{{ icon(step.stepName) }}</span>
        <span class="agent-trace__msg">{{ step.message }}</span>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.agent-trace {
  margin: 0.5rem 0;
  border: 1px solid var(--color-border, rgba(148, 163, 184, 0.25));
  border-radius: 8px;
  background: var(--color-surface-subtle, rgba(148, 163, 184, 0.06));
  font-size: 0.78rem;
}

.agent-trace__head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-muted, #64748b);
  font-weight: 600;
  font-size: 0.74rem;
}

.agent-trace__chevron {
  opacity: 0.7;
}

.agent-trace__list {
  list-style: none;
  margin: 0;
  padding: 0.2rem 0.6rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.agent-trace__step {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
  line-height: 1.35;
  color: var(--color-text, #334155);
}

.agent-trace__icon {
  flex: 0 0 auto;
  width: 1.1rem;
  text-align: center;
  font-weight: 700;
  color: var(--color-text-muted, #94a3b8);
}

.agent-trace__step.is-tool_call .agent-trace__icon {
  color: var(--color-primary, #3b82f6);
}

.agent-trace__step.is-compose .agent-trace__icon {
  color: var(--color-success, #22c55e);
}

.agent-trace__step.is-fallback .agent-trace__icon {
  color: var(--color-warning, #f59e0b);
}

.agent-trace__msg {
  flex: 1 1 auto;
  word-break: break-word;
}
</style>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { ChevronDown, ChevronUp, MessageCircle } from '@lucide/vue';

import ChatStatusIndicator from '@/components/chatbot/ChatStatusIndicator.vue';
import type { AgentTaskResponse } from '@/types/agentTask';

const props = defineProps<{
  fabAgentTask: AgentTaskResponse | null;
  isRunning: boolean;
  error: string | null;
  basisAt: string | null;
  isBriefingResult: boolean;
  agentDirectionsLabel: string;
}>();

const emit = defineEmits<{
  (e: 'focus-tg', tgName: string): void;
  (e: 'open-chat', task: AgentTaskResponse): void;
}>();

const isCollapsed = ref(false);

const coreMetrics = computed(() =>
  (props.fabAgentTask?.result?.evidence ?? []).filter(
    (e) => !e.severity || e.severity === '정보' || e.severity === 'info'
  )
);
const alertMetrics = computed(() =>
  (props.fabAgentTask?.result?.evidence ?? []).filter(
    (e) => e.severity && e.severity !== '정보' && e.severity !== 'info'
  )
);

function severityLabel(s: string): string {
  if (s === '위험' || s === 'critical' || s === 'danger') return '위험';
  if (s === '주의' || s === 'warning') return '주의';
  return s;
}
function severityClass(s: string): string {
  if (s === '위험' || s === 'critical' || s === 'danger') return 'bc__ev-severity--danger';
  if (s === '주의' || s === 'warning') return 'bc__ev-severity--warning';
  return 'bc__ev-severity--info';
}
function splitEvidenceValue(value: string): string[] {
  return value
    .split(/,\s*(?=[A-Za-z가-힣])/)
    .map((s) => s.trim())
    .filter(Boolean);
}
function extractTgName(part: string): string {
  return part.split(':')[0].trim();
}
function hasTgName(part: string): boolean {
  const name = extractTgName(part);
  return /^[A-Za-z][A-Za-z0-9_]+$/.test(name) && name.length > 3;
}
function watchSeverityColor(severity: string): string {
  if (severity === 'critical') return 'var(--color-risk-critical)';
  if (severity === 'warning') return 'var(--color-status-warning)';
  return 'var(--color-action-primary)';
}
function formatEventTime(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
</script>

<template>
  <div class="bc__card">
    <button
      class="bc__head"
      type="button"
      :aria-expanded="!isCollapsed"
      aria-controls="bc-agent-result-body"
      @click="isCollapsed = !isCollapsed"
    >
      <div class="bc__head-text">
        <div class="bc__label">현황 브리핑 결과</div>
        <strong>{{
          fabAgentTask?.result?.artifacts?.[0]?.title ?? (isRunning ? '현황 분석 중' : '분석 결과')
        }}</strong>
        <div v-if="basisAt" class="bc__time">기준 시각 · {{ formatEventTime(basisAt) }}</div>
      </div>
      <span class="bc__toggle" aria-hidden="true">
        <ChevronUp v-if="!isCollapsed" :size="18" />
        <ChevronDown v-else :size="18" />
      </span>
    </button>

    <div v-show="!isCollapsed" id="bc-agent-result-body" class="bc__body">
      <ChatStatusIndicator v-if="isRunning" label="현황 분석 생성 중…" />
      <p v-else-if="error" class="bc__error">{{ error }}</p>
      <template v-else-if="fabAgentTask?.result">
        <p class="bc__summary">{{ fabAgentTask.result.summary }}</p>

        <!-- 핵심 지표 (정보 severity) — 3칸 그리드 -->
        <div v-if="coreMetrics.length" class="bc__metric-grid">
          <div v-for="item in coreMetrics.slice(0, 3)" :key="item.label" class="bc__metric-cell">
            <span class="bc__metric-label">{{ item.label }}</span>
            <b class="bc__metric-value">{{ item.value }}</b>
          </div>
        </div>

        <!-- 주의/위험 항목 -->
        <section v-if="alertMetrics.length" class="bc__section">
          <h4 class="bc__section-title">주의 · 위험 항목</h4>
          <div v-for="item in alertMetrics" :key="item.label" class="bc__alert-row">
            <div class="bc__alert-header">
              <span class="bc__severity" :class="severityClass(item.severity ?? '')">
                {{ severityLabel(item.severity ?? '') }}
              </span>
              <span class="bc__alert-label">{{ item.label }}</span>
            </div>
            <div class="bc__chip-row">
              <button
                v-for="part in splitEvidenceValue(item.value)"
                :key="part"
                type="button"
                class="bc__chip"
                :class="{ 'bc__chip--tg': hasTgName(part) }"
                :title="hasTgName(part) ? `${extractTgName(part)} 클릭 시 3D 포커스` : undefined"
                @click="hasTgName(part) ? emit('focus-tg', extractTgName(part)) : undefined"
              >
                {{ part }}
              </button>
            </div>
          </div>
        </section>

        <!-- 영향 범위 -->
        <section
          v-if="
            fabAgentTask.result.propagation?.affectedProcesses?.length ||
            fabAgentTask.result.propagation?.affectedToolGroups?.length
          "
          class="bc__section"
        >
          <h4 class="bc__section-title">영향 범위</h4>
          <p v-if="fabAgentTask.result.propagation.summary" class="bc__propagation-summary">
            {{ fabAgentTask.result.propagation.summary }}
          </p>
          <div v-if="fabAgentTask.result.propagation.affectedProcesses?.length" class="bc__chip-row">
            <span v-for="p in fabAgentTask.result.propagation.affectedProcesses" :key="p" class="bc__process-chip">{{
              p
            }}</span>
          </div>
          <div v-if="fabAgentTask.result.propagation.affectedToolGroups?.length" class="bc__chip-row">
            <button
              v-for="tg in fabAgentTask.result.propagation.affectedToolGroups"
              :key="tg"
              type="button"
              class="bc__chip bc__chip--tg"
              :title="`${tg} 클릭 시 3D 포커스`"
              @click="emit('focus-tg', tg)"
            >
              {{ tg }}
            </button>
          </div>
        </section>

        <!-- 권장 조치 -->
        <section v-if="fabAgentTask.result.followUpPrompts?.length" class="bc__section">
          <h4 class="bc__section-title">권장 조치</h4>
          <ul class="bc__follow-list">
            <li v-for="prompt in fabAgentTask.result.followUpPrompts" :key="prompt">{{ prompt }}</li>
          </ul>
        </section>

        <!-- 살펴볼 TG -->
        <section v-if="fabAgentTask.result.watchToolGroups?.length" class="bc__section">
          <h4 class="bc__section-title">살펴볼 TG</h4>
          <div class="bc__watch-list">
            <button
              v-for="w in fabAgentTask.result.watchToolGroups"
              :key="w.tgName"
              type="button"
              class="bc__watch-chip"
              :style="{ '--watch-color': watchSeverityColor(w.severity) }"
              :title="`${w.tgName}${w.areaName ? ' · ' + w.areaName : ''} — ${w.reason} (클릭 시 줌인)`"
              @click="emit('focus-tg', w.tgName)"
            >
              <span class="bc__watch-name">{{ w.tgName }}</span>
              <span class="bc__watch-reason">{{ w.reason }}</span>
            </button>
          </div>
        </section>

        <!-- 현장 확인 포인트 / 대응 방향 -->
        <section v-if="fabAgentTask.result.responseDirections?.length" class="bc__section">
          <h4 class="bc__section-title">{{ agentDirectionsLabel }}</h4>
          <ul class="bc__directions">
            <li v-for="direction in fabAgentTask.result.responseDirections.slice(0, 4)" :key="direction.title">
              <strong>{{ direction.title }}</strong>
              <span>{{ direction.description }}</span>
            </li>
          </ul>
        </section>

        <button
          v-if="fabAgentTask.status === 'SUCCEEDED'"
          class="bc__ask-btn"
          type="button"
          @click="emit('open-chat', fabAgentTask)"
        >
          <MessageCircle :size="14" aria-hidden="true" />
          대화에서 더 물어보기
        </button>
      </template>
      <p v-else class="bc__summary">AI Agent 작업을 준비 중입니다.</p>
    </div>
  </div>
</template>

<style scoped>
.bc__card {
  display: grid;
  gap: var(--space-3);
  border: var(--border-width-default) solid color-mix(in srgb, var(--color-gold) 36%, var(--color-border-default));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-gold) 5%, transparent);
  padding: var(--space-3);
}

.bc__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  gap: var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  padding: var(--space-1);
  text-align: left;
}
.bc__head:hover {
  background: var(--color-state-hover);
}
.bc__head:focus-visible {
  outline: 2px solid var(--color-action-primary-border);
  outline-offset: 2px;
}
.bc__head strong {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
}
.bc__head-text {
  min-width: 0;
}
.bc__label {
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--f-title-label);
  margin-bottom: 4px;
}
.bc__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-height: 28px;
  padding: 2px;
  border: none;
  background: transparent;
  color: var(--color-fg-muted);
  cursor: pointer;
}
.bc__head .bc__toggle:hover {
  color: var(--color-fg-strong);
}
.bc__time {
  margin-top: 3px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bc__body {
  display: grid;
  gap: var(--space-3);
}

.bc__summary,
.bc__error {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: 1.55;
}
.bc__error {
  color: var(--color-status-danger);
}

.bc__ask-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  min-height: 34px;
  margin-top: var(--space-1);
  border: 1px solid var(--color-action-primary-border);
  border-radius: var(--radius-md);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
  cursor: pointer;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
.bc__ask-btn:hover {
  background: color-mix(in srgb, var(--color-action-primary) 16%, var(--color-bg-surface));
}

/* 섹션 */
.bc__section {
  display: grid;
  gap: var(--space-2);
  border-top: 1px solid var(--color-border-subtle);
  padding-top: var(--space-3);
}
.bc__section-title {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}
.bc__section p,
.bc__section li {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}
.bc__section ul {
  display: grid;
  gap: var(--space-2);
  margin: 0;
  padding-left: 16px;
}
.bc__section li strong {
  display: block;
  color: var(--color-fg);
}

/* 핵심 지표 그리드 */
.bc__metric-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}
.bc__metric-cell {
  display: grid;
  gap: 3px;
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  padding: var(--space-2);
  text-align: center;
}
.bc__metric-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.3;
}
.bc__metric-value {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

/* 주의/위험 */
.bc__alert-row {
  display: grid;
  gap: var(--space-2);
  border-radius: var(--radius-md);
  background: var(--color-bg-page);
  padding: var(--space-2);
}
.bc__alert-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.bc__alert-label {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.bc__severity {
  flex-shrink: 0;
  border-radius: var(--radius-sm);
  padding: 1px 6px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.bc__ev-severity--danger {
  background: color-mix(in srgb, var(--color-status-danger) 14%, transparent);
  color: var(--color-status-danger);
}
.bc__ev-severity--warning {
  background: color-mix(in srgb, var(--color-status-warning) 14%, transparent);
  color: var(--color-status-warning);
}
.bc__ev-severity--info {
  background: color-mix(in srgb, var(--color-status-info) 14%, transparent);
  color: var(--color-status-info);
}

/* 칩 */
.bc__chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}
.bc__chip {
  display: inline-block;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-surface);
  padding: 2px 7px;
  color: var(--color-fg);
  font: inherit;
  font-size: var(--font-size-xs);
  cursor: default;
}
.bc__chip--tg {
  border-color: color-mix(in srgb, var(--color-action-primary) 40%, var(--color-border-default));
  background: color-mix(in srgb, var(--color-action-primary) 7%, var(--color-bg-surface));
  color: var(--color-action-primary);
  cursor: pointer;
}
.bc__chip--tg:hover {
  background: color-mix(in srgb, var(--color-action-primary) 15%, var(--color-bg-surface));
}
.bc__process-chip {
  display: inline-block;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm);
  background: var(--color-bg-subtle);
  padding: 2px 7px;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}
.bc__propagation-summary {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

/* 권장 조치 */
.bc__follow-list {
  display: grid;
  gap: var(--space-1);
  margin: 0;
  padding-left: 16px;
}
.bc__follow-list li {
  color: var(--color-fg);
  font-size: var(--font-size-xs);
  line-height: 1.5;
}

/* 살펴볼 TG */
.bc__watch-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.bc__watch-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  max-width: 100%;
  padding: 5px var(--space-2);
  border: 1px solid color-mix(in srgb, var(--watch-color) 45%, var(--color-border-default));
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--watch-color) 9%, var(--color-bg-surface));
  color: var(--color-fg);
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.bc__watch-chip:hover {
  background: color-mix(in srgb, var(--watch-color) 18%, var(--color-bg-surface));
}
.bc__watch-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-fg-strong);
}
.bc__watch-reason {
  font-size: var(--font-size-xs);
  color: var(--color-fg-muted);
}

/* 대응 방향 */
.bc__directions {
  padding-left: 0;
  list-style: none;
  display: grid;
  gap: var(--space-2);
  margin: 0;
}
.bc__directions li {
  display: grid;
  gap: 2px;
  padding: 0 0 0 10px;
  border-left: 2px solid var(--color-border-default);
}
.bc__directions li strong {
  display: block;
  color: var(--color-fg);
  font-size: var(--font-size-sm);
}
.bc__directions li span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.5;
  overflow-wrap: anywhere;
}
</style>

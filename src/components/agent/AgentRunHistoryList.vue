<script setup lang="ts">
import { ref } from 'vue';

import type { AgentRunListItem } from '@/services/agentTaskService';

import type { AgentTaskResult } from '@/types/agentTask';

const props = defineProps<{
  items: AgentRunListItem[];
  loading?: boolean;
  title?: string;
  deletable?: boolean;
  loadFull?: (item: AgentRunListItem) => Promise<AgentTaskResult | null>;
}>();

const emit = defineEmits<{
  (e: 'delete', item: AgentRunListItem): void;
  (e: 'focusTg', tgName: string): void;
}>();

const openId = ref<string | null>(null);
const fullResults = ref<Record<string, AgentTaskResult | null>>({});
const fetchingId = ref<string | null>(null);

async function toggle(item: AgentRunListItem) {
  if (openId.value === item.id) {
    openId.value = null;
    return;
  }
  openId.value = item.id;
  if (props.loadFull && !(item.id in fullResults.value)) {
    fetchingId.value = item.id;
    try {
      fullResults.value[item.id] = await props.loadFull(item);
    } finally {
      fetchingId.value = null;
    }
  }
}

function fmt(ts: string | null): string {
  if (!ts) return '';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString();
}

function firstLine(summary: string | null): string {
  if (!summary) return '(요약 없음)';
  return (
    summary
      .split('\n')[0]
      .replace(/^#+\s*/, '')
      .trim() || summary
  );
}

function severityColor(severity: string): string {
  const s = severity?.toUpperCase();
  if (s === 'CRITICAL') return 'var(--color-risk-critical, #e5484d)';
  if (s === 'HIGH') return 'var(--color-risk-high, #e5a44d)';
  if (s === 'MEDIUM') return 'var(--color-risk-medium, #e5d64d)';
  return 'var(--color-border-default)';
}
</script>

<template>
  <section class="arh">
    <p v-if="title" class="arh__label">{{ title }}</p>
    <p v-if="loading" class="arh__state">불러오는 중…</p>
    <p v-else-if="items.length === 0" class="arh__state">아직 실행 이력이 없습니다.</p>
    <ul v-else class="arh__list">
      <li v-for="item in items" :key="item.id" class="arh__item" :class="{ 'arh__item--open': openId === item.id }">
        <!-- 헤더 -->
        <button type="button" class="arh__trigger" @click="toggle(item)">
          <span class="arh__trigger-left">
            <span class="arh__trigger-line">{{ firstLine(item.summary) }}</span>
            <span class="arh__trigger-meta">
              <span v-if="item.status !== 'SUCCEEDED'" class="arh__status" :data-status="item.status">{{
                item.status
              }}</span>
              <time>{{ fmt(item.completedAt ?? item.createdAt) }}</time>
            </span>
          </span>
          <svg class="arh__chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M3 5l4 4 4-4"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>

        <!-- 확장 본문 -->
        <div v-if="openId === item.id" class="arh__body">
          <!-- 로딩 -->
          <p v-if="fetchingId === item.id" class="arh__body-state">결과 불러오는 중…</p>

          <!-- rich 결과 -->
          <template v-else-if="fullResults[item.id]">
            <p class="arh__summary">{{ fullResults[item.id]!.summary }}</p>

            <section v-if="fullResults[item.id]!.evidence?.length" class="arh__section">
              <h4 class="arh__section-title">현황 지표</h4>
              <ul class="arh__evidence">
                <li v-for="ev in fullResults[item.id]!.evidence.slice(0, 6)" :key="`${ev.label}-${ev.value}`">
                  <span class="arh__ev-label">{{ ev.label }}</span>
                  <b class="arh__ev-value">{{ ev.value }}</b>
                </li>
              </ul>
            </section>

            <section v-if="fullResults[item.id]!.watchToolGroups?.length" class="arh__section">
              <h4 class="arh__section-title">살펴볼 TG</h4>
              <div class="arh__watch-list">
                <button
                  v-for="w in fullResults[item.id]!.watchToolGroups"
                  :key="w.tgName"
                  type="button"
                  class="arh__watch-chip"
                  :style="{ '--watch-color': severityColor(w.severity) }"
                  :title="`${w.tgName}${w.areaName ? ' · ' + w.areaName : ''} — ${w.reason}`"
                  @click.stop="emit('focusTg', w.tgName)"
                >
                  <span class="arh__watch-name">{{ w.tgName }}</span>
                  <span class="arh__watch-reason">{{ w.reason }}</span>
                </button>
              </div>
            </section>

            <section v-if="fullResults[item.id]!.responseDirections?.length" class="arh__section">
              <h4 class="arh__section-title">현장 확인 포인트</h4>
              <ul class="arh__directions">
                <li v-for="dir in fullResults[item.id]!.responseDirections.slice(0, 4)" :key="dir.title">
                  <strong>{{ dir.title }}</strong>
                  <span>{{ dir.description }}</span>
                </li>
              </ul>
            </section>
          </template>

          <!-- loadFull 없거나 결과 null → summary 텍스트 폴백 -->
          <p v-else class="arh__summary">{{ item.summary ?? '(요약 없음)' }}</p>

          <!-- 삭제 버튼 -->
          <div v-if="deletable" class="arh__body-footer">
            <button type="button" class="arh__delete-btn" @click.stop="emit('delete', item)">이력 삭제</button>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.arh {
  display: grid;
  gap: var(--space-2, 8px);
}

.arh__label {
  margin: 0;
  font-size: var(--font-size-xs, 0.75rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-fg-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.arh__state,
.arh__body-state {
  margin: 0;
  font-size: var(--font-size-sm, 0.85rem);
  color: var(--color-fg-muted);
}

/* 목록 */
.arh__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-2, 8px);
}

/* 카드 */
.arh__item {
  border: var(--border-width-default, 1px) solid var(--color-border-default);
  border-radius: var(--radius-md, 8px);
  transition: border-color 0.15s;
  background: color-mix(in srgb, var(--color-gold, #c8a86b) 3%, transparent);
}
.arh__item--open {
  border-color: color-mix(in srgb, var(--color-gold, #c8a86b) 36%, var(--color-border-default));
}

/* 헤더 트리거 */
.arh__trigger {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
}
.arh__trigger:hover {
  background: var(--color-state-hover);
}

.arh__trigger-left {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 3px;
}

.arh__trigger-line {
  font-size: var(--font-size-sm, 0.875rem);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-fg-strong);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.arh__trigger-meta {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--color-fg-muted);
}

.arh__chevron {
  flex: 0 0 auto;
  color: var(--color-fg-muted);
  transition: transform 0.2s ease;
}
.arh__item--open .arh__chevron {
  transform: rotate(180deg);
}

.arh__status[data-status='FAILED'] {
  color: var(--color-status-danger, #e5484d);
}
.arh__status[data-status='RUNNING'] {
  color: var(--color-status-warning, #e5b94d);
}

/* ── 확장 본문 ── */
.arh__body {
  border-top: 1px solid var(--color-border-subtle);
  padding: var(--space-3, 12px);
  display: grid;
  gap: var(--space-3, 12px);
}

/* summary 텍스트 */
.arh__summary {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-sm, 0.875rem);
  line-height: 1.55;
}

/* 섹션 공통 */
.arh__section {
  display: grid;
  gap: var(--space-2, 8px);
  border-top: 1px solid var(--color-border-subtle);
  padding-top: var(--space-3, 12px);
}
.arh__section-title {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm, 0.875rem);
  font-weight: var(--font-weight-bold, 700);
}

/* evidence 리스트 */
.arh__evidence {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-2, 8px);
}
.arh__evidence li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2, 8px);
  border-radius: var(--radius-md, 6px);
  background: var(--color-bg-page);
  padding: 6px var(--space-2, 8px);
}
.arh__ev-label {
  min-width: 0;
  overflow: hidden;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs, 0.75rem);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.arh__ev-value {
  flex-shrink: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm, 0.875rem);
  font-weight: var(--font-weight-bold, 700);
}

/* watchToolGroups 칩 */
.arh__watch-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2, 8px);
}
.arh__watch-chip {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  max-width: 100%;
  padding: 5px var(--space-2, 8px);
  border: 1px solid color-mix(in srgb, var(--watch-color) 45%, var(--color-border-default));
  border-radius: var(--radius-md, 6px);
  background: color-mix(in srgb, var(--watch-color) 9%, var(--color-bg-surface));
  color: var(--color-fg);
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.arh__watch-chip:hover {
  background: color-mix(in srgb, var(--watch-color) 18%, var(--color-bg-surface));
}
.arh__watch-name {
  font-size: var(--font-size-sm, 0.875rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-fg-strong);
}
.arh__watch-reason {
  font-size: var(--font-size-xs, 0.75rem);
  color: var(--color-fg-muted);
}

/* responseDirections */
.arh__directions {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: var(--space-2, 8px);
}
.arh__directions li {
  display: grid;
  gap: 2px;
  padding: 0 0 0 10px;
  border-left: 2px solid var(--color-border-default);
}
.arh__directions li strong {
  display: block;
  color: var(--color-fg);
  font-size: var(--font-size-sm, 0.875rem);
}
.arh__directions li span {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs, 0.75rem);
  line-height: 1.5;
  overflow-wrap: anywhere;
}

/* 삭제 버튼 */
.arh__body-footer {
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--color-border-subtle);
  padding-top: var(--space-2, 8px);
}
.arh__delete-btn {
  padding: 4px 12px;
  font-size: var(--font-size-xs, 0.75rem);
  font: inherit;
  font-size: var(--font-size-xs, 0.75rem);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-sm, 4px);
  background: transparent;
  color: var(--color-fg-muted);
  cursor: pointer;
  transition:
    border-color 0.15s,
    color 0.15s;
}
.arh__delete-btn:hover {
  border-color: var(--color-status-danger, #e5484d);
  color: var(--color-status-danger, #e5484d);
}
</style>

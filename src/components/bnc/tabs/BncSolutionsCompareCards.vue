<script setup lang="ts">
import type { BncActionPlan, BncActionSpecGroup, BncBaselineSnapshotItem, BncRagEvidence } from '@/types/bnc';

interface PlanBadge {
  label: string;
  tone: 'success' | 'info' | 'warning';
}

defineProps<{
  plans: BncActionPlan[];
  selectedOptionId: string;
  isCurrentOptionSelected: boolean;
  currentOptionMetrics: BncBaselineSnapshotItem[];
  baselineTargetToolGroups: string[];
  ragEvidence: BncRagEvidence | null | undefined;
  planBadges: Record<string, PlanBadge>;
}>();

defineEmits<{
  selectCurrentOption: [];
  selectPlan: [planId: string];
}>();

function isHotAction(action: string) {
  return action.toLowerCase().includes('superhot');
}

function lotBadgeLabel(group: BncActionSpecGroup): string {
  const n = group.lots.length;
  if (isHotAction(group.action)) return `SuperHotLot 지정 · ${n}건`;
  return `우선순위 상향 · ${n} 건`;
}

function lotBadgeDesc(group: BncActionSpecGroup): string {
  const n = group.lots.length;
  if (isHotAction(group.action)) return 'SuperHotLot은 줄을 서지 않고 즉시 최우선으로 진행됩니다.';
  return `납기가 임박한 lot ${n}건의 처리 순서를 앞당깁니다.`;
}

function totalLots(plan: BncActionPlan): number {
  return plan.actionSpec?.lotGroups?.reduce((s, g) => s + g.lots.length, 0) ?? 0;
}

function lotRowDesc(action: string, t2dueMin: number): string {
  if (isHotAction(action)) return 'SuperHotLot';
  return `납기 ${t2dueMin.toLocaleString('ko-KR')}분`;
}
</script>

<template>
  <section class="bnc-solutions__compare">
    <div class="bnc-solutions__compare-hd">
      <h3>대응안 후보 추천</h3>
    </div>

    <div class="bnc-solutions__cards">
      <!-- 무대응 -->
      <button
        type="button"
        class="bnc-solutions__card bnc-solutions__card--current"
        :class="{ 'bnc-solutions__card--selected': isCurrentOptionSelected }"
        @click="$emit('selectCurrentOption')"
      >
        <div class="bnc-solutions__card-hd">
          <div class="bnc-solutions__card-hd-top">
            <span class="bnc-solutions__card-name">무대응</span>
            <span class="bnc-solutions__type-chip">현재 유지</span>
          </div>
        </div>

        <div class="bnc-solutions__op-section">
          <span class="bnc-solutions__op-label">Lot 투입 간격 (Release Interval)</span>
          <span class="bnc-solutions__op-value">현재 유지</span>
          <p class="bnc-solutions__op-desc">투입 속도·Lot 우선순위를 바꾸지 않습니다.</p>
        </div>

        <div class="bnc-solutions__lot-section">
          <span class="bnc-solutions__lot-label">Lot 조정</span>
          <span class="bnc-solutions__lot-none">조정 없음</span>
        </div>
      </button>

      <!-- 대응안 A / B / C -->
      <button
        v-for="(plan, i) in plans"
        :key="plan.planId"
        type="button"
        class="bnc-solutions__card bnc-solutions__card--plan"
        :class="[
          {
            'bnc-solutions__card--selected': plan.planId === selectedOptionId,
            'bnc-solutions__card--recommended': plan.recommended,
          },
          plan.recommended ? `bnc-solutions__card--recommended-${planBadges[plan.planId]?.tone}` : '',
        ]"
        @click="$emit('selectPlan', plan.planId)"
      >
        <div class="bnc-solutions__card-hd">
          <div class="bnc-solutions__card-hd-top">
            <span class="bnc-solutions__card-name">대응안 {{ ['A', 'B', 'C'][i] ?? i + 1 }}</span>
            <span class="bnc-solutions__card-hd-chips">
              <span v-if="plan.actionLabel" class="bnc-solutions__type-chip">{{ plan.actionLabel }}</span>
              <span
                v-if="plan.recommended"
                class="bnc-solutions__ai-badge"
                :class="`bnc-solutions__ai-badge--${planBadges[plan.planId]?.tone}`"
                >AI 추천</span
              >
            </span>
          </div>
        </div>

        <div class="bnc-solutions__op-section">
          <span class="bnc-solutions__op-label">Lot 투입 간격 (Release Interval)</span>
          <span v-if="plan.actionSpec?.intervalPct" class="bnc-solutions__interval-val">
            +{{ plan.actionSpec.intervalPct.toFixed(1) }}%
          </span>
          <p class="bnc-solutions__op-desc">
            신규 lot 투입을 {{ plan.actionSpec?.intervalPct }}% 늦춰 혼잡을 완화합니다.
          </p>
        </div>

        <div class="bnc-solutions__lot-section">
          <span class="bnc-solutions__lot-label">
            Lot 조정{{ plan.actionSpec?.lotGroups?.length ? ` · ${totalLots(plan)}건` : '' }}
          </span>

          <span v-if="plan.actionSpec?.noLotAdjust" class="bnc-solutions__lot-none">
            조정 없음{{ plan.actionSpec.noLotReason ? ` · ${plan.actionSpec.noLotReason}` : '' }}
          </span>

          <template v-else-if="plan.actionSpec?.lotGroups?.length">
            <div class="bnc-solutions__lot-badges">
              <span
                v-for="group in plan.actionSpec.lotGroups"
                :key="group.zone"
                class="bnc-solutions__lot-badge"
                :class="
                  isHotAction(group.action) ? 'bnc-solutions__lot-badge--hot' : 'bnc-solutions__lot-badge--priority'
                "
                >↑ {{ lotBadgeLabel(group) }}</span
              >
            </div>
            <p class="bnc-solutions__op-desc">{{ lotBadgeDesc(plan.actionSpec.lotGroups[0]) }}</p>
            <div class="bnc-solutions__lot-list">
              <span class="bnc-solutions__lot-list-hd">대상 lot</span>
              <div class="bnc-solutions__lot-rows">
                <template v-for="group in plan.actionSpec.lotGroups" :key="group.zone">
                  <div v-for="lot in group.lots" :key="lot.id" class="bnc-solutions__lot-row">
                    <span class="bnc-solutions__lot-row-id">{{ lot.id }}</span>
                    <span class="bnc-solutions__lot-row-meta"
                      >{{ lot.product }} · {{ lotRowDesc(group.action, lot.t2dueMin) }}</span
                    >
                  </div>
                </template>
              </div>
            </div>
          </template>
        </div>
      </button>
    </div>
  </section>
</template>

<style scoped>
.bnc-solutions__compare {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
}

.bnc-solutions__compare-hd {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
  min-width: 0;
}

.bnc-solutions__compare-hd h3 {
  margin: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
}

.bnc-solutions__cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(200px, 1fr));
  gap: var(--space-3);
  align-items: stretch;
  overflow-x: auto;
}

/* ── 카드 공통 ─────────────────────────────────────── */
.bnc-solutions__card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  border-radius: var(--radius-lg);
  overflow: visible;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-fast);
}

.bnc-solutions__card--current {
  border: 1.5px solid color-mix(in srgb, var(--color-status-warning) 30%, var(--color-border-default));
  background: color-mix(in srgb, var(--color-status-warning) 5%, var(--color-bg-card));
}
.bnc-solutions__card--current:hover {
  border-color: color-mix(in srgb, var(--color-status-warning) 56%, var(--color-border-default));
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-status-warning) 16%, transparent);
}

.bnc-solutions__card--plan {
  border: 1.5px solid var(--color-border-default);
  background: var(--color-bg-card);
}
.bnc-solutions__card--plan:hover {
  border-color: var(--color-action-primary-border);
  box-shadow: 0 2px 8px color-mix(in srgb, var(--color-action-primary) 12%, transparent);
}

.bnc-solutions__card--recommended {
  border-color: color-mix(in srgb, var(--color-status-success) 45%, var(--color-border-default));
  background: color-mix(in srgb, var(--color-status-success) 4%, var(--color-bg-card));
}
.bnc-solutions__card--recommended-info {
  border-color: color-mix(in srgb, #2563eb 48%, var(--color-border-default));
  border-top-color: #2563eb;
  background: color-mix(in srgb, #2563eb 5%, var(--color-bg-card));
}
.bnc-solutions__card--recommended-warning {
  border-color: color-mix(in srgb, var(--color-status-warning) 48%, var(--color-border-default));
  border-top-color: var(--color-status-warning);
  background: color-mix(in srgb, var(--color-status-warning) 6%, var(--color-bg-card));
}
.bnc-solutions__card--recommended-success {
  border-color: color-mix(in srgb, var(--color-status-success) 45%, var(--color-border-default));
  background: color-mix(in srgb, var(--color-status-success) 4%, var(--color-bg-card));
}

.bnc-solutions__card--selected {
  border-color: #2563eb !important;
  background: #eff6ff !important;
  box-shadow:
    0 0 0 2px #2563eb,
    0 10px 24px #1d4ed81f;
}

/* ── AI 추천 배지 (헤더 내 인라인) ─────────────── */
.bnc-solutions__ai-badge {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  background: var(--color-status-success);
  color: #fff;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}
.bnc-solutions__ai-badge--info {
  background: #2563eb;
}
.bnc-solutions__ai-badge--warning {
  background: var(--color-status-warning);
}

/* ── 카드 헤더 ───────────────────────────────────── */
.bnc-solutions__card-hd {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
}

.bnc-solutions__card-hd-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.bnc-solutions__card-hd-chips {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  flex-shrink: 0;
}

.bnc-solutions__card-name {
  color: var(--color-fg-strong);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  line-height: 1.2;
}

.bnc-solutions__type-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-pill);
  background: var(--color-bg-subtle);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

/* ── 운영 조건 섹션 ──────────────────────────────── */
.bnc-solutions__op-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  border-top: 1px solid var(--color-border-subtle);
}

.bnc-solutions__op-label {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  line-height: 1.4;
}

.bnc-solutions__op-value {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__interval-val {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.4;
}

.bnc-solutions__op-desc {
  margin: 0;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  line-height: 1.55;
  word-break: keep-all;
}

/* ── Lot 조정 섹션 ───────────────────────────────── */
.bnc-solutions__lot-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  border-top: 1px solid var(--color-border-subtle);
  flex: 1;
}

.bnc-solutions__lot-label {
  color: var(--color-fg-strong);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.bnc-solutions__lot-none {
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  margin: 0;
}

.bnc-solutions__lot-badges {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.bnc-solutions__lot-badge {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__lot-badge--priority {
  background: color-mix(in srgb, var(--color-status-warning) 12%, var(--color-bg-subtle));
  color: var(--color-status-warning);
  border: 1px solid color-mix(in srgb, var(--color-status-warning) 28%, var(--color-border-subtle));
}

.bnc-solutions__lot-badge--hot {
  background: color-mix(in srgb, #f97316 14%, var(--color-bg-subtle));
  color: #c2410c;
  border: 1px solid color-mix(in srgb, #f97316 32%, var(--color-border-subtle));
}

.bnc-solutions__lot-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: var(--space-1);
}

.bnc-solutions__lot-list-hd {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.bnc-solutions__lot-rows {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bnc-solutions__lot-row {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  min-width: 0;
}

.bnc-solutions__lot-row-id {
  flex-shrink: 0;
  color: var(--color-fg-strong);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}

.bnc-solutions__lot-row-meta {
  overflow: hidden;
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── 반응형 ──────────────────────────────────────── */
@media (max-width: 900px) {
  .bnc-solutions__cards {
    grid-template-columns: repeat(2, minmax(200px, 1fr));
  }
}

@media (max-width: 580px) {
  .bnc-solutions__cards {
    grid-template-columns: 1fr;
  }
}
</style>

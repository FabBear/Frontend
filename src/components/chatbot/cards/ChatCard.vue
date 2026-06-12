<script setup lang="ts">
import { type Component, computed } from 'vue';
import { useRouter } from 'vue-router';

import { Box } from '@lucide/vue';

import type { ChatUiCard } from '@/types/chatbot';

import ChatCardCases from './ChatCardCases.vue';
import ChatCardLot from './ChatCardLot.vue';
import ChatCardNavigation from './ChatCardNavigation.vue';
import ChatCardStatus from './ChatCardStatus.vue';
import ChatCardTrend from './ChatCardTrend.vue';

// 카드 종류 → 컴포넌트 레지스트리. AI가 고른 type에 맞는 컴포넌트를 props로 렌더.
// (props는 백엔드가 카드 type에 맞춰 보내는 실데이터 — Component로 두고 런타임에 위임)
const registry: Record<ChatUiCard['type'], Component> = {
  status: ChatCardStatus,
  trend: ChatCardTrend,
  lot: ChatCardLot,
  cases: ChatCardCases,
  navigation: ChatCardNavigation,
};

const props = defineProps<{ card: ChatUiCard }>();
const router = useRouter();

const component = computed(() => registry[props.card.type as keyof typeof registry] ?? null);

// 액션 칩: 카드의 실데이터에서 TG를 뽑아 3D 뷰 딥링크(?tg=) 제공(읽기 전용·결정적).
const tgChips = computed<string[]>(() => {
  const p = props.card.props as Record<string, unknown>;
  const rows = (p.rows as Array<Record<string, unknown>> | undefined) ?? [];
  const pick = (value: unknown) => {
    const tg = String(value ?? '').split('/')[1];
    return tg?.trim() || null;
  };
  let tgs: Array<string | null> = [];
  if (props.card.type === 'lot') tgs = rows.map((r) => pick(r.label));
  else if (props.card.type === 'cases') tgs = rows.map((r) => pick(r.where));
  return [...new Set(tgs.filter((t): t is string => Boolean(t)))].slice(0, 3);
});

function open3d(tg: string) {
  void router.push({ path: '/monitoring/fab-3d', query: { tg } });
}
</script>

<template>
  <div v-if="component" class="chat-card">
    <component :is="component" :data="card.props" />
    <div v-if="tgChips.length" class="chat-card__actions">
      <button v-for="tg in tgChips" :key="tg" type="button" class="chat-card__chip" @click="open3d(tg)">
        <Box :size="11" aria-hidden="true" />
        {{ tg }} 3D로 보기
      </button>
    </div>
  </div>
</template>

<style scoped>
.chat-card {
  margin-top: var(--space-2);
  padding: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
}
.chat-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  margin-top: var(--space-2);
}
.chat-card__chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: 1px solid var(--color-action-primary-border);
  border-radius: var(--radius-pill);
  background: var(--color-bg-card);
  color: var(--color-action-primary);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}
.chat-card__chip:hover {
  background: var(--color-action-primary-soft);
}
</style>

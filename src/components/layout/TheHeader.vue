<script setup lang="ts">
import { computed } from 'vue';

import { Bell, Bot, LogOut, Moon, Sun, UserRound } from '@lucide/vue';

import { useTheme } from '@/composables/useTheme';

import type { AuthUser } from '@/types/auth';

import BaseButton from '@/components/base/BaseButton.vue';
import DataAsOfBadge from '@/components/layout/DataAsOfBadge.vue';

interface Props {
  title: string;
  notificationCount: number;
  user: AuthUser | null;
  notificationOpen?: boolean;
  chatOpen?: boolean;
  dataAsOf?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  chatOpen: false,
  dataAsOf: null,
  notificationOpen: false,
});

const emit = defineEmits<{
  openChat: [];
  toggleNotifications: [];
  logout: [];
}>();

const { isDark, toggle: toggleTheme } = useTheme();

const roleLabel = computed(() => {
  if (!props.user) return '미인증';
  return props.user.roles.includes('ADMIN') ? '관리자' : '엔지니어';
});

const userPrimaryLabel = computed(() => {
  if (!props.user) return '미인증 사용자';
  return `${props.user.userName} · ${props.user.loginId}`;
});

const userSecondaryLabel = computed(() => {
  if (!props.user) return 'Fab 미선택';
  return `${props.user.fabName ?? props.user.fabId} · ${roleLabel.value}`;
});
</script>

<template>
  <header class="the-header">
    <div>
      <p class="the-header__eyebrow">Fab 운영</p>
      <h1 class="the-header__title">{{ title }}</h1>
    </div>

    <div class="the-header__actions">
      <DataAsOfBadge :as-of="dataAsOf ?? null" />
      <BaseButton
        class="the-header__chat-button"
        :class="{ 'the-header__chat-button--active': chatOpen }"
        variant="primary"
        size="sm"
        @click="emit('openChat')"
      >
        <Bot :size="16" aria-hidden="true" />
        AI 에이전트
      </BaseButton>
      <button
        class="the-header__notification-button"
        :class="{ 'the-header__notification-button--active': notificationOpen }"
        type="button"
        aria-label="알림"
        :aria-expanded="notificationOpen"
        @click="emit('toggleNotifications')"
      >
        <Bell :size="17" aria-hidden="true" />
        <span v-if="notificationCount > 0" class="the-header__badge">
          {{ notificationCount }}
        </span>
      </button>
      <div class="the-header__user">
        <span class="the-header__avatar">
          <template v-if="user">{{ user.roles.includes('ADMIN') ? 'A' : 'E' }}</template>
          <UserRound v-else :size="15" aria-hidden="true" />
        </span>
        <div class="the-header__info">
          <strong>{{ userPrimaryLabel }}</strong>
          <span>{{ userSecondaryLabel }}</span>
        </div>
      </div>
      <button
        class="the-header__icon-button the-header__theme-btn"
        type="button"
        :aria-label="isDark ? '라이트 모드로 전환' : '다크 모드로 전환'"
        @click="toggleTheme"
      >
        <Sun v-if="isDark" :size="17" aria-hidden="true" />
        <Moon v-else :size="17" aria-hidden="true" />
      </button>
      <button class="the-header__icon-button" type="button" aria-label="로그아웃" @click="emit('logout')">
        <LogOut :size="17" aria-hidden="true" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.the-header {
  --header-control-height: 40px;

  display: flex;
  height: var(--layout-header-height);
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: var(--space-3);
  border-bottom: var(--border-width-default) solid var(--color-border-default);
  background: var(--color-bg-surface);
  padding: 0 var(--spacing-page);
}

.the-header > div:first-child {
  min-width: 0;
}

.the-header__eyebrow {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.the-header__title {
  overflow: hidden;
  color: var(--color-fg-strong);
  font-size: var(--font-size-lg);
  line-height: var(--line-height-tight);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.the-header__actions {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: var(--space-3);
}

.the-header__actions :deep(.base-button--sm) {
  min-height: var(--header-control-height);
  padding: 0 12px;
}

.the-header__chat-button--active {
  border-color: var(--color-action-primary-border);
  background: var(--color-state-selected-bg);
  color: var(--color-action-primary);
}

.the-header__notification-button,
.the-header__icon-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: var(--header-control-height);
  border: var(--border-width-default) solid var(--color-border-default);
  border-radius: var(--radius-md);
  background: var(--color-bg-surface);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.the-header__notification-button--active,
.the-header__notification-button:hover,
.the-header__icon-button:hover {
  border-color: var(--color-action-primary-border);
  color: var(--color-action-primary);
}

.the-header__badge {
  position: absolute;
  top: -6px;
  right: -6px;
  border-radius: var(--radius-pill);
  background: var(--color-status-danger);
  padding: 1px 6px;
  color: var(--color-text-inverse);
  font-size: var(--font-size-xs);
}

.the-header__user {
  display: flex;
  align-items: center;
  height: var(--header-control-height);
  gap: var(--space-2);
  border: var(--border-width-default) solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  padding: 0 12px 0 6px;
  font-size: var(--font-size-xs);
}

.the-header__info {
  display: grid;
  align-content: center;
  min-width: 0;
  row-gap: 2px;
  line-height: 1.25;
}

.the-header__info strong,
.the-header__info span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.the-header__user span {
  color: var(--color-fg-muted);
}

.the-header__avatar {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: var(--radius-pill);
  background: var(--color-action-primary);
  color: var(--color-text-inverse) !important;
  font-weight: var(--font-weight-bold);
}

.the-header__theme-btn {
  transition:
    color var(--transition-fast),
    border-color var(--transition-fast);
}

@media (max-width: 1180px) {
  .the-header__actions {
    gap: var(--space-2);
  }

  .the-header__user {
    min-width: 180px;
  }
}
</style>

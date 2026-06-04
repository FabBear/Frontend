<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

import { useNotifications } from '@/composables/useNotifications';

import { ROUTE_NAMES } from '@/constants/routes';

import TheHeader from './TheHeader.vue';
import TheNotificationPanel from './TheNotificationPanel.vue';
import TheSidebar from './TheSidebar.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const isNotificationOpen = ref(false);
const {
  notifications,
  unreadCount,
  latestCriticalUnread,
  isLoading: isNotificationLoading,
  errorMessage: notificationErrorMessage,
  streamError,
  markRead,
} = useNotifications();

const pageTitle = computed(() => {
  return typeof route.meta.title === 'string' ? route.meta.title : 'Dashboard';
});

function handleToggleNotifications() {
  isNotificationOpen.value = !isNotificationOpen.value;
}

async function handleOpenCriticalNotification() {
  if (latestCriticalUnread.value) {
    await markRead(latestCriticalUnread.value.id);
  }
  isNotificationOpen.value = true;
}

function handleOpenNotificationCase(caseId: string) {
  router.push({ name: ROUTE_NAMES.bottleneckCenter, query: { caseId } });
  isNotificationOpen.value = false;
}

function handleOpenNotificationMonitoring(caseId: string) {
  router.push({ name: ROUTE_NAMES.bottleneckMonitoring, query: { caseId } });
  isNotificationOpen.value = false;
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="app-layout app-shell">
    <TheSidebar />
    <div class="app-layout__main">
      <TheHeader
        :title="pageTitle"
        :notification-count="unreadCount"
        :notification-open="isNotificationOpen"
        :user="authStore.user"
        @toggle-notifications="handleToggleNotifications"
        @logout="handleLogout"
      />
      <main class="app-layout__content">
        <slot />
      </main>
    </div>
    <TheNotificationPanel
      :open="isNotificationOpen"
      :notifications="notifications"
      :loading="isNotificationLoading"
      :error-message="notificationErrorMessage"
      :stream-error="streamError"
      @close="isNotificationOpen = false"
      @mark-read="markRead"
      @open-case="handleOpenNotificationCase"
      @open-monitoring="handleOpenNotificationMonitoring"
    />
    <aside
      v-if="latestCriticalUnread && !isNotificationOpen"
      class="app-layout__critical-alert"
      role="alert"
      aria-live="assertive"
    >
      <strong>{{ latestCriticalUnread.title }}</strong>
      <p>{{ latestCriticalUnread.message }}</p>
      <button type="button" @click="handleOpenCriticalNotification">알림 확인</button>
    </aside>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  width: 100%;
  min-width: 0;
}

.app-layout__main {
  min-width: 0;
  flex: 1;
}

.app-layout__content {
  min-width: 0;
  min-height: calc(100svh - var(--layout-header-height));
  overflow: auto;
  padding: var(--spacing-page);
}

.app-layout__critical-alert {
  position: fixed;
  right: var(--space-4);
  bottom: var(--space-4);
  z-index: var(--z-index-toast);
  display: grid;
  width: min(420px, calc(100vw - var(--space-4) * 2));
  gap: var(--space-2);
  border: 1px solid var(--color-risk-critical);
  border-left-width: 5px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-card);
  padding: var(--space-3);
  box-shadow: var(--shadow-panel);
}

.app-layout__critical-alert strong {
  color: var(--color-risk-critical);
  font-size: var(--font-size-base);
}

.app-layout__critical-alert p {
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-normal);
}

.app-layout__critical-alert button {
  justify-self: start;
  min-height: 30px;
  border: 0;
  border-radius: var(--radius-md);
  background: var(--color-status-danger);
  padding: 0 12px;
  color: var(--color-text-inverse);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
</style>

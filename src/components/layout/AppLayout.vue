<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

import { useChatDrawer } from '@/composables/useChatDrawer';
import { useNotifications } from '@/composables/useNotifications';

import { ROUTE_NAMES } from '@/constants/routes';

import ChatDrawer from '@/components/chatbot/ChatDrawer.vue';

import TheHeader from './TheHeader.vue';
import TheNotificationPanel from './TheNotificationPanel.vue';
import TheSidebar from './TheSidebar.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const isNotificationOpen = ref(false);
const { isOpen: isChatOpen, open: openChat, close: closeChat } = useChatDrawer();
const {
  notifications,
  unreadCount,
  bottleneckUnreadCount,
  isLoading: isNotificationLoading,
  errorMessage: notificationErrorMessage,
  streamError,
  notificationPushTick,
  markRead,
  markAllRead,
} = useNotifications();

const pageTitle = computed(() => {
  return typeof route.meta.title === 'string' ? route.meta.title : 'Dashboard';
});

watch(
  () => route.query.chat,
  (chat) => {
    if (chat !== 'open') return;
    openChat();
    const query = { ...route.query };
    delete query.chat;
    void router.replace({ query });
  },
  { immediate: true }
);

watch(notificationPushTick, (tick) => {
  if (tick <= 0) return;
  isNotificationOpen.value = true;
});

function handleToggleNotifications() {
  isNotificationOpen.value = !isNotificationOpen.value;
}

function handleOpenNotificationCase(caseId: string, tab?: string) {
  router.push({
    name: ROUTE_NAMES.bottleneckCenter,
    query: { caseId, ...(tab ? { tab } : {}) },
  });
  isNotificationOpen.value = false;
}

function handleOpenNotificationMonitoring(caseId: string) {
  router.push({ name: ROUTE_NAMES.bottleneckMonitoring, query: { caseId } });
  isNotificationOpen.value = false;
}

// 드리프트(MODEL_RETRAIN) 알림 → 읽음 처리 후 관리자 MLflow 모니터링으로 이동
async function handleOpenNotificationMlflow(notificationId?: string) {
  if (notificationId) {
    await markRead(notificationId);
  }
  const driftId = notificationId?.replace(/^drift-/, '');
  router.push({ path: '/admin/mlflow', query: driftId ? { driftId } : undefined });
  isNotificationOpen.value = false;
}

async function handleLogout() {
  await authStore.logout();
  router.push('/login');
}
</script>

<template>
  <div class="app-layout app-shell">
    <!-- 사이드바 배지는 병목(서버) 안읽음만. 헤더 종은 드리프트 포함 전체(unreadCount) -->
    <TheSidebar :bottleneck-unread-count="bottleneckUnreadCount" />
    <div class="app-layout__main">
      <TheHeader
        :notification-count="unreadCount"
        :notification-open="isNotificationOpen"
        :chat-open="isChatOpen"
        :user="authStore.user"
        @open-chat="openChat"
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
      :unread-count="unreadCount"
      :loading="isNotificationLoading"
      :error-message="notificationErrorMessage"
      :stream-error="streamError"
      @close="isNotificationOpen = false"
      @mark-read="markRead"
      @mark-all-read="markAllRead"
      @open-case="handleOpenNotificationCase"
      @open-monitoring="handleOpenNotificationMonitoring"
      @open-mlflow="handleOpenNotificationMlflow"
    />
    <ChatDrawer :open="isChatOpen" :context-title="pageTitle" @close="closeChat" />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  width: 100%;
  min-width: 0;
  height: 100svh; /* 앱 셸을 뷰포트 높이로 고정 → 사이드바/헤더 고정, 본문만 스크롤 */
}

.app-layout__main {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.app-layout__content {
  min-width: 0;
  min-height: 0;
  flex: 1; /* 헤더 아래 남은 공간을 채우고 이 영역만 스크롤 */
  overflow: auto;
  padding: var(--spacing-page);
}
</style>

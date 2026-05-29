<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

import { MOCK_NOTIFICATIONS } from '@/constants/mockData/notification';

import TheHeader from './TheHeader.vue';
import TheNotificationPanel from './TheNotificationPanel.vue';
import TheSidebar from './TheSidebar.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const isNotificationOpen = ref(false);

const pageTitle = computed(() => {
  return typeof route.meta.title === 'string' ? route.meta.title : 'Dashboard';
});

const unreadCount = computed(() => {
  return MOCK_NOTIFICATIONS.filter((notification) => notification.unread).length;
});

function handleToggleNotifications() {
  isNotificationOpen.value = !isNotificationOpen.value;
}

function handleLogout() {
  authStore.logout();
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
      :notifications="MOCK_NOTIFICATIONS"
      @close="isNotificationOpen = false"
    />
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-width: var(--layout-content-min-width);
}

.app-layout__main {
  min-width: 0;
  flex: 1;
}

.app-layout__content {
  min-height: calc(100svh - var(--layout-header-height));
  overflow: auto;
  padding: var(--spacing-page);
}
</style>

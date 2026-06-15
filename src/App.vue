<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

import AppLayout from '@/components/layout/AppLayout.vue';

const route = useRoute();
const authStore = useAuthStore();

const usesAppLayout = computed(() => route.meta.layout !== 'empty' && authStore.isLoggedIn);
</script>

<template>
  <AppLayout v-if="usesAppLayout">
    <RouterView />
  </AppLayout>
  <RouterView v-else />
</template>

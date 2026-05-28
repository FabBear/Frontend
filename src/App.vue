<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';

import AppLayout from '@/components/layout/AppLayout.vue';

const route = useRoute();

const usesAppLayout = computed(() => route.meta.layout !== 'empty');
</script>

<template>
  <AppLayout v-if="usesAppLayout">
    <RouterView />
  </AppLayout>
  <RouterView v-else />
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { RiskLevel } from '@/constants/riskLevel';

type StatusVariant = 'success' | 'warning' | 'info';
type BadgeVariant = RiskLevel | StatusVariant;

interface Props {
  variant?: BadgeVariant;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info',
});

const badgeClass = computed(() => `badge--${props.variant}`);
</script>

<template>
  <span class="badge" :class="badgeClass">
    <slot />
  </span>
</template>

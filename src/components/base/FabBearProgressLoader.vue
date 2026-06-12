<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

import lottie, { type AnimationItem } from 'lottie-web/build/player/lottie_light';

withDefaults(
  defineProps<{
    label?: string;
    tone?: 'page' | 'panel';
  }>(),
  {
    label: '불러오는 중입니다',
    tone: 'page',
  }
);

const loaderRef = ref<HTMLDivElement | null>(null);
const hasAnimationError = ref(false);
let animation: AnimationItem | null = null;

onMounted(async () => {
  if (!loaderRef.value) return;

  try {
    const response = await fetch('/lottie/fabbear-progress.json');
    if (!response.ok) throw new Error('FabBear progress animation is unavailable.');
    const animationData = await response.json();

    animation = lottie.loadAnimation({
      container: loaderRef.value,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData,
    });
  } catch {
    hasAnimationError.value = true;
  }
});

onBeforeUnmount(() => {
  animation?.destroy();
  animation = null;
});
</script>

<template>
  <div class="fabbear-progress-loader" :class="`fabbear-progress-loader--${tone}`" role="status" aria-live="polite">
    <div v-if="!hasAnimationError" ref="loaderRef" class="fabbear-progress-loader__animation" aria-hidden="true" />
    <div v-else class="fabbear-progress-loader__fallback" aria-hidden="true">
      <img src="@/assets/fabbear-symbol.svg" alt="" />
      <span><i /><i /><i /></span>
    </div>
    <p>{{ label }}</p>
  </div>
</template>

<style scoped>
.fabbear-progress-loader {
  display: grid;
  justify-items: center;
  gap: var(--space-2);
  min-width: 0;
  color: var(--color-brand-brown);
  text-align: center;
}

.fabbear-progress-loader--page {
  min-height: 360px;
  place-content: center;
}

.fabbear-progress-loader--panel {
  min-height: 180px;
  place-content: center;
}

.fabbear-progress-loader__animation {
  width: 170px;
  height: 260px;
}

.fabbear-progress-loader__fallback {
  display: grid;
  justify-items: center;
  gap: var(--space-3);
}

.fabbear-progress-loader__fallback img {
  width: 96px;
  height: auto;
}

.fabbear-progress-loader__fallback span {
  display: inline-flex;
  gap: var(--space-1);
}

.fabbear-progress-loader__fallback i {
  display: block;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--color-gold);
  animation: fabbear-progress-pulse 1.1s infinite both;
}

.fabbear-progress-loader__fallback i:nth-child(2) {
  animation-delay: 180ms;
}

.fabbear-progress-loader__fallback i:nth-child(3) {
  animation-delay: 360ms;
}

.fabbear-progress-loader p {
  margin: 0;
  color: var(--color-fg);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
}

@keyframes fabbear-progress-pulse {
  0%,
  100% {
    opacity: 0.25;
    transform: scale(0.75);
  }

  40% {
    opacity: 1;
    transform: scale(1);
  }
}

@media (max-width: 720px) {
  .fabbear-progress-loader--page {
    min-height: 300px;
  }

  .fabbear-progress-loader__animation {
    width: 140px;
    height: 216px;
  }
}
</style>

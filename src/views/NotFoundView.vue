<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { SearchX } from '@lucide/vue';

import { useAuthStore } from '@/stores/auth';

import { ROUTE_NAMES } from '@/constants/routes';

const authStore = useAuthStore();

const primaryRoute = computed(() =>
  authStore.isLoggedIn ? { name: ROUTE_NAMES.dashboard } : { name: ROUTE_NAMES.login }
);
const primaryLabel = computed(() => (authStore.isLoggedIn ? '대시보드로 돌아가기' : '로그인으로 이동'));
</script>

<template>
  <main class="not-found">
    <div class="not-found__bg" aria-hidden="true" />

    <section class="not-found__content">
      <div class="not-found__icon-wrap" aria-hidden="true">
        <SearchX :size="100" :stroke-width="1.5" />
      </div>

      <div class="not-found__text">
        <h1>페이지를 찾을 수 없습니다</h1>
        <p class="not-found__desc">요청한 주소가 변경되었거나 존재하지 않는 페이지입니다.</p>
      </div>

      <RouterLink class="not-found__link" :to="primaryRoute">
        {{ primaryLabel }}
      </RouterLink>
    </section>
  </main>
</template>

<style scoped>
.not-found {
  position: relative;
  display: grid;
  min-height: 100svh;
  place-items: center;
  overflow: hidden;
  background: var(--color-bg-app, var(--color-bg));
  padding: var(--spacing-page);
}

.not-found__bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(circle, color-mix(in srgb, var(--color-action-primary) 14%, transparent) 1.5px, transparent 1.5px)
      60px 0 / 61px 44px,
    linear-gradient(
        90deg,
        transparent 60px,
        color-mix(in srgb, var(--color-action-primary) 6%, transparent) 60px,
        color-mix(in srgb, var(--color-action-primary) 6%, transparent) 61px,
        transparent 61px
      )
      0 0 / 61px 44px,
    linear-gradient(
        0deg,
        transparent 43px,
        color-mix(in srgb, var(--color-action-primary) 6%, transparent) 43px,
        color-mix(in srgb, var(--color-action-primary) 6%, transparent) 44px,
        transparent 44px
      )
      0 0 / 61px 44px;
  mask: radial-gradient(ellipse 72% 68% at 50% 50%, black 55%, transparent 100%);
  -webkit-mask: radial-gradient(ellipse 72% 68% at 50% 50%, black 55%, transparent 100%);
  pointer-events: none;
}

.not-found__content {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  max-width: 400px;
  gap: var(--space-6);
  text-align: center;
}

.not-found__icon-wrap {
  display: grid;
  place-items: center;
}

.not-found__text {
  display: grid;
  gap: var(--space-2);
}

.not-found__code {
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.not-found__text h1 {
  color: var(--color-fg-strong);
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}

.not-found__desc {
  color: var(--color-fg-muted);
  font-size: var(--font-size-base);
  line-height: 1.6;
}

.not-found__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border-radius: var(--radius-pill);
  background: linear-gradient(
    130deg,
    color-mix(in srgb, var(--color-brand-red) 76%, var(--color-status-warning)),
    var(--color-brand-red) 48%,
    color-mix(in srgb, var(--color-brand-red) 55%, var(--color-brand-brown))
  );
  padding: 0 var(--space-8);
  color: var(--color-text-inverse);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  text-decoration: none;
  transition: opacity 0.15s;
}

.not-found__link:hover {
  opacity: 0.88;
}
</style>

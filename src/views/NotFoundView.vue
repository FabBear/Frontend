<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { Cpu, LayoutDashboard } from '@lucide/vue';

import { useAuthStore } from '@/stores/auth';

import { ROUTE_NAMES } from '@/constants/routes';

const authStore = useAuthStore();

const primaryRoute = computed(() =>
  authStore.isLoggedIn ? { name: ROUTE_NAMES.dashboard } : { name: ROUTE_NAMES.login }
);

const pawTrail = [
  { left: '28%', bottom: '0px', scale: 0.88, rotate: 38 },
  { left: '34%', bottom: '24px', scale: 0.92, rotate: 42 },
  { left: '40%', bottom: '14px', scale: 0.96, rotate: 38 },
  { left: '46%', bottom: '46px', scale: 0.99, rotate: 42 },
  { left: '52%', bottom: '34px', scale: 1.02, rotate: 38 },
  { left: '58%', bottom: '70px', scale: 1.05, rotate: 42 },
  { left: '64%', bottom: '100px', scale: 1.08, rotate: 38 },
];
</script>

<template>
  <main class="not-found">
    <div class="not-found__bg" aria-hidden="true" />

    <header class="not-found__header">
      <RouterLink class="not-found__brand" :to="primaryRoute" aria-label="fabBear 홈으로 이동">
        <img class="not-found__brand-symbol" src="@/assets/fabbear-symbol.svg" alt="" aria-hidden="true" />
        <img class="not-found__brand-wordmark" src="@/assets/fabbear-wordmark.svg" alt="fabBear" />
      </RouterLink>
    </header>

    <div class="not-found__main">
      <section class="not-found__content">
        <span class="not-found__code" aria-hidden="true">404</span>
        <h1>페이지를 찾을 수 없습니다</h1>
        <p>요청한 화면이 이동되었거나 더 이상 운영 중이지 않습니다.</p>
        <RouterLink class="not-found__btn" :to="primaryRoute">
          <LayoutDashboard :size="18" aria-hidden="true" />
          {{ authStore.isLoggedIn ? '대시보드로 이동' : '로그인으로 이동' }}
        </RouterLink>
      </section>

      <div class="not-found__illustration" aria-hidden="true">
        <img src="@/assets/bear-search.svg" alt="" draggable="false" />
      </div>

      <div class="not-found__paws" aria-hidden="true">
        <img
          v-for="(paw, i) in pawTrail"
          :key="i"
          src="@/assets/paw.svg"
          class="not-found__paw"
          :style="{
            left: paw.left,
            bottom: paw.bottom,
            transform: `rotate(${paw.rotate}deg) scale(${paw.scale})`,
          }"
          alt=""
        />
      </div>
    </div>

    <footer class="not-found__footer">
      <div class="not-found__footer-brand">
        <Cpu :size="16" />
        <span>반도체 제조 운영을 위한 AI 에이전트</span>
        <span class="not-found__sep" aria-hidden="true">|</span>
        <span>Smart. Adaptive. <strong>FabBEAR.</strong></span>
      </div>
    </footer>
  </main>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  min-height: 100svh;
  background:
    radial-gradient(1100px 560px at 78% 34%, var(--color-gold-bg-glow) 0%, var(--color-gold-bg-glow-clear) 62%),
    linear-gradient(180deg, var(--color-login-panel-bg) 0%, var(--color-bg-page) 100%);
  overflow: hidden;
  position: relative;
}

.not-found__bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    linear-gradient(
        90deg,
        transparent 62px,
        color-mix(in srgb, var(--color-gold) 8%, transparent) 62px,
        color-mix(in srgb, var(--color-gold) 8%, transparent) 63px,
        transparent 63px
      )
      0 0 / 63px 48px,
    linear-gradient(
        0deg,
        transparent 47px,
        color-mix(in srgb, var(--color-gold) 8%, transparent) 47px,
        color-mix(in srgb, var(--color-gold) 8%, transparent) 48px,
        transparent 48px
      )
      0 0 / 63px 48px;
  mask: radial-gradient(ellipse 90% 80% at 60% 45%, black 40%, transparent 80%);
  -webkit-mask: radial-gradient(ellipse 90% 80% at 60% 45%, black 40%, transparent 80%);
  pointer-events: none;
}

.not-found__header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  min-height: var(--layout-header-height);
  padding: 0 max(var(--space-6), calc((100% - 1280px) / 2 + var(--space-6)));
}

.not-found__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-action-primary);
  text-decoration: none;
}

.not-found__brand-symbol {
  display: block;
  width: 42px;
  height: 36px;
  object-fit: contain;
  object-position: center;
  flex-shrink: 0;
}

.not-found__brand-wordmark {
  display: block;
  width: 132px;
  height: auto;
  object-fit: contain;
  object-position: left center;
}

.not-found__main {
  flex: 1;
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  width: min(100%, 1500px);
  margin: 0 auto;
  padding: 0 max(var(--space-6), 48px);
}

.not-found__content {
  position: relative;
  z-index: 3;
  display: grid;
  gap: var(--space-4);
  max-width: min(720px, 52vw);
  padding-bottom: clamp(var(--space-8), 7vh, 90px);
  padding-left: 60px;
}

.not-found__code {
  font-size: clamp(6rem, 9.8vw, 8.75rem);
  font-weight: 800;
  line-height: 0.9;
  color: var(--color-gold);
  letter-spacing: 0;
}

.not-found__content h1 {
  color: var(--color-fg-strong);
  max-width: none;
  font-size: clamp(2rem, 2.75vw, 2.75rem);
  font-weight: var(--font-weight-bold);
  line-height: 1.22;
  margin: 0;
  white-space: nowrap;
  word-break: keep-all;
  overflow-wrap: normal;
}

.not-found__content p {
  color: var(--color-fg-muted);
  font-size: var(--font-size-lg);
  line-height: 1.6;
  margin: 0;
  word-break: keep-all;
}

.not-found__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  width: fit-content;
  min-height: 46px;
  padding: 0 var(--space-6);
  border-radius: var(--radius-md);
  background: var(--color-action-primary);
  color: var(--color-text-inverse);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
  transition:
    background 0.15s,
    box-shadow 0.15s;
  box-shadow: 0 8px 18px color-mix(in srgb, var(--color-action-primary) 24%, transparent);
}

.not-found__btn:hover {
  background: var(--color-action-primary-hover);
  box-shadow: 0 12px 24px color-mix(in srgb, var(--color-action-primary) 24%, transparent);
}

.not-found__illustration {
  position: absolute;
  right: 20px;
  top: 50%;
  z-index: 1;
  width: min(46vw, 640px);
  transform: translateY(-52%);
  pointer-events: none;
}

.not-found__illustration img {
  width: 100%;
  height: auto;
  display: block;
}

.not-found__paws {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 6%;
  z-index: 2;
  height: 280px;
  pointer-events: none;
}

.not-found__paw {
  position: absolute;
  width: 44px;
  height: auto;
  opacity: 0.68;
  filter: drop-shadow(0 1px 1px var(--color-gold-shadow-soft));
}

.not-found__footer {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  padding: var(--space-3) max(var(--space-6), calc((100% - 1280px) / 2 + var(--space-6)));
  border-top: 1px solid var(--color-border-subtle);
}

.not-found__footer-brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.not-found__footer-brand strong {
  color: var(--color-gold);
  font-weight: var(--font-weight-semibold);
}

.not-found__sep {
  color: var(--color-border-default);
  margin: 0 var(--space-1);
}

@media (max-width: 840px) {
  .not-found__main {
    padding: var(--space-8) var(--space-6) 180px;
  }

  .not-found__content {
    max-width: min(520px, 100%);
  }

  .not-found__content h1 {
    white-space: normal;
  }

  .not-found__illustration {
    right: -48px;
    width: min(72vw, 500px);
    opacity: 0.18;
  }

  .not-found__footer {
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
  }
}

@media (max-width: 480px) {
  .not-found__header {
    padding: 0 var(--space-4);
  }

  .not-found__main {
    padding-inline: var(--space-4);
  }

  .not-found__footer-brand {
    flex-wrap: wrap;
  }

  .not-found__paw {
    display: none;
  }
}
</style>

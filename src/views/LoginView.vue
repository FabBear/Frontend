<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

import { getApiErrorMessage } from '@/services/api';

import type { LoginRequest } from '@/types/auth';

import LoginBrandPanel from '@/components/auth/LoginBrandPanel.vue';
import LoginForm from '@/components/auth/LoginForm.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const loginError = ref('');
const isLoading = ref(false);

function resolveSafeRedirect(rawRedirect: unknown): string {
  if (typeof rawRedirect !== 'string') return '/dashboard';

  const redirect = rawRedirect.trim();
  const hasProtocol = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(redirect);
  const isInternalPath = redirect.startsWith('/') && !redirect.startsWith('//') && !redirect.includes('\\');

  if (!isInternalPath || hasProtocol) return '/dashboard';
  return redirect;
}

onMounted(async () => {
  try {
    await authStore.fetchFabs();
  } catch {
    loginError.value = 'Fab 목록을 불러오지 못했습니다. 페이지를 새로고침해 주세요.';
  }
});

async function handleLogin(payload: LoginRequest) {
  loginError.value = '';
  isLoading.value = true;

  try {
    const latestFabs = await authStore.fetchFabs();
    if (!latestFabs.some((fab) => fab.fabId === payload.fabId)) {
      loginError.value = 'Fab 목록이 갱신되었습니다. Fab을 다시 선택해 주세요.';
      return;
    }

    await authStore.login(payload);
    const redirect = resolveSafeRedirect(route.query.redirect);
    router.push(redirect);
  } catch (error) {
    loginError.value = getApiErrorMessage(error, '로그인 중 알 수 없는 오류가 발생했습니다.');
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <main class="login-view app-shell">
    <div class="login-view__wafer" aria-hidden="true"></div>
    <LoginBrandPanel />

    <div class="login-view__right">
      <section class="login-view__panel" aria-labelledby="login-title">
        <LoginForm :fabs="authStore.fabs" :loading="isLoading" @submit="handleLogin" />

        <p v-if="loginError" class="login-view__error" role="alert">
          {{ loginError }}
        </p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.login-view {
  position: relative;
  display: flex;
  align-items: stretch;
  min-height: 100svh;
  overflow: hidden;
  background: linear-gradient(150deg, #f0ece4 0%, #f4f0ea 45%, #f8f6f2 100%);
}

.login-view__wafer {
  position: absolute;
  left: calc(50% - 160vmin);
  top: 50%;
  transform: translateY(-50%);
  width: 160vmin;
  height: 160vmin;
  border-radius: 50%;
  z-index: 0;
  overflow: hidden;
  box-shadow: 0 0 35px 20px rgba(218, 217, 216, 0.82);
  background:
    /* 상단 primary highlight */
    radial-gradient(
      ellipse 55% 38% at 38% 22%,
      rgba(248, 232, 191, 0.34) 0%,
      rgba(243, 216, 150, 0.1) 44%,
      transparent 66%
    ),
    /* 우하단 secondary shimmer — 교차 반사 효과 */
    radial-gradient(ellipse 50% 44% at 74% 76%, rgba(248, 224, 160, 0.26) 0%, transparent 55%),
    /* 좌하단 딥 새도우 */ radial-gradient(ellipse 40% 45% at 14% 82%, rgba(130, 80, 8, 0.28) 0%, transparent 54%),
    /* 우측 중간 — 미세 이리데센트 쿨 shimmer */
    radial-gradient(ellipse 32% 28% at 84% 44%, rgba(190, 235, 210, 0.07) 0%, transparent 52%),
    /* 교차 각도 shimmer 레이어 (홀로그램 광각 효과) */
    linear-gradient(
        220deg,
        transparent 20%,
        rgba(248, 232, 191, 0.09) 38%,
        rgba(244, 210, 110, 0.13) 50%,
        rgba(248, 228, 170, 0.07) 62%,
        transparent 78%
      ),
    /* 메인 골드 그라데이션 */
    linear-gradient(
        140deg,
        #c49317 0%,
        #e4ab1b 15%,
        #e9ba44 28%,
        #eec96d 40%,
        #f3d896 48%,
        #f8e8bf 55%,
        #f3d896 62%,
        #eec96d 70%,
        #e9ba44 80%,
        #e4ab1b 90%,
        #c49317 100%
      );
}

/* 다이 격자 — edge exclusion zone 안쪽에만 표시 */
.login-view__wafer::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle, rgba(140, 90, 10, 0.2) 1.5px, transparent 1.5px) 63px 0 / 64px 50px,
    linear-gradient(
        90deg,
        transparent 63px,
        rgba(140, 90, 10, 0.18) 63px,
        rgba(140, 90, 10, 0.18) 64px,
        transparent 64px
      )
      0 0 / 64px 50px,
    linear-gradient(
        0deg,
        transparent 49px,
        rgba(140, 90, 10, 0.18) 49px,
        rgba(140, 90, 10, 0.18) 50px,
        transparent 50px
      )
      0 0 / 64px 50px;
  mask: radial-gradient(circle at center, black 82%, transparent 87%);
  -webkit-mask: radial-gradient(circle at center, black 82%, transparent 87%);
  pointer-events: none;
}

/* 다크 메탈릭 엣지 링 */
.login-view__wafer::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(
    circle at center,
    transparent 82%,
    rgba(25, 8, 0, 0.2) 87%,
    rgba(25, 8, 0, 0.62) 92%,
    rgba(18, 5, 0, 0.9) 96%
  );
  pointer-events: none;
}

.login-view__right {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-4);
  flex: 1;
  padding: var(--space-8) clamp(var(--space-5), 5vw, 72px) var(--space-8) clamp(180px, 18vw, 320px);
}

.login-view__panel {
  display: grid;
  position: relative;
  width: min(100%, 440px);
  gap: var(--space-6);
  border: var(--border-width-default) solid var(--color-login-panel-border);
  border-radius: 20px;
  padding: var(--space-8);
  background: linear-gradient(145deg, #ffffff, var(--color-login-panel-bg)), var(--color-login-panel-bg);
  box-shadow:
    0 22px 56px var(--color-login-panel-shadow),
    inset 0 1px 0 #ffffff;
}

.login-view__error {
  border: var(--border-width-default) solid color-mix(in srgb, var(--color-status-danger) 30%, transparent);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-status-danger) 8%, transparent);
  padding: var(--space-3);
  color: var(--color-status-danger);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

@media (max-width: 860px) {
  .login-view {
    display: grid;
    align-content: start;
    background: var(--color-bg-surface);
  }

  .login-view__wafer {
    display: none;
  }

  .login-view__right {
    padding: var(--space-6) var(--space-5) var(--space-8);
  }
}
</style>

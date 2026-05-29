<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

import { MOCK_AUTH_ACCOUNTS, MOCK_AUTH_FABS } from '@/constants/mockData/auth';

import type { LoginRequest, MockAuthAccount } from '@/types/auth';

import LoginBrandPanel from '@/components/auth/LoginBrandPanel.vue';
import LoginForm from '@/components/auth/LoginForm.vue';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const loginError = ref('');
const isLoading = ref(false);
const loginFormRef = ref<InstanceType<typeof LoginForm> | null>(null);

function fillDemo(account: MockAuthAccount) {
  loginFormRef.value?.fill(account.loginId, account.password, account.fabId);
}

async function handleLogin(payload: LoginRequest) {
  loginError.value = '';
  isLoading.value = true;

  try {
    authStore.login(payload);
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard';
    router.push(redirect);
  } catch (error) {
    loginError.value = error instanceof Error ? error.message : '로그인 중 알 수 없는 오류가 발생했습니다.';
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <main class="login-view app-shell">
    <LoginBrandPanel />

    <div class="login-view__right">
      <section class="login-view__panel" aria-labelledby="login-title">
        <LoginForm ref="loginFormRef" :fabs="MOCK_AUTH_FABS" :loading="isLoading" @submit="handleLogin" />

        <p v-if="loginError" class="login-view__error" role="alert">
          {{ loginError }}
        </p>
      </section>

      <div class="login-view__demo">
        <p>Demo 계정</p>
        <dl>
          <div v-for="account in MOCK_AUTH_ACCOUNTS" :key="account.userId">
            <dt>{{ account.roles.includes('ADMIN') ? '관리자' : '일반 엔지니어' }}</dt>
            <dd>
              <button class="login-view__demo-fill" type="button" @click="fillDemo(account)">
                {{ account.fabCode }} · {{ account.loginId }} / {{ account.password }}
              </button>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </main>
</template>

<style scoped>
.login-view {
  --wafer-center-x: -10%;
  --wafer-center-y: 50%;
  --wafer-radius: 52%;
  --wafer-edge: 52.5%;

  position: relative;
  display: flex;
  align-items: stretch;
  min-height: 100svh;
  overflow: hidden;
  background:
    radial-gradient(
      circle at var(--wafer-center-x) var(--wafer-center-y),
      transparent var(--wafer-radius),
      color-mix(in srgb, var(--color-action-primary) 7%, var(--color-bg-surface)) var(--wafer-edge)
    ),
    linear-gradient(
      155deg,
      color-mix(in srgb, var(--color-status-warning) 68%, var(--color-action-primary)),
      color-mix(in srgb, var(--color-action-primary) 78%, var(--color-status-warning)) 55%,
      color-mix(in srgb, var(--color-action-primary) 94%, black)
    );
}

/* 웨이퍼 다이 격자 — 직사각형 칩 셀 + 1px 다이싱 레인 + 코너 정렬 마크 */
.login-view::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(circle, rgba(255, 255, 255, 0.36) 1.5px, transparent 1.5px) 79px 0 / 80px 56px,
    linear-gradient(
        90deg,
        transparent 79px,
        rgba(255, 255, 255, 0.22) 79px,
        rgba(255, 255, 255, 0.22) 80px,
        transparent 80px
      )
      0 0 / 80px 56px,
    linear-gradient(
        0deg,
        transparent 55px,
        rgba(255, 255, 255, 0.22) 55px,
        rgba(255, 255, 255, 0.22) 56px,
        transparent 56px
      )
      0 0 / 80px 56px;
  mask: radial-gradient(
    circle at var(--wafer-center-x) var(--wafer-center-y),
    black var(--wafer-radius),
    transparent var(--wafer-edge)
  );
  -webkit-mask: radial-gradient(
    circle at var(--wafer-center-x) var(--wafer-center-y),
    black var(--wafer-radius),
    transparent var(--wafer-edge)
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
  border-radius: 20px;
  padding: var(--space-8);
  background-color: var(--color-bg-surface);
  box-shadow: 0 4px 40px color-mix(in srgb, var(--color-action-primary) 10%, rgba(0, 0, 0, 0.07));
}

.login-view__demo {
  display: grid;
  gap: var(--space-2);
  width: min(100%, 440px);
  border-top: var(--border-width-default) solid var(--color-border-subtle);
  padding-top: var(--space-4);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
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

.login-view__demo p {
  font-weight: var(--font-weight-bold);
}

.login-view__demo dl {
  display: grid;
  gap: var(--space-2);
}

.login-view__demo div {
  display: flex;
  justify-content: space-between;
  gap: var(--space-3);
}

.login-view__demo dt {
  color: var(--color-fg);
  font-weight: var(--font-weight-semibold);
}

.login-view__demo dd {
  margin: 0;
}

.login-view__demo-fill {
  border: 0;
  background: transparent;
  color: var(--color-fg-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: var(--font-size-sm);
  text-decoration: underline dashed;
  text-underline-offset: 3px;
  cursor: pointer;
}

.login-view__demo-fill:hover {
  color: var(--color-brand-red);
}

@media (max-width: 860px) {
  .login-view {
    display: grid;
    align-content: start;
    background: var(--color-bg-surface);
  }

  .login-view__right {
    padding: var(--space-6) var(--space-5) var(--space-8);
  }
}
</style>

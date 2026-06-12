<script setup lang="ts"></script>

<template>
  <section class="login-brand-panel" aria-label="fabBear 소개">
    <div class="login-brand-panel__content">
      <p class="login-brand-panel__kicker">FAB BOTTLENECK RESPONSE</p>
      <h1 id="login-title" class="login-brand-panel__logo">
        <img class="login-brand-panel__symbol" src="@/assets/fabbear-symbol.svg" alt="" aria-hidden="true" />
        <img class="login-brand-panel__wordmark" src="@/assets/fabbear-wordmark.svg" alt="FabBEAR" />
      </h1>
      <p class="login-brand-panel__copy">반도체 Fab 병목 예측과 대응 흐름을 한 곳에서 관리합니다.</p>
    </div>
  </section>
</template>

<style scoped>
.login-brand-panel {
  position: relative;
  z-index: 1;
  display: flex;
  width: min(50vw, 640px);
  flex-shrink: 0;
  align-items: center;
  padding: clamp(var(--space-8), 7vw, 96px);
  color: var(--color-fg);
}

.login-brand-panel__content {
  display: grid;
  max-width: 600px;
  gap: var(--space-5);
}

.login-brand-panel__kicker {
  color: var(--color-brand-brown);
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-extrabold);
  letter-spacing: 0.1em;
}

.login-brand-panel__logo {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin: 0;
}

.login-brand-panel__symbol {
  display: block;
  width: clamp(100px, 10.5vw, 140px);
  height: clamp(82px, 8.8vw, 114px);
  object-fit: contain;
  object-position: center;
  flex-shrink: 0;
}

.login-brand-panel__wordmark {
  display: block;
  width: min(500px, 38vw);
  height: auto;
  object-fit: contain;
  object-position: left center;
}

.login-brand-panel__copy {
  color: var(--color-brand-brown);
  font-size: clamp(var(--font-size-lg), 1.55vw, var(--font-size-lg));
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-relaxed);
  word-break: keep-all;
}

@media (max-width: 860px) {
  .login-brand-panel {
    width: 100%;
    padding: var(--space-8) var(--space-6) var(--space-6);
    background: linear-gradient(150deg, var(--color-login-bg-soft), var(--color-login-bg));
  }

  .login-brand-panel__wordmark {
    width: min(380px, calc(100vw - 172px));
  }
}
</style>

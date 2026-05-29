<script setup lang="ts"></script>

<template>
  <section class="login-brand-panel" aria-label="fabBear 소개">
    <div class="login-brand-panel__content">
      <p class="login-brand-panel__kicker">FAB BOTTLENECK RESPONSE</p>
      <h1 id="login-title" class="login-brand-panel__logo">
        <span class="login-brand-panel__logo-fab">Fab</span><span class="login-brand-panel__logo-bear">BEAR</span>
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
  color: var(--color-text-inverse);
}

.login-brand-panel__content {
  display: grid;
  max-width: 400px;
  gap: var(--space-4);
}

.login-brand-panel__kicker {
  color: color-mix(in srgb, var(--color-text-inverse) 72%, transparent);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-extrabold);
  letter-spacing: 0.1em;
}

.login-brand-panel__logo {
  font-size: clamp(52px, 6.5vw, 80px);
  line-height: 1;
  filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.28));
}

.login-brand-panel__logo-fab {
  color: var(--color-text-inverse);
}

.login-brand-panel__logo-bear {
  color: var(--color-brand-red);
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.45);
}

.login-brand-panel__copy {
  color: color-mix(in srgb, var(--color-text-inverse) 86%, transparent);
  font-size: var(--font-size-base);
  line-height: var(--line-height-relaxed);
}

@media (max-width: 860px) {
  .login-brand-panel {
    width: 100%;
    padding: var(--space-8) var(--space-6) var(--space-6);
    background: linear-gradient(
      150deg,
      color-mix(in srgb, var(--color-action-primary) 90%, var(--color-status-warning)),
      var(--color-action-primary)
    );
  }
}
</style>

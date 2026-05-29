<script setup lang="ts">
import { computed, ref } from 'vue';

import { Building2, ChevronDown, LockKeyhole, UserRound } from '@lucide/vue';

import type { AuthFab, LoginRequest } from '@/types/auth';

import BaseButton from '@/components/base/BaseButton.vue';
import BaseInput from '@/components/base/BaseInput.vue';

interface Props {
  loading?: boolean;
  fabs: AuthFab[];
}

withDefaults(defineProps<Props>(), { loading: false });

const emit = defineEmits<{
  submit: [payload: LoginRequest];
}>();

const selectedFabId = ref('');
const loginId = ref('');
const password = ref('');
const fabTouched = ref(false);
const usernameTouched = ref(false);
const passwordTouched = ref(false);

function fill(id: string, p: string, fabId?: string) {
  loginId.value = id;
  password.value = p;
  selectedFabId.value = fabId ?? selectedFabId.value;
  fabTouched.value = false;
  usernameTouched.value = false;
  passwordTouched.value = false;
}

defineExpose({ fill });

const fabError = computed(() => {
  return fabTouched.value && !selectedFabId.value ? 'Fab을 선택하세요.' : '';
});

const usernameError = computed(() => {
  return usernameTouched.value && !loginId.value.trim() ? '아이디를 입력하세요.' : '';
});

const passwordError = computed(() => {
  return passwordTouched.value && !password.value ? '비밀번호를 입력하세요.' : '';
});

const canSubmit = computed(() => Boolean(selectedFabId.value && loginId.value.trim() && password.value));

function handleSubmit() {
  fabTouched.value = true;
  usernameTouched.value = true;
  passwordTouched.value = true;

  if (!canSubmit.value) {
    return;
  }

  emit('submit', {
    loginId: loginId.value.trim(),
    password: password.value,
    fabId: selectedFabId.value,
  });
}
</script>

<template>
  <form class="login-form" novalidate @submit.prevent="handleSubmit">
    <label class="login-form__field">
      <span class="login-form__label">Fab 선택</span>
      <span class="login-form__control">
        <Building2 class="login-form__icon" :size="18" aria-hidden="true" />
        <select v-model="selectedFabId" class="login-form__select" :disabled="loading" @blur="fabTouched = true">
          <option value="" disabled>Fab을 선택하세요</option>
          <option v-for="fab in fabs" :key="fab.fabId" :value="fab.fabId">
            {{ fab.fabName }}
          </option>
        </select>
        <ChevronDown class="login-form__chevron" :size="18" aria-hidden="true" />
      </span>
      <span v-if="fabError" class="login-form__error">{{ fabError }}</span>
    </label>

    <label class="login-form__field">
      <span class="login-form__label">아이디</span>
      <span class="login-form__control">
        <UserRound class="login-form__icon" :size="18" aria-hidden="true" />
        <BaseInput
          v-model="loginId"
          class="login-form__input"
          placeholder="아이디"
          autocomplete="username"
          @blur="usernameTouched = true"
        />
      </span>
      <span v-if="usernameError" class="login-form__error">{{ usernameError }}</span>
    </label>

    <label class="login-form__field">
      <span class="login-form__label">비밀번호</span>
      <span class="login-form__control">
        <LockKeyhole class="login-form__icon" :size="18" aria-hidden="true" />
        <BaseInput
          v-model="password"
          class="login-form__input"
          type="password"
          placeholder="비밀번호"
          autocomplete="current-password"
          @blur="passwordTouched = true"
        />
      </span>
      <span v-if="passwordError" class="login-form__error">{{ passwordError }}</span>
    </label>

    <BaseButton class="login-form__submit" type="submit" :loading="loading">로그인</BaseButton>
  </form>
</template>

<style scoped>
.login-form {
  display: grid;
  gap: var(--space-5);
}

.login-form__field {
  display: grid;
  gap: var(--space-2);
  color: var(--color-fg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.login-form__label {
  padding-left: var(--space-4);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.login-form__control {
  position: relative;
  display: block;
}

.login-form__icon {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: var(--space-4);
  color: color-mix(in srgb, var(--color-brand-red) 72%, var(--color-fg-muted));
  transform: translateY(-50%);
}

.login-form__chevron {
  position: absolute;
  top: 50%;
  right: var(--space-4);
  color: var(--color-brand-red);
  pointer-events: none;
  transform: translateY(-50%);
}

.login-form__input {
  min-height: 48px;
  border-color: transparent;
  border-radius: var(--radius-pill);
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--color-brand-red) 5%, transparent), transparent 42%),
    color-mix(in srgb, var(--color-brand-brown) 5%, var(--color-bg-surface));
  padding-left: var(--space-10);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--color-brand-red) 22%, var(--color-border-subtle)),
    0 2px 8px color-mix(in srgb, var(--color-brand-red) 6%, transparent);
}

.login-form__select {
  width: 100%;
  min-height: 48px;
  appearance: none;
  border: 0;
  border-radius: var(--radius-pill);
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--color-brand-red) 5%, transparent), transparent 42%),
    color-mix(in srgb, var(--color-brand-brown) 5%, var(--color-bg-surface));
  box-shadow: inset 0 0 0 1px var(--color-border-subtle);
  color: var(--color-fg-muted);
  font: inherit;
  font-weight: var(--font-weight-semibold);
  padding: 0 var(--space-8) 0 var(--space-10);
}

.login-form__select:focus {
  outline: 3px solid var(--color-focus-ring);
  box-shadow: inset 0 0 0 1px var(--color-action-primary-border);
}

.login-form__select:disabled {
  cursor: not-allowed;
  opacity: var(--opacity-disabled);
}

.login-form__input:focus {
  box-shadow: inset 0 0 0 1px var(--color-action-primary-border);
}

.login-form__error {
  color: var(--color-status-danger);
  font-size: var(--font-size-xs);
}

.login-form__submit {
  width: 100%;
  min-height: 52px;
  border-color: transparent;
  margin-top: var(--space-2);
  background: linear-gradient(
    130deg,
    color-mix(in srgb, var(--color-brand-red) 76%, var(--color-status-warning)),
    var(--color-brand-red) 48%,
    color-mix(in srgb, var(--color-brand-red) 80%, black)
  );
  border-radius: var(--radius-pill);
}

.login-form__submit:hover {
  border-color: transparent;
  background: linear-gradient(
    130deg,
    color-mix(in srgb, var(--color-brand-red) 86%, var(--color-status-warning)),
    color-mix(in srgb, var(--color-brand-red) 88%, black)
  );
}
</style>

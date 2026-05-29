import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { MOCK_AUTH_ACCOUNTS } from '@/constants/mockData/auth';

import type { AuthUser, LoginRequest, LoginResponse } from '@/types/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const token = ref<string | null>(null);

  const isLoggedIn = computed(() => Boolean(user.value && token.value));
  const isAdmin = computed(() => user.value?.roles.includes('ADMIN') ?? false);

  async function login(payload: LoginRequest): Promise<LoginResponse> {
    const account = MOCK_AUTH_ACCOUNTS.find(
      (mockAccount) =>
        mockAccount.loginId === payload.loginId &&
        mockAccount.password === payload.password &&
        mockAccount.fabId === payload.fabId
    );

    if (!account) {
      throw new Error('아이디 또는 비밀번호가 일치하지 않습니다.');
    }

    const authUser: AuthUser = {
      userId: account.userId,
      loginId: account.loginId,
      userName: account.userName,
      department: account.department,
      fabId: account.fabId,
      fabCode: account.fabCode,
      fabName: account.fabName,
      roles: account.roles,
      lastLoginAt: account.lastLoginAt,
    };

    user.value = authUser;
    token.value = account.mockAccessToken;

    return {
      user: authUser,
    };
  }

  function logout() {
    user.value = null;
    token.value = null;
  }

  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    login,
    logout,
  };
});

import { createPinia, setActivePinia } from 'pinia';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '@/stores/auth';

import api from '@/services/api';

import { MOCK_AUTH_ACCOUNTS, MOCK_AUTH_FABS } from '@/constants/mockData/auth';

import type { LoginRequest } from '@/types/auth';

import router from '@/router';

vi.mock('@/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('auth store and route guard', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    vi.mocked(api.get).mockImplementation((url) => {
      if (url === '/v1/auth/fabs') {
        return Promise.resolve({ data: { fabs: MOCK_AUTH_FABS } });
      }

      return Promise.reject(new Error('로그인이 필요합니다.'));
    });
    vi.mocked(api.post).mockImplementation((_url, payload) => {
      const loginPayload = payload as LoginRequest;
      const account = MOCK_AUTH_ACCOUNTS.find(
        (mockAccount) =>
          mockAccount.loginId === loginPayload.loginId &&
          mockAccount.password === loginPayload.password &&
          mockAccount.fabId === loginPayload.fabId
      );

      if (!account) {
        return Promise.reject(new Error('아이디 또는 비밀번호가 일치하지 않습니다.'));
      }

      return Promise.resolve({
        data: {
          userId: account.userId,
          loginId: account.loginId,
          userName: account.userName,
          department: account.department,
          fabId: account.fabId,
          fabCode: account.fabCode,
          roles: account.roles,
          lastLoginAt: account.lastLoginAt,
        },
      });
    });
    await router.push('/login');
  });

  it('logs in with matching mock credentials', async () => {
    const authStore = useAuthStore();

    const response = await authStore.login({
      loginId: 'engineer01',
      password: 'eng1234',
      fabId: MOCK_AUTH_FABS[0].fabId,
    });

    expect(response.user.roles).toContain('ENGINEER');
    expect(response.user.fabCode).toBe('FAB_SK_001');
    expect(authStore.isLoggedIn).toBe(true);
  });

  it('rejects invalid credentials', async () => {
    const authStore = useAuthStore();

    await expect(
      authStore.login({
        loginId: 'engineer01',
        password: 'wrong-password',
        fabId: MOCK_AUTH_FABS[0].fabId,
      })
    ).rejects.toThrow('아이디 또는 비밀번호가 일치하지 않습니다.');
    expect(authStore.isLoggedIn).toBe(false);
  });

  it('redirects a signed-in engineer away from admin routes', async () => {
    const authStore = useAuthStore();
    await authStore.login({
      loginId: 'engineer01',
      password: 'eng1234',
      fabId: MOCK_AUTH_FABS[0].fabId,
    });

    await router.push('/admin/access');

    expect(router.currentRoute.value.path).toBe('/dashboard');
  });

  it('allows an admin to enter admin routes', async () => {
    const authStore = useAuthStore();
    await authStore.login({
      loginId: 'admin',
      password: 'admin1234',
      fabId: MOCK_AUTH_FABS[0].fabId,
    });

    await router.push('/admin/access');

    expect(router.currentRoute.value.path).toBe('/admin/access');
  });
});

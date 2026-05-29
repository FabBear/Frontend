import { createPinia, setActivePinia } from 'pinia';

import { beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '@/stores/auth';

import { MOCK_AUTH_FABS } from '@/constants/mockData/auth';

import router from '@/router';

describe('auth store and route guard', () => {
  beforeEach(async () => {
    setActivePinia(createPinia());
    await router.push('/login');
  });

  it('logs in with matching mock credentials', () => {
    const authStore = useAuthStore();

    const response = authStore.login({
      loginId: 'engineer01',
      password: 'eng1234',
      fabId: MOCK_AUTH_FABS[0].fabId,
    });

    expect(response.user.roles).toContain('ENGINEER');
    expect(response.user.fabCode).toBe('FAB_SK_001');
    expect(authStore.isLoggedIn).toBe(true);
    expect(authStore.token).toBe('mock-access-token-engineer-01');
  });

  it('rejects invalid credentials', () => {
    const authStore = useAuthStore();

    expect(() =>
      authStore.login({
        loginId: 'engineer01',
        password: 'wrong-password',
        fabId: MOCK_AUTH_FABS[0].fabId,
      })
    ).toThrow('아이디 또는 비밀번호가 일치하지 않습니다.');
    expect(authStore.isLoggedIn).toBe(false);
  });

  it('redirects a signed-in engineer away from admin routes', async () => {
    const authStore = useAuthStore();
    authStore.login({
      loginId: 'engineer01',
      password: 'eng1234',
      fabId: MOCK_AUTH_FABS[0].fabId,
    });

    await router.push('/admin/access');

    expect(router.currentRoute.value.path).toBe('/dashboard');
  });

  it('allows an admin to enter admin routes', async () => {
    const authStore = useAuthStore();
    authStore.login({
      loginId: 'admin',
      password: 'admin1234',
      fabId: MOCK_AUTH_FABS[0].fabId,
    });

    await router.push('/admin/access');

    expect(router.currentRoute.value.path).toBe('/admin/access');
  });
});

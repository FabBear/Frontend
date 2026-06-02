import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import api from '@/services/api';

import type { AuthFab, AuthLoginResult, AuthUser, LoginRequest } from '@/types/auth';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const fabs = ref<AuthFab[]>([]); // 로그인 화면 Fab 드롭다운 및 fabName 조회에 사용
  const authChecked = ref(false); // 세션 복구 시도 여부 — router guard 중복 호출 방지

  const isLoggedIn = computed(() => Boolean(user.value));
  const isAdmin = computed(() => user.value?.roles.includes('ADMIN') ?? false);

  // 로그인/세션 복구 응답에 fabName이 없어 fabs 목록에서 직접 채운다
  function withFabName(authUser: AuthUser): AuthUser {
    const selectedFab = fabs.value.find((f) => f.fabId === authUser.fabId);
    return { ...authUser, fabName: authUser.fabName ?? selectedFab?.fabName };
  }

  // 로그인 화면 마운트 시 호출 — Fab 선택 드롭다운 데이터 로드
  async function fetchFabs(): Promise<AuthFab[]> {
    const { data } = await api.get<{ fabs: AuthFab[] }>('/v1/auth/fabs');
    fabs.value = data.fabs;
    return data.fabs;
  }

  async function login(payload: LoginRequest): Promise<AuthLoginResult> {
    const { data } = await api.post<AuthUser>('/v1/auth/login', payload);
    user.value = withFabName(data);
    authChecked.value = true;
    return { user: user.value };
  }

  // 현재 세션의 사용자 정보를 서버에서 다시 조회 (세션 복구 시 사용)
  async function fetchMe(): Promise<AuthUser> {
    const { data } = await api.get<AuthUser>('/v1/auth/me');
    user.value = withFabName(data);
    return user.value;
  }

  // 페이지 새로고침 시 router.beforeEach에서 호출 — accessToken 쿠키가 유효하면 세션을 복구
  // authChecked가 true면 이미 시도한 것이므로 바로 반환
  // 미인증 상태에서 /me가 401을 반환하는 것은 정상 동작이며, catch에서 처리됨
  async function restoreSession(): Promise<AuthUser | null> {
    if (authChecked.value) return user.value;

    try {
      if (fabs.value.length === 0) {
        await fetchFabs();
      }
      return await fetchMe();
    } catch {
      clearAuth();
      return null;
    } finally {
      authChecked.value = true;
    }
  }

  async function logout() {
    try {
      await api.post('/v1/auth/logout');
    } catch (error) {
      // 서버 로그아웃 실패해도 로컬 세션은 반드시 종료 — 에러는 전파하지 않음
      console.error('[Auth] logout 요청 실패:', error);
    } finally {
      clearAuth();
    }
  }

  function clearAuth() {
    user.value = null;
    authChecked.value = true; // 인증 확인 완료 + 미로그인 상태 — 불필요한 /me 재시도 방지
  }

  return {
    user,
    fabs,
    authChecked,
    isLoggedIn,
    isAdmin,
    fetchFabs,
    login,
    fetchMe,
    restoreSession,
    logout,
    clearAuth,
  };
});

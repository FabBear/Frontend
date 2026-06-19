import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import api from '@/services/api';

import type { AuthFab, AuthLoginResult, AuthMenu, AuthUser, LoginRequest } from '@/types/auth';

const PREVIEW_AUTH_STORAGE_KEY = 'fabbear.previewAuthUser';

const PREVIEW_FABS: AuthFab[] = [
  {
    fabId: 'FAB_ICN_01',
    fabCode: 'ICN',
    fabName: 'SK하이닉스 이천 FAB',
    location: '이천',
  },
];

const PREVIEW_ACCOUNTS: Array<AuthUser & { password: string }> = [
  {
    userId: 'user-admin',
    loginId: 'admin',
    password: 'admin1234',
    userName: '관리자',
    department: '운영관리',
    fabId: 'FAB_ICN_01',
    fabCode: 'ICN',
    fabName: 'SK하이닉스 이천 FAB',
    roles: ['ADMIN'],
    lastLoginAt: '2026-06-14T14:12:46Z',
  },
  {
    userId: 'user-engineer01',
    loginId: 'engineer01',
    password: 'eng1234',
    userName: '공정 엔지니어',
    department: '공정팀',
    fabId: 'FAB_ICN_01',
    fabCode: 'ICN',
    fabName: 'SK하이닉스 이천 FAB',
    roles: ['ENGINEER'],
    lastLoginAt: '2026-06-14T14:10:00Z',
  },
];

const ENGINEER_MENU_CODES = [
  'DASHBOARD',
  'MONITORING_BOTTLENECK',
  'MONITORING_MES',
  'MONITORING_TOOL',
  'MONITORING_LOT_RELEASE_PLAN',
  'MONITORING_3DFAB',
  'RESPONSE_CENTER',
  'REPORT_HISTORY',
];

const ADMIN_MENU_CODES = [
  ...ENGINEER_MENU_CODES,
  'ADMIN_THRESHOLD',
  'ADMIN_MLFLOW',
  'ADMIN_PERMISSION',
  'ADMIN_MES',
  'ADMIN_PROMPT',
  'ADMIN_COLLECT',
];

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null);
  const fabs = ref<AuthFab[]>([]); // 로그인 화면 Fab 드롭다운 및 fabName 조회에 사용
  const menus = ref<AuthMenu[]>([]); // 역할 기반 접근 가능 메뉴 — 사이드바 노출 필터에 사용
  const authChecked = ref(false); // 세션 복구 시도 여부 — router guard 중복 호출 방지

  const isLoggedIn = computed(() => Boolean(user.value));
  const isAdmin = computed(() => user.value?.roles.includes('ADMIN') ?? false);
  // 접근 가능한 메뉴 코드 집합 — 사이드바가 O(1)로 노출 여부를 판단한다
  const menuCodes = computed(() => new Set(menus.value.map((m) => m.menuCode)));

  // 로그인/세션 복구 응답에 fabName이 없어 fabs 목록에서 직접 채운다
  function withFabName(authUser: AuthUser): AuthUser {
    const selectedFab = fabs.value.find((f) => f.fabId === authUser.fabId);
    return { ...authUser, fabName: normalizeFabName(authUser.fabName ?? selectedFab?.fabName) };
  }

  // 로그인 화면 마운트 시 호출 — Fab 선택 드롭다운 데이터 로드
  async function fetchFabs(): Promise<AuthFab[]> {
    try {
      const { data } = await api.get<{ fabs: AuthFab[] }>('/v1/auth/fabs');
      fabs.value = data.fabs;
      return data.fabs;
    } catch {
      fabs.value = PREVIEW_FABS.map((fab) => ({ ...fab }));
      return fabs.value;
    }
  }

  async function login(payload: LoginRequest): Promise<AuthLoginResult> {
    if (!isUuid(payload.fabId)) {
      const previewUser = resolvePreviewLogin(payload, fabs.value);
      if (!previewUser) {
        throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
      }

      user.value = withFabName(previewUser);
      menus.value = buildPreviewMenus(previewUser.roles);
      authChecked.value = true;
      persistPreviewUser(user.value);
      return { user: user.value };
    }

    try {
      const { data } = await api.post<AuthUser>('/v1/auth/login', payload);
      user.value = withFabName(data);
      authChecked.value = true;
      // 실서버 로그인 성공 → 과거 백엔드 다운 시 fallback으로 남았을 수 있는 preview 키 제거.
      // 이 키가 남아 있으면 shouldUsePresentationScenario()가 true가 되어 SSE 알림 스트림이
      // 비활성화되고(알림이 새로고침해야만 보임) 데모 데이터로 폴백된다.
      clearPreviewUser();
      // 로그인 직후 1회만 메뉴를 받아 캐싱 — 사이드바는 이 캐시를 읽는다(매 렌더 재조회 X)
      await fetchMenus().catch((error) => {
        console.error('[Auth] 메뉴 로드 실패:', error);
      });
      return { user: user.value };
    } catch (error) {
      const previewUser = resolvePreviewLogin(payload, fabs.value);
      if (!previewUser) throw error;

      user.value = withFabName(previewUser);
      menus.value = buildPreviewMenus(previewUser.roles);
      authChecked.value = true;
      persistPreviewUser(user.value);
      return { user: user.value };
    }
  }

  // 현재 세션의 사용자 정보를 서버에서 다시 조회 (세션 복구 시 사용)
  async function fetchMe(): Promise<AuthUser> {
    try {
      const { data } = await api.get<AuthUser>('/v1/auth/me');
      user.value = withFabName(data);
      return user.value;
    } catch (error) {
      const storedUser = readPreviewUser();
      if (!storedUser) throw error;
      user.value = withFabName(storedUser);
      return user.value;
    }
  }

  // 역할 기반 접근 가능 메뉴 조회 — 로그인/세션 복구 시 1회 호출 후 store에 캐싱
  async function fetchMenus(): Promise<AuthMenu[]> {
    try {
      const { data } = await api.get<AuthMenu[]>('/v1/auth/menus');
      menus.value = data;
      return data;
    } catch {
      menus.value = buildPreviewMenus(user.value?.roles ?? ['ENGINEER']);
      return menus.value;
    }
  }

  // 페이지 새로고침 시 router.beforeEach에서 호출 — accessToken 쿠키가 유효하면 세션을 복구
  // authChecked가 true면 이미 시도한 것이므로 바로 반환
  // 미인증 상태에서 /me가 401을 반환하는 것은 정상 동작이며, catch에서 처리됨
  async function restoreSession(): Promise<AuthUser | null> {
    if (authChecked.value) return user.value;

    try {
      if (fabs.value.length === 0) {
        await fetchFabs().catch((error) => {
          console.error('[Auth] Fab 목록 로드 실패:', error);
        });
      }
      const me = await fetchMe();
      // 세션 복구 시에도 메뉴를 1회 받아 캐싱 — 실패해도 세션 복구는 진행(사이드바는 폴백)
      await fetchMenus().catch((error) => {
        console.error('[Auth] 메뉴 로드 실패:', error);
      });
      return me;
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
    menus.value = []; // 로그아웃/세션 만료 시 메뉴 캐시도 비운다
    authChecked.value = true; // 인증 확인 완료 + 미로그인 상태 — 불필요한 /me 재시도 방지
    clearPreviewUser();
  }

  return {
    user,
    fabs,
    menus,
    menuCodes,
    authChecked,
    isLoggedIn,
    isAdmin,
    fetchFabs,
    login,
    fetchMe,
    fetchMenus,
    restoreSession,
    logout,
    clearAuth,
  };
});

function resolvePreviewLogin(payload: LoginRequest, availableFabs: AuthFab[]): AuthUser | null {
  const account = PREVIEW_ACCOUNTS.find(
    (previewAccount) => previewAccount.loginId === payload.loginId && previewAccount.password === payload.password
  );
  if (!account) return null;
  const selectedFab = availableFabs.find((fab) => fab.fabId === payload.fabId) ?? PREVIEW_FABS[0];
  const user: AuthUser = {
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
  return {
    ...user,
    fabId: selectedFab.fabId,
    fabCode: selectedFab.fabCode,
    fabName: selectedFab.fabName,
  };
}

function buildPreviewMenus(roles: AuthUser['roles']): AuthMenu[] {
  const codes = roles.includes('ADMIN') ? ADMIN_MENU_CODES : ENGINEER_MENU_CODES;
  return codes.map((code) => ({
    menuCode: code,
    menuName: code,
    menuPath: '/',
    permission: 'READ',
  }));
}

function normalizeFabName(fabName: string | null | undefined): string | undefined {
  if (!fabName) return undefined;
  if (fabName.includes('Demo')) return 'SK하이닉스 이천 FAB';
  return fabName;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function persistPreviewUser(authUser: AuthUser): void {
  try {
    window.localStorage.setItem(PREVIEW_AUTH_STORAGE_KEY, JSON.stringify(authUser));
  } catch {
    return;
  }
}

function readPreviewUser(): AuthUser | null {
  try {
    const raw = window.localStorage.getItem(PREVIEW_AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function clearPreviewUser(): void {
  try {
    window.localStorage.removeItem(PREVIEW_AUTH_STORAGE_KEY);
  } catch {
    return;
  }
}

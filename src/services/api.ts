import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

import { shouldUsePresentationScenario } from '@/constants/scenarioMode';

// _csrfRetried: CSRF priming 후 무한 retry 방지 플래그
// _authVerifiedOn401: 단일 요청에서 인증 재확인 중복 방지 플래그
type RetryableConfig = InternalAxiosRequestConfig & { _csrfRetried?: boolean; _authVerifiedOn401?: boolean };

const PREVIEW_AUTH_STORAGE_KEY = 'fabbear.previewAuthUser';

// XSRF-TOKEN 쿠키를 읽어 반환 — Spring이 발급한 CSRF 토큰
function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^| )XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // HttpOnly 쿠키 자동 전송에 필요
});

// 상태 변경 요청 — XSRF-TOKEN 쿠키값을 X-XSRF-TOKEN 헤더로 전달
api.interceptors.request.use((config) => {
  if (shouldUsePresentationScenario()) {
    return Promise.reject(new Error('API request skipped'));
  }

  if (['post', 'put', 'patch', 'delete'].includes((config.method ?? '').toLowerCase())) {
    const token = getCsrfToken();
    if (token) config.headers['X-XSRF-TOKEN'] = token;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // 공통 응답 래퍼 { success, data, error, meta } → data 필드만 추출
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  async (error) => {
    const config = error.config as RetryableConfig;
    const isAuthUrl = config?.url?.includes('/v1/auth/');
    const isStateChanging = ['post', 'put', 'patch', 'delete'].includes((config?.method ?? '').toLowerCase());

    // Spring Security 6 deferred CSRF — 첫 POST 시 XSRF-TOKEN 쿠키 없으면 401 반환 후 쿠키 발급
    // 쿠키가 새로 생긴 경우 한 번 자동 retry (이후엔 _csrfRetried로 차단)
    if (error.response?.status === 401 && isStateChanging && !config._csrfRetried) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config._csrfRetried = true;
        return api(config);
      }
    }

    // 인증 만료 401 — 쿠키 세션이 실제로 만료됐는지 /me로 확인 후 로컬 세션 초기화
    if (error.response?.status === 401 && !isAuthUrl && !config._authVerifiedOn401) {
      config._authVerifiedOn401 = true;
      const { useAuthStore } = await import('@/stores/auth');
      const authStore = useAuthStore();
      if (!authStore.isLoggedIn) {
        return Promise.reject(error);
      }

      try {
        await axios.get('/v1/auth/me', {
          baseURL: api.defaults.baseURL,
          withCredentials: true,
          headers: { Accept: 'application/json' },
        });
      } catch (meError) {
        if (axios.isAxiosError(meError) && meError.response?.status === 401) {
          if (window.localStorage.getItem(PREVIEW_AUTH_STORAGE_KEY)) {
            return Promise.reject(error);
          }
          authStore.clearAuth();
        }
      }
    }

    return Promise.reject(error);
  }
);

/**
 * 공통 응답 envelope({ error: { message } })에서 사용자에게 보여줄 에러 메시지를 추출한다.
 * 컴포넌트가 axios를 직접 import하지 않도록 services 레이어에서 제공한다.
 *
 * @param error catch로 받은 알 수 없는 에러
 * @param fallback envelope 메시지가 없을 때 사용할 기본 메시지
 * @returns 표시용 에러 메시지
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string } } | undefined;
    if (data?.error?.message) return data.error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default api;

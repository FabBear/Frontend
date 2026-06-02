import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// _csrfRetried: CSRF priming 후 무한 retry 방지 플래그
type RetryableConfig = InternalAxiosRequestConfig & { _csrfRetried?: boolean };

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
  if (['post', 'put', 'patch', 'delete'].includes(config.method ?? '')) {
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

    // 인증 만료 401 — 로컬 세션 초기화 (auth 엔드포인트 실패는 각 호출부에서 처리)
    if (error.response?.status === 401 && !isAuthUrl) {
      const { useAuthStore } = await import('@/stores/auth');
      useAuthStore().clearAuth();
    }

    return Promise.reject(error);
  }
);

export default api;

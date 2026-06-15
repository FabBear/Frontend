export type UserRole = 'ENGINEER' | 'ADMIN';

export interface AuthFab {
  fabId: string;
  fabCode: string;
  fabName: string;
  location: string;
}

export interface AuthFabsResponseData {
  fabs: AuthFab[];
}

export interface LoginRequest {
  loginId: string;
  password: string;
  fabId: string;
}

export interface AuthUser {
  userId: string;
  loginId: string;
  userName: string;
  department?: string;
  fabId: string;
  fabCode: string;
  fabName?: string;
  roles: UserRole[];
  lastLoginAt?: string;
}

// 백엔드 LoginResponse와 구분 — 스토어가 내부적으로 반환하는 프론트 전용 타입
export interface AuthLoginResult {
  user: AuthUser;
}

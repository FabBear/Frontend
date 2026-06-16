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

// GET /api/v1/auth/menus 응답 — 현재 사용자 역할에 매핑된 메뉴(평면 리스트)
// 사이드바는 menuCode로 노출 여부만 판단하고, 아이콘/섹션/실제 라우트는 프론트가 매핑한다.
export interface AuthMenu {
  menuCode: string;
  menuName: string;
  menuPath: string;
  permission: string;
}

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
  department: string;
  fabId: string;
  fabCode: string;
  fabName: string;
  roles: UserRole[];
  lastLoginAt: string;
}

export interface LoginResponse {
  user: AuthUser;
}

export interface MockAuthAccount extends AuthUser {
  password: string;
  mockAccessToken: string;
}

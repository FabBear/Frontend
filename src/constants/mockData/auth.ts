import type { AuthFab, AuthFabsResponseData, MockAuthAccount } from '@/types/auth';

export const MOCK_AUTH_FABS: AuthFab[] = [
  {
    fabId: '11111111-1111-4111-8111-111111111111',
    fabCode: 'FAB_SK_001',
    fabName: 'SK하이닉스 이천 FAB1',
    location: '경기도 이천시',
  },
  {
    fabId: '22222222-2222-4222-8222-222222222222',
    fabCode: 'FAB_SK_002',
    fabName: 'SK하이닉스 청주 FAB2',
    location: '충청북도 청주시',
  },
];

export const MOCK_AUTH_FABS_RESPONSE: AuthFabsResponseData = {
  fabs: MOCK_AUTH_FABS,
};

// API-AUTH-02 Mock: loginId/password/fabId가 모두 일치해야 로그인 성공.
export const MOCK_AUTH_ACCOUNTS: MockAuthAccount[] = [
  {
    userId: '33333333-3333-4333-8333-333333333333',
    loginId: 'engineer01',
    password: 'eng1234',
    userName: '김엔지니어',
    department: '공정 기술팀',
    fabId: MOCK_AUTH_FABS[0].fabId,
    fabCode: MOCK_AUTH_FABS[0].fabCode,
    fabName: MOCK_AUTH_FABS[0].fabName,
    roles: ['ENGINEER'],
    lastLoginAt: '2026-05-22T01:00:00Z',
    mockAccessToken: 'mock-access-token-engineer-01',
  },
  {
    userId: '44444444-4444-4444-8444-444444444444',
    loginId: 'admin',
    password: 'admin1234',
    userName: '시스템 관리자',
    department: '공정 관리팀',
    fabId: MOCK_AUTH_FABS[0].fabId,
    fabCode: MOCK_AUTH_FABS[0].fabCode,
    fabName: MOCK_AUTH_FABS[0].fabName,
    roles: ['ADMIN'],
    lastLoginAt: '2026-05-22T01:00:00Z',
    mockAccessToken: 'mock-access-token-admin-01',
  },
];

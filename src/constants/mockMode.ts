export const FORCE_DEMO_MOCK_DATA =
  import.meta.env.VITE_FORCE_MOCK_DATA === 'true' || import.meta.env.VITE_USE_BNC_MOCK_DATA === 'true';

export function shouldUseDemoMockData(): boolean {
  return FORCE_DEMO_MOCK_DATA;
}

export function cloneMockData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

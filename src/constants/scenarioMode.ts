// auth.ts가 persistPreviewUser로 저장하는 키 — 순환 의존을 피해 직접 참조
const PREVIEW_AUTH_STORAGE_KEY = 'fabbear.previewAuthUser';

export const FORCE_PRESENTATION_SCENARIO =
  import.meta.env.VITE_FORCE_PRESENTATION_SCENARIO === 'true' || import.meta.env.VITE_USE_PRESENTATION_SCENARIO === 'true';

export function shouldUsePresentationScenario(): boolean {
  if (FORCE_PRESENTATION_SCENARIO) return true;
  try {
    return Boolean(window.localStorage.getItem(PREVIEW_AUTH_STORAGE_KEY));
  } catch {
    return false;
  }
}

export function cloneScenarioData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

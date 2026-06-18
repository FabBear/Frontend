import { ref } from 'vue';

export interface CaseProgressEvent {
  caseId: string;
  stepName: string;
  status: string;
}

/** SSE "caseProgress" 이벤트를 전역으로 공유하는 reactive ref.
 *  useNotifications가 수신 즉시 갱신하고, useBnc가 watch해서 detail을 재조회한다. */
export const latestCaseProgress = ref<CaseProgressEvent | null>(null);

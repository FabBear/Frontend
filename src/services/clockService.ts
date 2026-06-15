import api from '@/services/api';

/**
 * 데모 presentation 기준 "현재 시각"(ISO)을 백엔드에서 조회한다.
 * 2020 시드 데이터 기준의 단일 시계 소스 — 날짜 기본값/챗 anchor에 사용.
 */
export async function fetchPresentationNow(): Promise<string> {
  const { data } = await api.get<{ now: string }>('/v1/monitoring/clock');
  return data.now;
}

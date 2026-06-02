import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';

import { fetchDashboardData } from '@/services/dashboardService';

import { DASHBOARD_POLL_INTERVAL_MS } from '@/constants/dashboard';

import type { DashboardSectionData, DashboardSectionErrors } from '@/types/dashboard';

export function useDashboardData() {
  const dashboardData = shallowRef<DashboardSectionData>({
    kpi: null,
    alerts: null,
    processAreas: null,
    trends: null,
  });
  const isLoading = ref(false);
  const isMockAlerts = ref(false);
  const sectionErrors = shallowRef<DashboardSectionErrors>({});
  const hasLoadedAnySection = computed(() => Object.values(dashboardData.value).some((section) => section !== null));
  const errorMessage = computed(() => {
    if (hasLoadedAnySection.value) return null;
    return Object.values(sectionErrors.value)[0] ?? null;
  });

  async function loadDashboardData() {
    isLoading.value = true;
    sectionErrors.value = {};
    try {
      const { data, errors, isMockAlerts: mock } = await fetchDashboardData();
      dashboardData.value = data;
      sectionErrors.value = errors;
      isMockAlerts.value = mock;
    } catch {
      sectionErrors.value = { kpi: '대시보드 데이터를 불러오지 못했습니다.' };
    } finally {
      isLoading.value = false;
    }
  }

  async function pollDashboardData() {
    if (isLoading.value) return;
    try {
      const { data, errors, isMockAlerts: mock } = await fetchDashboardData();
      dashboardData.value = data;
      sectionErrors.value = errors;
      isMockAlerts.value = mock;
    } catch {
      // 폴링 실패 시 마지막 데이터 유지 — 일시적 네트워크 오류로 화면을 비우지 않음
    }
  }

  let pollTimer: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    void loadDashboardData();
    pollTimer = setInterval(() => void pollDashboardData(), DASHBOARD_POLL_INTERVAL_MS);
  });

  onUnmounted(() => {
    if (pollTimer !== null) clearInterval(pollTimer);
  });

  return {
    dashboardData,
    isLoading,
    isMockAlerts,
    errorMessage,
    sectionErrors,
    hasLoadedAnySection,
    refreshDashboardData: loadDashboardData,
  };
}

import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';

import { useAuthStore } from '@/stores/auth';

import { fetchDashboardData } from '@/services/dashboardService';

import { DASHBOARD_POLL_INTERVAL_MS } from '@/constants/dashboard';

import type { DashboardSectionData, DashboardSectionErrors } from '@/types/dashboard';

export function useDashboardData() {
  const authStore = useAuthStore();
  const dashboardData = shallowRef<DashboardSectionData>({
    kpi: null,
    alerts: null,
    processAreas: null,
    trends: null,
    releasePlan: null,
  });
  const isLoading = ref(false);
  const sectionErrors = shallowRef<DashboardSectionErrors>({});
  const hasLoadedAnySection = computed(() => Object.values(dashboardData.value).some((section) => section !== null));
  const errorMessage = computed(() => {
    if (hasLoadedAnySection.value) return null;
    return Object.values(sectionErrors.value)[0] ?? null;
  });

  async function loadDashboardData() {
    if (!authStore.isLoggedIn) return;
    if (isLoading.value) return;
    isLoading.value = true;
    sectionErrors.value = {};
    try {
      const { data, errors } = await fetchDashboardData();
      dashboardData.value = data;
      sectionErrors.value = errors;
    } catch {
      sectionErrors.value = { kpi: '대시보드 데이터를 불러오지 못했습니다.' };
    } finally {
      isLoading.value = false;
    }
  }

  async function pollDashboardData() {
    if (!authStore.isLoggedIn) return;
    if (isLoading.value) return;
    try {
      const { data, errors } = await fetchDashboardData();
      mergePolledDashboardData(data, errors);
    } catch {
      // 폴링 실패 시 마지막 데이터 유지 — 일시적 네트워크 오류로 화면을 비우지 않음
    }
  }

  function mergePolledDashboardData(data: DashboardSectionData, errors: DashboardSectionErrors) {
    const nextData = { ...dashboardData.value };
    const nextErrors = { ...sectionErrors.value };

    if (data.kpi !== null) {
      nextData.kpi = data.kpi;
      delete nextErrors.kpi;
    } else if (errors.kpi && nextData.kpi === null) {
      nextErrors.kpi = errors.kpi;
    }

    if (data.alerts !== null) {
      nextData.alerts = data.alerts;
      delete nextErrors.alerts;
    } else if (errors.alerts && nextData.alerts === null) {
      nextErrors.alerts = errors.alerts;
    }

    if (data.releasePlan !== null) {
      nextData.releasePlan = data.releasePlan;
      delete nextErrors.releasePlan;
    } else if (errors.releasePlan && nextData.releasePlan === null) {
      nextErrors.releasePlan = errors.releasePlan;
    }

    if (data.processAreas !== null) {
      nextData.processAreas = data.processAreas;
      delete nextErrors.processAreas;
    } else if (errors.processAreas && nextData.processAreas === null) {
      nextErrors.processAreas = errors.processAreas;
    }

    if (data.trends !== null) {
      nextData.trends = data.trends;
      delete nextErrors.trends;
    } else if (errors.trends && nextData.trends === null) {
      nextErrors.trends = errors.trends;
    }

    dashboardData.value = nextData;
    sectionErrors.value = nextErrors;
  }

  let pollTimer: ReturnType<typeof setInterval> | null = null;

  function startPolling() {
    if (pollTimer !== null) return;
    pollTimer = setInterval(() => void pollDashboardData(), DASHBOARD_POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollTimer === null) return;
    clearInterval(pollTimer);
    pollTimer = null;
  }

  onMounted(() => {
    if (!authStore.isLoggedIn) return;

    void loadDashboardData();
    startPolling();
  });

  watch(
    () => authStore.isLoggedIn,
    (isLoggedIn) => {
      if (!isLoggedIn) {
        stopPolling();
        return;
      }

      void loadDashboardData();
      startPolling();
    }
  );

  onUnmounted(() => {
    stopPolling();
  });

  return {
    dashboardData,
    isLoading,
    errorMessage,
    sectionErrors,
    hasLoadedAnySection,
    refreshDashboardData: loadDashboardData,
  };
}

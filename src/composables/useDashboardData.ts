import { onMounted, ref, shallowRef } from 'vue';

import { fetchDashboardData } from '@/services/dashboardService';

import type { DashboardData } from '@/types/dashboard';

export function useDashboardData() {
  const dashboardData = shallowRef<DashboardData | null>(null);
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);

  async function loadDashboardData() {
    isLoading.value = true;
    errorMessage.value = null;
    try {
      dashboardData.value = await fetchDashboardData();
    } catch {
      errorMessage.value = '대시보드 데이터를 불러오지 못했습니다.';
    } finally {
      isLoading.value = false;
    }
  }

  onMounted(() => {
    void loadDashboardData();
  });

  return {
    dashboardData,
    isLoading,
    errorMessage,
    refreshDashboardData: loadDashboardData,
  };
}

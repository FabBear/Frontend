import { computed, ref } from 'vue';

import { fetchBottleneckAlertsPage } from '@/services/bottleneckMonitoringService';

import type { BottleneckAlertItem } from '@/types/dashboard';
import type { DashboardPageInfo } from '@/types/dashboardApi';

type PageButton = number | 'ellipsis-start' | 'ellipsis-end';

const ALERT_PAGE_SIZE = 10;
const DEFAULT_PAGE_INFO: DashboardPageInfo = {
  page: 0,
  size: ALERT_PAGE_SIZE,
  totalElements: 0,
  totalPages: 0,
  sort: 'detectedAt,desc',
};

const koDateInputFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function getDateRangeBound(dateValue: string, endOfDay = false) {
  if (!dateValue) return null;

  const suffix = endOfDay ? 'T23:59:59.999+09:00' : 'T00:00:00.000+09:00';
  const timestamp = new Date(`${dateValue}${suffix}`).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

function getDateRangeParam(dateValue: string, endOfDay = false) {
  const timestamp = getDateRangeBound(dateValue, endOfDay);

  return timestamp === null ? null : new Date(timestamp).toISOString();
}

function formatDateInputValue(timestamp: number) {
  return koDateInputFormatter.format(new Date(timestamp));
}

export function useBottleneckAlertList() {
  const alerts = ref<BottleneckAlertItem[]>([]);
  const isLoading = ref(false);
  const hasLoaded = ref(false);
  const errorMessage = ref<string | null>(null);
  const filterStartDate = ref('');
  const filterEndDate = ref('');
  const page = ref(0);
  const pageInfo = ref<DashboardPageInfo>({ ...DEFAULT_PAGE_INFO });

  const rangeAnchor = computed(() => {
    const timestamps = alerts.value
      .map((alert) => new Date(alert.detectedAt).getTime())
      .filter((timestamp) => !Number.isNaN(timestamp));
    return timestamps.length > 0 ? Math.max(...timestamps) : Date.now();
  });

  const totalPages = computed(() => Math.max(1, pageInfo.value.totalPages));

  const pageButtons = computed<PageButton[]>(() => {
    const total = totalPages.value;
    const current = page.value;
    const edgePageCount = 1;
    const siblingCount = 1;

    if (total <= 7) {
      return Array.from({ length: total }, (_, index) => index);
    }

    const startPage = Math.max(edgePageCount, current - siblingCount);
    const endPage = Math.min(total - edgePageCount - 1, current + siblingCount);
    const pages: PageButton[] = [0];

    if (startPage > edgePageCount) {
      pages.push('ellipsis-start');
    }

    for (let nextPage = startPage; nextPage <= endPage; nextPage += 1) {
      pages.push(nextPage);
    }

    if (endPage < total - edgePageCount - 1) {
      pages.push('ellipsis-end');
    }

    pages.push(total - 1);
    return pages;
  });

  async function loadAlerts(nextPage = page.value) {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      const result = await fetchBottleneckAlertsPage({
        page: nextPage,
        size: ALERT_PAGE_SIZE,
        detectedFrom: getDateRangeParam(filterStartDate.value),
        detectedTo: getDateRangeParam(filterEndDate.value, true),
      });

      alerts.value = result.items;
      pageInfo.value = result.pageInfo;
      page.value = result.pageInfo.page;
    } catch {
      errorMessage.value = '병목 알림 목록을 불러오지 못했습니다.';
      alerts.value = [];
      pageInfo.value = { ...DEFAULT_PAGE_INFO };
      page.value = 0;
    } finally {
      isLoading.value = false;
      hasLoaded.value = true;
    }
  }

  function applyPresetRange(dayCount: number | null) {
    if (dayCount === null) {
      filterStartDate.value = '';
      filterEndDate.value = '';
      void loadAlerts(0);
      return;
    }

    const anchor = rangeAnchor.value;
    const start = anchor - (dayCount - 1) * 24 * 60 * 60 * 1000;

    filterStartDate.value = formatDateInputValue(start);
    filterEndDate.value = formatDateInputValue(anchor);
    void loadAlerts(0);
  }

  function handleDateFilterChange() {
    void loadAlerts(0);
  }

  function handlePageChange(nextPage: number) {
    if (nextPage < 0 || nextPage >= totalPages.value || nextPage === page.value) return;
    void loadAlerts(nextPage);
  }

  return {
    alerts,
    isLoading,
    hasLoaded,
    errorMessage,
    filterStartDate,
    filterEndDate,
    pageInfo,
    totalPages,
    pageButtons,
    loadAlerts,
    applyPresetRange,
    handleDateFilterChange,
    handlePageChange,
  };
}

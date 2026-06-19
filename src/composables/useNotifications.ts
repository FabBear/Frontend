import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue';

import { useAuthStore } from '@/stores/auth';

import { fetchMlflowDriftAlerts } from '@/services/adminService';
import {
  createNotificationEventSource,
  fetchNotifications,
  mapNotificationStreamEvent,
  markAllNotificationsRead,
  markNotificationsRead,
} from '@/services/notificationService';

import { shouldUsePresentationScenario } from '@/constants/scenarioMode';

import type { AdminDriftAlert } from '@/types/admin';
import type { NotificationItem, NotificationStreamEvent } from '@/types/notification';

import { latestCaseProgress } from '@/composables/useCaseProgress';

// 드리프트 알림은 ADMIN 전용 엔드포인트(/v1/admin/mlflow/drift-alerts)에서 가져온다.
// 신규 drift는 백엔드 DriftAlertPushScheduler가 60초 주기로 SSE(MODEL_RETRAIN)를 발행하면
// 프론트가 수신 즉시 목록을 새로고침한다. 클라이언트 폴링은 사용하지 않는다.

// 드리프트 알림 ID는 서버 알림 ID와 구분되도록 접두사를 붙인다 (읽음 처리 분기에 사용).
const DRIFT_ID_PREFIX = 'drift-';
const DRIFT_ACK_STORAGE_KEY = 'fabbear.notifications.driftAckedIds';

function loadDriftAckedIds() {
  if (typeof window === 'undefined') return new Set<string>();
  try {
    const raw = window.localStorage.getItem(DRIFT_ACK_STORAGE_KEY);
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(ids.filter((id) => typeof id === 'string'));
  } catch {
    return new Set<string>();
  }
}

function saveDriftAckedIds(ids: Set<string>) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DRIFT_ACK_STORAGE_KEY, JSON.stringify([...ids]));
}

function formatDriftScore(value: number | null | undefined) {
  return value === null || value === undefined ? '-' : value.toFixed(3);
}

function buildDriftDetails(alert: AdminDriftAlert): NotificationItem['detailItems'] {
  const detail = alert.detail;
  const decision = detail?.retrain_decision ?? detail?.retrain_approval;
  const contributors = detail?.top_contributors
    ?.slice(0, 2)
    .map((item) => `${item.toolgroup ?? item.tg_name ?? '-'} FN ${item.fn} / FP ${item.fp}`)
    .join(', ');

  return [
    { label: '감지 기준', value: alert.triggerType },
    { label: '현재 F1', value: formatDriftScore(alert.f1AtDetection ?? detail?.f1_current) },
    { label: '임계값', value: formatDriftScore(detail?.threshold) },
    { label: '권장 조치', value: detail?.recommendation ?? '모델 교체 승인 필요' },
    ...(decision?.status ? [{ label: '교체 승인', value: decision.status === 'ON_HOLD' ? '보류됨' : '승인됨' }] : []),
    ...(contributors ? [{ label: '주요 영향 TG', value: contributors }] : []),
  ];
}

function mapDriftAlert(alert: AdminDriftAlert, ackedIds: Set<string>): NotificationItem {
  const decision = alert.detail?.retrain_decision ?? alert.detail?.retrain_approval;
  const isDecided = alert.isRetrainTriggered || decision?.status === 'ON_HOLD';
  const f1Suffix = alert.f1AtDetection !== null ? ` (F1 ${alert.f1AtDetection.toFixed(3)})` : '';
  return {
    id: `${DRIFT_ID_PREFIX}${alert.id}`,
    type: 'MODEL_RETRAIN',
    level: 'warning',
    title: isDecided ? '모델 드리프트 처리됨' : '모델 드리프트 감지',
    message: isDecided
      ? `${alert.triggerType} 드리프트 모델 교체 승인이 기록되었습니다${f1Suffix}`
      : `${alert.triggerType} 드리프트 감지 — 신규 모델 교체 승인 대기${f1Suffix}`,
    refCaseId: null,
    createdAt: alert.detectedAt,
    detailItems: buildDriftDetails(alert),
    // 모델 교체 승인 전이라도 사용자가 알림을 확인하면 현재 브라우저에서는 읽음으로 처리한다.
    unread: !isDecided && !ackedIds.has(alert.id),
  };
}

export function useNotifications() {
  const authStore = useAuthStore();
  // 서버(병목) 알림 — SSE + /v1/notifications
  const serverNotifications = shallowRef<NotificationItem[]>([]);
  const serverUnreadCount = ref(0);
  // 드리프트(MODEL_RETRAIN) 알림 — ADMIN 폴링
  const driftNotifications = shallowRef<NotificationItem[]>([]);
  const driftAckedIds = ref<Set<string>>(loadDriftAckedIds());
  const isLoading = ref(false);
  const errorMessage = ref<string | null>(null);
  const streamConnected = ref(false);
  const streamError = ref(false);
  const notificationPushTick = ref(0);

  // 패널/종에 보여줄 통합 목록 (최신순)
  const notifications = computed(() =>
    [...serverNotifications.value, ...driftNotifications.value]
      .filter((notification) => notification.unread)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  );
  const driftUnreadCount = computed(
    () => driftNotifications.value.filter((notification) => notification.unread).length
  );
  // 헤더 종 배지 = 전체 안읽음(병목 + 드리프트)
  const unreadCount = computed(() => serverUnreadCount.value + driftUnreadCount.value);
  // 사이드바 "병목 대응 센터" 배지 = 병목(서버) 안읽음만 — 드리프트는 제외
  const bottleneckUnreadCount = computed(() => serverUnreadCount.value);

  const latestCriticalUnread = computed(
    () => notifications.value.find((notification) => notification.unread && notification.level === 'critical') ?? null
  );

  async function loadNotifications() {
    if (!authStore.isLoggedIn) return;

    isLoading.value = true;
    errorMessage.value = null;

    try {
      const data = await fetchNotifications();
      serverNotifications.value = data.items;
      serverUnreadCount.value = data.totalUnreadCount;
    } catch {
      errorMessage.value = '알림을 불러오지 못했습니다.';
      serverNotifications.value = [];
      serverUnreadCount.value = 0;
    } finally {
      isLoading.value = false;
    }
  }

  // ADMIN만 드리프트 알림을 조회한다. 비관리자는 엔드포인트가 막혀 있어 자연히 제외된다.
  async function loadDriftAlerts() {
    if (!authStore.isLoggedIn || !authStore.isAdmin) {
      driftNotifications.value = [];
      return;
    }

    try {
      const alerts = await fetchMlflowDriftAlerts();
      driftNotifications.value = alerts.map((alert) => mapDriftAlert(alert, driftAckedIds.value));
    } catch {
      // 드리프트 조회 실패는 무시 — 병목 알림 표시는 유지
    }
  }

  async function markRead(notificationId: string) {
    if (!authStore.isLoggedIn) return;
    if (notificationId.startsWith(DRIFT_ID_PREFIX)) {
      const driftId = notificationId.slice(DRIFT_ID_PREFIX.length);
      driftAckedIds.value = new Set([...driftAckedIds.value, driftId]);
      saveDriftAckedIds(driftAckedIds.value);
      driftNotifications.value = driftNotifications.value.filter((notification) => notification.id !== notificationId);
      return;
    }

    const target = serverNotifications.value.find((notification) => notification.id === notificationId);
    if (!target || !target.unread) return;

    serverNotifications.value = serverNotifications.value.filter((notification) => notification.id !== notificationId);
    serverUnreadCount.value = Math.max(serverUnreadCount.value - 1, 0);

    try {
      await markNotificationsRead([notificationId]);
    } catch {
      serverNotifications.value = [target, ...serverNotifications.value].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      serverUnreadCount.value += 1;
    }
  }

  async function markAllRead() {
    if (!authStore.isLoggedIn || unreadCount.value === 0) return;

    const previousServerNotifications = serverNotifications.value;
    const previousServerUnreadCount = serverUnreadCount.value;
    const previousDriftNotifications = driftNotifications.value;
    const previousDriftAckedIds = new Set(driftAckedIds.value);

    const nextDriftAckedIds = new Set(driftAckedIds.value);
    for (const notification of driftNotifications.value) {
      if (notification.id.startsWith(DRIFT_ID_PREFIX)) {
        nextDriftAckedIds.add(notification.id.slice(DRIFT_ID_PREFIX.length));
      }
    }

    serverNotifications.value = [];
    serverUnreadCount.value = 0;
    driftAckedIds.value = nextDriftAckedIds;
    saveDriftAckedIds(driftAckedIds.value);
    driftNotifications.value = [];

    try {
      await markAllNotificationsRead();
    } catch {
      serverNotifications.value = previousServerNotifications;
      serverUnreadCount.value = previousServerUnreadCount;
      driftAckedIds.value = previousDriftAckedIds;
      saveDriftAckedIds(driftAckedIds.value);
      driftNotifications.value = previousDriftNotifications;
      errorMessage.value = '알림 전체 읽음 처리에 실패했습니다.';
    }
  }

  let eventSource: EventSource | null = null;

  function closeStream() {
    eventSource?.close();
    eventSource = null;
    streamConnected.value = false;
  }

  function resetNotifications() {
    closeStream();
    serverNotifications.value = [];
    driftNotifications.value = [];
    serverUnreadCount.value = 0;
    isLoading.value = false;
    errorMessage.value = null;
    streamError.value = false;
  }

  function connectStream() {
    if (!authStore.isLoggedIn) return;
    if (shouldUsePresentationScenario()) {
      streamConnected.value = true;
      streamError.value = false;
      return;
    }

    eventSource?.close();
    eventSource = createNotificationEventSource();

    eventSource.addEventListener('open', () => {
      streamConnected.value = true;
      streamError.value = false;
    });

    eventSource.addEventListener('notification', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as NotificationStreamEvent;
        const item = mapNotificationStreamEvent(payload);
        serverNotifications.value = [
          item,
          ...serverNotifications.value.filter((notification) => notification.id !== item.id),
        ].slice(0, 20);
        serverUnreadCount.value = payload.unreadCount ?? serverUnreadCount.value + 1;
        streamConnected.value = true;
        streamError.value = false;
        notificationPushTick.value += 1;
        if (payload.notificationType === 'MODEL_RETRAIN') {
          void loadDriftAlerts();
        }
      } catch {
        // 잘못된 SSE 페이로드는 무시 — 스트림 연결 유지
      }
    });

    eventSource.addEventListener('caseProgress', (event) => {
      try {
        latestCaseProgress.value = JSON.parse((event as MessageEvent).data);
      } catch {
        // 잘못된 페이로드 무시
      }
    });

    eventSource.onerror = () => {
      streamConnected.value = false;
      streamError.value = true;
      eventSource?.close();
      eventSource = null;
      setTimeout(() => {
        if (authStore.isLoggedIn && !eventSource) {
          connectStream();
        }
      }, 5000);
    };
  }

  onMounted(() => {
    if (!authStore.isLoggedIn) return;

    void loadNotifications();
    connectStream();
    void loadDriftAlerts();
  });

  watch(
    () => authStore.isLoggedIn,
    (isLoggedIn) => {
      if (!isLoggedIn) {
        resetNotifications();
        return;
      }

      void loadNotifications();
      connectStream();
      void loadDriftAlerts();
    }
  );

  onUnmounted(() => {
    closeStream();
  });

  return {
    notifications,
    unreadCount,
    bottleneckUnreadCount,
    latestCriticalUnread,
    isLoading,
    errorMessage,
    streamConnected,
    streamError,
    notificationPushTick,
    loadNotifications,
    markRead,
    markAllRead,
  };
}

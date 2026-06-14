import { createRouter, createWebHistory } from 'vue-router';

import { useAuthStore } from '@/stores/auth';

import { ROUTE_NAMES } from '@/constants/routes';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: { name: ROUTE_NAMES.dashboard },
    },
    {
      path: '/login',
      name: ROUTE_NAMES.login,
      component: () => import('@/views/LoginView.vue'),
      meta: { layout: 'empty', title: '로그인' },
    },
    {
      path: '/dashboard',
      name: ROUTE_NAMES.dashboard,
      component: () => import('@/views/DashboardView.vue'),
      meta: { title: '대시보드', requiresAuth: true },
    },
    {
      path: '/monitoring/bottlenecks',
      name: ROUTE_NAMES.bottleneckMonitoring,
      component: () => import('@/views/BottleneckMonitoringView.vue'),
      meta: { title: '병목 모니터링', requiresAuth: true },
    },
    {
      path: '/monitoring/mes',
      name: ROUTE_NAMES.mesMonitoring,
      component: () => import('@/views/MesMonitorView.vue'),
      meta: { title: 'MES 모니터링', requiresAuth: true },
    },
    {
      path: '/monitoring/machines',
      name: ROUTE_NAMES.machineMonitoring,
      component: () => import('@/views/MachineMonitorView.vue'),
      meta: { title: '장비 모니터링', requiresAuth: true },
    },
    {
      path: '/monitoring/fab-3d',
      name: ROUTE_NAMES.fab3d,
      component: () => import('@/views/Fab3dView.vue'),
      meta: { title: '3D FAB 뷰', requiresAuth: true },
    },
    {
      path: '/response/bottleneck-center',
      name: ROUTE_NAMES.bottleneckCenter,
      component: () => import('@/views/BncView.vue'),
      meta: { title: '병목 대응 센터', requiresAuth: true },
    },
    {
      path: '/reports/archive',
      name: ROUTE_NAMES.reportArchive,
      component: () => import('@/views/ActionHistoryView.vue'),
      meta: { title: '리포트 아카이브', requiresAuth: true },
    },
    {
      path: '/reports/action-history',
      name: ROUTE_NAMES.actionHistory,
      redirect: (to) => ({ name: ROUTE_NAMES.reportArchive, query: { ...to.query, reportType: 'ACTION' } }),
    },
    {
      path: '/ai/chatbot',
      name: ROUTE_NAMES.aiChatbot,
      redirect: (to) => ({ name: ROUTE_NAMES.dashboard, query: { ...to.query, chat: 'open' } }),
      meta: { title: 'AI 챗봇', requiresAuth: true },
    },
    {
      path: '/admin/thresholds',
      name: 'adminThresholds',
      component: () => import('@/views/AdminThresholdView.vue'),
      meta: { title: '임계값 관리', requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/mlflow',
      name: 'adminMlflow',
      component: () => import('@/views/AdminMlflowView.vue'),
      meta: { title: 'MLflow 모니터링', requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/access',
      name: 'adminAccess',
      component: () => import('@/views/AdminAccessView.vue'),
      meta: { title: '권한 관리', requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/mes-interface',
      name: 'adminMesInterface',
      component: () => import('@/views/AdminMesInterfaceView.vue'),
      meta: { title: 'MES 인터페이스', requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/prompts',
      name: 'adminPrompts',
      component: () => import('@/views/AdminPromptView.vue'),
      meta: { title: '프롬프트 관리', requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/admin/ingestion',
      name: 'adminIngestion',
      component: () => import('@/views/AdminIngestionView.vue'),
      meta: { title: '데이터 수집', requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: ROUTE_NAMES.notFound,
      component: () => import('@/views/NotFoundView.vue'),
      meta: { layout: 'empty', title: '페이지를 찾을 수 없습니다' },
    },
  ],
});

router.beforeEach(async (to) => {
  const authStore = useAuthStore();

  if (!authStore.authChecked) {
    await authStore.restoreSession();
  }

  if (to.name === ROUTE_NAMES.login && authStore.isLoggedIn) {
    return { name: ROUTE_NAMES.dashboard };
  }

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return { name: ROUTE_NAMES.login, query: { redirect: to.fullPath } };
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return { name: ROUTE_NAMES.dashboard };
  }

  return true;
});

export default router;

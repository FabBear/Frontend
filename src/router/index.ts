import { createRouter, createWebHistory } from 'vue-router';

import PlaceholderView from '@/views/PlaceholderView.vue';

const appRoutes = [
  { path: '/dashboard', name: 'dashboard', title: '대시보드' },
  { path: '/monitoring/bottlenecks', name: 'bottlenecks', title: '병목 모니터링' },
  { path: '/monitoring/mes', name: 'mesMonitoring', title: 'MES 모니터링' },
  { path: '/monitoring/machines', name: 'machineMonitoring', title: '장비 모니터링' },
  { path: '/monitoring/fab-3d', name: 'fab3d', title: '3D FAB 뷰' },
  { path: '/response/bottleneck-center', name: 'bottleneckCenter', title: '병목 대응 센터' },
  { path: '/reports/cause', name: 'causeReport', title: '원인 분석 리포트' },
  { path: '/reports/action-history', name: 'actionHistory', title: '대응 이력' },
  { path: '/ai/chatbot', name: 'aiChatbot', title: 'AI 챗봇' },
  { path: '/admin/thresholds', name: 'adminThresholds', title: '임계값 관리' },
  { path: '/admin/mlflow', name: 'adminMlflow', title: 'MLflow 모니터링' },
  { path: '/admin/access', name: 'adminAccess', title: '권한 관리' },
  { path: '/admin/sites', name: 'adminSites', title: '공장 관리' },
  { path: '/admin/mes-interface', name: 'adminMesInterface', title: 'MES 인터페이스' },
  { path: '/admin/prompts', name: 'adminPrompts', title: '프롬프트 관리' },
  { path: '/admin/ingestion', name: 'adminIngestion', title: '데이터 수집' },
  { path: '/admin/logs', name: 'adminLogs', title: '운영 로그' },
] as const;

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/login',
      name: 'login',
      component: PlaceholderView,
      meta: {
        layout: 'empty',
        title: '로그인',
      },
    },
    ...appRoutes.map((route) => ({
      path: route.path,
      name: route.name,
      component: PlaceholderView,
      meta: {
        title: route.title,
      },
    })),
  ],
});

export default router;

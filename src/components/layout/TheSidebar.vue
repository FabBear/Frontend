<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import {
  Activity,
  CalendarClock,
  ClipboardList,
  Factory,
  FileClock,
  Gauge,
  History,
  LayoutDashboard,
  LockKeyhole,
  MessagesSquare,
  ServerCog,
  Settings2,
  SlidersHorizontal,
  Wrench,
} from '@lucide/vue';

import { useAuthStore } from '@/stores/auth';

import type { NavSection } from '@/types/nav';

const props = withDefaults(
  defineProps<{
    // 안읽은 병목 알림(BOTTLENECK_CRITICAL) 수 — 병목 대응 센터 배지로 표시
    bottleneckUnreadCount?: number;
  }>(),
  { bottleneckUnreadCount: 0 }
);

const authStore = useAuthStore();

const BOTTLENECK_CENTER_PATH = '/response/bottleneck-center';

const navSections: NavSection[] = [
  {
    // 최상단 단독(카테고리 헤더 없음)
    items: [{ label: '대시보드', to: '/dashboard', icon: LayoutDashboard, code: 'DASHBOARD' }],
  },
  {
    title: '모니터링',
    items: [
      { label: '병목 모니터링', to: '/monitoring/bottlenecks', icon: Activity, code: 'MONITORING_BOTTLENECK' },
      { label: 'MES 모니터링', to: '/monitoring/mes', icon: ServerCog, code: 'MONITORING_MES' },
      { label: '장비 모니터링', to: '/monitoring/machines', icon: Wrench, code: 'MONITORING_TOOL' },
      {
        label: 'Lot 투입 계획',
        to: '/monitoring/lot-release-plan',
        icon: CalendarClock,
        code: 'MONITORING_LOT_RELEASE_PLAN',
      },
      { label: '3D FAB 뷰', to: '/monitoring/fab-3d', icon: Factory, code: 'MONITORING_3DFAB' },
    ],
  },
  {
    title: '대응 & 리포트',
    items: [
      { label: '병목 대응 센터', to: BOTTLENECK_CENTER_PATH, icon: Gauge, code: 'RESPONSE_CENTER' },
      { label: '리포트 아카이브', to: '/reports/archive', icon: History, code: 'REPORT_HISTORY' },
    ],
  },
  {
    title: '관리자 전용',
    adminOnly: true,
    items: [
      { label: '라벨링 기준 관리', to: '/admin/labeling-rules', icon: SlidersHorizontal, code: 'ADMIN_THRESHOLD' },
      { label: 'MLflow 모니터링', to: '/admin/mlflow', icon: ClipboardList, code: 'ADMIN_MLFLOW' },
      { label: '권한 관리', to: '/admin/access', icon: LockKeyhole, code: 'ADMIN_PERMISSION' },
      { label: 'MES 인터페이스', to: '/admin/mes-interface', icon: Settings2, code: 'ADMIN_MES' },
      { label: '프롬프트 관리', to: '/admin/prompts', icon: MessagesSquare, code: 'ADMIN_PROMPT' },
      { label: '데이터 수집', to: '/admin/ingestion', icon: FileClock, code: 'ADMIN_COLLECT' },
    ],
  },
];

const visibleNavSections = computed(() => {
  // 메뉴 API가 로드됐으면 menuCode 집합으로 노출 판단,
  // 미로드(최초 진입/오류)면 기존 역할 기반(adminOnly+isAdmin)으로 폴백 — 사이드바가 비지 않도록.
  const useMenuApi = authStore.menuCodes.size > 0;

  return navSections
    .filter((section) => useMenuApi || !section.adminOnly || authStore.isAdmin)
    .map((section) => ({
      ...section,
      items: section.items
        .filter((item) => !useMenuApi || !item.code || authStore.menuCodes.has(item.code))
        .map((item) =>
          item.to === BOTTLENECK_CENTER_PATH
            ? { ...item, badge: props.bottleneckUnreadCount > 0 ? String(props.bottleneckUnreadCount) : undefined }
            : item
        ),
    }))
    .filter((section) => section.items.length > 0);
});
</script>

<template>
  <aside class="the-sidebar" aria-label="Main navigation">
    <RouterLink class="the-sidebar__brand" to="/dashboard">
      <img class="the-sidebar__brand-symbol" src="@/assets/fabbear-symbol.svg" alt="" aria-hidden="true" />
      <img class="the-sidebar__brand-wordmark" src="@/assets/fabbear-wordmark.svg" alt="fabBear" />
    </RouterLink>

    <nav class="the-sidebar__nav">
      <section
        v-for="section in visibleNavSections"
        :key="section.title ?? section.items[0]?.to"
        class="the-sidebar__section"
      >
        <h2 v-if="section.title" class="the-sidebar__section-title">{{ section.title }}</h2>
        <RouterLink
          v-for="item in section.items"
          :key="item.to"
          class="the-sidebar__link"
          exact-active-class="the-sidebar__link--active"
          :to="item.to"
        >
          <component
            :is="item.icon"
            v-if="item.icon"
            class="the-sidebar__icon"
            :size="17"
            :stroke-width="2"
            aria-hidden="true"
          />
          <span class="the-sidebar__label">{{ item.label }}</span>
          <span v-if="item.badge" class="the-sidebar__badge">{{ item.badge }}</span>
        </RouterLink>
      </section>
    </nav>
  </aside>
</template>

<style scoped>
.the-sidebar {
  display: flex;
  flex-direction: column;
  width: var(--layout-sidebar-width);
  height: 100svh; /* 셸 높이에 고정 — 본문 스크롤과 무관하게 제자리 */
  border-right: var(--border-width-default) solid var(--color-border-default);
  background: var(--color-bg-surface);
  color: var(--color-fg);
}

.the-sidebar__brand {
  display: flex;
  height: var(--layout-header-height);
  align-items: center;
  gap: var(--space-2);
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
  padding: 0 var(--spacing-card);
  color: var(--color-action-primary);
  font-weight: var(--font-weight-extrabold);
}

.the-sidebar__brand-symbol {
  display: block;
  width: 48px;
  height: 48px;
  object-fit: contain;
  object-position: center;
  flex-shrink: 0;
}

.the-sidebar__brand-wordmark {
  display: block;
  width: min(132px, calc(100% - 44px));
  height: auto;
  object-fit: contain;
  object-position: left center;
}

.the-sidebar__nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto; /* 메뉴가 길어지면 브랜드는 고정, 메뉴만 내부 스크롤 */
  padding: var(--space-3) 0;
}

.the-sidebar__section {
  border-bottom: var(--border-width-default) solid var(--color-border-subtle);
  padding: var(--space-3) 0;
}

.the-sidebar__section-title {
  padding: 0 var(--spacing-card) var(--space-2);
  color: var(--color-fg-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
}

.the-sidebar__link {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border: var(--border-width-default) solid transparent;
  border-radius: var(--radius-md);
  padding: 8px var(--spacing-card);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
  transition:
    border-color 120ms,
    background 120ms,
    color 120ms,
    transform 160ms ease,
    box-shadow 160ms ease;
}

.the-sidebar__link:hover,
.the-sidebar__link:focus-visible {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
  transform: translateY(-2px);
  box-shadow: var(--shadow-panel);
  outline: none;
}

.the-sidebar__link--active {
  border-color: var(--color-action-primary-border);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
  transform: translateY(-2px);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-action-primary) 12%, transparent);
}

.the-sidebar__link--active::before {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 8px;
  width: 3px;
  border-radius: var(--radius-pill);
  background: var(--color-action-primary);
  content: '';
}

.the-sidebar__icon {
  width: 24px;
  flex-shrink: 0;
}

.the-sidebar__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.the-sidebar__badge {
  border-radius: var(--radius-pill);
  background: var(--color-status-danger);
  padding: 1px 7px;
  color: var(--color-text-inverse);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}
</style>

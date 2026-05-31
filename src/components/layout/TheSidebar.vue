<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import {
  Activity,
  Building2,
  ClipboardList,
  Factory,
  FileClock,
  FileSearch,
  Gauge,
  History,
  LayoutDashboard,
  LockKeyhole,
  MessagesSquare,
  ScrollText,
  ServerCog,
  Settings2,
  SlidersHorizontal,
  Wrench,
} from '@lucide/vue';

import { useAuthStore } from '@/stores/auth';

import type { NavSection } from '@/types/nav';

const authStore = useAuthStore();

const navSections: NavSection[] = [
  {
    title: '사용자 서비스',
    items: [
      { label: '대시보드', to: '/dashboard', icon: LayoutDashboard },
      { label: '병목 모니터링', to: '/monitoring/bottlenecks', icon: Activity },
      { label: 'MES 모니터링', to: '/monitoring/mes', icon: ServerCog },
      { label: '장비 모니터링', to: '/monitoring/machines', icon: Wrench },
      { label: '3D FAB 뷰', to: '/monitoring/fab-3d', icon: Factory },
      { label: '병목 대응 센터', to: '/response/bottleneck-center', icon: Gauge, badge: '3' },
      { label: '원인 분석 리포트', to: '/reports/cause', icon: FileSearch },
      { label: '대응 이력', to: '/reports/action-history', icon: History },
    ],
  },
  {
    title: '관리자',
    items: [
      { label: '임계값 관리', to: '/admin/thresholds', icon: SlidersHorizontal },
      { label: 'MLflow 모니터링', to: '/admin/mlflow', icon: ClipboardList },
      { label: '권한 관리', to: '/admin/access', icon: LockKeyhole },
      { label: '공장 관리', to: '/admin/sites', icon: Building2 },
      { label: 'MES 인터페이스', to: '/admin/mes-interface', icon: Settings2 },
      { label: '프롬프트 관리', to: '/admin/prompts', icon: MessagesSquare },
      { label: '데이터 수집', to: '/admin/ingestion', icon: FileClock },
      { label: '운영 로그', to: '/admin/logs', icon: ScrollText },
    ],
  },
];

const visibleNavSections = computed(() => {
  return navSections
    .map((section) => ({
      ...section,
      items: section.title === '관리자' && !authStore.isAdmin ? [] : section.items,
    }))
    .filter((section) => section.items.length > 0);
});
</script>

<template>
  <aside class="the-sidebar" aria-label="Main navigation">
    <RouterLink class="the-sidebar__brand" to="/dashboard">
      <span class="the-sidebar__logo">FB</span>
      <span>fabBear</span>
    </RouterLink>

    <nav class="the-sidebar__nav">
      <section v-for="section in visibleNavSections" :key="section.title" class="the-sidebar__section">
        <h2 class="the-sidebar__section-title">{{ section.title }}</h2>
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
  width: var(--layout-sidebar-width);
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

.the-sidebar__logo {
  display: inline-grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: var(--radius-md);
  background: var(--color-action-primary-soft);
  font-size: var(--font-size-sm);
}

.the-sidebar__nav {
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
  display: flex;
  align-items: center;
  gap: var(--space-2);
  border-left: var(--border-width-thick) solid transparent;
  padding: 8px var(--spacing-card);
  color: var(--color-fg-muted);
  font-size: var(--font-size-sm);
}

.the-sidebar__link:hover,
.the-sidebar__link--active {
  border-left-color: var(--color-action-primary);
  background: var(--color-action-primary-soft);
  color: var(--color-action-primary);
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

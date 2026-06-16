import type { Component } from 'vue';

export interface NavItem {
  label: string;
  to: string;
  icon?: Component;
  badge?: string;
  // 백엔드 메뉴 코드(tm_menu.menu_code) — /auth/menus 응답으로 노출 여부 결정
  code?: string;
}

export interface NavSection {
  title?: string;
  adminOnly?: boolean;
  items: NavItem[];
}

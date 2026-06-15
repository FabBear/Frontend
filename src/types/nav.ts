import type { Component } from 'vue';

export interface NavItem {
  label: string;
  to: string;
  icon?: Component;
  badge?: string;
}

export interface NavSection {
  title?: string;
  adminOnly?: boolean;
  items: NavItem[];
}

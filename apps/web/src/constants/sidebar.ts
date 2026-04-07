import { Home, Settings } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface SidebarItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const sidebarItems: SidebarItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    icon: Home,
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: Settings,
  },
];

export const projectStatusVariants = {
  empty: {
    color: '#888',
    text: 'No projects',
  },
  draft: {
    color: '#ff6b35',
    text: 'Draft',
  },
  active: {
    color: '#10b981',
    text: 'Active',
  },
  completed: {
    color: '#3b82f6',
    text: 'Completed',
  },
};

export const sidebarItems = [
  {
    path: '/',
    label: 'Dashboard',
    icon: '📊',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: '⚙️',
  },
  // Will be added when user opens a project:
  // {
  //   path: '/project/:projectId/editor',
  //   label: 'Editor',
  //   icon: '✏️',
  // },
  // {
  //   path: '/project/:projectId/ai',
  //   label: 'AI Command',
  //   icon: '🤖',
  // },
  // {
  //   path: '/project/:projectId/assets',
  //   label: 'Asset Studio',
  //   icon: '🎨',
  // },
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
    color: '#4CAF50',
    text: 'Active',
  },
  completed: {
    color: '#2196F3',
    text: 'Completed',
  },
};

export const quickActionOptions = [
  {
    id: 'new-project',
    label: 'New Project',
    icon: '➕',
    description: 'Start a new game project',
  },
  {
    id: 'open-project',
    label: 'Open Project',
    icon: '📁',
    description: 'Open existing project',
  },
  {
    id: 'examples',
    label: 'Examples',
    icon: '📚',
    description: 'Browse sample templates',
  },
];

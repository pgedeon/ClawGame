import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { FileCode, Bot, Palette, Play } from 'lucide-react';
import { api, type ProjectListItem } from '../api/client';
import { sidebarItems } from '../constants/sidebar';

interface SidebarNavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState<ProjectListItem | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we're in a project context
  const isInProjectContext = location.pathname.startsWith('/project/');
  const projectId = isInProjectContext ? location.pathname.split('/')[2] : null;

  useEffect(() => {
    if (isInProjectContext) {
      loadProjects();
    }
  }, [isInProjectContext]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectList = await api.listProjects();
      setProjects(projectList);

      if (projectId) {
        const project = projectList.find(p => p.id === projectId);
        setCurrentProject(project || null);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const dynamicSidebarItems: SidebarNavItem[] = [...sidebarItems] as SidebarNavItem[];

  // Add project-specific navigation when in project context
  if (isInProjectContext && projectId) {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      dynamicSidebarItems.push(
        {
          path: `/project/${projectId}/editor`,
          label: 'Editor',
          icon: FileCode,
        },
        {
          path: `/project/${projectId}/ai`,
          label: 'AI Command',
          icon: Bot,
        },
        {
          path: `/project/${projectId}/assets`,
          label: 'Asset Studio',
          icon: Palette,
        },
        {
          path: `/project/${projectId}/preview`,
          label: 'Game Preview',
          icon: Play,
        },
      );
    }
  }

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>🎮 ClawGame</h1>
          {currentProject && (
            <p className="sidebar-project-name">
              {currentProject.name}
            </p>
          )}
        </div>

        <div className="sidebar-nav">
          {dynamicSidebarItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={20} className="nav-icon" />
                <span className="nav-text">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <main className="main-content">
        {children || <Outlet />}
      </main>
    </div>
  );
}

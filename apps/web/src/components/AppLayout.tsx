import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { api, type ProjectListItem } from '../api/client';
import { sidebarItems } from '../constants/sidebar';

interface AppLayoutProps {
  children?: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState<ProjectListItem | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we're in a project context
  const isInProjectContext = location.pathname.startsWith('/project/');
  const projectId = isInProjectContext ? location.pathname.split('/')[2] : null;

  useEffect(() => {
    // Only load projects if we're in project context
    if (isInProjectContext) {
      loadProjects();
    }
  }, [isInProjectContext]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectList = await api.listProjects();
      setProjects(projectList);
      
      // Set current project
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

  const dynamicSidebarItems = [...sidebarItems];
  
  // Add project-specific navigation when in project context
  if (isInProjectContext) {
    const project = projects.find(p => p.id === projectId);
    if (project) {
      // Insert project items after settings
      const settingsIndex = dynamicSidebarItems.findIndex(item => item.path === '/settings');
      if (settingsIndex !== -1) {
        const projectItems = [
          {
            path: `/project/${projectId}/editor`,
            label: 'Editor',
            icon: '✏️',
          },
          {
            path: `/project/${projectId}/ai`,
            label: 'AI Command',
            icon: '🤖',
          },
          {
            path: `/project/${projectId}/assets`,
            label: 'Asset Studio',
            icon: '🎨',
          },
        ];
        
        dynamicSidebarItems.splice(settingsIndex + 1, 0, ...projectItems);
      }
    }
  }

  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="sidebar-header">
          <h1>🎮 ClawGame</h1>
          {currentProject && (
            <p style={{ fontSize: '0.8rem', opacity: 0.8, marginTop: '0.25rem' }}>
              {currentProject.name}
            </p>
          )}
        </div>
        
        <div className="sidebar-nav">
          {dynamicSidebarItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            // Check if this is a project route and we're in project context
            const isProjectRoute = item.path.includes('/project/:projectId/');
            if (isProjectRoute && projectId) {
              const itemWithId = item.path.replace(':projectId', projectId);
              return (
                <Link
                  key={item.path}
                  to={itemWithId}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.label}</span>
                </Link>
              );
            }
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
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
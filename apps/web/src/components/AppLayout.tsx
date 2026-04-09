import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { FileCode, Bot, Palette, Play, Layers, ArrowLeft, StickyNote } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api, type ProjectListItem } from '../api/client';
import { sidebarItems } from '../constants/sidebar';
import { ToastProvider, ToastList } from './Toast';
import { AIFAB } from './AIFAB';
import { CommandPalette, useCommandPaletteToggle } from './CommandPalette';
import { SkipLink } from './SkipLink';
import { ProjectNotesPanel } from './ProjectNotesPanel';
import { logger } from '../utils/logger';
import '../project-notes.css';

interface SidebarNavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export function AppLayout({ children }: { children?: React.ReactNode }) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState<ProjectListItem | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Check if we're in a project context
  const isInProjectContext = location.pathname.startsWith('/project/');
  const projectId = isInProjectContext ? location.pathname.split('/')[2] : null;

  // Command palette
  const cmdPalette = useCommandPaletteToggle();

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
      logger.error('Error loading projects:', err);
    } finally {
      setLoading(false);
    }
  };

  // Project-specific navigation items
  const projectNavItems: SidebarNavItem[] = isInProjectContext && projectId ? [
    { path: `/project/${projectId}/editor`, label: 'Code Editor', icon: FileCode },
    { path: `/project/${projectId}/scene-editor`, label: 'Scene Editor', icon: Layers },
    { path: `/project/${projectId}/ai`, label: 'AI Command', icon: Bot },
    { path: `/project/${projectId}/assets`, label: 'Asset Studio', icon: Palette },
    { path: `/project/${projectId}/preview`, label: 'Game Preview', icon: Play },
  ] : [];

  return (
    <ToastProvider>
      <div className="app-layout">
        {/* Skip link for accessibility */}
        <SkipLink />

        <nav className="sidebar" role="navigation" aria-label="Main navigation">
          <div className="sidebar-header">
            <h1>🎮 ClawGame</h1>
            {!isInProjectContext && currentProject && (
              <p className="sidebar-project-name">
                {currentProject.name}
              </p>
            )}
            <button
              className="sidebar-cmd-btn"
              onClick={cmdPalette.open}
              title="Command Palette (Ctrl+K)"
            >
              <span className="sidebar-cmd-text">Search...</span>
              <kbd>⌘K</kbd>
            </button>
          </div>

          <div className="sidebar-nav">
            {isInProjectContext && currentProject && (
              <>
                {/* Project context indicator */}
                <div className="sidebar-project-context">
                  <span className="project-context-dot" />
                  <span className="project-context-name" title={currentProject.name}>
                    {currentProject.name}
                  </span>
                </div>

                {/* Project navigation */}
                {projectNavItems.map((item) => {
                  const isActive = location.pathname === item.path ||
                    (item.path !== '/' && location.pathname.startsWith(item.path));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      role="menuitem"
                    >
                      <Icon size={20} className="nav-icon" />
                      <span className="nav-text">{item.label}</span>
                    </Link>
                  );
                })}

                {/* Notes toggle */}
                <button
                  className={`nav-item ${showNotes ? 'active' : ''}`}
                  onClick={() => setShowNotes(!showNotes)}
                  role="menuitem"
                  style={{ background: 'none', border: 'none', width: '100%', cursor: 'pointer' }}
                >
                  <StickyNote size={20} className="nav-icon" />
                  <span className="nav-text">Notes</span>
                </button>

                {/* Back to projects */}
                <div className="sidebar-section-title" />
                <Link to="/" className="sidebar-back-link" role="menuitem">
                  <ArrowLeft size={18} />
                  <span>All Projects</span>
                </Link>
              </>
            ) || sidebarItems.map((item) => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  role="menuitem"
                >
                  <Icon size={20} className="nav-icon" />
                  <span className="nav-text">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <main className="main-content" id="main-content" role="main">
          {children || <Outlet />}
        </main>

        {/* Project Notes Panel — slides in from right */}
        {showNotes && projectId && (
          <div className="project-notes-panel">
            <ProjectNotesPanel projectId={projectId} />
          </div>
        )}

        {/* Floating AI button — visible on project pages */}
        {isInProjectContext && (
          <AIFAB projectId={projectId || undefined} pageContext={location.pathname.split("/").pop() || ""} />
        )}

        {/* Command Palette — global */}
        <CommandPalette
          isOpen={cmdPalette.isOpen}
          onClose={cmdPalette.close}
          projectId={projectId || undefined}
        />
      </div>
      <ToastList />
    </ToastProvider>
  );
}

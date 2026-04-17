import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { FileCode, Bot, Palette, Play, Layers, ArrowLeft, StickyNote, Settings, GitBranch } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api, type ProjectListItem } from '../api/client';
import { sidebarItems } from '../constants/sidebar';
import { ToastProvider, ToastList } from './Toast';
import { AISidePanel } from './AISidePanel';
import { CommandPalette, useCommandPaletteToggle } from './CommandPalette';
import { SkipLink } from './SkipLink';
import { ProjectNotesPanel } from './ProjectNotesPanel';
import { logger } from '../utils/logger';
import '../project-notes.css';
import '../ai-sidepanel.css';

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

  // Get current page context and selection state
  const getPageContext = () => {
    const pathParts = location.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1];
    
    // Context mappings for different pages
    const contextMap: Record<string, string> = {
      'editor': 'Code Editor',
      'scene-editor': 'Scene Editor', 
      'behavior-graph': 'Behavior Graph',
      'ai': 'AI Command',
      'assets': 'Asset Studio',
      'preview': 'Game Preview',
      'ai-settings': 'AI Settings'
    };
    
    return contextMap[lastPart] || lastPart || 'Dashboard';
  };

  // Project-specific navigation items
  const projectNavItems: SidebarNavItem[] = isInProjectContext && projectId ? [
    { path: `/project/${projectId}/editor`, label: 'Code Editor', icon: FileCode },
    { path: `/project/${projectId}/scene-editor`, label: 'Scene Editor', icon: Layers },
    { path: `/project/${projectId}/behavior-graph`, label: 'Behavior Graph', icon: GitBranch },
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

                <Link to={`/project/${projectId}/ai-settings`} className="nav-item" role="menuitem">
                  <Settings size={20} className="nav-icon" />
                  <span className="nav-text">AI Settings</span>
                </Link>

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

        {/* AI Side Panel — persistent on project pages */}
        {isInProjectContext && (
          <AISidePanel
            projectId={projectId || undefined}
            pageContext={getPageContext()}
            selectedCode={getSelectedCode()}
            currentFile={getCurrentFile()}
            selectedEntities={getSelectedEntities()}
          />
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

  // Helper functions to get current context
  function getSelectedCode(): string | undefined {
    // This would be implemented based on current editor selection
    // For now, return undefined
    return undefined;
  }

  function getCurrentFile(): string | undefined {
    // This would be implemented based on current file in editor
    // For now, return undefined
    return undefined;
  }

  function getSelectedEntities(): string[] | undefined {
    // This would be implemented based on scene editor selection
    // For now, return undefined
    return undefined;
  }
}
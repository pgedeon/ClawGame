/**
 * @clawgame/web - Project Hub Page
 * Game development studio workspace with tabbed interface
 */

import React, { useState, useEffect } from 'react';
import { useParams, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, type ProjectDetail } from '../api/client';
import {
  Layers,
  Code,
  Bot,
  Palette,
  Play,
  ArrowLeft,
  Settings,
  Sparkles,
  ChevronRight,
  Gamepad2,
  Download,
} from 'lucide-react';
import '../game-hub.css';
import { logger } from '../utils/logger';
import { WelcomeModal } from '../components/WelcomeModal';

interface ProjectTab {
  id: string;
  path: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId]);

  const loadProject = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const projectData = await api.getProject(id);
      setProject(projectData);
    } catch (err) {
      logger.error('Error loading project:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  if (!projectId) {
    return (
      <div className="project-hub">
        <div className="error-state">
          <div className="error-icon">🎮</div>
          <h3>No Project Selected</h3>
          <p>Please open a project first.</p>
          <Link to="/" className="primary-button">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="project-hub">
        <div className="project-hub-loading">
          <div className="project-hub-spinner" />
          <p>Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="project-hub">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>{error || 'Project not found'}</h3>
          <Link to="/" className="primary-button">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const tabs: ProjectTab[] = [
    {
      id: 'overview',
      path: `/project/${projectId}`,
      label: 'Overview',
      icon: <Gamepad2 size={18} />,
      description: 'Project dashboard',
    },
    {
      id: 'scene-editor',
      path: `/project/${projectId}/scene-editor`,
      label: 'Scene Editor',
      icon: <Layers size={18} />,
      description: 'Visual scene editing',
    },
    {
      id: 'editor',
      path: `/project/${projectId}/editor`,
      label: 'Code Editor',
      icon: <Code size={18} />,
      description: 'Edit game scripts',
    },
    {
      id: 'ai',
      path: `/project/${projectId}/ai`,
      label: 'AI Command',
      icon: <Bot size={18} />,
      description: 'AI-powered development',
    },
    {
      id: 'assets',
      path: `/project/${projectId}/assets`,
      label: 'Assets',
      icon: <Palette size={18} />,
      description: 'Asset management',
    },
    {
      id: 'preview',
      path: `/project/${projectId}/preview`,
      label: 'Play',
      icon: <Play size={18} />,
      description: 'Run your game',
    },
    {
      id: 'export',
      path: `/project/${projectId}/export`,
      label: 'Export',
      icon: <Download size={18} />,
      description: 'Export to HTML',
    },
  ];

  // Determine active tab
  const activeTab = tabs.find(
    (tab) => tab.path === location.pathname || (tab.id !== 'overview' && location.pathname.startsWith(tab.path))
  ) || tabs[0];

  const isOverviewPage = location.pathname === `/project/${projectId}`;

  return (
    <div className="project-hub">
      {/* Project Header Bar */}
      <header className="project-hub-header">
        <div className="project-hub-header-left">
          <Link to="/" className="project-hub-back" title="Back to Dashboard">
            <ArrowLeft size={18} />
          </Link>
          <div className="project-hub-title">
            <h1>{project.name}</h1>
            <div className="project-hub-meta">
              <span className="project-hub-genre">{project.genre}</span>
              <span className="project-hub-separator">•</span>
              <span className="project-hub-art">{project.artStyle}</span>
              <span className="project-hub-separator">•</span>
              <span className={`project-hub-status status-${project.status}`}>
                {project.status}
              </span>
            </div>
          </div>
        </div>

        <div className="project-hub-header-right">
          <button
            className="project-hub-play-btn"
            onClick={() => navigate(`/project/${projectId}/preview`)}
            title="Play Game"
          >
            <Play size={16} />
            <span>Play</span>
          </button>
        </div>
      </header>

      {/* Tab Bar */}
      <nav className="project-hub-tabs">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            to={tab.path}
            className={`project-hub-tab ${activeTab.id === tab.id ? 'active' : ''}`}
            title={tab.description}
          >
            <span className="project-hub-tab-icon">{tab.icon}</span>
            <span className="project-hub-tab-label">{tab.label}</span>
          </Link>
        ))}
      </nav>

      {/* Tab Content */}
      <div className="project-hub-content">
        {isOverviewPage ? (
          <ProjectOverview project={project} projectId={projectId} />
        ) : (
          <Outlet />
        )}
      </div>

      {/* Welcome Modal for new projects */}
      <WelcomeModal projectId={projectId} projectName={project.name} />
    </div>
  );
}

/* ─── Overview Sub-Component ─── */

function ProjectOverview({ project, projectId }: { project: ProjectDetail; projectId: string }) {
  const navigate = useNavigate();

  const quickActions = [
    {
      label: 'Edit Scenes',
      description: 'Visual 2D scene editor with drag-and-drop entity placement',
      icon: <Layers size={28} />,
      path: `/project/${projectId}/scene-editor`,
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    },
    {
      label: 'AI Command',
      description: 'Describe what you want and let AI generate code',
      icon: <Sparkles size={28} />,
      path: `/project/${projectId}/ai`,
      color: '#06b6d4',
      gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)',
      badge: 'AI-Powered',
    },
    {
      label: 'Code Editor',
      description: 'Full code workspace with syntax highlighting and file management',
      icon: <Code size={28} />,
      path: `/project/${projectId}/editor`,
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981, #059669)',
    },
    {
      label: 'Asset Studio',
      description: 'Generate and manage game assets with AI assistance',
      icon: <Palette size={28} />,
      path: `/project/${projectId}/assets`,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)',
      badge: 'New',
    },
    {
      label: 'Play Game',
      description: 'Run and test your game in built-in preview',
      icon: <Play size={28} />,
      path: `/project/${projectId}/preview`,
      color: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444, #dc2626)',
    },
    {
      label: 'Export Game',
      description: 'Export your game as a standalone HTML file',
      icon: <Download size={28} />,
      path: `/project/${projectId}/export`,
      color: '#8b5cf6',
      gradient: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      badge: 'New',
    },
  ];

  return (
    <div className="project-overview-page">
      {/* AI Quick Prompt */}
      <div className="project-ai-quick">
        <div className="project-ai-quick-inner">
          <Bot size={20} className="project-ai-quick-icon" />
          <span className="project-ai-quick-text">
            Ask AI to build something — press <kbd>⌘K</kbd> or{' '}
            <button
              className="project-ai-quick-link"
              onClick={() => navigate(`/project/${projectId}/ai`)}
            >
              open AI Command →
            </button>
          </span>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="project-overview-actions">
        {quickActions.map((action) => (
          <button
            key={action.label}
            className="project-overview-card"
            onClick={() => navigate(action.path)}
            style={{ '--card-accent': action.color } as React.CSSProperties}
          >
            <div className="project-overview-card-icon" style={{ background: action.gradient }}>
              {action.icon}
            </div>
            <div className="project-overview-card-content">
              <div className="project-overview-card-header">
                <h3>{action.label}</h3>
                {action.badge && (
                  <span className={`project-overview-card-badge ${action.badge === 'Coming Soon' ? 'badge-soon' : 'badge-ai'}`}>
                    {action.badge}
                  </span>
                )}
              </div>
              <p>{action.description}</p>
            </div>
            <ChevronRight size={18} className="project-overview-card-chevron" />
          </button>
        ))}
      </div>

      {/* Project Stats */}
      <div className="project-overview-stats">
        <div className="project-stat">
          <span className="project-stat-value">{project.sceneCount}</span>
          <span className="project-stat-label">Scenes</span>
        </div>
        <div className="project-stat">
          <span className="project-stat-value">{project.entityCount}</span>
          <span className="project-stat-label">Entities</span>
        </div>
        <div className="project-stat">
          <span className="project-stat-value">{project.engine.runtimeTarget}</span>
          <span className="project-stat-label">Runtime</span>
        </div>
        <div className="project-stat">
          <span className="project-stat-value">{project.engine.renderBackend}</span>
          <span className="project-stat-label">Renderer</span>
        </div>
        <div className="project-stat">
          <span className="project-stat-value">v{project.version}</span>
          <span className="project-stat-label">Version</span>
        </div>
      </div>

      {/* Project Description */}
      {project.description && (
        <div className="project-overview-description">
          <h3>About this project</h3>
          <p>{project.description}</p>
        </div>
      )}

      {/* Engine Config */}
      <details className="project-overview-engine">
        <summary>Engine Configuration</summary>
        <div className="project-overview-engine-grid">
          <div className="engine-config-item">
            <span className="engine-config-label">Engine Version</span>
            <span className="engine-config-value">{project.engine.version}</span>
          </div>
          <div className="engine-config-item">
            <span className="engine-config-label">Runtime Target</span>
            <span className="engine-config-value">{project.engine.runtimeTarget}</span>
          </div>
          <div className="engine-config-item">
            <span className="engine-config-label">Render Backend</span>
            <span className="engine-config-value">{project.engine.renderBackend}</span>
          </div>
        </div>
      </details>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, FolderOpen, BookOpen, Sparkles, Terminal, Zap } from 'lucide-react';
import { api, type ProjectListItem } from '../api/client';

// Helper function to safely format dates
function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return 'Unknown';
  
  try {
    const date = new Date(dateString);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Unknown';
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (error) {
    return 'Unknown';
  }
}

export function DashboardPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectList = await api.listProjects();
      setProjects(projectList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">
          <div className="dashboard-loading-spinner" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h3>Failed to load projects</h3>
          <p>{error}</p>
          <button onClick={loadProjects} className="error-retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* AI Hero Section */}
      <section className="dashboard-hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            <span>AI-Native Platform</span>
          </div>
          <h1>Build Games with AI</h1>
          <p className="hero-subtitle">
            Describe your game idea, and let AI generate the code. Edit, preview, and ship — all in the browser.
          </p>
          <div className="hero-actions">
            <Link to="/create-project" className="hero-cta-primary">
              <PlusCircle size={18} />
              New Project
            </Link>
            <button
              className="hero-cta-secondary"
              onClick={() => {
                const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true });
                document.dispatchEvent(event);
              }}
            >
              <Terminal size={18} />
              Try AI Command <kbd>⌘K</kbd>
            </button>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>
      </section>

      {/* Quick Actions */}
      <section className="dashboard-section">
        <h2 className="section-title">Quick Actions</h2>
        <div className="action-grid">
          <Link to="/create-project" className="action-card primary">
            <PlusCircle size={24} className="action-icon-svg" />
            <h3 className="action-title">New Project</h3>
            <p className="action-description">Start a new game project with AI assistance</p>
            <span className="action-badge">AI-Powered</span>
          </Link>
          <Link to="/open-project" className="action-card">
            <FolderOpen size={24} className="action-icon-svg" />
            <h3 className="action-title">Open Project</h3>
            <p className="action-description">Continue working on an existing game</p>
          </Link>
          <Link to="/examples" className="action-card">
            <BookOpen size={24} className="action-icon-svg" />
            <h3 className="action-title">Examples</h3>
            <p className="action-description">Browse sample game templates</p>
          </Link>
        </div>
      </section>

      {/* Projects List */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Your Projects</h2>
          {projects.length > 0 && (
            <Link to="/create-project" className="section-action">
              <PlusCircle size={16} />
              New
            </Link>
          )}
        </div>

        {projects.length === 0 ? (
          <div className="projects-empty">
            <div className="empty-icon">🎮</div>
            <h3>No projects yet</h3>
            <p>Create your first game and let AI help you build it!</p>
            <Link to="/create-project" className="cta-button">
              <PlusCircle size={16} />
              Create Your First Game
            </Link>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="project-card"
              >
                <div className="project-card-header">
                  <h3 className="project-name">{project.name}</h3>
                  <span className={`project-status ${project.status}`}>
                    {project.status}
                  </span>
                </div>
                <div className="project-card-meta">
                  <span className="project-genre-tag">{project.genre}</span>
                  <span className="project-art-tag">{project.artStyle}</span>
                </div>
                <div className="project-card-footer">
                  <span className="project-date">
                    {formatDate(project.updatedAt)}
                  </span>
                  <span className="project-open-link">Open →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* AI Tips */}
      <section className="dashboard-section ai-tips-section">
        <div className="ai-tip">
          <Zap size={18} className="ai-tip-icon" />
          <div>
            <strong>Pro tip:</strong> Press <kbd>⌘K</kbd> anywhere to open the AI command palette.
            Ask it to generate code, explain errors, or refactor your game logic.
          </div>
        </div>
      </section>
    </div>
  );
}

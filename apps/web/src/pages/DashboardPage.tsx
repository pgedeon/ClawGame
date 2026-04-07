import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, FolderOpen, BookOpen } from 'lucide-react';
import { api, type ProjectListItem } from '../api/client';

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
      console.error('Error loading projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const quickActionLinks = [
    {
      to: '/create-project',
      label: 'New Project',
      icon: PlusCircle,
      description: 'Start a new game project with AI assistance',
      primary: true,
    },
    {
      to: '/open-project',
      label: 'Open Project',
      icon: FolderOpen,
      description: 'Open an existing project',
      primary: false,
    },
    {
      to: '/examples',
      label: 'Examples',
      icon: BookOpen,
      description: 'Browse sample game templates',
      primary: false,
    },
  ];

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading" style={{ textAlign: 'center', padding: '4rem' }}>
          Loading dashboard...
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
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Manage your ClawGame projects</p>
      </header>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-grid">
          {quickActionLinks.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className={`action-card ${action.primary ? 'primary' : ''}`}
              >
                <Icon size={28} className="action-icon-svg" />
                <h3 className="action-title">{action.label}</h3>
                <p className="action-description">{action.description}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="projects-section">
        <h2>Your Projects</h2>
        {projects.length === 0 ? (
          <div className="projects-empty">
            <div className="empty-icon">🎮</div>
            <h3>No projects yet</h3>
            <p>Create your first game project and let AI help you build it!</p>
            <Link to="/create-project" className="cta-button">
              <PlusCircle size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Create Your First Game
            </Link>
          </div>
        ) : (
          <div className="projects-list">
            {projects.map((project) => (
              <Link
                key={project.id}
                to={`/project/${project.id}`}
                className="project-card"
              >
                <div className="project-header">
                  <h3 className="project-name">{project.name}</h3>
                  <span className={`project-status ${project.status}`}>
                    {project.status}
                  </span>
                </div>
                <div className="project-details">
                  <p className="project-type">
                    {project.genre} • {project.artStyle}
                  </p>
                  <p className="project-date">
                    Last modified: {new Date(project.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="project-actions">
                  <span className="open-icon">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

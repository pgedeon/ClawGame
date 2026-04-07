import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
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
      icon: '➕',
      description: 'Start a new game project',
    },
    {
      to: '/open-project',
      label: 'Open Project',
      icon: '📁',
      description: 'Open existing project',
    },
    {
      to: '/examples',
      label: 'Examples',
      icon: '📚',
      description: 'Browse sample templates',
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
        <div className="error" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#d32f2f', marginBottom: '1rem' }}>{error}</p>
          <button 
            onClick={loadProjects}
            className="primary-button"
          >
            Retry
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
          {quickActionLinks.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="action-card"
            >
              <span className="action-icon">{action.icon}</span>
              <h3 className="action-title">{action.label}</h3>
              <p className="action-description">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="projects-section">
        <h2>Your Projects</h2>
        {projects.length === 0 ? (
          <div className="projects-empty">
            <p>No projects yet. Create your first game project!</p>
            <div className="demo-create">
              <p className="demo-hint">Or try our demo:</p>
              <Link to="/project/demo-project-123" className="cta-button">
                View Demo Project
              </Link>
            </div>
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
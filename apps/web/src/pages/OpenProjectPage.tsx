import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, type ProjectListItem } from '../api/client';

export function OpenProjectPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const getProjectStatusClass = (status: string) => {
    switch (status) {
      case 'active': return 'active';
      case 'draft': return 'draft';
      case 'completed': return 'completed';
      default: return '';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="open-project-page">
        <header className="page-header">
          <Link to="/" className="back-link">← Back to Dashboard</Link>
          <h1>Open Project</h1>
          <p>Loading projects...</p>
        </header>
        <div className="loading" style={{ textAlign: 'center', padding: '2rem' }}>
          Loading your projects...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="open-project-page">
        <header className="page-header">
          <Link to="/" className="back-link">← Back to Dashboard</Link>
          <h1>Open Project</h1>
          <p>Error loading projects</p>
        </header>
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
    <div className="open-project-page">
      <header className="page-header">
        <Link to="/" className="back-link">← Back to Dashboard</Link>
        <h1>Open Project</h1>
        <p>Select a project to continue working</p>
      </header>

      {projects.length === 0 ? (
        <div className="empty-state">
          <p>No projects found.</p>
          <Link to="/create-project" className="cta-button">
            Create Your First Project
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
                <span className={`project-status ${getProjectStatusClass(project.status)}`}>
                  {project.status}
                </span>
              </div>
              <div className="project-details">
                <p className="project-type">
                  {project.genre} • {project.artStyle}
                </p>
                <p className="project-date">
                  Last modified: {formatDate(project.updatedAt)}
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
  );
}
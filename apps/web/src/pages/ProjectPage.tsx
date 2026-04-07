import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, type ProjectDetail } from '../api/client';

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      console.error('Error loading project:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="project-page">
        <div className="loading" style={{ textAlign: 'center', padding: '4rem' }}>
          Loading project...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-page">
        <div className="error" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#d32f2f', marginBottom: '1rem' }}>{error}</p>
          <Link to="/" className="primary-button">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-page">
        <header className="page-header">
          <h1>Project Not Found</h1>
          <p>The requested project could not be found.</p>
        </header>
        <div className="project-empty">
          <Link to="/" className="cta-button">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="project-page">
      <header className="page-header">
        <Link to="/" className="back-link">← Back to Dashboard</Link>
        <h1>{project.name}</h1>
        <p>Project dashboard and controls</p>
      </header>

      <div className="project-overview">
        <div className="project-info">
          <div className="info-grid">
            <div className="info-item">
              <label>Genre:</label>
              <span>{project.genre}</span>
            </div>
            <div className="info-item">
              <label>Art Style:</label>
              <span>{project.artStyle}</span>
            </div>
            <div className="info-item">
              <label>Status:</label>
              <span className={`status-${project.status}`}>{project.status}</span>
            </div>
            <div className="info-item">
              <label>Version:</label>
              <span>{project.version}</span>
            </div>
          </div>

          {project.description && (
            <div className="project-description">
              <h3>Description</h3>
              <p>{project.description}</p>
            </div>
          )}

          <div className="project-stats">
            <h3>Project Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Scenes:</span>
                <span className="stat-value">{project.sceneCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Entities:</span>
                <span className="stat-value">{project.entityCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Created:</span>
                <span className="stat-value">
                  {new Date(project.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Updated:</span>
                <span className="stat-value">
                  {new Date(project.updatedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="engine-info">
            <h3>Engine Configuration</h3>
            <div className="engine-grid">
              <div className="engine-item">
                <span className="engine-label">Runtime Target:</span>
                <span className="engine-value">{project.engine.runtimeTarget}</span>
              </div>
              <div className="engine-item">
                <span className="engine-label">Render Backend:</span>
                <span className="engine-value">{project.engine.renderBackend}</span>
              </div>
              <div className="engine-item">
                <span className="engine-label">Engine Version:</span>
                <span className="engine-value">{project.engine.version}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="project-actions">
          <h3>Project Actions</h3>
          <div className="action-buttons">
            <Link to={`/project/${project.id}/editor`} className="primary-button">
              Open Editor
            </Link>
            <Link to={`/project/${project.id}/ai`} className="secondary-button">
              AI Command
            </Link>
            <Link to={`/project/${project.id}/assets`} className="secondary-button">
              Asset Studio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
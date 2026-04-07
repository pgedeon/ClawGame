import React from 'react';
import { Link } from 'react-router-dom';

export function OpenProjectPage() {
  // Mock projects data (would come from API)
  const mockProjects = [
    {
      id: 'demo-project-123',
      name: 'Demo Platformer',
      type: '2d-platformer',
      status: 'active',
      lastModified: '2026-04-07',
    },
    {
      id: 'pixel-adventure', 
      name: 'Pixel Adventure',
      type: 'top-down-action',
      status: 'draft',
      lastModified: '2026-04-06',
    },
  ];

  return (
    <div className="open-project-page">
      <header className="page-header">
        <Link to="/" className="back-link">← Back to Dashboard</Link>
        <h1>Open Project</h1>
        <p>Select a project to continue working</p>
      </header>

      <div className="projects-list">
        {mockProjects.length === 0 ? (
          <div className="empty-state">
            <p>No projects found.</p>
            <Link to="/create-project" className="cta-button">
              Create Your First Project
            </Link>
          </div>
        ) : (
          mockProjects.map((project) => (
            <Link key={project.id} to={`/project/${project.id}`} className="project-card">
              <div className="project-header">
                <h3 className="project-name">{project.name}</h3>
                <span className={`project-status ${project.status}`}>
                  {project.status}
                </span>
              </div>
              <div className="project-details">
                <p className="project-type">
                  {project.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
                <p className="project-date">
                  Last modified: {project.lastModified}
                </p>
              </div>
              <div className="project-actions">
                <span className="open-icon">→</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
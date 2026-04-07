import React from 'react';
import { Link } from 'react-router-dom';
import { quickActionOptions } from '../constants/sidebar';

export function DashboardPage() {
  return (
    <div className="dashboard-page">
      <header className="page-header">
        <h1>Dashboard</h1>
        <p>Manage your ClawGame projects</p>
      </header>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-grid">
          {quickActionOptions.map((action) => (
            <Link
              key={action.id}
              to={`/${action.id === 'new-project' ? 'create-project' : action.id === 'open-project' ? 'open-project' : 'examples'}`}
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
        <div className="projects-empty">
          <p>No projects yet. Create your first game project!</p>
          <Link to="/create-project" className="cta-button">
            Create Project
          </Link>
        </div>
      </div>
    </div>
  );
}
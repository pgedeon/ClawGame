import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { quickActionOptions } from '../constants/sidebar';

export function DashboardPage() {
  const [isCreating, setIsCreating] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('2d-platformer');
  
  const navigate = useNavigate();

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Actually create the project via API
    console.log('Creating project:', { name: projectName, type: projectType });
    // Navigate to the project (fake ID for now)
    navigate('/project/demo-project-123');
  };

  const quickActionLinks = [
    {
      to: '/create-project',
      label: 'New Project',
      icon: quickActionOptions[0].icon,
      description: quickActionOptions[0].description,
    },
    {
      to: '/open-project',
      label: 'Open Project',
      icon: quickActionOptions[1].icon,
      description: quickActionOptions[1].description,
    },
    {
      to: '/examples',
      label: 'Examples',
      icon: quickActionOptions[2].icon,
      description: quickActionOptions[2].description,
    },
  ];

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
        <div className="projects-empty">
          <p>No projects yet. Create your first game project!</p>
          <div className="demo-create">
            <p className="demo-hint">Or try our demo:</p>
            <Link to="/project/demo-project-123" className="cta-button">
              View Demo Project
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
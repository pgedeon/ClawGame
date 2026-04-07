import React from 'react';

export function ProjectPage() {
  return (
    <div className="project-page">
      <header className="page-header">
        <h1>Project</h1>
        <p>Project-specific dashboard and controls</p>
      </header>
      
      <div className="project-empty">
        <p>Select or create a project to get started.</p>
      </div>
    </div>
  );
}
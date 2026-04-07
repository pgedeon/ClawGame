import React from 'react';
import { Link } from 'react-router-dom';

export function ExamplesPage() {
  const templates = [
    {
      id: 'simple-platformer',
      name: 'Simple Platformer',
      description: 'A basic 2D platformer with jumping and enemies',
      genre: 'Platformer',
      difficulty: 'Beginner',
    },
    {
      id: 'top-down-rpg',
      name: 'Top-Down RPG',
      description: 'Explore a world, battle enemies, collect items',
      genre: 'RPG',
      difficulty: 'Intermediate',
    },
    {
      id: 'puzzle-game',
      name: 'Puzzle Game',
      description: 'Logic puzzles and brain teasers',
      genre: 'Puzzle',
      difficulty: 'Beginner',
    },
    {
      id: 'space-shooter',
      name: 'Space Shooter',
      description: 'Classic arcade shooter with waves of enemies',
      genre: 'Action',
      difficulty: 'Intermediate',
    },
  ];

  return (
    <div className="examples-page">
      <header className="page-header">
        <Link to="/" className="back-link">← Back to Dashboard</Link>
        <h1>Project Templates</h1>
        <p>Start with a template or create your own from scratch</p>
      </header>

      <div className="templates-grid">
        {templates.map((template) => (
          <Link key={template.id} to={`/create-project?template=${template.id}`} className="template-card">
            <div className="template-header">
              <h3 className="template-name">{template.name}</h3>
              <span className="template-genre">{template.genre}</span>
            </div>
            <p className="template-description">{template.description}</p>
            <div className="template-meta">
              <span className="difficulty-tag">{template.difficulty}</span>
              <span className="template-actions">Use Template →</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="create-from-scratch">
        <h2>Or Create From Scratch</h2>
        <p>Have your own game idea? Start completely fresh!</p>
        <Link to="/create-project" className="cta-button secondary">
          Create Custom Project
        </Link>
      </div>
    </div>
  );
}
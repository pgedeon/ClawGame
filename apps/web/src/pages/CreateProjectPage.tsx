import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type CreateProjectInput } from '../api/client';

export function CreateProjectPage() {
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: '',
    genre: 'action',
    artStyle: 'pixel',
    description: '',
    runtimeTarget: 'browser',
    renderBackend: 'canvas',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const response = await api.createProject(formData);
      console.log('Project created:', response);
      // Navigate to the new project
      navigate(`/project/${response.id}`);
    } catch (err) {
      console.error('Error creating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof CreateProjectInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const projectTypes = [
    { id: '2d-platformer', name: '2D Platformer', description: 'Classic side-scrolling platform game' },
    { id: 'top-down-action', name: 'Top-Down Action', description: 'View from above, action gameplay' },
    { id: 'puzzle', name: 'Puzzle Game', description: 'Brain teasers and puzzles' },
    { id: 'rpg', name: 'RPG', description: 'Role-playing game mechanics' },
  ];

  const artStyles = [
    { id: 'pixel', name: 'Pixel Art', description: 'Retro 8/16-bit style' },
    { id: 'vector', name: 'Vector Art', description: 'Clean scalable graphics' },
    { id: '3d-low', name: 'Low Poly 3D', description: 'Simple 3D models' },
    { id: 'hand-drawn', name: 'Hand Drawn', description: 'Illustrative style' },
  ];

  return (
    <div className="create-project-page">
      <header className="page-header">
        <Link to="/" className="back-link">← Back to Dashboard</Link>
        <h1>Create New Project</h1>
        <p>Start building your game with ClawGame</p>
      </header>

      {error && (
        <div className="error-message" style={{
          padding: '1rem',
          background: '#ffebee',
          border: '1px solid #ffcdd2',
          borderRadius: '4px',
          color: '#d32f2f',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="project-form">
        <div className="form-section">
          <label className="form-label" htmlFor="name">
            Project Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="My Awesome Game"
            required
          />
        </div>

        <div className="form-section">
          <label className="form-label" htmlFor="genre">
            Genre
          </label>
          <select
            id="genre"
            value={formData.genre}
            onChange={(e) => handleChange('genre', e.target.value)}
          >
            <option value="action">Action</option>
            <option value="adventure">Adventure</option>
            <option value="puzzle">Puzzle</option>
            <option value="rpg">RPG</option>
            <option value="strategy">Strategy</option>
            <option value="simulation">Simulation</option>
          </select>
        </div>

        <div className="form-section">
          <label className="form-label" htmlFor="artStyle">
            Art Style
          </label>
          <div className="radio-group">
            {artStyles.map((style) => (
              <label key={style.id} className="radio-option">
                <input
                  type="radio"
                  name="artStyle"
                  value={style.id}
                  checked={formData.artStyle === style.id}
                  onChange={(e) => handleChange('artStyle', e.target.value)}
                />
                <span>{style.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-section">
          <label className="form-label" htmlFor="description">
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe your game idea..."
            rows={3}
          />
        </div>

        <div className="form-actions">
          <Link to="/" className="secondary-button">
            Cancel
          </Link>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </div>
  );
}
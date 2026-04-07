import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export function CreateProjectPage() {
  const [formData, setFormData] = useState({
    name: '',
    type: '2d-platformer',
    description: '',
    artStyle: 'pixel',
    genre: 'action',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // TODO: Actually create the project via API
      console.log('Creating project:', formData);
      // For demo, navigate to project with fake ID
      navigate(`/project/demo-project-${Date.now()}`);
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
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
          <label className="form-label" htmlFor="type">
            Project Type
          </label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) => handleChange('type', e.target.value)}
          >
            {projectTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name} - {type.description}
              </option>
            ))}
          </select>
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
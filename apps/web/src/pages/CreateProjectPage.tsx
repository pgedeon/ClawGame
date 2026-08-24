import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { CreateProjectInput } from '../api/client';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { logger } from '../utils/logger';
import './create-project.css';
import { templates, type GameTemplate } from '../templates/templateCatalog';
import { createProjectWithTemplate } from '../templates/templateLaunch';
import { recordRecentProject } from '../utils/recentProjects';


export function CreateProjectPage() {
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: '',
    genre: 'action',
    artStyle: 'pixel',
    description: '',
    runtimeTarget: 'browser',
    renderBackend: 'canvas',
  });
  const [selectedTemplate, setSelectedTemplate] = useState<GameTemplate | null>(templates[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      // Shared create + template file-writing path (also used by LandingPage)
      const { id: projectId } = await createProjectWithTemplate(formData, selectedTemplate);

      recordRecentProject({
        id: projectId,
        name: formData.name || 'Untitled project',
        templateId: selectedTemplate.id,
        createdAt: new Date().toISOString(),
      });

      navigate(`/project/${projectId}`);
    } catch (err) {
      logger.error('Error creating project:', err);
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof CreateProjectInput, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const artStyles = [
    { 
      id: 'pixel', 
      name: 'Pixel Art', 
      description: 'Retro 8/16-bit style',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMiIgZmlsbD0iIzAwMCIvPgo8cGF0aCBkPSJNMTAgM0g2WiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+'
    },
    { 
      id: 'vector', 
      name: 'Vector Art', 
      description: 'Clean scalable graphics',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0iIzMzMyIvPgo8cGF0aCBkPSJNMTIgM0g4Yy0xIDAtMy0yLTQtNC0xem0tNiAxMGMtMiAwLTMtMi00LTQgNC00IDAtMiAxIDQgMiA0IDQgMCAyIDMgNiAwIDAgMi0xIDItNHptMCAxOGMtMiAwIDMtMi00LTQgNC00IDAgMi0xIDItMSA0em0tMiAxOGMtMiAwIDMtMi00IDQgNCA0IDAgMi0xIDItMSA0eiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjEiLz4KPC9zdmc+'
    },
    { 
      id: '3d-low', 
      name: 'Low Poly 3D', 
      description: 'Simple 3D models',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE0IDAgMjFjMC4xLjcgMSAwLjUgcyAxLjEuNSAwIDEgMCAxIDAtMS41IDEuMS0xIDAgLTEem0tMSAxNWMwIDEuMS41IDAgMC41LTEuMS41LTEgMS0xLjUgMS0xLjUgMS0xLjUgMS0xem0tMSAxOGMtMSAwLjUtMS41IDAtMC41IDEuMS0xLjUgMS0xem0tMSAxOGMtMC45IDEuOS0yLjkgMC45IDIuOSAxLjl6IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4='
    },
    { 
      id: 'hand-drawn', 
      name: 'Hand Drawn', 
      description: 'Illustrative style',
      preview: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgMTIgMTAgMTAgMTFjMC0xIDAtMi0xLTItMiAtMi0yLS0yLTItMi0yLTItSDN6IiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMSIvPgo8L3N2Zz4='
    },
  ];

  return (
    <div className="create-project-page">
      <header className="page-header">
        <Link to="/dashboard" className="back-link">
          <ArrowLeft size={16} className="icon" />
          Back to Dashboard
        </Link>
        <h1>Create New Project</h1>
        <p>Start building your game with ClawGame</p>
      </header>

      {error && (
        <div className="error-message">
          <p>{error}</p>
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
          <label className="form-label">Choose a Template</label>
          <div className="template-grid">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`template-card ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                onClick={() => setSelectedTemplate(template)}
              >
                <div className="template-icon">
                  <template.icon size={32} />
                </div>
                <div className="template-info">
                  <h3>{template.name}</h3>
                  <p>{template.description}</p>
                  <span className="template-badge">
                    <Sparkles size={12} />
                    AI-Ready
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="form-section">
          <label className="form-label" htmlFor="genre">
            Genre
          </label>
          <select
            id="genre"
            value={formData.genre}
            onChange={(e) => handleChange('genre', e.target.value)}
            className="form-select"
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
          <label className="form-label">Art Style</label>
          <div className="art-style-grid">
            {artStyles.map((style) => (
              <label
                key={style.id}
                className={`art-style-card ${formData.artStyle === style.id ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="artStyle"
                  value={style.id}
                  checked={formData.artStyle === style.id}
                  onChange={(e) => handleChange('artStyle', e.target.value)}
                  className="sr-only"
                />
                <div className="art-style-preview">
                  <img src={style.preview} alt={style.name} />
                </div>
                <span className="art-style-name">{style.name}</span>
                <span className="art-style-desc">{style.description}</span>
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
          <Link to="/dashboard" className="secondary-button">
            Cancel
          </Link>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : `Create ${selectedTemplate?.name || 'Project'}`}
          </button>
        </div>
      </form>
    </div>
  );
}

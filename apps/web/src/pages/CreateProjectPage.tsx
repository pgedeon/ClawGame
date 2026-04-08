import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type CreateProjectInput } from '../api/client';
import { FolderPlus, ArrowLeft, Sparkles, Gamepad2, Target, MessageSquare } from 'lucide-react';
import { logger } from '../utils/logger';
import './create-project.css';

interface GameTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  genre: string;
  defaultScene: any;
  defaultScript?: string;
}

const templates: GameTemplate[] = [
  {
    id: 'platformer',
    name: 'Platformer',
    description: 'Jump between platforms, collect coins, avoid enemies',
    icon: <Gamepad2 size={32} />,
    genre: 'action',
    defaultScene: {
      name: 'Main Scene',
      entities: [
        {
          id: 'player-1',
          transform: { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            playerInput: true,
            movement: { vx: 0, vy: 0, speed: 200, jumpSpeed: 400, gravity: 800 },
            sprite: { width: 32, height: 48, color: '#3b82f6' },
            physics: { type: 'dynamic', friction: 0.1, restitution: 0 }
          }
        },
        {
          id: 'platform-1',
          transform: { x: 400, y: 450, scaleX: 4, scaleY: 1, rotation: 0 },
          components: {
            platform: true,
            sprite: { width: 160, height: 32, color: '#64748b' }
          }
        },
        {
          id: 'platform-2',
          transform: { x: 700, y: 350, scaleX: 3, scaleY: 1, rotation: 0 },
          components: {
            platform: true,
            sprite: { width: 120, height: 32, color: '#64748b' }
          }
        },
        {
          id: 'coin-1',
          transform: { x: 700, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            collision: { width: 20, height: 20, type: 'collectible', value: 10 },
            sprite: { width: 20, height: 20, color: '#fbbf24' }
          }
        }
      ]
    },
    defaultScript: `// Platformer Game Script
export function update(deltaTime: number) {
  // Handle player input
  if (keys['ArrowLeft'] || keys['a']) player.vx = -200;
  else if (keys['ArrowRight'] || keys['d']) player.vx = 200;
  else player.vx *= 0.9;
  
  if ((keys['ArrowUp'] || keys['w'] || keys[' ']) && player.onGround) {
    player.vy = -400;
  }
  
  // Apply gravity
  player.vy += 800 * deltaTime;
}

export function render(ctx: CanvasRenderingContext2D) {
  // Game rendering handled by scene system
}`
  },
  {
    id: 'topdown',
    name: 'Top-Down Action',
    description: 'Move freely, shoot enemies, collect items',
    icon: <Target size={32} />,
    genre: 'action',
    defaultScene: {
      name: 'Main Scene',
      entities: [
        {
          id: 'player-1',
          transform: { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            playerInput: true,
            movement: { vx: 0, vy: 0, speed: 250 },
            sprite: { width: 32, height: 32, color: '#10b981' }
          }
        },
        {
          id: 'enemy-1',
          transform: { x: 600, y: 400, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            ai: { type: 'chase', speed: 100, detectionRange: 300 },
            sprite: { width: 32, height: 32, color: '#ef4444' }
          }
        },
        {
          id: 'powerup-1',
          transform: { x: 200, y: 200, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            collision: { width: 24, height: 24, type: 'powerup', powerupType: 'speed' },
            sprite: { width: 24, height: 24, color: '#8b5cf6' }
          }
        }
      ]
    },
    defaultScript: `// Top-Down Action Game Script
export function update(deltaTime: number) {
  // Free movement in all directions
  const speed = 250;
  
  if (keys['ArrowUp'] || keys['w']) player.y -= speed * deltaTime;
  if (keys['ArrowDown'] || keys['s']) player.y += speed * deltaTime;
  if (keys['ArrowLeft'] || keys['a']) player.x -= speed * deltaTime;
  if (keys['ArrowRight'] || keys['d']) player.x += speed * deltaTime;
  
  // Clamp to screen bounds
  player.x = Math.max(16, Math.min(784, player.x));
  player.y = Math.max(16, Math.min(584, player.y));
}

export function render(ctx: CanvasRenderingContext2D) {
  // Game rendering handled by scene system
}`
  },
  {
    id: 'dialogue',
    name: 'Dialogue Adventure',
    description: 'Explore, talk to characters, make choices',
    icon: <MessageSquare size={32} />,
    genre: 'adventure',
    defaultScene: {
      name: 'Main Scene',
      entities: [
        {
          id: 'player-1',
          transform: { x: 400, y: 350, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            playerInput: true,
            movement: { vx: 0, vy: 0, speed: 150 },
            sprite: { width: 32, height: 48, color: '#f59e0b' }
          }
        },
        {
          id: 'npc-1',
          transform: { x: 600, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            npc: true,
            dialogue: {
              id: 'intro',
              messages: [
                "Welcome, traveler!",
                "I've been waiting for someone like you.",
                "There's a secret in forest to the east..."
              ],
              choices: [
                { text: "Tell me more", nextDialogue: 'secret' },
                { text: "I must go", nextDialogue: 'goodbye' }
              ]
            },
            sprite: { width: 32, height: 48, color: '#ec4899' }
          }
        },
        {
          id: 'sign-1',
          transform: { x: 200, y: 400, scaleX: 1, scaleY: 1, rotation: 0 },
          components: {
            interactable: true,
            text: "Village of Whispering Oaks",
            sprite: { width: 64, height: 48, color: '#78716c' }
          }
        }
      ]
    },
    defaultScript: `// Dialogue Adventure Game Script
export function update(deltaTime: number) {
  // Walk around and interact
  const speed = 150;
  
  if (keys['ArrowUp'] || keys['w']) player.y -= speed * deltaTime;
  if (keys['ArrowDown'] || keys['s']) player.y += speed * deltaTime;
  if (keys['ArrowLeft'] || keys['a']) player.x -= speed * deltaTime;
  if (keys['ArrowRight'] || keys['d']) player.x += speed * deltaTime;
  
  // Check for nearby NPCs to interact with
  if (keys['e'] || keys['Enter']) {
    checkInteractions();
  }
}

export function render(ctx: CanvasRenderingContext2D) {
  // Game rendering handled by scene system
}`
  }
];

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
      // Set genre from template if not already set
      const projectInput = {
        ...formData,
        genre: formData.genre || selectedTemplate.genre
      };

      const response = await api.createProject(projectInput);
      
      // Add template-specific files
      try {
        // Default game script from template
        if (selectedTemplate.defaultScript) {
          await api.writeFile(response.id, 'scripts/game.ts', selectedTemplate.defaultScript);
        }

        // Default player script
        await api.writeFile(response.id, 'scripts/player.ts', `// Player controls for ${formData.name}
export function update(deltaTime: number) {
  const speed = 200;
  
  if (keys['ArrowLeft'] || keys['a']) entity.vx = -speed;
  else if (keys['ArrowRight'] || keys['d']) entity.vx = speed;
  else entity.vx *= 0.8;
  
  if (keys['ArrowUp'] || keys['w']) entity.vy = -speed;
  else if (keys['ArrowDown'] || keys['s']) entity.vy = speed;
  else entity.vy *= 0.8;
}

export function render(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = entity.color || '#3b82f6';
  ctx.fillRect(-16, -16, 32, 32);
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  ctx.strokeRect(-16, -16, 32, 32);
}`);

        // Default scene from template
        await api.createDirectory(response.id, 'scenes');
        await api.writeFile(response.id, 'scenes/main-scene.json', JSON.stringify(selectedTemplate.defaultScene, null, 2));
        
        logger.info('Template files added to project', response.id);
      } catch (err) {
        logger.error('Template creation failed:', err);
        // Don't block project creation
      }
      
      navigate(`/project/${response.id}`);
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
        <Link to="/" className="back-link">
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
                  {template.icon}
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
          <Link to="/" className="secondary-button">
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

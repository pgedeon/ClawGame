/**
 * @clawgame/web - Scene Editor Page
 * Visual 2D scene editor with entity placement, selection, and property editing
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import { Entity, Transform, Sprite, Movement, AI, Collision, Scene } from '@clawgame/engine';
import '../scene-editor.css';

interface SceneEditorPageProps {
  projectId: string;
}

// Tool modes for the editor
type ToolMode = 'select' | 'move' | 'add-entity';

// Entity templates for quick creation
interface EntityTemplate {
  id: string;
  name: string;
  transform: Transform;
  components: Map<string, any>;
}

const ENTITY_TEMPLATES: EntityTemplate[] = [
  {
    id: 'player',
    name: '🎮 Player',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('playerInput', true);
      m.set('movement', { vx: 0, vy: 0, speed: 200 });
      return m;
    })(),
  },
  {
    id: 'enemy',
    name: '👾 Enemy',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('ai', { type: 'patrol', patrolSpeed: 50 });
      m.set('movement', { vx: 0, vy: 0, speed: 50 });
      return m;
    })(),
  },
  {
    id: 'coin',
    name: '🪙 Coin',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('collision', { width: 16, height: 16, type: 'collectible' });
      return m;
    })(),
  },
  {
    id: 'wall',
    name: '🧱 Wall',
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: (() => {
      const m = new Map<string, any>();
      m.set('collision', { width: 32, height: 32, type: 'wall' });
      return m;
    })(),
  },
];

function SceneEditorContent({ projectId }: SceneEditorPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Editor state
  const [scene, setScene] = useState<Scene | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<EntityTemplate | null>(null);

  // Viewport state (zoom/pan)
  const [viewport, setViewport] = useState({
    x: 0,
    y: 0,
    zoom: 1,
  });

  // Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [entityDragOffset, setEntityDragOffset] = useState({ x: 0, y: 0 });

  // UI state
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [snapping, setSnapping] = useState(true);
  const [gridSize] = useState(32);

  // Refs for rendering
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const animationRef = useRef<number | null>(null);

  // Load project and scene
  useEffect(() => {
    loadProjectAndScene();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [projectId]);

  const loadProjectAndScene = async () => {
    try {
      const project = await api.getProject(projectId);
      setProjectName(project?.name || 'Unknown Project');

      // Try to load existing scene file
      try {
        const sceneData = await api.readFile(projectId, 'scenes/main-scene.json');
        const parsedScene = JSON.parse(sceneData.content);
        
        // Reconstruct Map from JSON
        const entitiesMap = new Map<string, Entity>();
        parsedScene.entities.forEach((e: any) => {
          const components = new Map(Object.entries(e.components));
          entitiesMap.set(e.id, { ...e, components });
        });

        const loadedScene: Scene = {
          name: parsedScene.name,
          entities: entitiesMap,
        };
        
        setScene(loadedScene);
        setEntities(Array.from(entitiesMap.values()));
      } catch (sceneErr) {
        // Scene doesn't exist yet, create default scene
        const defaultScene = createDefaultScene();
        setScene(defaultScene);
        setEntities(Array.from(defaultScene.entities.values()));
      }
    } catch (err) {
      console.error('Failed to load project:', err);
      setError('Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultScene = (): Scene => {
    const entitiesMap = new Map<string, Entity>();

    // Create a default player entity
    const playerComponents = new Map<string, any>();
    playerComponents.set('playerInput', true);
    playerComponents.set('movement', { vx: 0, vy: 0, speed: 200 });

    const playerEntity: Entity = {
      id: 'player-1',
      transform: { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
      components: playerComponents,
    };
    entitiesMap.set('player-1', playerEntity);

    return {
      name: 'Main Scene',
      entities: entitiesMap,
    };
  };

  // Render the editor canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctxRef.current = ctx;

    // Set canvas size to match container
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      render();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Re-render when state changes
  useEffect(() => {
    render();
  }, [scene, viewport, selectedEntityId, showGrid]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || !scene) return;

    // Clear canvas
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;

      // Calculate grid bounds based on viewport
      const startX = Math.floor(-viewport.x / (viewport.zoom * gridSize)) * gridSize;
      const startY = Math.floor(-viewport.y / (viewport.zoom * gridSize)) * gridSize;
      const endX = startX + Math.ceil(canvas.width / (viewport.zoom * gridSize)) * gridSize + gridSize;
      const endY = startY + Math.ceil(canvas.height / (viewport.zoom * gridSize)) * gridSize + gridSize;

      ctx.beginPath();
      for (let x = startX; x <= endX; x += gridSize) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y <= endY; y += gridSize) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();

      // Draw origin
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-100, 0);
      ctx.lineTo(100, 0);
      ctx.moveTo(0, -100);
      ctx.lineTo(0, 100);
      ctx.stroke();
    }

    // Draw entities
    scene.entities.forEach((entity) => {
      drawEntity(ctx, entity, entity.id === selectedEntityId);
    });

    ctx.restore();
  }, [scene, viewport, selectedEntityId, showGrid, gridSize]);

  const drawEntity = (ctx: CanvasRenderingContext2D, entity: Entity, isSelected: boolean) => {
    const transform = entity.transform;
    const sprite = entity.components.get('sprite') as Sprite | undefined;
    const collision = entity.components.get('collision') as Collision | undefined;

    // Get entity dimensions
    let width = 32;
    let height = 32;

    if (sprite) {
      width = sprite.width;
      height = sprite.height;
    } else if (collision) {
      width = collision.width;
      height = collision.height;
    }

    const x = transform.x;
    const y = transform.y;

    // Draw selection highlight
    if (isSelected) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 4, y - 4, width + 8, height + 8);

      // Draw resize handles
      const handleSize = 6;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(x + width - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(x - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);
      ctx.fillRect(x + width - handleSize / 2, y + height - handleSize / 2, handleSize, handleSize);
    }

    // Draw sprite if available
    if (sprite && sprite.image instanceof HTMLImageElement && sprite.image.complete) {
      ctx.drawImage(sprite.image, x, y, width, height);
    } else {
      // Draw placeholder box
      const colors: Record<string, string> = {
        'player': '#3b82f6',
        'enemy': '#ef4444',
        'coin': '#fbbf24',
        'wall': '#6b7280',
        'default': '#8b5cf6',
      };

      const entityColor = entity.id.includes('player') ? colors.player :
                          entity.id.includes('enemy') ? colors.enemy :
                          entity.id.includes('coin') ? colors.coin :
                          entity.id.includes('wall') ? colors.wall :
                          colors.default;

      ctx.fillStyle = entityColor;
      ctx.fillRect(x, y, width, height);

      // Add border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Add label
      ctx.fillStyle = 'white';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(entity.id.split('-')[0], x + width / 2, y + height / 2 + 4);
    }

    // Draw collision box if has collision component
    if (collision && !isSelected) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(x, y, collision.width, collision.height);
      ctx.setLineDash([]);
    }
  };

  // Canvas event handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !scene) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    const worldX = (mouseX - viewport.x) / viewport.zoom;
    const worldY = (mouseY - viewport.y) / viewport.zoom;

    // Check if we clicked on an entity
    let clickedEntity: Entity | null = null;

    // Reverse iteration to click top-most entities first
    const entityArray = Array.from(scene.entities.values());
    for (let i = entityArray.length - 1; i >= 0; i--) {
      const entity = entityArray[i];
      const sprite = entity.components.get('sprite') as Sprite | undefined;
      const collision = entity.components.get('collision') as Collision | undefined;

      let width = 32;
      let height = 32;

      if (sprite) {
        width = sprite.width;
        height = sprite.height;
      } else if (collision) {
        width = collision.width;
        height = collision.height;
      }

      if (worldX >= entity.transform.x && worldX <= entity.transform.x + width &&
          worldY >= entity.transform.y && worldY <= entity.transform.y + height) {
        clickedEntity = entity;
        break;
      }
    }

    if (clickedEntity && toolMode === 'select') {
      setSelectedEntityId(clickedEntity.id);
      setIsDragging(true);
      setEntityDragOffset({
        x: worldX - clickedEntity.transform.x,
        y: worldY - clickedEntity.transform.y,
      });
    } else if (toolMode === 'select') {
      setSelectedEntityId(null);
      // Start panning
      setIsDragging(true);
      setDragStart({ x: mouseX - viewport.x, y: mouseY - viewport.y });
    } else if (toolMode === 'add-entity' && selectedTemplate) {
      // Add new entity at clicked position
      const newId = `${selectedTemplate.id}-${Date.now()}`;
      const newPosition = snapping ? {
        x: Math.round(worldX / gridSize) * gridSize,
        y: Math.round(worldY / gridSize) * gridSize,
      } : { x: worldX, y: worldY };

      const newEntity: Entity = {
        id: newId,
        transform: {
          ...selectedTemplate.transform,
          ...newPosition,
        },
        components: new Map(selectedTemplate.components),
      };

      const newScene: Scene = {
        ...scene,
        entities: new Map(scene.entities).set(newId, newEntity),
      };

      setScene(newScene);
      setEntities(Array.from(newScene.entities.values()));
      setSelectedEntityId(newId);
      setToolMode('select');
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !scene) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - viewport.x) / viewport.zoom;
    const worldY = (mouseY - viewport.y) / viewport.zoom;

    if (toolMode === 'select' && selectedEntityId) {
      // Move selected entity
      const entity = scene.entities.get(selectedEntityId);
      if (entity) {
        let newX = worldX - entityDragOffset.x;
        let newY = worldY - entityDragOffset.y;

        if (snapping) {
          newX = Math.round(newX / gridSize) * gridSize;
          newY = Math.round(newY / gridSize) * gridSize;
        }

        const updatedEntity = {
          ...entity,
          transform: { ...entity.transform, x: newX, y: newY },
        };

        const newScene: Scene = {
          ...scene,
          entities: new Map(scene.entities).set(selectedEntityId, updatedEntity),
        };

        setScene(newScene);
        setEntities(Array.from(newScene.entities.values()));
      }
    } else {
      // Pan viewport
      setViewport({
        ...viewport,
        x: mouseX - dragStart.x,
        y: mouseY - dragStart.y,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleCanvasWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom towards mouse position
    const worldX = (mouseX - viewport.x) / viewport.zoom;
    const worldY = (mouseY - viewport.y) / viewport.zoom;

    setViewport({
      x: mouseX - worldX * newZoom,
      y: mouseY - worldY * newZoom,
      zoom: newZoom,
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected entity
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEntityId && scene) {
        const newScene: Scene = {
          ...scene,
          entities: new Map(scene.entities),
        };
        newScene.entities.delete(selectedEntityId);
        setScene(newScene);
        setEntities(Array.from(newScene.entities.values()));
        setSelectedEntityId(null);
      }

      // Tool shortcuts
      if (e.key === 'v') setToolMode('select');
      if (e.key === 'm') setToolMode('move');

      // Zoom shortcuts
      if (e.key === '+' || e.key === '=') {
        setViewport({ ...viewport, zoom: Math.min(5, viewport.zoom * 1.2) });
      }
      if (e.key === '-') {
        setViewport({ ...viewport, zoom: Math.max(0.1, viewport.zoom / 1.2) });
      }
      if (e.key === '0') {
        setViewport({ x: 0, y: 0, zoom: 1 });
      }

      // Save shortcut (Ctrl+S)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveScene();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntityId, scene, viewport, toolMode]);

  // Save scene
  const saveScene = async () => {
    if (!scene) return;

    try {
      // Serialize scene to JSON
      const serializedScene = {
        name: scene.name,
        entities: Array.from(scene.entities.entries()).map(([id, entity]) => ({
          id,
          transform: entity.transform,
          components: Object.fromEntries(entity.components),
        })),
      };

      // Ensure scenes directory exists
      try {
        await api.createDirectory(projectId, 'scenes');
      } catch {
        // Directory might already exist
      }

      // Write scene file
      await api.writeFile(
        projectId,
        'scenes/main-scene.json',
        JSON.stringify(serializedScene, null, 2),
        'utf-8'
      );

    } catch (err) {
      console.error('Failed to save scene:', err);
      setError('Failed to save scene');
    }
  };

  // Update selected entity property
  const updateEntityProperty = <K extends keyof Transform>(
    property: K,
    value: Transform[K]
  ) => {
    if (!selectedEntityId || !scene) return;

    const entity = scene.entities.get(selectedEntityId);
    if (!entity) return;

    const updatedEntity = {
      ...entity,
      transform: { ...entity.transform, [property]: value },
    };

    const newScene: Scene = {
      ...scene,
      entities: new Map(scene.entities).set(selectedEntityId, updatedEntity),
    };

    setScene(newScene);
    setEntities(Array.from(newScene.entities.values()));
  };

  // Add component to entity
  const addComponent = (componentType: string) => {
    if (!selectedEntityId || !scene) return;

    const entity = scene.entities.get(selectedEntityId);
    if (!entity) return;

    let newComponent: any;

    switch (componentType) {
      case 'sprite':
        newComponent = {
          image: null,
          width: 32,
          height: 32,
        };
        break;
      case 'movement':
        newComponent = {
          vx: 0,
          vy: 0,
          speed: 100,
        };
        break;
      case 'ai':
        newComponent = {
          type: 'idle',
        };
        break;
      case 'collision':
        newComponent = {
          width: 32,
          height: 32,
          type: 'wall',
        };
        break;
      default:
        return;
    }

    const updatedEntity = {
      ...entity,
      components: new Map(entity.components).set(componentType, newComponent),
    };

    const newScene: Scene = {
      ...scene,
      entities: new Map(scene.entities).set(selectedEntityId, updatedEntity),
    };

    setScene(newScene);
    setEntities(Array.from(newScene.entities.values()));
  };

  // Remove component from entity
  const removeComponent = (componentType: string) => {
    if (!selectedEntityId || !scene) return;

    const entity = scene.entities.get(selectedEntityId);
    if (!entity) return;

    const updatedComponents = new Map(entity.components);
    updatedComponents.delete(componentType);

    const updatedEntity = {
      ...entity,
      components: updatedComponents,
    };

    const newScene: Scene = {
      ...scene,
      entities: new Map(scene.entities).set(selectedEntityId, updatedEntity),
    };

    setScene(newScene);
    setEntities(Array.from(newScene.entities.values()));
  };

  if (isLoading) {
    return (
      <div className="scene-editor-page">
        <div className="loading">Loading scene editor...</div>
      </div>
    );
  }

  return (
    <div className="scene-editor-page">
      <header className="page-header">
        <div className="project-info">
          <h1>🎨 Scene Editor</h1>
          <p>Project: <span className="project-name">{projectName}</span></p>
        </div>

        <div className="editor-controls">
          <div className="tool-bar">
            <button
              className={`tool-btn ${toolMode === 'select' ? 'active' : ''}`}
              onClick={() => setToolMode('select')}
              title="Select Tool (V)"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              </svg>
              Select
            </button>
            <button
              className={`tool-btn ${toolMode === 'add-entity' ? 'active' : ''}`}
              onClick={() => setToolMode('add-entity')}
              title="Add Entity"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              Add Entity
            </button>
          </div>

          <div className="zoom-controls">
            <button onClick={() => setViewport({ ...viewport, zoom: Math.max(0.1, viewport.zoom / 1.2) })} title="Zoom Out (-)">
              −
            </button>
            <span>{Math.round(viewport.zoom * 100)}%</span>
            <button onClick={() => setViewport({ ...viewport, zoom: Math.min(5, viewport.zoom * 1.2) })} title="Zoom In (+)">
              +
            </button>
            <button onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })} title="Reset View (0)">
              ↺
            </button>
          </div>

          <div className="view-options">
            <label className="option-toggle">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              Grid
            </label>
            <label className="option-toggle">
              <input
                type="checkbox"
                checked={snapping}
                onChange={(e) => setSnapping(e.target.checked)}
              />
              Snap
            </label>
          </div>

          <button className="save-btn" onClick={saveScene} title="Save Scene (Ctrl+S)">
            💾 Save Scene
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          ❌ {error}
        </div>
      )}

      <div className="scene-editor-container">
        {/* Entity Templates Panel (shows when adding entities) */}
        {toolMode === 'add-entity' && (
          <div className="entity-templates">
            <h3>Add Entity</h3>
            <div className="template-grid">
              {ENTITY_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  className={`template-btn ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  {template.name}
                </button>
              ))}
            </div>
            <p className="hint">Click on canvas to place selected entity type</p>
          </div>
        )}

        {/* Main Canvas */}
        <div className="canvas-container" ref={containerRef}>
          <canvas
            ref={canvasRef}
            className="scene-canvas"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onWheel={handleCanvasWheel}
          />
        </div>

        {/* Property Inspector */}
        <div className="inspector-panel">
          {selectedEntityId && scene ? (
            <>
              <div className="inspector-section">
                <h3>📋 Entity Properties</h3>
                <div className="entity-info">
                  <label>ID</label>
                  <input
                    type="text"
                    value={selectedEntityId}
                    readOnly
                    className="readonly"
                  />
                </div>
              </div>

              {/* Transform Component */}
              <div className="inspector-section">
                <h3>📍 Transform</h3>
                <div className="property-row">
                  <label>X</label>
                  <input
                    type="number"
                    value={Math.round(scene.entities.get(selectedEntityId)?.transform.x || 0)}
                    onChange={(e) => updateEntityProperty('x', Number(e.target.value))}
                  />
                </div>
                <div className="property-row">
                  <label>Y</label>
                  <input
                    type="number"
                    value={Math.round(scene.entities.get(selectedEntityId)?.transform.y || 0)}
                    onChange={(e) => updateEntityProperty('y', Number(e.target.value))}
                  />
                </div>
                <div className="property-row">
                  <label>Rotation</label>
                  <input
                    type="number"
                    value={Math.round(scene.entities.get(selectedEntityId)?.transform.rotation || 0)}
                    onChange={(e) => updateEntityProperty('rotation', Number(e.target.value))}
                  />
                </div>
                <div className="property-row">
                  <label>Scale X</label>
                  <input
                    type="number"
                    step="0.1"
                    value={scene.entities.get(selectedEntityId)?.transform.scaleX || 1}
                    onChange={(e) => updateEntityProperty('scaleX', Number(e.target.value))}
                  />
                </div>
                <div className="property-row">
                  <label>Scale Y</label>
                  <input
                    type="number"
                    step="0.1"
                    value={scene.entities.get(selectedEntityId)?.transform.scaleY || 1}
                    onChange={(e) => updateEntityProperty('scaleY', Number(e.target.value))}
                  />
                </div>
              </div>

              {/* Components */}
              <div className="inspector-section">
                <h3>🧩 Components</h3>
                <div className="component-list">
                  {Array.from(scene.entities.get(selectedEntityId)?.components.keys() || [])
                    .filter((key) => key !== 'playerInput')
                    .map((componentType) => (
                    <div key={componentType} className="component-item">
                      <span className="component-name">{componentType}</span>
                      <button
                        className="remove-btn"
                        onClick={() => removeComponent(componentType)}
                        title="Remove component"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="inspector-section">
                <h3>Add Component</h3>
                <div className="component-buttons">
                  <button onClick={() => addComponent('sprite')} disabled={scene.entities.get(selectedEntityId)?.components.has('sprite')}>
                    + Sprite
                  </button>
                  <button onClick={() => addComponent('movement')} disabled={scene.entities.get(selectedEntityId)?.components.has('movement')}>
                    + Movement
                  </button>
                  <button onClick={() => addComponent('ai')} disabled={scene.entities.get(selectedEntityId)?.components.has('ai')}>
                    + AI
                  </button>
                  <button onClick={() => addComponent('collision')} disabled={scene.entities.get(selectedEntityId)?.components.has('collision')}>
                    + Collision
                  </button>
                </div>
              </div>

              <div className="inspector-section">
                <h3>🎯 Actions</h3>
                <div className="action-buttons">
                  <button className="danger-btn" onClick={() => {
                    if (scene) {
                      const newScene: Scene = { ...scene, entities: new Map(scene.entities) };
                      newScene.entities.delete(selectedEntityId);
                      setScene(newScene);
                      setEntities(Array.from(newScene.entities.values()));
                      setSelectedEntityId(null);
                    }
                  }}>
                    🗑️ Delete Entity
                  </button>
                  <button className="duplicate-btn" onClick={() => {
                    const entity = scene?.entities.get(selectedEntityId);
                    if (entity) {
                      const newId = `${selectedEntityId.split('-')[0]}-${Date.now()}`;
                      const newEntity = {
                        ...entity,
                        id: newId,
                        transform: { ...entity.transform, x: entity.transform.x + 32, y: entity.transform.y + 32 },
                      };
                      const newScene: Scene = {
                        ...scene,
                        entities: new Map(scene.entities).set(newId, newEntity),
                      };
                      setScene(newScene);
                      setEntities(Array.from(newScene.entities.values()));
                      setSelectedEntityId(newId);
                    }
                  }}>
                    📋 Duplicate
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="inspector-placeholder">
              <p>Select an entity to edit its properties</p>
              <p className="hint">Or use Add Entity tool to create new entities</p>
            </div>
          )}

          {/* Entity List */}
          <div className="inspector-section">
            <h3>📦 Entities ({scene?.entities.size || 0})</h3>
            <div className="entity-list">
              {Array.from(scene?.entities.values() || []).map((entity) => (
                <button
                  key={entity.id}
                  className={`entity-item ${entity.id === selectedEntityId ? 'selected' : ''}`}
                  onClick={() => setSelectedEntityId(entity.id)}
                >
                  {entity.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SceneEditorPage() {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return (
      <div className="scene-editor-page">
        <div className="error-state">
          <div className="error-icon">🎨</div>
          <h3>No Project Selected</h3>
          <p>Please open a project first to edit scenes.</p>
        </div>
      </div>
    );
  }

  return <SceneEditorContent projectId={projectId} />;
}

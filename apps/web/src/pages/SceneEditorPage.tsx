/**
 * @clawgame/web - Scene Editor Page
 * Main orchestrator page using decomposed components: AssetBrowserPanel, SceneCanvas, PropertyInspector
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api, type AssetMetadata } from '../api/client';
import { Entity, Scene, Transform } from '@clawgame/engine';
import { AssetBrowserPanel } from '../components/scene-editor/AssetBrowserPanel';
import { SceneCanvas } from '../components/scene-editor/SceneCanvas';
import { PropertyInspector } from '../components/scene-editor/PropertyInspector';
import { logger } from '../utils/logger';
import '../scene-editor.css';
import { 
  Save as SaveIcon,
} from 'lucide-react';

function SceneEditorContent() {
  const { projectId } = useParams<{ projectId: string }>();
  
  // Main state
  const [scene, setScene] = useState<Scene | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor state
  const [toolMode, setToolMode] = useState<'select' | 'add-entity'>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapping, setSnapping] = useState(true);
  const [gridSize] = useState(32);

  // Asset browser state
  const [assetCache, setAssetCache] = useState(new Map<string, HTMLImageElement>());

  // Initialize
  useEffect(() => {
    if (projectId) {
      loadProjectAndScene();
    }
    return () => {
      // Cleanup any cached images
      assetCache.forEach(img => {
        if (img.src.startsWith('blob:')) {
          URL.revokeObjectURL(img.src);
        }
      });
    };
  }, [projectId]);

  const loadProjectAndScene = async () => {
    if (!projectId) return;
    
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
      logger.error('Failed to load project:', err);
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

  // Update entities when scene changes
  useEffect(() => {
    if (scene) {
      setEntities(Array.from(scene.entities.values()));
    }
  }, [scene]);

  // Canvas event handlers
  const handleSceneUpdate = useCallback((newScene: Scene) => {
    setScene(newScene);
    setEntities(Array.from(newScene.entities.values()));
  }, []);

  const handleZoomViewport = useCallback((offsetX: number, offsetY: number, newZoom: number) => {
    setViewport({
      x: offsetX,
      y: offsetY,
      zoom: newZoom,
    });
  }, []);

  const handlePanViewport = useCallback((offsetX: number, offsetY: number) => {
    setViewport(prev => ({
      ...prev,
      x: offsetX,
      y: offsetY,
    }));
  }, []);

  // Entity property handlers
  const handleUpdateProperty = useCallback((property: keyof Transform, value: any) => {
    if (!selectedEntityId || !scene) return;

    const entity = scene.entities.get(selectedEntityId);
    if (!entity) return;

    if (property === 'x' || property === 'y' || property === 'rotation' || property === 'scaleX' || property === 'scaleY') {
      const updatedEntity = {
        ...entity,
        transform: { 
          ...entity.transform, 
          [property]: value 
        },
      };

      const newScene: Scene = {
        ...scene,
        entities: new Map(scene.entities).set(selectedEntityId, updatedEntity),
      };

      handleSceneUpdate(newScene);
    }
  }, [selectedEntityId, scene, handleSceneUpdate]);

  const handleAddComponent = useCallback((componentType: string) => {
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

    handleSceneUpdate(newScene);
  }, [selectedEntityId, scene, handleSceneUpdate]);

  const handleRemoveComponent = useCallback((componentType: string) => {
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

    handleSceneUpdate(newScene);
  }, [selectedEntityId, scene, handleSceneUpdate]);

  const handleDeleteEntity = useCallback((entityId: string) => {
    if (!scene) return;

    const newScene: Scene = {
      ...scene,
      entities: new Map(scene.entities),
    };
    newScene.entities.delete(entityId);

    handleSceneUpdate(newScene);
    if (entityId === selectedEntityId) {
      setSelectedEntityId(null);
    }
  }, [scene, selectedEntityId, handleSceneUpdate]);

  const handleDuplicateEntity = useCallback((entityId: string) => {
    if (!scene) return;

    const entity = scene.entities.get(entityId);
    if (!entity) return;

    const newId = `${entityId.split('-')[0]}-${Date.now()}`;
    const newEntity = {
      ...entity,
      id: newId,
      transform: { ...entity.transform, x: entity.transform.x + 32, y: entity.transform.y + 32 },
    };

    const newScene: Scene = {
      ...scene,
      entities: new Map(scene.entities).set(newId, newEntity),
    };

    handleSceneUpdate(newScene);
    setSelectedEntityId(newId);
  }, [scene, handleSceneUpdate]);

  const handleAttachAsset = useCallback((assetId: string) => {
    if (!selectedEntityId || !scene) return;

    const entity = scene.entities.get(selectedEntityId);
    if (!entity) return;

    // Add or update sprite component with asset reference
    const sprite = entity.components.get('sprite');
    const updatedSprite = sprite ? { ...sprite, image: assetId } : {
      image: assetId,
      width: 32,
      height: 32,
    };

    const updatedEntity = {
      ...entity,
      components: new Map(entity.components).set('sprite', updatedSprite),
    };

    const newScene: Scene = {
      ...scene,
      entities: new Map(scene.entities).set(selectedEntityId, updatedEntity),
    };

    handleSceneUpdate(newScene);
  }, [selectedEntityId, scene, handleSceneUpdate]);

  const handleSaveScene = useCallback(async () => {
    if (!scene || !projectId) return;

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
      logger.error('Failed to save scene:', err);
      setError('Failed to save scene');
    }
  }, [scene, projectId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't fire shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable;

      if (isInputFocused) return;
      // Delete selected entity
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEntityId && scene) {
        e.preventDefault();
        handleDeleteEntity(selectedEntityId);
      }

      // Tool shortcuts
      if (e.key === 'v') setToolMode('select');
      if (e.key === 'm') setToolMode('add-entity');

      // Zoom shortcuts
      if (e.key === '+' || e.key === '=') {
        setViewport(prev => ({ 
          ...prev, 
          zoom: Math.min(5, prev.zoom * 1.2) 
        }));
      }
      if (e.key === '-') {
        setViewport(prev => ({ 
          ...prev, 
          zoom: Math.max(0.1, prev.zoom / 1.2) 
        }));
      }
      if (e.key === '0') {
        setViewport({ x: 0, y: 0, zoom: 1 });
      }

      // Save shortcut (Ctrl+S)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveScene();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedEntityId, scene, handleDeleteEntity, handleSaveScene]);

  if (isLoading) {
    return (
      <div className="scene-editor-page">
        <div className="loading">Loading scene editor...</div>
      </div>
    );
  }

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
            <button onClick={() => setViewport(prev => ({ ...prev, zoom: Math.max(0.1, prev.zoom / 1.2) }))} title="Zoom Out (-)">
              −
            </button>
            <span>{Math.round(viewport.zoom * 100)}%</span>
            <button onClick={() => setViewport(prev => ({ ...prev, zoom: Math.min(5, prev.zoom * 1.2) }))} title="Zoom In (+)">
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

          <button className="save-btn" onClick={handleSaveScene} title="Save Scene (Ctrl+S)">
            <SaveIcon size={16} />
            Save Scene
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          ❌ {error}
        </div>
      )}

      <div className="scene-editor-container">
        {/* Asset Browser Panel */}
        <AssetBrowserPanel
          projectId={projectId}
          selectedEntityId={selectedEntityId}
          onAttachAsset={handleAttachAsset}
          assetCache={assetCache}
          setAssetCache={setAssetCache}
        />

        {/* Main Canvas */}
        <SceneCanvas
          projectId={projectId}
          scene={scene}
          entities={entities}
          selectedEntityId={selectedEntityId}
          toolMode={toolMode}
          selectedTemplate={selectedTemplate}
          viewport={viewport}
          showGrid={showGrid}
          snapping={snapping}
          gridSize={gridSize}
          onSelectEntity={setSelectedEntityId}
          onUpdateScene={handleSceneUpdate}
          onZoomViewport={handleZoomViewport}
          onPanViewport={handlePanViewport}
        />

        {/* Property Inspector */}
        <PropertyInspector
          scene={scene}
          selectedEntityId={selectedEntityId}
          onUpdateProperty={handleUpdateProperty}
          onAddComponent={handleAddComponent}
          onRemoveComponent={handleRemoveComponent}
          onSelectEntity={setSelectedEntityId}
          onDeleteEntity={handleDeleteEntity}
          onDuplicateEntity={handleDuplicateEntity}
        />
      </div>
    </div>
  );
}

export function SceneEditorPage() {
  return <SceneEditorContent />;
}

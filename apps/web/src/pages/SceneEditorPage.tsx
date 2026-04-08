/**
 * @clawgame/web - Scene Editor Page
 * Main orchestrator page using decomposed components: AssetBrowserPanel, SceneCanvas, PropertyInspector
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { api, type AssetMetadata } from '../api/client';
import { Entity, Scene, Transform, Component, Sprite } from '@clawgame/engine';
import { AssetBrowserPanel } from '../components/scene-editor/AssetBrowserPanel';
import { SceneCanvas } from '../components/scene-editor/SceneCanvas';
import { PropertyInspector } from '../components/scene-editor/PropertyInspector';
import { SceneEditorAIBar } from '../components/scene-editor/SceneEditorAIBar';
import { ToolMode, ENTITY_TEMPLATES } from '../components/scene-editor/types';
import { logger } from '../utils/logger';
import '../scene-editor.css';
import '../scene-editor-ai.css';
import { 
  Save as SaveIcon,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Plus,
} from 'lucide-react';

function SceneEditorContent() {
  const { projectId } = useParams<{ projectId: string }>();
  
  // Main state
  const [scene, setScene] = useState<Scene | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor state
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapping, setSnapping] = useState(true);
  const [gridSize] = useState(32);

  // Tool mode and template
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // Asset cache - map of asset ID to loaded image
  const [assetCache, setAssetCache] = useState<Map<string, HTMLImageElement>>(new Map());

  // Helper to convert entities Map to array for components
  const entitiesArray = scene ? Array.from(scene.entities.values()) : [];

  // Load project info
  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId]);

  const loadProject = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const project = await api.getProject(id);
      setProjectName(project?.name || 'Unknown Project');
      
      // Try to load existing scene
      try {
        const sceneData = await api.readFile(id, 'scenes/main-scene.json');
        const sceneContent = JSON.parse(sceneData.content) as any;
        
        // Convert JSON object to Map for entities
        if (sceneContent && sceneContent.entities) {
          const entities = new Map<string, Entity>();
          const entitiesObj = sceneContent.entities;
          if (entitiesObj instanceof Map) {
            setScene({ name: sceneContent.name || 'Main Scene', entities: entitiesObj });
          } else if (Array.isArray(entitiesObj)) {
            entitiesObj.forEach((entity: any) => {
              if (entity.id && entity.components) {
                let components: Map<string, Component>;
                if (entity.components instanceof Map) {
                  components = entity.components;
                } else {
                  // Create new Map from object entries
                  components = new Map();
                  for (const [key, value] of Object.entries(entity.components)) {
                    components.set(key, value as Component);
                  }
                }
                entities.set(entity.id, { ...entity, components });
              }
            });
            setScene({ name: sceneContent.name || 'Main Scene', entities });
          } else if (typeof entitiesObj === 'object') {
            const entities = new Map<string, Entity>();
            for (const [key, entity] of Object.entries(entitiesObj as Record<string, any>)) {
              if (entity.id && entity.components) {
                let components: Map<string, Component>;
                if (entity.components instanceof Map) {
                  components = entity.components;
                } else {
                  components = new Map();
                  for (const [compKey, compValue] of Object.entries(entity.components)) {
                    components.set(compKey, compValue as Component);
                  }
                }
                entities.set(key, { ...entity, components });
              }
            }
            setScene({ name: sceneContent.name || 'Main Scene', entities });
          }
        }
      } catch (sceneErr) {
        logger.warn('No existing scene found, creating default:', sceneErr);
        // Create default scene with player entity
        const transform: Transform = { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 };
        
        const playerComponents = new Map<string, Component>();
        playerComponents.set('transform', transform);
        playerComponents.set('movement', { vx: 0, vy: 0, speed: 200 });
        playerComponents.set('sprite', { 
          image: new Image(),
          width: 32, 
          height: 48 
        });
        playerComponents.set('collision', { 
          width: 32, 
          height: 48, 
          type: 'player' 
        });

        const playerEntity: Entity = {
          id: 'player-1',
          transform,
          components: playerComponents
        };
        
        setScene({ 
          name: 'Main Scene',
          entities: new Map([['player-1', playerEntity]]) 
        });
      }
    } catch (err) {
      logger.error('Error loading project:', err);
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const saveScene = async () => {
    if (!projectId || !scene) return;

    try {
      await api.createDirectory(projectId, 'scenes');
      const sceneContent = JSON.stringify(scene, null, 2);
      await api.writeFile(projectId, 'scenes/main-scene.json', sceneContent);
      
      logger.info('Scene saved successfully');
    } catch (err) {
      logger.error('Error saving scene:', err);
      setError(err instanceof Error ? err.message : 'Failed to save scene');
    }
  };

  // Scene canvas handlers
  const handleUpdateScene = useCallback((newScene: Scene) => {
    setScene(newScene);
  }, []);

  const handleZoomViewport = useCallback((offsetX: number, offsetY: number, newZoom: number) => {
    setViewport({ x: offsetX, y: offsetY, zoom: newZoom });
  }, []);

  const handlePanViewport = useCallback((offsetX: number, offsetY: number) => {
    setViewport(prev => ({ ...prev, x: offsetX, y: offsetY }));
  }, []);

  // Property handlers
  const handleUpdateProperty = useCallback(<K extends keyof Transform>(property: K, value: Transform[K]) => {
    if (!selectedEntityId || !scene) return;
    
    const entity = scene.entities.get(selectedEntityId);
    if (!entity) return;
    
    const updatedTransform = { ...entity.transform, [property]: value };
    const updatedComponents = new Map(entity.components);
    updatedComponents.set('transform', updatedTransform);
    
    const updatedEntity = { ...entity, transform: updatedTransform, components: updatedComponents };
    const newEntities = new Map(scene.entities);
    newEntities.set(selectedEntityId, updatedEntity);
    setScene({ ...scene, entities: newEntities });
  }, [scene, selectedEntityId]);

  const handleAddComponent = useCallback((componentType: string) => {
    if (!selectedEntityId || !scene) return;
    
    const entity = scene.entities.get(selectedEntityId);
    if (!entity) return;
    
    const newComponents = new Map(entity.components);
    newComponents.set(componentType, getComponentDefault(componentType));
    
    const updatedEntity = { ...entity, components: newComponents };
    const newEntities = new Map(scene.entities);
    newEntities.set(selectedEntityId, updatedEntity);
    setScene({ ...scene, entities: newEntities });
  }, [scene, selectedEntityId]);

  const handleRemoveComponent = useCallback((componentType: string) => {
    if (!selectedEntityId || !scene) return;
    
    const entity = scene.entities.get(selectedEntityId);
    if (!entity) return;
    
    const newComponents = new Map(entity.components);
    newComponents.delete(componentType);
    
    const updatedEntity = { ...entity, components: newComponents };
    const newEntities = new Map(scene.entities);
    newEntities.set(selectedEntityId, updatedEntity);
    setScene({ ...scene, entities: newEntities });
  }, [scene, selectedEntityId]);

  // Entity manipulation handlers
  const handleSelectEntity = useCallback((entityId: string | null) => {
    setSelectedEntityId(entityId);
  }, []);

  const handleDeleteEntity = useCallback((entityId: string) => {
    if (!scene) return;
    
    const newEntities = new Map(scene.entities);
    newEntities.delete(entityId);
    setScene({ ...scene, entities: newEntities });
    
    if (selectedEntityId === entityId) {
      setSelectedEntityId(null);
    }
  }, [scene, selectedEntityId]);

  const handleDuplicateEntity = useCallback((entityId: string) => {
    if (!scene) return;
    
    const entity = scene.entities.get(entityId);
    if (!entity) return;
    
    const newEntity: Entity = {
      ...entity,
      id: `entity-${Date.now()}`,
      transform: { 
        ...entity.transform, 
        x: entity.transform.x + 32, 
        y: entity.transform.y + 32 
      }
    };
    
    const newEntities = new Map(scene.entities);
    newEntities.set(newEntity.id, newEntity);
    setScene({ ...scene, entities: newEntities });
    setSelectedEntityId(newEntity.id);
  }, [scene]);

  const handleAddAsset = useCallback(async (assetId: string) => {
    // Get asset details
    try {
      const asset = await api.getAsset(projectId || '', assetId);
      
      // Create sprite component from asset
      const image = new Image();
      image.src = asset.url;
      
      const sprite: Sprite = {
        image,
        width: 32,
        height: 32,
        offsetX: 0,
        offsetY: 0
      };
      
      const collision = { 
        width: 32, 
        height: 32, 
        type: 'wall' as const 
      };
      
      const transform: Transform = { 
        x: viewport.x + 400, 
        y: viewport.y + 300, 
        scaleX:1, 
        scaleY: 1, 
        rotation: 0 
      };
      
      const components = new Map<string, Component>();
      components.set('transform', transform);
      components.set('sprite', sprite);
      components.set('collision', collision);

      const newEntity: Entity = {
        id: `entity-${Date.now()}`,
        transform,
        components
      };
      
      const newEntities = new Map(scene?.entities);
      newEntities.set(newEntity.id, newEntity);
      setScene(prev => prev ? { ...prev, entities: newEntities } : null);
      setSelectedEntityId(newEntity.id);
      
      logger.info('Added asset as entity:', asset.name);
    } catch (err) {
      logger.error('Error loading asset:', err);
    }
  }, [projectId, viewport, scene]);

  // Add simple entity from template
  const handleAddSimpleEntity = useCallback((templateId: string) => {
    if (!scene) return;

    const template = ENTITY_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const transform: Transform = {
      x: 400 + viewport.x,
      y: 300 + viewport.y,
      scaleX: 1,
      scaleY: 1,
      rotation: 0
    };

    const components = new Map<string, Component>();
    template.components.forEach((value, key) => {
      components.set(key, value);
    });

    const newEntity: Entity = {
      id: `entity-${Date.now()}`,
      transform,
      components
    };

    const newEntities = new Map(scene.entities);
    newEntities.set(newEntity.id, newEntity);
    setScene({ ...scene, entities: newEntities });
    setSelectedEntityId(newEntity.id);
  }, [scene, viewport]);

  // Get default component values
  const getComponentDefault = (type: string): Component => {
    switch (type) {
      case 'transform':
        return { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
      case 'sprite':
        return { 
          image: new Image(),
          width: 32, 
          height: 32,
          offsetX: 0,
          offsetY: 0
        };
      case 'movement':
        return { vx: 0, vy: 0, speed: 200 };
      case 'collision':
        return { width: 32, height: 32, type: 'wall' };
      case 'ai':
        return { type: 'patrol' };
      default:
        return { x: 0, y: 0 };
    }
  };

  // Get selected entity type for AI context
  const getSelectedEntityType = (): string => {
    if (!selectedEntityId) return '';
    
    const entity = scene?.entities.get(selectedEntityId);
    if (!entity) return '';
    
    // Determine type based on components
    const comps = entity.components || new Map();
    if (comps.has('movement')) return 'Player';
    if (comps.has('collision') && (comps.get('collision') as any)?.type === 'wall') return 'Platform';
    if (comps.has('collision') && (comps.get('collision') as any)?.type === 'collectible') return 'Collectible';
    if (comps.has('ai')) return 'Enemy';
    if (comps.has('sprite')) return 'Sprite';
    return 'Entity';
  };

  // Zoom controls
  const handleZoomIn = () => {
    setViewport(prev => ({ ...prev, zoom: Math.min(prev.zoom * 1.25, 4) }));
  };

  const handleZoomOut = () => {
    setViewport(prev => ({ ...prev, zoom: Math.max(prev.zoom / 1.25, 0.25) }));
  };

  const handleResetView = () => {
    setViewport({ x: 0, y: 0, zoom: 1 });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="scene-editor-page">
        <div className="loading-state">
          <div className="loading-spinner" />
          <p>Loading scene editor...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="scene-editor-page">
        <div className="error-banner">
          <div className="error-icon">⚠️</div>
          <div>
            <h3>Error Loading Scene</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Main editor interface
  return (
    <div className="scene-editor-page">
      {/* Header with project info and controls */}
      <header className="scene-editor-header">
        <div className="project-info">
          <h2>Scene Editor</h2>
          <p className="project-name">{projectName}</p>
        </div>

        <div className="editor-actions">
          <button
            className="action-btn"
            onClick={saveScene}
            title="Save scene"
          >
            <SaveIcon size={18} />
            <span>Save</span>
          </button>

          <div className="zoom-controls">
            <button
              className="icon-btn"
              onClick={handleZoomOut}
              title="Zoom out"
            >
              <ZoomOut size={18} />
            </button>
            <span className="zoom-level">{Math.round(viewport.zoom * 100)}%</span>
            <button
              className="icon-btn"
              onClick={handleZoomIn}
              title="Zoom in"
            >
              <ZoomIn size={18} />
            </button>
            <button
              className="icon-btn"
              onClick={handleResetView}
              title="Reset view"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Tool options */}
      <div className="tool-options">
        <div className="view-options">
          <label className="option-toggle">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            <span>Show Grid</span>
          </label>
          <label className="option-toggle">
            <input
              type="checkbox"
              checked={snapping}
              onChange={(e) => setSnapping(e.target.checked)}
            />
            <span>Snap to Grid</span>
          </label>
        </div>
        <div className="entity-actions">
          <button
            className={`action-btn ${toolMode === 'add-entity' ? 'active' : ''}`}
            onClick={() => setToolMode(toolMode === 'add-entity' ? 'select' : 'add-entity')}
            title="Add entity mode"
          >
            <Plus size={16} />
            <span>Add Entity</span>
          </button>
        </div>
      </div>

      {/* AI Assistant Bar */}
      <SceneEditorAIBar
        projectId={projectId || ''}
        selectedEntityId={selectedEntityId || undefined}
        selectedEntityType={getSelectedEntityType()}
        sceneEntities={entitiesArray}
      />

      {/* Main editor area */}
      <div className="scene-editor-container">
        <AssetBrowserPanel
          projectId={projectId || ''}
          selectedEntityId={selectedEntityId}
          onAttachAsset={handleAddAsset}
          assetCache={assetCache}
          setAssetCache={setAssetCache}
        />

        <SceneCanvas
          projectId={projectId || ''}
          scene={scene}
          entities={entitiesArray}
          selectedEntityId={selectedEntityId}
          toolMode={toolMode}
          selectedTemplate={selectedTemplate}
          viewport={viewport}
          showGrid={showGrid}
          snapping={snapping}
          gridSize={gridSize}
          onSelectEntity={handleSelectEntity}
          onUpdateScene={handleUpdateScene}
          onZoomViewport={handleZoomViewport}
          onPanViewport={handlePanViewport}
        />

        <PropertyInspector
          scene={scene}
          selectedEntityId={selectedEntityId}
          onUpdateProperty={handleUpdateProperty}
          onAddComponent={handleAddComponent}
          onRemoveComponent={handleRemoveComponent}
          onSelectEntity={handleSelectEntity}
          onDeleteEntity={handleDeleteEntity}
          onDuplicateEntity={handleDuplicateEntity}
        />
      </div>
    </div>
  );
}

export function SceneEditorPage() {
  const { projectId } = useParams<{ projectId: string }>();

  if (!projectId) {
    return (
      <div className="scene-editor-page">
        <div className="error-banner">
          <div className="error-icon">🎨</div>
          <div>
            <h3>No Project Selected</h3>
            <p>Please open a project first to access the scene editor.</p>
          </div>
        </div>
      </div>
    );
  }

  return <SceneEditorContent />;
}

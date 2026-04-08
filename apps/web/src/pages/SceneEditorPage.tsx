/**
 * @clawgame/web - Scene Editor Page
 * Main orchestrator page using decomposed components: AssetBrowserPanel, SceneCanvas, PropertyInspector
 *
 * v0.12.3 fixes:
 * - Scene Save: properly serializes Map→Array (was saving {} for entities)
 * - Add Entity: shows template picker dropdown instead of being a no-op
 * - Duplicate: generates readable entity names (player-1-copy instead of entity-1775666322645)
 * - Save feedback: shows toast on success/failure
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { api, type AssetMetadata } from '../api/client';
import { Entity, Scene, Transform, Component, Sprite } from '@clawgame/engine';
import { AssetBrowserPanel } from '../components/scene-editor/AssetBrowserPanel';
import { SceneCanvas } from '../components/scene-editor/SceneCanvas';
import { PropertyInspector } from '../components/scene-editor/PropertyInspector';
import { SceneEditorAIBar } from '../components/scene-editor/SceneEditorAIBar';
import { ToolMode, ENTITY_TEMPLATES } from '../components/scene-editor/types';
import { useToast } from '../components/Toast';
import { logger } from '../utils/logger';
import '../scene-editor.css';
import '../scene-editor-ai.css';
import { 
  Save as SaveIcon,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Plus,
  X,
  Check,
} from 'lucide-react';

/**
 * Serialize scene for JSON storage.
 * Converts Map<string, Entity> → Entity[] with plain-object components.
 * Also strips non-serializable fields like Image objects.
 */
function serializeScene(scene: Scene): string {
  const entities: any[] = [];
  
  scene.entities.forEach((entity, _key) => {
    // Convert components Map to plain object, stripping non-serializable fields
    const componentsObj: Record<string, any> = {};
    entity.components.forEach((value, key) => {
      if (key === 'sprite') {
        // Strip Image objects — save dimensions and color only
        const sprite = value as any;
        componentsObj[key] = {
          width: sprite.width || 32,
          height: sprite.height || 32,
          offsetX: sprite.offsetX || 0,
          offsetY: sprite.offsetY || 0,
          color: sprite.color || undefined,
        };
      } else if (key === 'transform') {
        // Skip — transform is stored at entity level
      } else if (value && typeof value === 'object' && value instanceof Image) {
        // Skip raw Image objects
      } else {
        componentsObj[key] = value;
      }
    });

    entities.push({
      id: entity.id,
      transform: entity.transform,
      components: componentsObj,
    });
  });

  return JSON.stringify({
    name: scene.name,
    entities,
  }, null, 2);
}

/**
 * Generate a readable entity name on duplicate.
 * "player-1" → "player-1-copy", "player-1-copy" → "player-1-copy-2"
 */
function generateDuplicateId(originalId: string, existingIds: Set<string>): string {
  const base = `${originalId}-copy`;
  if (!existingIds.has(base)) return base;
  
  let counter = 2;
  while (existingIds.has(`${base}-${counter}`)) {
    counter++;
  }
  return `${base}-${counter}`;
}

function SceneEditorContent() {
  const { projectId } = useParams<{ projectId: string }>();
  const { showToast } = useToast();
  
  // Main state
  const [scene, setScene] = useState<Scene | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editor state
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapping, setSnapping] = useState(true);
  const [gridSize] = useState(32);

  // Tool mode and template
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  // Template picker dropdown state
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const templatePickerRef = useRef<HTMLDivElement>(null);

  // Asset cache - map of asset ID to loaded image
  const [assetCache, setAssetCache] = useState<Map<string, HTMLImageElement>>(new Map());

  // Helper to convert entities Map to array for components
  const entitiesArray = scene ? Array.from(scene.entities.values()) : [];

  // Close template picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (templatePickerRef.current && !templatePickerRef.current.contains(e.target as Node)) {
        setShowTemplatePicker(false);
      }
    };
    if (showTemplatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTemplatePicker]);


  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Delete / Backspace — delete selected entity
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEntityId) {
        e.preventDefault();
        handleDeleteEntity(selectedEntityId);
        return;
      }
      // Ctrl/Cmd + D — duplicate selected entity
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault();
        if (selectedEntityId) handleDuplicateEntity(selectedEntityId);
        return;
      }
      // Ctrl/Cmd + S — save scene
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveScene();
        return;
      }
      // V — select tool
      if (e.key === "v") { setToolMode("select"); return; }
      // G — move tool
      if (e.key === "g") { setToolMode("move"); return; }
      // Escape — deselect
      if (e.key === "Escape") {
        setSelectedEntityId(null);
        setToolMode("select");
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedEntityId, scene, showTemplatePicker]);


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
        
        // Convert JSON to Map for entities
        if (sceneContent && sceneContent.entities) {
          const entities = new Map<string, Entity>();
          const entitiesObj = sceneContent.entities;
          
          if (Array.isArray(entitiesObj)) {
            // Preferred format: entities as array
            entitiesObj.forEach((entity: any) => {
              if (entity && entity.id) {
                const components = new Map<string, Component>();
                if (entity.components && typeof entity.components === 'object') {
                  for (const [key, value] of Object.entries(entity.components)) {
                    components.set(key, value as Component);
                  }
                }
                const transform: Transform = entity.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
                entities.set(entity.id, { 
                  id: entity.id, 
                  transform,
                  components 
                });
              }
            });
          } else if (typeof entitiesObj === 'object' && !(entitiesObj instanceof Map)) {
            // Legacy format: entities as keyed object
            for (const [key, entity] of Object.entries(entitiesObj as Record<string, any>)) {
              if (entity && entity.id) {
                const components = new Map<string, Component>();
                if (entity.components && typeof entity.components === 'object') {
                  for (const [compKey, compValue] of Object.entries(entity.components)) {
                    components.set(compKey, compValue as Component);
                  }
                }
                const transform: Transform = entity.transform || { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
                entities.set(key, { ...entity, transform, components });
              }
            }
          }
          
          if (entities.size > 0) {
            setScene({ name: sceneContent.name || 'Main Scene', entities });
          }
        }
      } catch (sceneErr) {
        logger.warn('No existing scene found, creating default:', sceneErr);
      }
      
      // If no scene was loaded, create a default one
      if (!scene) {
        const transform: Transform = { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 };
        
        const playerComponents = new Map<string, Component>();
        playerComponents.set('transform', transform);
        playerComponents.set('movement', { vx: 0, vy: 0, speed: 200 });
        playerComponents.set('sprite', { 
          width: 32, 
          height: 48,
          color: '#3b82f6',
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

    setSaving(true);
    try {
      await api.createDirectory(projectId, 'scenes');
      const sceneContent = serializeScene(scene);
      await api.writeFile(projectId, 'scenes/main-scene.json', sceneContent);
      
      logger.info('Scene saved successfully');
      showToast({ type: 'success', message: `Scene saved — ${scene.entities.size} entities persisted` });
    } catch (err) {
      logger.error('Error saving scene:', err);
      const msg = err instanceof Error ? err.message : 'Failed to save scene';
      setError(msg);
      showToast({ type: 'error', message: `Save failed: ${msg}` });
    } finally {
      setSaving(false);
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
    
    // Generate readable name
    const existingIds = new Set(scene.entities.keys());
    const newId = generateDuplicateId(entityId, existingIds);
    
    const newEntity: Entity = {
      ...entity,
      id: newId,
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
      
      const transform: Transform = { 
        x: viewport.x + 400, 
        y: viewport.y + 300, 
        scaleX: 1, 
        scaleY: 1, 
        rotation: 0 
      };
      
      const components = new Map<string, Component>();
      components.set('transform', transform);
      components.set('sprite', { width: 32, height: 32, color: '#8b5cf6' });
      components.set('collision', { width: 32, height: 32, type: 'wall' });

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

  // Add entity from template — actually creates the entity immediately
  const handleAddEntityFromTemplate = useCallback((templateId: string) => {
    if (!scene) {
      // If no scene exists, create one
      const template = ENTITY_TEMPLATES.find(t => t.id === templateId);
      if (!template) return;

      const transform: Transform = {
        x: 400,
        y: 300,
        scaleX: 1,
        scaleY: 1,
        rotation: 0
      };

      const components = new Map<string, Component>();
      template.components.forEach((value, key) => {
        components.set(key, value);
      });
      // Always add transform
      components.set('transform', transform);

      const newEntity: Entity = {
        id: `${templateId}-1`,
        transform,
        components
      };

      setScene({
        name: 'Main Scene',
        entities: new Map([[newEntity.id, newEntity]])
      });
      setSelectedEntityId(newEntity.id);
      setShowTemplatePicker(false);
      setToolMode('select');
      showToast({ type: 'success', message: `Added ${template.name} to scene` });
      return;
    }

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
    // Always add transform to the entity
    components.set('transform', transform);

    // Generate readable ID
    const existingIds = new Set(scene.entities.keys());
    let entityId = `${templateId}-1`;
    let counter = 1;
    while (existingIds.has(entityId)) {
      counter++;
      entityId = `${templateId}-${counter}`;
    }

    const newEntity: Entity = {
      id: entityId,
      transform,
      components
    };

    const newEntities = new Map(scene.entities);
    newEntities.set(newEntity.id, newEntity);
    setScene({ ...scene, entities: newEntities });
    setSelectedEntityId(newEntity.id);
    setShowTemplatePicker(false);
    setToolMode('select');
    showToast({ type: 'success', message: `Added ${template.name} (${entityId}) to scene` });
  }, [scene, viewport, showToast]);

  // Get default component values
  const getComponentDefault = (type: string): Component => {
    switch (type) {
      case 'transform':
        return { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 };
      case 'sprite':
        return { 
          width: 32, 
          height: 32,
          offsetX: 0,
          offsetY: 0,
          color: '#8b5cf6',
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
    if (comps.has('playerInput')) return 'Player';
    if (comps.has('movement')) return 'Player';
    if (comps.has('ai')) return 'Enemy';
    if (comps.has('collision') && (comps.get('collision') as any)?.type === 'wall') return 'Platform';
    if (comps.has('collision') && (comps.get('collision') as any)?.type === 'collectible') return 'Collectible';
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
            disabled={saving}
            title="Save scene (⌘S)"
          >
            <SaveIcon size={18} />
            <span>{saving ? 'Saving...' : 'Save'}</span>
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
        <div className="entity-actions" ref={templatePickerRef} style={{ position: 'relative' }}>
          <button
            className={`action-btn ${showTemplatePicker ? 'active' : ''}`}
            onClick={() => setShowTemplatePicker(!showTemplatePicker)}
            title="Add entity from template"
          >
            <Plus size={16} />
            <span>Add Entity</span>
          </button>
          
          {/* Template picker dropdown */}
          {showTemplatePicker && (
            <div className="template-picker-dropdown">
              <div className="template-picker-header">
                <span>Add Entity</span>
                <button className="template-picker-close" onClick={() => setShowTemplatePicker(false)}>
                  <X size={14} />
                </button>
              </div>
              {ENTITY_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  className="template-picker-item"
                  onClick={() => handleAddEntityFromTemplate(template.id)}
                  title={`Add ${template.name}`}
                >
                  <span className="template-name">{template.name}</span>
                  <span className="template-meta">
                    {Array.from(template.components.keys()).join(', ')}
                  </span>
                </button>
              ))}
            </div>
          )}
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

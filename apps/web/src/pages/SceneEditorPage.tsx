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
import { Entity, Scene, Transform, Component, SpriteComponent as Sprite } from '@clawgame/engine';
import { AssetBrowserPanel } from '../components/scene-editor/AssetBrowserPanel';
import { SceneCanvas } from '../components/scene-editor/SceneCanvas';
import { PropertyInspector } from '../components/scene-editor/PropertyInspector';
import { SceneHierarchyTree } from '../components/scene-editor/SceneHierarchyTree';
import { SceneEditorAIBar } from '../components/scene-editor/SceneEditorAIBar';
import { AnimationsPanel } from '../components/scene-editor/AnimationsPanel';
import { PrefabPanel } from '../components/scene-editor/PrefabPanel';
import { createDefaultAnimationsConfig, createDefaultPrefabLibrary, instantiatePrefab, compileScene } from '@clawgame/engine';
import { ToolMode, ENTITY_TEMPLATES, type EntityTemplate } from '../components/scene-editor/types';
import { useToast } from '../components/Toast';
import { logger } from '../utils/logger';
import { createDefaultEditorScene, deserializeEditorScene, getSceneInitialViewport, serializeEditorScene, type EditorScene, type EditorSceneMetadata } from '../utils/sceneEditorScene';
import '../scene-editor.css';
import '../scene-editor-ai.css';
import { 
  Save as SaveIcon,
  FileCode2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Plus,
  X,
  Check,
} from 'lucide-react';

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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showCompiledCode, setShowCompiledCode] = useState(false);
  const [compiledCode, setCompiledCode] = useState<string>('');

  // Editor state
  const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
  const [showGrid, setShowGrid] = useState(true);
  const [snapping, setSnapping] = useState(true);
  const [showPhysicsDebug, setShowPhysicsDebug] = useState(false);
  const [showAnimations, setShowAnimations] = useState(false);
  const [animationsConfig, setAnimationsConfig] = useState(() => createDefaultAnimationsConfig());
  const [showPrefabs, setShowPrefabs] = useState(false);
  const [prefabLibrary, setPrefabLibrary] = useState(() => createDefaultPrefabLibrary());
  const [gridSize] = useState(32);

  // Tool mode and template
  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  
  // Template picker dropdown state
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const templatePickerRef = useRef<HTMLDivElement>(null);
  const leftSidebarRef = useRef<HTMLDivElement>(null);

  // Asset cache - map of asset ID to loaded image
  const [assetCache, setAssetCache] = useState<Map<string, HTMLImageElement>>(new Map());

  // Helper to convert entities Map to array for components
  const entitiesArray = scene ? Array.from(scene.entities.values()) : [];
  const templateGroups = ENTITY_TEMPLATES.reduce((groups, template) => {
    const group = template.category || 'Display';
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push(template);
    return groups;
  }, new Map<string, EntityTemplate[]>());

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
      setSelectedEntityId(null);
      const project = await api.getProject(id);
      setProjectName(project?.name || 'Unknown Project');
      
      // Try to load existing scene
      try {
        const sceneData = await api.readFile(id, 'scenes/main-scene.json');
        const sceneContent = JSON.parse(sceneData.content) as any;
        const loadedScene = deserializeEditorScene(sceneContent);
        setScene(loadedScene);
        setViewport(getSceneInitialViewport(loadedScene));
      } catch (sceneErr) {
        logger.warn('No existing scene found, creating default:', sceneErr);
        const defaultScene = createDefaultEditorScene();
        setScene(defaultScene);
        setViewport(getSceneInitialViewport(defaultScene));
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
      const sceneContent = serializeEditorScene(scene);
      await api.writeFile(projectId, 'scenes/main-scene.json', sceneContent);
      
      setLastSaved(new Date());
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

  const handleUpdateEntity = useCallback((entityId: string, patch: Partial<Entity>) => {
    if (!scene) return;

    const entity = scene.entities.get(entityId);
    if (!entity) return;

    const updatedEntity: Entity = { ...entity, ...patch };
    const newEntities = new Map(scene.entities);
    newEntities.set(entityId, updatedEntity);
    setScene({ ...scene, entities: newEntities });
  }, [scene]);

  const handleUpdateComponent = useCallback((componentType: string, data: Record<string, any>) => {
    if (!selectedEntityId || !scene) return;

    const entity = scene.entities.get(selectedEntityId);
    if (!entity) return;

    const newComponents = new Map(entity.components);
    newComponents.set(componentType, data as Component);

    const updatedEntity: Entity = { ...entity, components: newComponents };
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

  const handleToggleVisibility = useCallback((entityId: string) => {
    if (!scene) return;
    const entity = scene.entities.get(entityId);
    if (!entity) return;
    const updatedEntity: Entity = { ...entity, visible: entity.visible === false };
    const newEntities = new Map(scene.entities);
    newEntities.set(entityId, updatedEntity);
    setScene({ ...scene, entities: newEntities });
  }, [scene]);

  const handleToggleLock = useCallback((entityId: string) => {
    if (!scene) return;
    const entity = scene.entities.get(entityId);
    if (!entity) return;
    const updatedEntity: Entity = { ...entity, locked: !entity.locked };
    const newEntities = new Map(scene.entities);
    newEntities.set(entityId, updatedEntity);
    setScene({ ...scene, entities: newEntities });
  }, [scene]);

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

  const handleInstantiatePrefab = useCallback((prefabKey: string, x: number, y: number) => {
    if (!scene) return;
    const prefab = prefabLibrary.prefabs.find((p) => p.key === prefabKey);
    if (!prefab) return;
    const newEntities = instantiatePrefab(prefab, `inst-${Date.now()}`, x, y);
    const nextEntities = new Map(scene.entities);
    for (const e of newEntities) nextEntities.set(e.id, e);
    const updatedScene: Scene = { ...scene, entities: nextEntities };
    setScene(updatedScene);
  }, [scene, prefabLibrary]);

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
      name: `${entity.name || entity.id} copy`,
      components: new Map(entity.components),
      transform: { 
        ...entity.transform, 
        x: entity.transform.x + 32, 
        y: entity.transform.y + 32 
      },
      visible: entity.visible !== false,
      locked: false,
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
      const cachedImage = assetCache.get(assetId);
      const selectedEntity = selectedEntityId ? scene?.entities.get(selectedEntityId) : null;
      const spriteWidth = cachedImage?.naturalWidth || cachedImage?.width || 64;
      const spriteHeight = cachedImage?.naturalHeight || cachedImage?.height || 64;

      if (selectedEntity && scene) {
        const updatedComponents = new Map(selectedEntity.components);
        const existingSprite = (updatedComponents.get('sprite') as Sprite | undefined) || {};
        updatedComponents.set('sprite', {
          ...existingSprite,
          assetRef: asset.id,
          width: existingSprite.width || spriteWidth,
          height: existingSprite.height || spriteHeight,
        });

        if (!updatedComponents.has('collision')) {
          updatedComponents.set('collision', {
            width: spriteWidth,
            height: spriteHeight,
            type: selectedEntity.type === 'player' ? 'player' : selectedEntity.type === 'enemy' ? 'enemy' : 'wall',
          });
        }

        const updatedEntity: Entity = {
          ...selectedEntity,
          phaserKind: selectedEntity.phaserKind || 'image',
          components: updatedComponents,
        };
        const newEntities = new Map(scene.entities);
        newEntities.set(updatedEntity.id, updatedEntity);
        setScene({ ...scene, entities: newEntities });
        showToast({ type: 'success', message: `Attached ${asset.name} to ${updatedEntity.id}` });
        return;
      }
      
      const transform: Transform = { 
        x: 400, 
        y: 300, 
        scaleX: 1, 
        scaleY: 1, 
        rotation: 0 
      };
      
      const components = new Map<string, Component>();
      components.set('sprite', {
        width: spriteWidth,
        height: spriteHeight,
        assetRef: asset.id,
      });
      components.set('collision', { width: spriteWidth, height: spriteHeight, type: 'wall' });

      const newEntity: Entity = {
        id: `entity-${Date.now()}`,
        name: asset.name,
        type: 'custom',
        phaserKind: 'image',
        visible: true,
        locked: false,
        transform,
        components,
      };
      
      const newEntities = new Map(scene?.entities);
      newEntities.set(newEntity.id, newEntity);
      setScene(prev => prev ? { ...prev, entities: newEntities } : null);
      setSelectedEntityId(newEntity.id);
      
      logger.info('Added asset as entity:', asset.name);
      showToast({ type: 'success', message: `Added ${asset.name} to scene` });
    } catch (err) {
      logger.error('Error loading asset:', err);
      showToast({ type: 'error', message: 'Failed to attach asset to scene' });
    }
  }, [assetCache, projectId, scene, selectedEntityId, showToast]);

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
        name: template.name,
        type: template.type,
        phaserKind: template.phaserKind,
        visible: true,
        locked: false,
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
      name: template.name,
      type: template.type,
      phaserKind: template.phaserKind,
      visible: true,
      locked: false,
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
        return { width: 32, height: 32, type: 'wall', immovable: true, allowGravity: false, bounce: 0, drag: 0, offsetX: 0, offsetY: 0 };
      case 'ai':
        return { type: 'patrol', patrolSpeed: 50 };
      case 'text':
        return { content: 'Hello', fontSize: 16, color: '#ffffff', fontFamily: 'sans-serif' };
      case 'particles':
        return { rate: 10, lifespan: 1000, speed: 50, color: '#f97316' };
      case 'collectible':
        return { type: 'coin', value: 10, name: 'Coin' };
      case 'container':
        return { children: [] };
      case 'tween':
        return { duration: 500, ease: 'linear', repeat: 0 };
      default:
        return { x: 0, y: 0 };
    }
  };

  const focusAssetBrowser = useCallback(() => {
    const input = leftSidebarRef.current?.querySelector<HTMLInputElement>('.asset-search input');
    input?.focus();
  }, []);

  // Get selected entity type for AI context
  const getSelectedEntityType = (): string => {
    if (!selectedEntityId) return '';
    
    const entity = scene?.entities.get(selectedEntityId);
    if (!entity) return '';
    
    if (entity.type) {
      return entity.type.charAt(0).toUpperCase() + entity.type.slice(1);
    }

    const comps = entity.components || new Map();
    if (comps.has('playerInput')) return 'Player';
    if (comps.has('ai')) return 'Enemy';
    if (comps.has('collision') && (comps.get('collision') as any)?.type === 'wall') return 'Platform';
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
          {lastSaved && (
            <span className="autosave-indicator" style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            className="tool-button"
            onClick={() => {
              if (!scene) return;
              const code = compileScene(scene, { className: (scene.name || 'Main').replace(/[^a-zA-Z0-9]/g, '') + 'Scene', language: 'typescript' });
              setCompiledCode(code);
              setShowCompiledCode(true);
            }}
            title="Compile scene to Phaser 4 code"
          >
            <FileCode2 size={14} />
            <span>Compile</span>
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
          <label className="option-toggle">
            <input
              type="checkbox"
              checked={showPhysicsDebug}
              onChange={(e) => {
                const show = e.target.checked;
                setShowPhysicsDebug(show);
              }}
            />
            <span>Physics Debug</span>
          </label>
          <label className="option-toggle">
            <input
              type="checkbox"
              checked={showAnimations}
              onChange={(e) => setShowAnimations(e.target.checked)}
            />
            <span>Animations</span>
          </label>
          <label className="option-toggle">
            <input
              type="checkbox"
              checked={showPrefabs}
              onChange={(e) => setShowPrefabs(e.target.checked)}
            />
            <span>Prefabs</span>
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
              {Array.from(templateGroups.entries()).map(([category, templates]) => (
                <div key={category} className="template-picker-group">
                  <div className="template-picker-group-label">{category}</div>
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      className="template-picker-item"
                      onClick={() => handleAddEntityFromTemplate(template.id)}
                      title={`Add ${template.name}`}
                    >
                      <span className="template-name">{template.name}</span>
                      <span className="template-meta">
                        {template.phaserKind} · {Array.from(template.components.keys()).join(', ')}
                      </span>
                    </button>
                  ))}
                </div>
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
        <div className="scene-left-sidebar" ref={leftSidebarRef}>
          <SceneHierarchyTree
            entities={entitiesArray}
            selectedEntityId={selectedEntityId}
            onSelectEntity={handleSelectEntity}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onRenameEntity={(entityId, name) => handleUpdateEntity(entityId, { name })}
            onDuplicateEntity={handleDuplicateEntity}
          />
          <AssetBrowserPanel
            projectId={projectId || ''}
            selectedEntityId={selectedEntityId}
            onAttachAsset={handleAddAsset}
            assetCache={assetCache}
            setAssetCache={setAssetCache}
          />
        </div>

        <SceneCanvas
          projectId={projectId || ''}
          scene={scene}
          entities={entitiesArray}
          assetCache={assetCache}
          selectedEntityId={selectedEntityId}
          toolMode={toolMode}
          selectedTemplate={selectedTemplate}
          viewport={viewport}
          showGrid={showGrid}
          showPhysicsDebug={showPhysicsDebug}
          snapping={snapping}
          gridSize={gridSize}
          onSelectEntity={handleSelectEntity}
          onUpdateScene={handleUpdateScene}
          onDeleteEntity={handleDeleteEntity}
          onDuplicateEntity={handleDuplicateEntity}
          onZoomViewport={handleZoomViewport}
          onPanViewport={handlePanViewport}
        />

        {showPrefabs && (
          <PrefabPanel
            library={prefabLibrary}
            onLibraryChange={setPrefabLibrary}
            sceneEntities={Array.from(scene?.entities.values() || [])}
            onInstantiatePrefab={handleInstantiatePrefab}
          />
        )}
        {showAnimations && (
          <AnimationsPanel
            config={animationsConfig}
            onConfigChange={setAnimationsConfig}
          />
        )}
        <PropertyInspector
          scene={scene}
          selectedEntityId={selectedEntityId}
          onUpdateProperty={handleUpdateProperty}
          onUpdateEntity={handleUpdateEntity}
          onAddComponent={handleAddComponent}
          onRemoveComponent={handleRemoveComponent}
          onUpdateComponent={handleUpdateComponent}
          onBrowseAssets={focusAssetBrowser}
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

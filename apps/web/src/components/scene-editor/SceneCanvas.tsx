/**
 * @clawgame/web - Scene Canvas Component
 * Phaser 4-powered editor canvas with real-time rendering, physics debug, and camera controls.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Component, Entity, Scene } from '@clawgame/engine';
import { ToolMode, ViewportState } from './types';
import { SceneEditorRuntime } from '../../runtime/SceneEditorRuntime';
import { logger } from '../../utils/logger';

interface SceneCanvasProps {
  projectId: string;
  scene: Scene | null;
  entities: Entity[];
  assetCache: Map<string, HTMLImageElement>;
  selectedEntityId: string | null;
  toolMode: ToolMode;
  selectedTemplate: any | null;
  viewport: ViewportState;
  showGrid: boolean;
  showPhysicsDebug?: boolean;
  snapping: boolean;
  gridSize: number;
  onSelectEntity: (entityId: string | null) => void;
  onUpdateScene: (newScene: Scene) => void;
  onDeleteEntity: (entityId: string) => void;
  onDuplicateEntity: (entityId: string) => void;
  onZoomViewport: (offsetX: number, offsetY: number, newZoom: number) => void;
  onPanViewport: (offsetX: number, offsetY: number) => void;
}

export function SceneCanvas({
  scene,
  entities,
  assetCache,
  selectedEntityId,
  toolMode,
  selectedTemplate,
  viewport,
  showGrid,
  showPhysicsDebug,
  snapping,
  gridSize,
  onSelectEntity,
  onUpdateScene,
  onDeleteEntity,
  onDuplicateEntity,
  onZoomViewport,
}: SceneCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<SceneEditorRuntime | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const onSelectEntityRef = useRef(onSelectEntity);
  const onUpdateSceneRef = useRef(onUpdateScene);
  const onDeleteEntityRef = useRef(onDeleteEntity);
  const onDuplicateEntityRef = useRef(onDuplicateEntity);
  const onZoomViewportRef = useRef(onZoomViewport);

  onSelectEntityRef.current = onSelectEntity;
  onUpdateSceneRef.current = onUpdateScene;
  onDeleteEntityRef.current = onDeleteEntity;
  onDuplicateEntityRef.current = onDuplicateEntity;
  onZoomViewportRef.current = onZoomViewport;

  // Mount/unmount Phaser game
  useEffect(() => {
    if (!containerRef.current) return;
    const runtime = new SceneEditorRuntime();
    runtime.mount(containerRef.current);
    runtimeRef.current = runtime;

    const phaserScene = runtime.getScene();
    if (phaserScene) {
      phaserScene.onEntitySelected = (id) => onSelectEntityRef.current(id);
      phaserScene.onEntityMoved = (entityId, x, y) => {
        const currentScene = sceneRef.current;
        if (!currentScene) return;
        const entity = currentScene.entities.get(entityId);
        if (!entity) return;
        const updated = { ...entity, transform: { ...entity.transform, x, y } };
        const newEntities = new Map(currentScene.entities).set(entityId, updated);
        onUpdateSceneRef.current({ ...currentScene, entities: newEntities });
      };
      phaserScene.onEntityDeleted = (entityId) => {
        onDeleteEntityRef.current(entityId);
      };
      phaserScene.onEntityDuplicated = (entityId) => {
        onDuplicateEntityRef.current(entityId);
      };
      phaserScene.onViewportChanged = (nextViewport) => {
        onZoomViewportRef.current(nextViewport.x, nextViewport.y, nextViewport.zoom);
      };
    }

    return () => {
      runtime.destroy();
      runtimeRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep scene ref current
  sceneRef.current = scene;

  // Sync entities to Phaser
  useEffect(() => {
    const phaserScene = runtimeRef.current?.getScene();
    if (!phaserScene) return;
    phaserScene.syncEntities(entities, assetCache);
  }, [entities, assetCache]);

  // Sync selection
  useEffect(() => {
    const phaserScene = runtimeRef.current?.getScene();
    if (!phaserScene) return;
    phaserScene.setSelectedEntity(selectedEntityId);
  }, [selectedEntityId]);

  // Sync editor state
  useEffect(() => {
    const phaserScene = runtimeRef.current?.getScene();
    if (!phaserScene) return;
    phaserScene.showGrid = showGrid;
    phaserScene.gridSize = gridSize;
    phaserScene.snapping = snapping;
    phaserScene.togglePhysicsDebug(Boolean(showPhysicsDebug));
    phaserScene.drawGrid();
  }, [showGrid, gridSize, snapping, showPhysicsDebug]);

  // Sync viewport
  useEffect(() => {
    const phaserScene = runtimeRef.current?.getScene();
    if (!phaserScene) return;
    phaserScene.setViewport(viewport.x, viewport.y, viewport.zoom);
  }, [viewport]);

  // Handle ghost entity for template placement
  useEffect(() => {
    const phaserScene = runtimeRef.current?.getScene();
    if (!phaserScene) return;
    if (toolMode === 'add-entity' && selectedTemplate) {
      phaserScene.showGhostEntity({
        type: selectedTemplate.type,
        width: 32,
        height: 32,
        color: '#8b5cf6',
      });
    } else {
      phaserScene.showGhostEntity(null);
    }
  }, [toolMode, selectedTemplate]);

  // Drop asset handler (preserve drag-and-drop from asset browser)
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const currentScene = sceneRef.current;
    const phaserScene = runtimeRef.current?.getScene();
    if (!currentScene || !phaserScene) return;

    const rawPayload =
      e.dataTransfer.getData('application/json') ||
      e.dataTransfer.getData('text/plain');
    if (!rawPayload) return;

    try {
      const payload = JSON.parse(rawPayload) as {
        assetId?: string;
        id?: string;
        name?: string;
        type?: string;
        url?: string;
        width?: number;
        height?: number;
      };
      const assetId = payload.assetId || payload.id;
      if (!assetId) return;

      const cachedImage = assetCache.get(assetId);
      const width = payload.width || cachedImage?.naturalWidth || cachedImage?.width || 64;
      const height = payload.height || cachedImage?.naturalHeight || cachedImage?.height || 64;
      const world = phaserScene.screenToWorld(e.clientX, e.clientY);
      const x = snapping ? Math.round(world.x / gridSize) * gridSize : world.x;
      const y = snapping ? Math.round(world.y / gridSize) * gridSize : world.y;
      const existingIds = new Set(currentScene.entities.keys());
      const baseId = `${assetId.replace(/[^a-zA-Z0-9_-]/g, '-')}-entity`;
      let entityId = baseId;
      let counter = 2;
      while (existingIds.has(entityId)) {
        entityId = `${baseId}-${counter}`;
        counter += 1;
      }

      const components = new Map<string, Component>();
      components.set('sprite', {
        width,
        height,
        assetRef: assetId,
      });
      components.set('collision', {
        width,
        height,
        type: 'wall',
      });

      const newEntity: Entity = {
        id: entityId,
        name: payload.name || assetId,
        type: 'custom',
        phaserKind: 'image',
        visible: true,
        locked: false,
        transform: { x, y, scaleX: 1, scaleY: 1, rotation: 0 },
        components,
      };
      const newEntities = new Map(currentScene.entities);
      newEntities.set(newEntity.id, newEntity);
      onUpdateSceneRef.current({ ...currentScene, entities: newEntities });
      onSelectEntityRef.current(newEntity.id);
      logger.info('Asset dropped on Phaser canvas', { assetId, entityId });
    } catch (err) {
      logger.error('Failed to parse dropped asset payload:', err);
    }
  }, [assetCache, gridSize, snapping]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return (
    <div
      className="canvas-container"
      ref={containerRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{ width: '100%', height: '100%' }}
    />
  );
}

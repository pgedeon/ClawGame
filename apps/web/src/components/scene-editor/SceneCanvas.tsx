/**
 * @clawgame/web - Scene Canvas Component
 * Phaser 4-powered editor canvas with real-time rendering, physics debug, and camera controls.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Entity, Scene } from '@clawgame/engine';
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
  snapping: boolean;
  gridSize: number;
  onSelectEntity: (entityId: string | null) => void;
  onUpdateScene: (newScene: Scene) => void;
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
  snapping,
  gridSize,
  onSelectEntity,
  onUpdateScene,
}: SceneCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<SceneEditorRuntime | null>(null);
  const sceneRef = useRef<Scene | null>(null);

  // Mount/unmount Phaser game
  useEffect(() => {
    if (!containerRef.current) return;
    const runtime = new SceneEditorRuntime();
    runtime.mount(containerRef.current);
    runtimeRef.current = runtime;

    const phaserScene = runtime.getScene();
    if (phaserScene) {
      phaserScene.onEntitySelected = (id) => onSelectEntity(id);
      phaserScene.onEntityMoved = (entityId, x, y) => {
        const currentScene = sceneRef.current;
        if (!currentScene) return;
        const entity = currentScene.entities.get(entityId);
        if (!entity) return;
        const updated = { ...entity, transform: { ...entity.transform, x, y } };
        const newEntities = new Map(currentScene.entities).set(entityId, updated);
        onUpdateScene({ ...currentScene, entities: newEntities });
      };
      phaserScene.onViewportChanged = () => {
        // Viewport changes are handled internally by Phaser camera
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
    phaserScene.drawGrid();
  }, [showGrid, gridSize, snapping]);

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
    // Delegate to parent via onUpdateScene — asset drop creates entity
    // This is handled by the existing SceneEditorPage handleAddAsset
    logger.info('Asset dropped on Phaser canvas');
  }, []);

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

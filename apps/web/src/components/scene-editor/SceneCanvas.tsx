/**
 * @clawgame/web - Scene Canvas Component
 * Main canvas area for entity placement, selection, drag-and-drop, and viewport controls
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { api, type AssetMetadata } from '../../api/client';
import { Entity, Transform, Scene, SpriteComponent as Sprite, CollisionComponent as Collision } from '@clawgame/engine';
import { ToolMode, ViewportState } from './types';
import { logger } from '../../utils/logger';

interface SceneCanvasProps {
  projectId: string;
  scene: Scene | null;
  entities: Entity[];
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
  projectId,
  scene,
  entities,
  selectedEntityId,
  toolMode,
  selectedTemplate,
  viewport,
  showGrid,
  snapping,
  gridSize,
  onSelectEntity,
  onUpdateScene,
  onZoomViewport,
  onPanViewport,
}: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Interaction state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [entityDragOffset, setEntityDragOffset] = useState({ x: 0, y: 0 });

  // Asset cache ref
  const assetCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      render(ctx, canvas);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [scene, viewport, showGrid, gridSize]);

  // Render function
  const render = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (!scene) return;

    // Clear canvas
    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // Draw grid
    if (showGrid) {
      drawGrid(ctx, canvas.width, canvas.height);
    }

    // Draw entities
    entities.forEach((entity) => {
      drawEntity(ctx, entity, entity.id === selectedEntityId, assetCache.current);
    });

    ctx.restore();
  }, [scene, viewport, showGrid, gridSize, selectedEntityId, entities]);

  const drawGrid = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    // Calculate grid bounds based on viewport
    const startX = Math.floor(-viewport.x / (viewport.zoom * gridSize)) * gridSize;
    const startY = Math.floor(-viewport.y / (viewport.zoom * gridSize)) * gridSize;
    const endX = startX + Math.ceil(width / (viewport.zoom * gridSize)) * gridSize + gridSize;
    const endY = startY + Math.ceil(height / (viewport.zoom * gridSize)) * gridSize + gridSize;

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
  };

  const drawEntity = (
    ctx: CanvasRenderingContext2D,
    entity: Entity,
    isSelected: boolean,
    cache: Map<string, HTMLImageElement>
  ) => {
    const transform = entity.transform;
    const sprite = entity.components.get('sprite') as Sprite | undefined;
    const collision = entity.components.get('collision') as Collision | undefined;

    // Get entity dimensions
    let width = 32;
    let height = 32;

    if (sprite && typeof sprite.image === 'string') {
      // It's an asset ID - get image from cache
      const img = cache.get(sprite.image);
      if (img && img.complete) {
        width = sprite.width || 32;
        height = sprite.height || 32;
      }
    } else if (sprite && sprite.image instanceof HTMLImageElement && sprite.image.complete) {
      width = sprite.width || 32;
      height = sprite.height || 32;
    } else if (collision) {
      width = collision.width || 32;
      height = collision.height || 32;
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
    let spriteDrawn = false;
    if (sprite && typeof sprite.image === 'string') {
      const img = cache.get(sprite.image);
      if (img && img.complete) {
        ctx.drawImage(img, x, y, width, height);
        spriteDrawn = true;
      }
    } else if (sprite && sprite.image instanceof HTMLImageElement && sprite.image.complete) {
      ctx.drawImage(sprite.image, x, y, width, height);
      spriteDrawn = true;
    }

    if (!spriteDrawn) {
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
      ctx.strokeRect(x, y, collision.width || 32, collision.height || 32);
      ctx.setLineDash([]);
    }
  };

  // Canvas event handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!scene) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates
    const worldX = (mouseX - viewport.x) / viewport.zoom;
    const worldY = (mouseY - viewport.y) / viewport.zoom;

    // Check if we clicked on an entity
    let clickedEntity: Entity | null = null;

    // Reverse iteration to click top-most entities first
    for (let i = entities.length - 1; i >= 0; i--) {
      const entity = entities[i];
      const sprite = entity.components.get('sprite') as Sprite | undefined;
      const collision = entity.components.get('collision') as Collision | undefined;

      let width = 32;
      let height = 32;

      if (sprite) {
        width = sprite.width || 32;
        height = sprite.height || 32;
      } else if (collision) {
        width = collision.width || 32;
        height = collision.height || 32;
      }

      if (worldX >= entity.transform.x && worldX <= entity.transform.x + width &&
          worldY >= entity.transform.y && worldY <= entity.transform.y + height) {
        clickedEntity = entity;
        break;
      }
    }

    if (clickedEntity && toolMode === 'select') {
      onSelectEntity(clickedEntity.id);
      setIsDragging(true);
      setEntityDragOffset({
        x: worldX - clickedEntity.transform.x,
        y: worldY - clickedEntity.transform.y,
      });
    } else if (toolMode === 'select') {
      onSelectEntity(null);
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

      // Update scene
      const newScene = { ...scene };
      newScene.entities = new Map(scene.entities).set(newId, newEntity);
      onUpdateScene(newScene);
      onSelectEntity(newId);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !scene) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - viewport.x) / viewport.zoom;
    const worldY = (mouseY - viewport.y) / viewport.zoom;

    if (toolMode === 'select' && selectedEntityId && scene) {
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

        const newScene = { ...scene };
        newScene.entities = new Map(scene.entities).set(selectedEntityId, updatedEntity);
        onUpdateScene(newScene);
      }
    } else {
      // Pan viewport
      onPanViewport(mouseX - dragStart.x, mouseY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
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

    onZoomViewport(mouseX - worldX * newZoom, mouseY - worldY * newZoom, newZoom);
  };

  const handleDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
      const assetId = dragData.id;
      
      if (!assetId || !scene) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - viewport.x) / viewport.zoom;
      const worldY = (mouseY - viewport.y) / viewport.zoom;

      // Create entity from dropped asset
      const newId = `sprite-${Date.now()}`;
      const newPosition = snapping ? {
        x: Math.round(worldX / gridSize) * gridSize,
        y: Math.round(worldY / gridSize) * gridSize,
      } : { x: worldX, y: worldY };

      const components = new Map<string, any>();
      // Store asset ID in sprite component
      components.set('sprite', {
        image: assetId,
        width: 32,
        height: 32,
      });

      const newEntity: Entity = {
        id: newId,
        transform: {
          x: newPosition.x,
          y: newPosition.y,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        },
        components,
      };

      // Update scene
      const newScene = { ...scene };
      newScene.entities = new Map(scene.entities).set(newId, newEntity);
      onUpdateScene(newScene);
      onSelectEntity(newId);
    } catch (err) {
      logger.error('Failed to handle dropped asset:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
  };

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    render(ctx, canvas);
  }, [render]);

  return (
    <div className="canvas-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="scene-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      />
    </div>
  );
}

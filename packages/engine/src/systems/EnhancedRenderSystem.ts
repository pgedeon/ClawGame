/**
 * @clawgame/engine - Enhanced Render System
 *
 * Extended version of RenderSystem with sprite sheet support.
 * Renders individual frames from sprite sheets based on animation state.
 */

import { Scene, Entity, Transform, SpriteComponent, AnimationComponent, CollisionComponent } from '../types';
import { SpriteSheetSystem, SpriteSheetCache } from './SpriteSheetSystem';

export class EnhancedRenderSystem {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private spriteSheetSystem: SpriteSheetSystem | null = null;
  private lastFrameTime: number = 0;
  private deltaTime: number = 0;

  /**
   * Set the canvas for rendering
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    // Initialize sprite sheet system
    this.spriteSheetSystem = new SpriteSheetSystem();
    this.spriteSheetSystem.attach(canvas);
  }

  /**
   * Update with delta time
   */
  update(scene: Scene, deltaTime: number): void {
    this.deltaTime = deltaTime;
    const ctx = this.ctx;
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, this.canvas?.width || 800, this.canvas?.height || 600);

    // Sort entities by render order (simple z-order based on y position)
    const entities = Array.from(scene.entities.values()).sort((a, b) => {
      const aY = a.transform?.y || 0;
      const bY = b.transform?.y || 0;
      return aY - bY;
    });

    // Render each entity
    for (const entity of entities) {
      this.renderEntity(entity, ctx);
    }
  }

  private renderEntity(entity: Entity, ctx: CanvasRenderingContext2D): void {
    const transform = entity.transform;
    if (!transform) return;

    const sprite = entity.components.get('sprite') as SpriteComponent | undefined;
    const animation = entity.components.get('animation') as AnimationComponent | undefined;
    const collision = entity.components.get('collision') as CollisionComponent | undefined;

    // Save context state
    ctx.save();

    // Apply transform
    ctx.translate(transform.x + (transform.width || 0) / 2, transform.y + (transform.height || 0) / 2);
    ctx.scale(transform.scaleX || 1, transform.scaleY || 1);
    ctx.rotate(transform.rotation || 0);

    // Handle sprite sheet rendering
    if (sprite && sprite.spriteSheet && this.spriteSheetSystem) {
      this.renderSpriteSheetEntity(entity, sprite, animation, ctx);
    } 
    // Handle single sprite image
    else if (sprite?.image) {
      this.renderSingleSprite(entity, sprite, ctx);
    }
    // Handle colored rectangle fallback
    else if (sprite?.color) {
      this.renderColoredRect(entity, sprite, collision, ctx);
    }
    // Handle entity type fallback
    else {
      this.renderTypeRect(entity, collision, ctx);
    }

    // Apply sprite effects
    if (sprite?.opacity !== undefined) {
      ctx.globalAlpha = sprite.opacity;
    }

    // Restore context state
    ctx.restore();
  }

  private renderSpriteSheetEntity(
    entity: Entity, 
    sprite: SpriteComponent, 
    animation: AnimationComponent | undefined, 
    ctx: CanvasRenderingContext2D
  ): void {
    if (!this.spriteSheetSystem) return;

    // In a real implementation, this would load the sprite sheet from the API
    // For now, we'll use placeholder logic
    const projectId = 'default-project'; // This should come from scene context
    const spriteName = sprite.spriteSheet;

    // Determine which frame to render
    let frameIndex = 0; // Default to first frame
    
    if (animation && animation.currentFrame !== undefined) {
      frameIndex = animation.currentFrame;
    }

    // Apply sprite effects
    if (sprite?.flipX) {
      ctx.scale(-1, 1);
    }
    if (sprite?.flipY) {
      ctx.scale(1, -1);
    }

    // Draw the sprite sheet frame
    const sourceWidth = sprite.frameWidth || 32;
    const sourceHeight = sprite.frameHeight || 32;
    const targetWidth = sprite.width || sourceWidth;
    const targetHeight = sprite.height || sourceHeight;

    // For now, use a placeholder sprite sheet pattern
    // In production, this would use the actual sprite sheet image
    const hue = (entity.id.charCodeAt(0) * 37) % 360;
    ctx.fillStyle = `hsl(${hue},70%,60%)`;
    ctx.fillRect(-targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
    
    // Draw frame number
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(frameIndex.toString(), 0, 0);

    // Draw animation name if available
    if (animation && animation.frames) {
      ctx.fillStyle = '#fff';
      ctx.font = '10px Arial';
      ctx.fillText(`anim: ${animation.frames.length}f`, 0, -20);
    }
  }

  private renderSingleSprite(entity: Entity, sprite: SpriteComponent, ctx: CanvasRenderingContext2D): void {
    if (!sprite.image) return;
    const width = sprite.width || 32;
    const height = sprite.height || 32;
    ctx.drawImage(
      sprite.image as CanvasImageSource,
      -width / 2,
      -height / 2,
      width,
      height,
    );
  }
  private renderColoredRect(
    entity: Entity, 
    sprite: SpriteComponent, 
    collision: CollisionComponent | undefined, 
    ctx: CanvasRenderingContext2D
  ): void {
    const width = sprite.width || collision?.width || 32;
    const height = sprite.height || collision?.height || 32;

    ctx.fillStyle = sprite.color!;
    ctx.fillRect(-width / 2, -height / 2, width, height);
  }

  private renderTypeRect(
    entity: Entity, 
    collision: CollisionComponent | undefined, 
    ctx: CanvasRenderingContext2D
  ): void {
    const width = collision?.width || 32;
    const height = collision?.height || 32;

    const typeColors = {
      player: '#4ade80',
      enemy: '#f87171',
      projectile: '#60a5fa',
      collectible: '#fbbf24',
      obstacle: '#a1a1aa',
      tower: '#8b5cf6',
      unit: '#f97316',
      trap: '#ef4444',
      default: '#6b7280',
    };
    
    const color = typeColors[entity.type as keyof typeof typeColors] || typeColors.default;
    ctx.fillStyle = color;
    ctx.fillRect(-width / 2, -height / 2, width, height);
  }

  /**
   * Detach method for compatibility
   */
  detach(): void {
    this.canvas = null;
    this.ctx = null;
    this.spriteSheetSystem?.detach();
  }

  /**
   * Get the sprite sheet system for external use
   */
  getSpriteSheetSystem(): SpriteSheetSystem | null {
    return this.spriteSheetSystem;
  }
}
/**
 * @clawgame/engine - Render system
 *
 * Supports:
 * - Static sprites (single image or color fill)
 * - Sprite sheet animation (frame slicing via AnimationComponent)
 * - Individual frame images (AnimationComponent.frames as asset refs)
 */

import { Scene, RendererConfig, Entity, SpriteComponent, CollisionComponent, AnimationComponent, Transform } from '../types';

export class RenderSystem {
  private ctx: CanvasRenderingContext2D;
  private config: RendererConfig;
  private lastFrameTime = performance.now();
  private frameCount = 0;
  private fps = 60;
  private entityCount = 0;

  /** Cache of loaded frame images: assetRef → HTMLImageElement */
  private frameImageCache: Map<string, HTMLImageElement> = new Map();

  constructor(ctx: CanvasRenderingContext2D, config: RendererConfig) {
    this.ctx = ctx;
    this.config = config;
  }

  /** Pre-load a frame image for animation use */
  registerFrameImage(assetRef: string, image: HTMLImageElement): void {
    this.frameImageCache.set(assetRef, image);
  }

  /** Update the scene rendering */
  update(scene: Scene, deltaTime: number): void {
    this.entityCount = scene.entities.size;
    
    // Clear canvas if configured
    if (this.config.clearCanvas !== false) {
      this.ctx.clearRect(0, 0, this.config.width, this.config.height);
      
      // Background
      if (this.config.backgroundColor) {
        this.ctx.fillStyle = this.config.backgroundColor;
        this.ctx.fillRect(0, 0, this.config.width, this.config.height);
      }
    }

    // Update FPS counter
    this.updateFPS();

    // Draw entities
    for (const entity of scene.entities.values()) {
      this.drawEntity(entity);
    }

    // Draw debug info if enabled
    if (this.config.showGrid || this.config.showHitboxes || this.config.showFPS) {
      this.drawDebugInfo();
    }
  }

  /** Draw a single entity */
  private drawEntity(entity: Entity): void {
    const transform = entity.components.get('transform') as Transform | undefined;
    const sprite = entity.components.get('sprite') as SpriteComponent | undefined;
    const collision = entity.components.get('collision') as CollisionComponent | undefined;
    const animation = entity.components.get('animation') as AnimationComponent | undefined;

    if (!transform) return;

    const x = transform.x + (sprite?.offsetX ?? 0);
    const y = transform.y + (sprite?.offsetY ?? 0);
    const width = sprite?.width ?? 100;
    const height = sprite?.height ?? 100;
    const scaleX = transform.scaleX ?? 1;
    const scaleY = transform.scaleY ?? 1;

    this.ctx.save();
    this.ctx.translate(x + width / 2, y + height / 2);
    this.ctx.rotate((transform.rotation ?? 0) * Math.PI / 180);
    this.ctx.scale(scaleX, scaleY);

    // Shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.ctx.fillRect(-width / 2 + 4, -height / 2 + 4, width, height);

    // Determine which image to draw
    const frameImage = this.resolveFrameImage(sprite, animation);

    if (frameImage) {
      // Check if sprite sheet mode
      if (sprite?.spriteSheet && sprite.frameWidth && sprite.frameHeight) {
        const fw = sprite.frameWidth;
        const fh = sprite.frameHeight;
        const currentFrame = animation?.currentFrame ?? 0;
        const cols = Math.max(1, Math.floor(frameImage.width / fw));
        const col = currentFrame % cols;
        const row = Math.floor(currentFrame / cols);
        this.ctx.drawImage(
          frameImage,
          col * fw, row * fh, fw, fh,  // source rect
          -width / 2, -height / 2, width, height  // dest rect
        );
      } else {
        this.ctx.drawImage(frameImage, -width / 2, -height / 2, width, height);
      }
    } else {
      // Color fallback — tint by animation frame if available
      this.ctx.fillStyle = sprite?.color || '#8b5cf6';
      this.ctx.fillRect(-width / 2, -height / 2, width, height);

      // Show frame indicator for animated entities without images
      if (animation && animation.frames.length > 1) {
        const frameIdx = animation.currentFrame ?? 0;
        this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
        this.ctx.font = '10px monospace';
        this.ctx.fillText(`${frameIdx + 1}/${animation.frames.length}`, -width / 2 + 2, -height / 2 + 12);
      }
    }

    // Outline
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(-width / 2, -height / 2, width, height);

    this.ctx.restore();

    // Draw hitboxes if enabled
    if (this.config.showHitboxes && collision) {
      this.drawHitbox(x, y, collision);
    }
  }

  private resolveFrameImage(sprite: SpriteComponent | undefined, animation: AnimationComponent | undefined): HTMLImageElement | undefined {
    if (!sprite) return undefined;

    // Sprite sheet mode - return the sheet image
    if (sprite.spriteSheet && sprite.frameWidth && sprite.frameHeight) {
      // For sprite sheet, we expect sprite.image to be the actual sheet image
      return sprite.image;
    }

    // Individual frame images mode
    if (animation && animation.frames.length > 0) {
      const frameIdx = animation.currentFrame ?? 0;
      const frameRef = animation.frames[Math.min(frameIdx, animation.frames.length - 1)];
      const cached = this.frameImageCache.get(frameRef);
      if (cached) return cached;
    }

    // Static sprite
    return sprite.image;
  }

  private drawHitbox(x: number, y: number, collision: CollisionComponent): void {
    const { width, height, type } = collision;
    let color = 'rgba(255, 0, 0, 0.3)';
    switch (type) {
      case 'player': color = 'rgba(0, 255, 0, 0.3)'; break;
      case 'enemy': color = 'rgba(255, 0, 0, 0.3)'; break;
      case 'collectible': color = 'rgba(255, 255, 0, 0.3)'; break;
      case 'trigger': color = 'rgba(0, 255, 255, 0.3)'; break;
    }
    
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
    this.ctx.strokeStyle = color.replace('0.3', '0.8');
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);
  }

  private updateFPS(): void {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    
    if (delta >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / delta);
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
    
    this.frameCount++;
  }

  private drawDebugInfo(): void {
    if (this.config.showFPS) {
      this.ctx.fillStyle = 'white';
      this.ctx.font = '16px monospace';
      this.ctx.fillText(`FPS: ${this.fps}`, 10, 20);
      this.ctx.fillText(`Entities: ${this.entityCount}`, 10, 40);
    }

    if (this.config.showGrid) {
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.lineWidth = 1;
      
      // Draw grid
      const gridSize = 50;
      for (let x = 0; x < this.config.width; x += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.config.height);
        this.ctx.stroke();
      }
      
      for (let y = 0; y < this.config.height; y += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.config.width, y);
        this.ctx.stroke();
      }
    }
  }

  /** Get current FPS */
  getFPS(): number {
    return this.fps;
  }

  /** Get entity count */
  getEntityCount(): number {
    return this.entityCount;
  }

  /** Clean up resources */
  destroy(): void {
    this.frameImageCache.clear();
  }
}
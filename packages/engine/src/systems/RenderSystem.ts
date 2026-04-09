/**
 * @clawgame/engine - Render system
 *
 * Supports:
 * - Static sprites (single image or color fill)
 * - Sprite sheet animation (frame slicing via AnimationComponent)
 * - Individual frame images (AnimationComponent.frames as asset refs)
 */

import { Scene, RendererConfig, Entity, SpriteComponent, CollisionComponent, AnimationComponent } from '../types';

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

  render(scene: Scene, config: RendererConfig): void {
    const { width, height, backgroundColor = '#ffffff', showGrid = false, showHitboxes = false } = config;

    this.ctx.fillStyle = backgroundColor;
    this.ctx.fillRect(0, 0, width, height);

    if (showGrid) {
      this.drawGrid(width, height);
    }

    this.entityCount = 0;
    scene.entities.forEach((entity) => {
      this.entityCount++;
      this.renderEntity(entity, showHitboxes);
    });

    this.drawHUD(scene.name);
    this.updateFPS();
  }

  private renderEntity(entity: Entity, showHitboxes: boolean): void {
    const transform = entity.transform;
    const sprite = entity.components.get('sprite') as SpriteComponent | undefined;
    const collision = entity.components.get('collision') as CollisionComponent | undefined;
    const animation = entity.components.get('animation') as AnimationComponent | undefined;

    if (!transform) return;

    if (sprite) {
      const x = transform.x + (sprite.offsetX ?? 0);
      const y = transform.y + (sprite.offsetY ?? 0);
      const width = sprite.width;
      const height = sprite.height;
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
        if (sprite.spriteSheet && sprite.frameWidth && sprite.frameHeight) {
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
        this.ctx.fillStyle = sprite.color || '#8b5cf6';
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
    }

    if (showHitboxes) {
      if (collision) {
        this.drawHitbox(transform.x, transform.y, collision);
      } else if (sprite) {
        this.drawHitbox(transform.x, transform.y, {
          width: sprite.width,
          height: sprite.height,
          type: entity.components.has('playerInput') ? 'player' :
                entity.components.has('ai') ? 'enemy' : 'collectible'
        } as CollisionComponent);
      }
    }
  }

  /**
   * Resolve which HTMLImageElement to render for the current frame.
   * Priority:
   *  1. Sprite sheet mode: sprite.spriteSheet image
   *  2. Frame image mode: look up animation.frames[currentFrame] in cache
   *  3. Static sprite: sprite.image
   */
  private resolveFrameImage(sprite: SpriteComponent, animation: AnimationComponent | undefined): HTMLImageElement | undefined {
    // Sprite sheet mode
    if (sprite.spriteSheet && sprite.frameWidth && sprite.frameHeight) {
      return sprite.spriteSheet;
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
      case 'wall': color = 'rgba(128, 128, 128, 0.3)'; break;
    }
    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color.replace('0.3)', '0.8)');
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(x, y, width, height);
    this.ctx.strokeRect(x, y, width, height);
  }

  private drawGrid(width: number, height: number): void {
    const gridSize = 32;
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    for (let y = 0; y <= height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
  }

  private drawHUD(sceneName: string): void {
    if (!this.config.showFPS) return;
    const padding = 10;
    const lineHeight = 16;
    const lines = [
      `Scene: ${sceneName}`,
      `Entities: ${this.entityCount}`,
      `FPS: ${this.fps.toFixed(1)}`,
    ];
    const boxWidth = 160;
    const boxHeight = padding * 2 + lines.length * lineHeight;
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, boxWidth, boxHeight);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px monospace';
    lines.forEach((line, i) => {
      this.ctx.fillText(line, 10 + padding, 10 + padding + (i + 1) * lineHeight - 3);
    });
  }

  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    if (elapsed >= 1000) {
      this.fps = this.frameCount / (elapsed / 1000);
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
  }

  getFPS(): number {
    return this.fps;
  }

  destroy(): void {
    this.frameImageCache.clear();
  }
}

/**
 * @clawgame/engine - Render system
 */

import { Scene, RendererConfig, Entity } from '../types';
import { Sprite, Collision } from '../types';

export class RenderSystem {
  private ctx: CanvasRenderingContext2D;
  private config: RendererConfig;
  private lastFrameTime = performance.now();
  private frameCount = 0;
  private fps = 60;
  private entityCount = 0;

  constructor(ctx: CanvasRenderingContext2D, config: RendererConfig) {
    this.ctx = ctx;
    this.config = config;
  }

  /**
   * Render the scene
   */
  render(scene: Scene, config: RendererConfig): void {
    const { width, height, backgroundColor = '#ffffff', showGrid = false, showHitboxes = false } = config;

    // Clear canvas
    this.ctx.fillStyle = backgroundColor;
    this.ctx.fillRect(0, 0, width, height);

    // Draw grid if enabled
    if (showGrid) {
      this.drawGrid(width, height);
    }

    // Count and draw entities
    this.entityCount = 0;
    scene.entities.forEach((entity) => {
      this.entityCount++;
      this.renderEntity(entity, showHitboxes);
    });

    // Draw HUD overlay (scene info + FPS combined)
    this.drawHUD(scene.name);

    this.updateFPS();
  }

  /**
   * Render a single entity
   */
  private renderEntity(entity: Entity, showHitboxes: boolean): void {
    const transform = entity.transform;
    const sprite = entity.components.get('sprite') as Sprite | undefined;
    const collision = entity.components.get('collision') as Collision | undefined;

    if (!transform) return;

    // Render sprite if present
    if (sprite) {
      const x = transform.x + (sprite.offsetX ?? 0);
      const y = transform.y + (sprite.offsetY ?? 0);
      const width = sprite.width;
      const height = sprite.height;

      // Apply scale
      const scaleX = transform.scaleX ?? 1;
      const scaleY = transform.scaleY ?? 1;

      this.ctx.save();
      this.ctx.translate(x + width / 2, y + height / 2);
      this.ctx.rotate((transform.rotation ?? 0) * Math.PI / 180);
      this.ctx.scale(scaleX, scaleY);

      // Draw shadow
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      this.ctx.fillRect(-width / 2 + 4, -height / 2 + 4, width, height);

      // Draw sprite (use image if available, otherwise colored rect)
      if (sprite.image) {
        this.ctx.drawImage(sprite.image, -width / 2, -height / 2, width, height);
      } else {
        this.ctx.fillStyle = sprite.color || '#8b5cf6';
        this.ctx.fillRect(-width / 2, -height / 2, width, height);
      }

      // Draw border/highlight
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(-width / 2, -height / 2, width, height);

      this.ctx.restore();
    }

    // Draw hitbox if enabled and collision component exists
    if (showHitboxes) {
      if (collision) {
        this.drawHitbox(transform.x, transform.y, collision);
      } else if (sprite) {
        // Fallback: draw hitbox based on sprite dimensions
        this.drawHitbox(transform.x, transform.y, {
          width: sprite.width,
          height: sprite.height,
          type: entity.components.has('playerInput') ? 'player' :
                entity.components.has('ai') ? 'enemy' : 'collectible'
        } as Collision);
      }
    }
  }

  /**
   * Draw a hitbox
   */
  private drawHitbox(x: number, y: number, collision: Collision): void {
    const { width, height, type } = collision;

    let color = 'rgba(255, 0, 0, 0.3)';
    switch (type) {
      case 'player':
        color = 'rgba(0, 255, 0, 0.3)';
        break;
      case 'enemy':
        color = 'rgba(255, 0, 0, 0.3)';
        break;
      case 'collectible':
        color = 'rgba(255, 255, 0, 0.3)';
        break;
      case 'wall':
        color = 'rgba(128, 128, 128, 0.3)';
        break;
    }

    this.ctx.fillStyle = color;
    this.ctx.strokeStyle = color.replace('0.3)', '0.8)');
    this.ctx.lineWidth = 2;
    this.ctx.fillRect(x, y, width, height);
    this.ctx.strokeRect(x, y, width, height);
  }

  /**
   * Draw background grid
   */
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

  /**
   * Draw HUD overlay — single combined panel with scene info and FPS
   */
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

  /**
   * Update FPS counter
   */
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

  /**
   * Get current FPS value (for external consumers)
   */
  getFPS(): number {
    return this.fps;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // No resources to cleanup in this implementation
  }
}

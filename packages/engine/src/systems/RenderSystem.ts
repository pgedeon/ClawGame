/**
 * @clawgame/engine - Render system
 */

import { Scene, RendererConfig } from '../types';
import { Sprite, Transform, Collision } from '../types';

export class RenderSystem {
  private ctx: CanvasRenderingContext2D;
  private config: RendererConfig;
  private lastFrameTime = performance.now();
  private frameCount = 0;
  private fps = 60;

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

    // Draw entities
    scene.entities.forEach((entity) => {
      this.renderEntity(entity, showHitboxes);
    });

    // Draw scene name
    this.drawSceneInfo(scene.name);

    // Draw FPS if enabled
    if (this.config.showFPS) {
      this.drawFPS();
    }

    this.updateFPS();
  }

  /**
   * Render a single entity
   */
  private renderEntity(entity: { id: string; transform: any; components: Map<string, any> }, showHitboxes: boolean): void {
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

      // Draw sprite
      this.ctx.drawImage(sprite.image, -width / 2, -height / 2, width, height);

      // Draw border/highlight
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(-width / 2, -height / 2, width, height);

      this.ctx.restore();
    }

    // Draw hitbox if enabled and collision component exists
    if (showHitboxes && collision && transform) {
      this.drawHitbox(transform, collision);
    }
  }

  /**
   * Draw a hitbox
   */
  private drawHitbox(transform: any, collision: Collision): void {
    const x = transform.x;
    const y = transform.y;
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
   * Draw scene name and info
   */
  private drawSceneInfo(sceneName: string): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 200, 80);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`Scene: ${sceneName}`, 20, 30);
    this.ctx.fillText(`Entities: ${this.config.showFPS ? this.frameCount : ''}`, 20, 50);
    this.ctx.fillText(`FPS: ${this.fps.toFixed(1)}`, 20, 70);
  }

  /**
   * Draw FPS counter
   */
  private drawFPS(): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 100, 24);

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`FPS: ${this.fps.toFixed(1)}`, 20, 26);
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
   * Cleanup resources
   */
  destroy(): void {
    // No resources to cleanup in this implementation
  }
}

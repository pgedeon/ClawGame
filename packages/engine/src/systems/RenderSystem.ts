/**
 * @clawgame/engine - Render system
 *
 * Draws entities with sprites or fallback shapes to the canvas context.
 * Respects transform, sprite, animation, and collision state.
 */

import { Scene, Entity, Transform, SpriteComponent, AnimationComponent, CollisionComponent } from '../types';

export class RenderSystem {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  /**
   * Set the canvas for rendering
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  update(scene: Scene, deltaTime: number): void {
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

    // Render sprite if available
    if (sprite?.image) {
      ctx.drawImage(
        sprite.image,
        -sprite.width! / 2,
        -sprite.height! / 2,
        sprite.width!,
        sprite.height!,
      );
    } else if (sprite?.color) {
      // Fallback to colored rectangle
      ctx.fillStyle = sprite.color;
      ctx.fillRect(
        -(transform.width || collision?.width || 32) / 2,
        -(transform.height || collision?.height || 32) / 2,
        transform.width || collision?.width || 32,
        transform.height || collision?.height || 32,
      );
    } else {
      // Fallback to entity type color
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
      ctx.fillRect(
        -(transform.width || collision?.width || 32) / 2,
        -(transform.height || collision?.height || 32) / 2,
        transform.width || collision?.width || 32,
        transform.height || collision?.height || 32,
      );
    }

    // Apply sprite effects
    if (sprite?.flipX) {
      ctx.scale(-1, 1);
    }
    if (sprite?.flipY) {
      ctx.scale(1, -1);
    }
    if (sprite?.opacity !== undefined) {
      ctx.globalAlpha = sprite.opacity;
    }

    // Restore context state
    ctx.restore();
  }

  /**
   * Detach method for compatibility
   */
  detach(): void {
    this.canvas = null;
    this.ctx = null;
  }
}
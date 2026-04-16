/**
 * @clawgame/engine - Movement system
 */

import { Scene, InputState } from '../types';
import { CollisionComponent, MovementComponent } from '../types';

export class MovementSystem {
  private worldBounds: { width: number; height: number };

  constructor(worldBounds = { width: 800, height: 600 }) {
    this.worldBounds = worldBounds;
  }

  setWorldBounds(bounds: { width: number; height: number }): void {
    this.worldBounds = bounds;
  }

  /**
   * Update all entities with Movement component.
   * For entities that also have a 'playerInput' marker component,
   * keyboard input is applied directly.
   */
  update(scene: Scene, deltaTime: number): void {
    scene.entities.forEach((entity) => {
      const movement = entity.components.get('movement') as MovementComponent | undefined;
      const transform = entity.transform;

      if (!movement || !transform) return;

      // If this entity is player-controlled, apply input to velocity
      if (entity.components.has('playerInput')) {
        movement.vx = 0;
        movement.vy = 0;

        // Input should be handled by InputSystem and passed to entities via components
        const input = entity.components.get('input') as InputState | undefined;
        if (input) {
          if (input.left) movement.vx = (movement.speed ?? 100) * -1;
          if (input.right) movement.vx = (movement.speed ?? 100) * 1;
          if (input.up) movement.vy = (movement.speed ?? 100) * -1;
          if (input.down) movement.vy = (movement.speed ?? 100) * 1;

          // Normalize diagonal movement
          if (movement.vx !== 0 && movement.vy !== 0) {
            const factor = 1 / Math.sqrt(2);
            movement.vx *= factor;
            movement.vy *= factor;
          }
        }
      }

      // Apply velocity to position
      transform.x += movement.vx * deltaTime;
      transform.y += movement.vy * deltaTime;

      const collision = entity.components.get('collision') as CollisionComponent | undefined;
      const width = collision?.width ?? 32;
      const height = collision?.height ?? 32;

      transform.x = Math.max(0, Math.min(transform.x, this.worldBounds.width - width));
      transform.y = Math.max(0, Math.min(transform.y, this.worldBounds.height - height));
    });
  }

  /**
   * Stop entity movement
   */
  stopEntity(scene: Scene, entityId: string): void {
    const entity = scene.entities.get(entityId);
    if (!entity) return;

    const movement = entity.components.get('movement') as MovementComponent | undefined;
    if (movement) {
      movement.vx = 0;
      movement.vy = 0;
    }
  }

  /**
   * Detach method for compatibility
   */
  detach(): void {
    // No cleanup required for movement system
  }
}
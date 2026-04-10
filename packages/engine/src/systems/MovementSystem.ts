/**
 * @clawgame/engine - Movement system
 */

import { Scene, InputState, Entity } from '../types';
import { MovementComponent, Transform } from '../types';

export class MovementSystem {
  /**
   * Update all entities with Movement component.
   * For entities that also have a 'playerInput' marker component,
   * keyboard input is applied directly.
   */
  update(scene: Scene, input: InputState, deltaTime: number): void {
    scene.entities.forEach((entity) => {
      const movement = entity.components.get('movement') as MovementComponent | undefined;
      const transform = entity.transform;

      if (!movement || !transform) return;

      // If this entity is player-controlled, apply input to velocity
      if (entity.components.has('playerInput')) {
        movement.vx = 0;
        movement.vy = 0;

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

      // Apply velocity to position
      transform.x += movement.vx * deltaTime;
      transform.y += movement.vy * deltaTime;

      // Simple boundary checking (assume canvas size from scene or fallback)
      // TODO: Make canvas size configurable per scene
      transform.x = Math.max(0, Math.min(transform.x, 800 - 32));
      transform.y = Math.max(0, Math.min(transform.y, 600 - 32));
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
}

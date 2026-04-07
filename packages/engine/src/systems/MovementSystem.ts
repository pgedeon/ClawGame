/**
 * @clawgame/engine - Movement system
 */

import { Scene, InputState } from '../types';
import { Movement, Transform, Collision } from '../types';

export class MovementSystem {
  /**
   * Update all entities with Movement component
   */
  update(scene: Scene, input: InputState, deltaTime: number): void {
    scene.entities.forEach((entity) => {
      const movement = entity.components.get('movement') as Movement | undefined;
      const transform = entity.transform;

      if (!movement || !transform) return;

      // Apply velocity to position
      transform.x += movement.vx * deltaTime;
      transform.y += movement.vy * deltaTime;

      // Simple boundary checking (assume 800x600 canvas)
      // TODO: Make canvas size configurable
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

    const movement = entity.components.get('movement') as Movement | undefined;
    if (movement) {
      movement.vx = 0;
      movement.vy = 0;
    }
  }
}

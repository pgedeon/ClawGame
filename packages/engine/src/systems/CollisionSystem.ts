/**
 * @clawgame/engine - Collision system
 */

import { Scene, Entity, CollisionComponent } from '../types';
import { EventBus } from '../EventBus';

export class CollisionSystem {
  private eventBus: EventBus | null = null;

  attach(bus: EventBus): void {
    this.eventBus = bus;
  }

  update(scene: Scene): void {
    const colliders = Array.from(scene.entities.values()).filter((entity) => entity.components.has('collision'));

    for (const entity of colliders) {
      const collision = entity.components.get('collision') as CollisionComponent | undefined;
      if (!collision) continue;

      const transform = entity.transform;
      if (!transform) continue;

      // Check collisions with other entities
      for (const other of colliders) {
        if (entity.id === other.id) continue;

        const otherCollision = other.components.get('collision') as CollisionComponent | undefined;
        if (!otherCollision) continue;

        const otherTransform = other.transform;
        if (!otherTransform) continue;

        if (this.overlaps(transform.x, transform.y, collision, otherTransform.x, otherTransform.y, otherCollision)) {
          // Emit collision event
          this.eventBus?.emit('collision:overlap', {
            entity: entity.id,
            other: other.id,
            type: collision.type,
            otherType: otherCollision.type,
          } as any);
        }
      }
    }
  }

  private overlaps(
    ax: number,
    ay: number,
    a: CollisionComponent,
    bx: number,
    by: number,
    b: CollisionComponent,
  ): boolean {
    const overlapX = Math.min(ax + a.width, bx + b.width) - Math.max(ax, bx);
    const overlapY = Math.min(ay + a.height, by + b.height) - Math.max(ay, by);
    return overlapX > 0 && overlapY > 0;
  }

  /**
   * Detach method for compatibility
   */
  detach(): void {
    this.eventBus = null;
  }
}
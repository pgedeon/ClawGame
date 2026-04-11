/**
 * @clawgame/engine - Projectile system
 *
 * Moves projectile entities, detects impacts against configured collision
 * targets, emits typed projectile events, and removes expired shots.
 */

import type { EventBus } from '../EventBus';
import { CollisionComponent, ProjectileComponent, Scene } from '../types';

export class ProjectileSystem {
  private worldBounds: { width: number; height: number };
  private eventBus: EventBus | null = null;

  constructor(worldBounds = { width: 800, height: 600 }) {
    this.worldBounds = worldBounds;
  }

  attach(bus: EventBus): void {
    this.eventBus = bus;
  }

  setWorldBounds(bounds: { width: number; height: number }): void {
    this.worldBounds = bounds;
  }

  update(scene: Scene, deltaTime: number): void {
    const removals = new Map<string, { reason: 'hit' | 'blocked' | 'bounds' | 'expired'; targetId?: string; targetType?: string }>();
    const colliders = Array.from(scene.entities.values()).filter((entity) => entity.components.has('collision'));

    for (const entity of scene.entities.values()) {
      const projectile = entity.components.get('projectile') as ProjectileComponent | undefined;
      const collision = entity.components.get('collision') as CollisionComponent | undefined;
      if (!projectile || !collision) continue;

      entity.transform.x += projectile.vx * deltaTime;
      entity.transform.y += projectile.vy * deltaTime;

      if (projectile.lifetime !== undefined) {
        projectile.lifetime -= deltaTime;
        if (projectile.lifetime <= 0) {
          removals.set(entity.id, { reason: 'expired' });
          continue;
        }
      }

      if (this.isOutOfBounds(entity.transform.x, entity.transform.y, collision.width, collision.height)) {
        removals.set(entity.id, { reason: 'bounds' });
        continue;
      }

      for (const target of colliders) {
        if (target.id === entity.id || removals.has(entity.id)) continue;

        const targetCollision = target.components.get('collision') as CollisionComponent | undefined;
        if (!targetCollision || targetCollision.type === 'projectile') continue;
        if (projectile.targetTypes?.length && (!targetCollision.type || !projectile.targetTypes.includes(targetCollision.type))) {
          continue;
        }
        if (!this.overlaps(entity.transform.x, entity.transform.y, collision, target.transform.x, target.transform.y, targetCollision)) {
          continue;
        }

        this.eventBus?.emit('projectile:hit', {
          projectileId: entity.id,
          targetId: target.id,
          targetType: targetCollision.type,
          damage: projectile.damage,
        });

        if (projectile.destroyOnHit !== false) {
          removals.set(entity.id, {
            reason: targetCollision.type === 'wall' ? 'blocked' : 'hit',
            targetId: target.id,
            targetType: targetCollision.type,
          });
        }
      }
    }

    for (const [projectileId, result] of removals) {
      scene.entities.delete(projectileId);
      this.eventBus?.emit('projectile:destroy', {
        projectileId,
        reason: result.reason,
        targetId: result.targetId,
        targetType: result.targetType,
      });
    }
  }

  private isOutOfBounds(x: number, y: number, width: number, height: number): boolean {
    return x + width < 0 || y + height < 0 || x > this.worldBounds.width || y > this.worldBounds.height;
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
}

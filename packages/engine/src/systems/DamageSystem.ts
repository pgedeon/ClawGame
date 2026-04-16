/**
 * @clawgame/engine - Damage System
 *
 * Handles damage application, health tracking, and entity defeat logic.
 * Listens for projectile:hit events and processes damage through StatsComponent.
 */

import type { EventBus } from '../EventBus';
import type { Scene } from '../types';

export class DamageSystem {
  private eventBus: EventBus | null = null;
  private pendingDamage: Array<{ targetId: string; damage: number; projectileId: string }> = [];

  attach(eventBus: EventBus): void {
    this.eventBus = eventBus;
    eventBus.on('projectile:hit', (payload) => {
      this.pendingDamage.push({
        targetId: payload.targetId,
        damage: payload.damage,
        projectileId: payload.projectileId,
      });
    });
  }

  update(scene: Scene, _deltaTime: number): void {
    if (this.pendingDamage.length === 0) return;
    
    const pending = this.pendingDamage;
    this.pendingDamage = [];
    
    for (const { targetId, damage, projectileId } of pending) {
      const entity = scene.entities.get(targetId);
      if (!entity) continue;
      
      const stats = entity.components.get('stats') as import('../types').StatsComponent | undefined;
      if (!stats) continue;
      
      const effectiveDamage = Math.max(0, damage - (stats.defense ?? 0));
      stats.health = Math.max(0, stats.health - effectiveDamage);
      
      this.eventBus?.emit('entity:damage', {
        entityId: targetId,
        damage: effectiveDamage,
        remainingHealth: stats.health,
      });
      
      if (stats.health <= 0) {
        scene.entities.delete(targetId);
        this.eventBus?.emit('entity:defeated', {
          entityId: targetId,
          type: (entity.components.get('collision') as import('../types').CollisionComponent | undefined)?.type ?? 'unknown',
        });
      }
    }
  }

  detach(): void {
    this.pendingDamage = [];
    this.eventBus = null;
  }
}
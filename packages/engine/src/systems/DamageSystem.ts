/**
 * @clawgame/engine - Damage system
 *
 * Listens for projectile:hit events, reduces target health via the
 * StatsComponent, and emits entity:defeated when health drops to zero.
 * This moves damage/death bookkeeping out of page-level simulation
 * and into the canonical engine runtime.
 */

import type { EventBus } from '../EventBus';
import { Scene, StatsComponent } from '../types';

export interface DamageSystemDeps {
  eventBus: EventBus;
}

export class DamageSystem {
  private eventBus: EventBus | null = null;
  private pendingDamage: Array<{
    targetId: string;
    damage: number;
  }> = [];

  attach(eventBus: EventBus): void {
    this.eventBus = eventBus;
    eventBus.on('projectile:hit', (payload) => {
      this.pendingDamage.push({ targetId: payload.targetId, damage: payload.damage });
    });
  }

  /** Process accumulated damage for one frame */
  update(scene: Scene, _deltaTime: number): void {
    if (this.pendingDamage.length === 0) return;

    const pending = this.pendingDamage;
    this.pendingDamage = [];

    for (const { targetId, damage } of pending) {
      const entity = scene.entities.get(targetId);
      if (!entity) continue;

      const stats = entity.components.get('stats') as StatsComponent | undefined;
      if (!stats) continue;

      // Apply defense reduction if present
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
          type: (entity.components.get('collision') as any)?.type ?? 'unknown',
        });
      }
    }
  }

  detach(): void {
    this.pendingDamage = [];
    this.eventBus = null;
  }
}

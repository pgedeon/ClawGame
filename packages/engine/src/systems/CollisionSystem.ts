/**
 * @clawgame/engine - Collision system
 *
 * Detects AABB collisions between entities with CollisionComponent,
 * emits typed collision events on the EventBus, and handles
 * trigger zone detection, collectible pickup, and combat interactions.
 */

import { Scene, Entity, CollisionComponent, StatsComponent, CollectibleComponent, TriggerComponent } from '../types';
import type { EventBus } from '../EventBus';

export interface CollisionEvent {
  entityA: string;
  entityB: string;
  typeA?: string;
  typeB?: string;
  overlap: { x: number; y: number };
}

export class CollisionSystem {
  private eventBus: EventBus | null = null;
  private triggeredSet = new Set<string>();

  attach(bus: EventBus): void {
    this.eventBus = bus;
  }

  update(scene: Scene): CollisionEvent[] {
    const entities: Entity[] = [];
    scene.entities.forEach((e) => {
      if (e.components.has('collision')) entities.push(e);
    });

    const events: CollisionEvent[] = [];

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const a = entities[i];
        const b = entities[j];
        const collision = this.checkCollision(a, b);
        if (collision) {
          events.push(collision);
          this.handleCollision(a, b, collision);
        }
      }
    }

    return events;
  }

  private checkCollision(a: Entity, b: Entity): CollisionEvent | null {
    const ac = a.components.get('collision') as CollisionComponent;
    const bc = b.components.get('collision') as CollisionComponent;
    const at = a.transform;
    const bt = b.transform;

    const overlapX = Math.min(at.x + ac.width, bt.x + bc.width) - Math.max(at.x, bt.x);
    const overlapY = Math.min(at.y + ac.height, bt.y + bc.height) - Math.max(at.y, bt.y);

    if (overlapX <= 0 || overlapY <= 0) return null;

    return {
      entityA: a.id,
      entityB: b.id,
      typeA: ac.type,
      typeB: bc.type,
      overlap: { x: overlapX, y: overlapY },
    };
  }

  private handleCollision(a: Entity, b: Entity, event: CollisionEvent): void {
    const ac = a.components.get('collision') as CollisionComponent;
    const bc = b.components.get('collision') as CollisionComponent;

    // Emit generic collision event
    this.eventBus?.emit('collision:enter', event);

    // Player + Collectible → pickup
    if (ac.type === 'player' && bc.type === 'collectible') {
      this.handlePickup(a, b);
    } else if (bc.type === 'player' && ac.type === 'collectible') {
      this.handlePickup(b, a);
    }

    // Player + Enemy → damage
    if (ac.type === 'player' && bc.type === 'enemy') {
      this.handleDamage(a, b);
    } else if (bc.type === 'player' && ac.type === 'enemy') {
      this.handleDamage(b, a);
    }

    // Trigger zone
    if (ac.type === 'trigger') {
      this.handleTrigger(a, b);
    } else if (bc.type === 'trigger') {
      this.handleTrigger(b, a);
    }
  }

  private handlePickup(player: Entity, collectible: Entity): void {
    const collectibleComp = collectible.components.get('collectible') as CollectibleComponent | undefined;
    this.eventBus?.emit('collision:pickup', {
      playerId: player.id,
      collectibleId: collectible.id,
      type: collectibleComp?.type ?? 'generic',
      value: collectibleComp?.value ?? 1,
    });
  }

  private handleDamage(player: Entity, enemy: Entity): void {
    const stats = player.components.get('stats') as StatsComponent | undefined;
    this.eventBus?.emit('collision:damage', {
      playerId: player.id,
      enemyId: enemy.id,
      damage: stats?.defense ? Math.max(1, 10 - stats.defense) : 10,
    });
  }

  private handleTrigger(trigger: Entity, other: Entity): void {
    const triggerComp = trigger.components.get('trigger') as TriggerComponent | undefined;
    if (!triggerComp) return;

    // Once-only triggers
    const key = `${trigger.id}:${other.id}`;
    if (triggerComp.once && this.triggeredSet.has(key)) return;
    this.triggeredSet.add(key);

    this.eventBus?.emit('collision:trigger', {
      triggerId: trigger.id,
      entityId: other.id,
      event: triggerComp.event,
      target: triggerComp.target,
    });
  }

  /** Reset trigger state (e.g. on scene reload) */
  resetTriggers(): void {
    this.triggeredSet.clear();
  }
}

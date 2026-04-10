/**
 * @clawgame/engine - Physics & Collision system tests
 */

import { describe, it, expect } from 'vitest';
import {
  Entity,
  Scene,
  toRuntimeEntity,
  SerializableEntity,
} from '../types';
import { PhysicsSystem } from './PhysicsSystem';
import { CollisionSystem } from './CollisionSystem';
import { EventBus } from '../EventBus';

// ─── Helpers ───

function makeEntity(overrides: Partial<SerializableEntity> & { id: string }): Entity {
  const base: SerializableEntity = {
    type: 'custom',
    transform: { x: 0, y: 0 },
    components: {},
    ...overrides,
  };
  return toRuntimeEntity(base);
}

function makeScene(entities: Entity[]): Scene {
  const map = new Map<string, Entity>();
  entities.forEach((e) => map.set(e.id, e));
  return { name: 'test', entities: map };
}

// ─── PhysicsSystem ───

describe('PhysicsSystem', () => {
  it('applies gravity to dynamic entities', () => {
    const sys = new PhysicsSystem({ width: 800, height: 600 });
    const entity = makeEntity({
      id: 'ball',
      transform: { x: 100, y: 100 },
      components: {
        movement: { vx: 0, vy: 0, speed: 100 },
        physics: { gravity: 980, friction: 0.9 },
        collision: { width: 32, height: 32 },
      },
    });
    const scene = makeScene([entity]);

    sys.update(scene, 0.1);

    expect(entity.transform.y).toBeGreaterThan(100);
    expect((entity.components.get('movement') as any).vy).toBeGreaterThan(0);
  });

  it('applies friction to horizontal velocity', () => {
    const sys = new PhysicsSystem({ width: 800, height: 600 });
    const entity = makeEntity({
      id: 'slider',
      transform: { x: 100, y: 100 },
      components: {
        movement: { vx: 200, vy: 0, speed: 100 },
        physics: { gravity: 0, friction: 0.5 },
        collision: { width: 32, height: 32 },
      },
    });
    const scene = makeScene([entity]);

    sys.update(scene, 0.016);

    const movement = entity.components.get('movement') as any;
    expect(Math.abs(movement.vx)).toBeLessThan(200);
  });

  it('resolves static body collisions (landing on platform)', () => {
    const sys = new PhysicsSystem({ width: 800, height: 600 });
    const player = makeEntity({
      id: 'player',
      transform: { x: 100, y: 68 },
      components: {
        movement: { vx: 0, vy: 100, speed: 100 },
        physics: { gravity: 0, bounce: 0 },
        collision: { width: 32, height: 32, type: 'player' },
      },
    });
    const platform = makeEntity({
      id: 'platform',
      type: 'obstacle',
      transform: { x: 90, y: 100 },
      components: {
        collision: { width: 64, height: 16, type: 'wall' },
      },
    });
    const scene = makeScene([player, platform]);

    // Simulate one frame: apply movement then physics
    player.transform.y += (player.components.get('movement') as any).vy * 0.016;
    sys.update(scene, 0.016);

    // Player should be pushed out above the platform
    expect(player.transform.y).toBeLessThanOrEqual(100);
    const physics = player.components.get('physics') as any;
    expect(physics.grounded).toBe(true);
  });

  it('clamps entities to world bounds', () => {
    const sys = new PhysicsSystem({ width: 800, height: 600 });
    const entity = makeEntity({
      id: 'oob',
      transform: { x: -10, y: 700 },
      components: {
        movement: { vx: 0, vy: 0, speed: 100 },
        collision: { width: 32, height: 32 },
      },
    });
    const scene = makeScene([entity]);

    sys.update(scene, 0.016);

    expect(entity.transform.x).toBe(0);
    expect(entity.transform.y).toBeLessThanOrEqual(600);
  });

  it('updates world bounds via setWorldBounds', () => {
    const sys = new PhysicsSystem({ width: 800, height: 600 });
    sys.setWorldBounds({ width: 400, height: 300 });

    const entity = makeEntity({
      id: 'wide',
      transform: { x: 500, y: 0 },
      components: {
        movement: { vx: 0, vy: 0, speed: 100 },
        collision: { width: 32, height: 32 },
      },
    });
    const scene = makeScene([entity]);

    sys.update(scene, 0.016);

    expect(entity.transform.x).toBeLessThanOrEqual(400 - 32);
  });
});

// ─── CollisionSystem ───

describe('CollisionSystem', () => {
  it('detects AABB overlap between two entities', () => {
    const sys = new CollisionSystem();
    const a = makeEntity({
      id: 'a',
      transform: { x: 0, y: 0 },
      components: { collision: { width: 32, height: 32, type: 'player' } },
    });
    const b = makeEntity({
      id: 'b',
      transform: { x: 16, y: 16 },
      components: { collision: { width: 32, height: 32, type: 'enemy' } },
    });

    const events = sys.update(makeScene([a, b]));

    expect(events).toHaveLength(1);
    expect(events[0].entityA).toBe('a');
    expect(events[0].entityB).toBe('b');
    expect(events[0].overlap.x).toBeGreaterThan(0);
  });

  it('emits no events for non-overlapping entities', () => {
    const sys = new CollisionSystem();
    const a = makeEntity({
      id: 'a',
      transform: { x: 0, y: 0 },
      components: { collision: { width: 32, height: 32 } },
    });
    const b = makeEntity({
      id: 'b',
      transform: { x: 100, y: 100 },
      components: { collision: { width: 32, height: 32 } },
    });

    const events = sys.update(makeScene([a, b]));
    expect(events).toHaveLength(0);
  });

  it('emits collision:enter on the EventBus', () => {
    const bus = new EventBus();
    const sys = new CollisionSystem();
    sys.attach(bus);

    const received: any[] = [];
    bus.on('collision:enter', (e: any) => received.push(e));

    const a = makeEntity({
      id: 'player1',
      transform: { x: 0, y: 0 },
      components: { collision: { width: 32, height: 32, type: 'player' } },
    });
    const b = makeEntity({
      id: 'enemy1',
      transform: { x: 16, y: 16 },
      components: { collision: { width: 32, height: 32, type: 'enemy' } },
    });

    sys.update(makeScene([a, b]));

    expect(received).toHaveLength(1);
    expect(received[0].entityA).toBe('player1');
  });

  it('emits collision:pickup for player + collectible', () => {
    const bus = new EventBus();
    const sys = new CollisionSystem();
    sys.attach(bus);

    const pickups: any[] = [];
    bus.on('collision:pickup', (e: any) => pickups.push(e));

    const player = makeEntity({
      id: 'p',
      transform: { x: 0, y: 0 },
      components: { collision: { width: 32, height: 32, type: 'player' } },
    });
    const coin = makeEntity({
      id: 'coin1',
      transform: { x: 16, y: 16 },
      components: {
        collision: { width: 16, height: 16, type: 'collectible' },
        collectible: { type: 'coin', value: 10 },
      },
    });

    sys.update(makeScene([player, coin]));

    expect(pickups).toHaveLength(1);
    expect(pickups[0].value).toBe(10);
    expect(pickups[0].collectibleId).toBe('coin1');
  });

  it('emits collision:trigger with once semantics', () => {
    const bus = new EventBus();
    const sys = new CollisionSystem();
    sys.attach(bus);

    const triggers: any[] = [];
    bus.on('collision:trigger' as any,  (e: any) => triggers.push(e));

    const trigger = makeEntity({
      id: 'zone',
      transform: { x: 0, y: 0 },
      components: {
        collision: { width: 64, height: 64, type: 'trigger' },
        trigger: { event: 'level_complete', once: true },
      },
    });
    const player = makeEntity({
      id: 'p',
      transform: { x: 10, y: 10 },
      components: { collision: { width: 32, height: 32, type: 'player' } },
    });
    const scene = makeScene([trigger, player]);

    sys.update(scene);
    sys.update(scene); // second time should be suppressed

    expect(triggers).toHaveLength(1);
    expect(triggers[0].event).toBe('level_complete');
  });

  it('resetTriggers allows re-firing once triggers', () => {
    const bus = new EventBus();
    const sys = new CollisionSystem();
    sys.attach(bus);

    const triggers: any[] = [];
    bus.on('collision:trigger' as any,  (e: any) => triggers.push(e));

    const trigger = makeEntity({
      id: 'zone',
      transform: { x: 0, y: 0 },
      components: {
        collision: { width: 64, height: 64, type: 'trigger' },
        trigger: { event: 'door_open', once: true },
      },
    });
    const player = makeEntity({
      id: 'p',
      transform: { x: 10, y: 10 },
      components: { collision: { width: 32, height: 32, type: 'player' } },
    });
    const scene = makeScene([trigger, player]);

    sys.update(scene);
    sys.resetTriggers();
    sys.update(scene);

    expect(triggers).toHaveLength(2);
  });

  it('ignores entities without collision component', () => {
    const sys = new CollisionSystem();
    const a = makeEntity({
      id: 'a',
      transform: { x: 0, y: 0 },
      components: {},
    });
    const b = makeEntity({
      id: 'b',
      transform: { x: 0, y: 0 },
      components: { collision: { width: 32, height: 32 } },
    });

    const events = sys.update(makeScene([a, b]));
    expect(events).toHaveLength(0);
  });
});

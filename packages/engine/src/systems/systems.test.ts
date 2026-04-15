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
import { MovementSystem } from './MovementSystem';
import { AISystem } from './AISystem';
import { ProjectileSystem } from './ProjectileSystem';
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

describe('MovementSystem', () => {
  it('moves player-controlled entities from input state', () => {
    const sys = new MovementSystem({ width: 800, height: 600 });
    const entity = makeEntity({
      id: 'player',
      type: 'player',
      transform: { x: 100, y: 100 },
      components: {
        playerInput: {},
        movement: { vx: 0, vy: 0, speed: 120 },
        collision: { width: 32, height: 32, type: 'player' },
      },
    });

    sys.update(makeScene([entity]), { left: false, right: true, up: false, down: false }, 0.5);

    expect(entity.transform.x).toBeGreaterThan(100);
  });

  it('honors configured world bounds when clamping movement', () => {
    const sys = new MovementSystem({ width: 120, height: 100 });
    const entity = makeEntity({
      id: 'player',
      type: 'player',
      transform: { x: 110, y: 95 },
      components: {
        playerInput: {},
        movement: { vx: 0, vy: 0, speed: 120 },
        collision: { width: 32, height: 32, type: 'player' },
      },
    });

    sys.update(makeScene([entity]), { left: false, right: true, up: false, down: true }, 0.5);

    expect(entity.transform.x).toBe(88);
    expect(entity.transform.y).toBe(68);
  });
});

describe('AISystem', () => {
  it('uses configured chase speed when targeting another entity', () => {
    const sys = new AISystem();
    const player = makeEntity({
      id: 'player',
      type: 'player',
      transform: { x: 200, y: 100 },
      components: {},
    });
    const enemy = makeEntity({
      id: 'enemy',
      type: 'enemy',
      transform: { x: 0, y: 100 },
      components: {
        movement: { vx: 0, vy: 0, speed: 10 },
        ai: { type: 'chase', targetEntity: 'player', speed: 80 },
      },
    });

    sys.update(makeScene([player, enemy]), 1);

    const movement = enemy.components.get('movement') as any;
    expect(movement.vx).toBeGreaterThan(70);
    expect(Math.abs(movement.vy)).toBeLessThan(1);
  });
});

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

  it('resolves static collisions for player-controlled entities', () => {
    const move = new MovementSystem({ width: 800, height: 600 });
    const physics = new PhysicsSystem({ width: 800, height: 600 });
    const player = makeEntity({
      id: 'player',
      type: 'player',
      transform: { x: 90, y: 100 },
      components: {
        playerInput: {},
        movement: { vx: 0, vy: 0, speed: 120 },
        collision: { width: 32, height: 32, type: 'player' },
      },
    });
    const wall = makeEntity({
      id: 'wall',
      type: 'obstacle',
      transform: { x: 110, y: 100 },
      components: {
        collision: { width: 32, height: 32, type: 'wall' },
      },
    });
    const scene = makeScene([player, wall]);

    move.update(scene, { left: false, right: true, up: false, down: false }, 0.1);
    physics.update(scene, 0.1);

    expect(player.transform.x).toBeLessThanOrEqual(78);
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

  it('emits collision:damage using enemy attack power and player defense', () => {
    const bus = new EventBus();
    const sys = new CollisionSystem();
    sys.attach(bus);

    const damages: any[] = [];
    bus.on('collision:damage', (e) => damages.push(e));

    const player = makeEntity({
      id: 'p',
      transform: { x: 0, y: 0 },
      components: {
        collision: { width: 32, height: 32, type: 'player' },
        stats: { health: 100, maxHealth: 100, defense: 4 },
      },
    });
    const enemy = makeEntity({
      id: 'enemy1',
      transform: { x: 16, y: 16 },
      components: {
        collision: { width: 32, height: 32, type: 'enemy' },
        stats: { health: 10, maxHealth: 10, attackPower: 12 },
      },
    });

    sys.update(makeScene([player, enemy]));

    expect(damages).toHaveLength(1);
    expect(damages[0]).toEqual({
      playerId: 'p',
      enemyId: 'enemy1',
      damage: 8,
    });
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

describe('ProjectileSystem', () => {
  it('emits projectile:hit and removes the projectile on enemy impact', () => {
    const sys = new ProjectileSystem({ width: 800, height: 600 });
    const bus = new EventBus();
    const hits: any[] = [];
    const destroys: any[] = [];
    bus.on('projectile:hit', (event) => hits.push(event));
    bus.on('projectile:destroy', (event) => destroys.push(event));
    sys.attach(bus);

    const projectile = makeEntity({
      id: 'proj-1',
      type: 'projectile',
      transform: { x: 0, y: 0 },
      components: {
        collision: { width: 10, height: 10, type: 'projectile' },
        projectile: { vx: 100, vy: 0, damage: 25, targetTypes: ['enemy'] },
      },
    });
    const enemy = makeEntity({
      id: 'enemy-1',
      type: 'enemy',
      transform: { x: 15, y: 0 },
      components: {
        collision: { width: 32, height: 32, type: 'enemy' },
      },
    });

    const scene = makeScene([projectile, enemy]);
    sys.update(scene, 0.16);

    expect(hits).toEqual([
      {
        projectileId: 'proj-1',
        targetId: 'enemy-1',
        targetType: 'enemy',
        damage: 25,
  isSpell: false,
      },
    ]);
    expect(destroys).toEqual([
      {
        projectileId: 'proj-1',
        reason: 'hit',
        targetId: 'enemy-1',
        targetType: 'enemy',
      },
    ]);
    expect(scene.entities.has('proj-1')).toBe(false);
  });

  it('treats wall impacts as blocked and expires projectiles at world bounds', () => {
    const sys = new ProjectileSystem({ width: 80, height: 80 });
    const bus = new EventBus();
    const destroys: any[] = [];
    bus.on('projectile:destroy', (event) => destroys.push(event));
    sys.attach(bus);

    const wallShot = makeEntity({
      id: 'proj-wall',
      type: 'projectile',
      transform: { x: 0, y: 0 },
      components: {
        collision: { width: 10, height: 10, type: 'projectile' },
        projectile: { vx: 100, vy: 0, damage: 10, targetTypes: ['wall'] },
      },
    });
    const wall = makeEntity({
      id: 'wall',
      type: 'obstacle',
      transform: { x: 12, y: 0 },
      components: {
        collision: { width: 32, height: 32, type: 'wall' },
      },
    });
    const outOfBoundsShot = makeEntity({
      id: 'proj-oob',
      type: 'projectile',
      transform: { x: 75, y: 75 },
      components: {
        collision: { width: 10, height: 10, type: 'projectile' },
        projectile: { vx: 50, vy: 50, damage: 10 },
      },
    });

    const scene = makeScene([wallShot, wall, outOfBoundsShot]);
    sys.update(scene, 0.16);

    expect(destroys).toContainEqual({
      projectileId: 'proj-wall',
      reason: 'blocked',
      targetId: 'wall',
      targetType: 'wall',
    });
    expect(destroys).toContainEqual({
      projectileId: 'proj-oob',
      reason: 'bounds',
      targetId: undefined,
      targetType: undefined,
    });
  });
});

import { describe, it, expect } from 'vitest';
import { EventBus } from '../EventBus';
import { DamageSystem } from './DamageSystem';
import { Entity, Scene } from '../types';

function makeEntity(id: string, health: number, maxHealth: number, collisionType?: string): Entity {
  const entity: Entity = {
    id,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
    components: new Map(),
  };
  entity.components.set('stats', { health, maxHealth });
  if (collisionType) {
    entity.components.set('collision', { width: 10, height: 10, type: collisionType as any });
  }
  return entity;
}

function makeScene(entities: Entity[] = []): Scene {
  const scene: Scene = { name: 'test', entities: new Map() };
  for (const e of entities) scene.entities.set(e.id, e);
  return scene;
}

describe('DamageSystem', () => {
  it('applies damage from projectile:hit events to the target stats', () => {
    const bus = new EventBus();
    const sys = new DamageSystem();
    sys.attach(bus);

    const enemy = makeEntity('e1', 100, 100, 'enemy');
    const scene = makeScene([enemy]);

    bus.emit('projectile:hit', { projectileId: 'p1', targetId: 'e1', targetType: 'enemy', damage: 30 });
    sys.update(scene, 1 / 60);

    const stats = enemy.components.get('stats') as any;
    expect(stats.health).toBe(70);
    expect(scene.entities.has('e1')).toBe(true);
  });

  it('removes entity and emits entity:defeated when health reaches 0', () => {
    const bus = new EventBus();
    const sys = new DamageSystem();
    sys.attach(bus);

    const enemy = makeEntity('e2', 25, 25, 'enemy');
    const scene = makeScene([enemy]);

    const defeated: any[] = [];
    bus.on('entity:defeated', (e) => defeated.push(e));

    bus.emit('projectile:hit', { projectileId: 'p2', targetId: 'e2', targetType: 'enemy', damage: 30 });
    sys.update(scene, 1 / 60);

    expect(scene.entities.has('e2')).toBe(false);
    expect(defeated).toHaveLength(1);
    expect(defeated[0].entityId).toBe('e2');
    expect(defeated[0].type).toBe('enemy');
  });

  it('applies multiple hits in the same frame', () => {
    const bus = new EventBus();
    const sys = new DamageSystem();
    sys.attach(bus);

    const enemy = makeEntity('e3', 60, 60, 'enemy');
    const scene = makeScene([enemy]);

    bus.emit('projectile:hit', { projectileId: 'p3', targetId: 'e3', targetType: 'enemy', damage: 20 });
    bus.emit('projectile:hit', { projectileId: 'p4', targetId: 'e3', targetType: 'enemy', damage: 20 });
    sys.update(scene, 1 / 60);

    const stats = enemy.components.get('stats') as any;
    expect(stats.health).toBe(20);
    expect(scene.entities.has('e3')).toBe(true);
  });

  it('ignores hits on entities without stats component', () => {
    const bus = new EventBus();
    const sys = new DamageSystem();
    sys.attach(bus);

    const entity: Entity = {
      id: 'e4',
      transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 },
      components: new Map(),
    };
    const scene = makeScene([entity]);

    bus.emit('projectile:hit', { projectileId: 'p5', targetId: 'e4', targetType: 'wall', damage: 10 });
    sys.update(scene, 1 / 60);

    expect(scene.entities.has('e4')).toBe(true);
  });

  it('respects defense stat to reduce damage', () => {
    const bus = new EventBus();
    const sys = new DamageSystem();
    sys.attach(bus);

    const enemy = makeEntity('e5', 50, 50);
    (enemy.components.get('stats') as any).defense = 5;
    const scene = makeScene([enemy]);

    const damages: any[] = [];
    bus.on('entity:damage', (e) => damages.push(e));

    bus.emit('projectile:hit', { projectileId: 'p6', targetId: 'e5', targetType: 'enemy', damage: 20 });
    sys.update(scene, 1 / 60);

    const stats = enemy.components.get('stats') as any;
    expect(stats.health).toBe(35); // 50 - (20 - 5) = 35
    expect(damages[0].damage).toBe(15);
    expect(damages[0].remainingHealth).toBe(35);
  });

  it('emits entity:damage for every hit processed', () => {
    const bus = new EventBus();
    const sys = new DamageSystem();
    sys.attach(bus);

    const enemy = makeEntity('e6', 100, 100, 'enemy');
    const scene = makeScene([enemy]);

    const damages: any[] = [];
    bus.on('entity:damage', (e) => damages.push(e));

    bus.emit('projectile:hit', { projectileId: 'p7', targetId: 'e6', targetType: 'enemy', damage: 10 });
    bus.emit('projectile:hit', { projectileId: 'p8', targetId: 'e6', targetType: 'enemy', damage: 15 });
    sys.update(scene, 1 / 60);

    expect(damages).toHaveLength(2);
    expect(damages[0].damage).toBe(10);
    expect(damages[1].damage).toBe(15);
  });

  it('does not process pending damage after detach', () => {
    const bus = new EventBus();
    const sys = new DamageSystem();
    sys.attach(bus);

    const enemy = makeEntity('e7', 100, 100, 'enemy');
    const scene = makeScene([enemy]);

    bus.emit('projectile:hit', { projectileId: 'p9', targetId: 'e7', targetType: 'enemy', damage: 30 });
    sys.detach();
    sys.update(scene, 1 / 60);

    const stats = enemy.components.get('stats') as any;
    expect(stats.health).toBe(100);
  });
});

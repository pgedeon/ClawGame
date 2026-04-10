/**
 * Tests for BehaviorPresets — pre-built enemy/NPC behavior graphs.
 */

import { describe, it, expect } from 'vitest';
import { BehaviorPresets } from './BehaviorPresets';
import { BehaviorExecutor, BehaviorContext } from './BehaviorExecutor';
import { Entity, Scene } from '../types';
import { EventBus } from '../EventBus';

function makeEntity(id: string, x = 100, y = 100): Entity {
  return {
    id,
    name: id,
    type: id === 'player' ? 'player' : 'enemy',
    transform: { x, y },
    components: new Map(),
  };
}

function makeScene(...entities: Entity[]): Scene {
  const map = new Map<string, Entity>();
  entities.forEach((e) => map.set(e.id, e));
  return { name: 'test', entities: map };
}

function ctx(entity: Entity, scene: Scene, overrides?: Partial<BehaviorContext>): BehaviorContext {
  return {
    entity,
    scene,
    events: new EventBus(),
    variables: {},
    deltaTime: 1 / 60,
    ...overrides,
  };
}

// ─── Patrol ───

describe('BehaviorPresets.patrol', () => {
  it('creates a valid graph structure', () => {
    const graph = BehaviorPresets.patrol({ fromX: 0, toX: 400 });
    expect(graph.id).toBeTruthy();
    expect(graph.root).toBe('root');
    expect(graph.nodes.length).toBe(3);
    expect(graph.edges.length).toBe(2);
    expect(graph.tags).toContain('patrol');
  });

  it('entity moves toward first patrol point', () => {
    const graph = BehaviorPresets.patrol({ fromX: 0, toX: 400, id: 'p1' });
    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const enemy = makeEntity('enemy', 200, 0);
    const movement = { vx: 0, vy: 0, speed: 60 };
    enemy.components.set('movement', movement as any);
    const scene = makeScene(enemy);

    const status = executor.tick('p1', ctx(enemy, scene));
    // move-to returns 'running' when not at target yet
    expect(status).toBe('running');
    // Should be moving toward fromX=0 (left)
    expect(movement.vx).toBeLessThan(0);
  });

  it('entity arrives at first point and heads to second', () => {
    const graph = BehaviorPresets.patrol({ fromX: 0, toX: 400, id: 'p2' });
    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const enemy = makeEntity('enemy', 0, 0); // Already at fromX
    const movement = { vx: 0, vy: 0, speed: 60 };
    enemy.components.set('movement', movement as any);
    const scene = makeScene(enemy);

    // First tick: move-to (0,0) → already there → success, moves to next → move-to (400,0)
    const status = executor.tick('p2', ctx(enemy, scene));
    expect(status).toBe('running');
    // Now heading toward toX=400
    expect(movement.vx).toBeGreaterThan(0);
  });
});

// ─── Chase ───

describe('BehaviorPresets.chase', () => {
  it('creates a valid graph with chase + idle branches', () => {
    const graph = BehaviorPresets.chase({ targetId: 'player' });
    expect(graph.root).toBe('root');
    expect(graph.tags).toContain('chase');
    // root, chase-seq, detect, pursue, idle
    expect(graph.nodes.length).toBe(5);
  });

  it('chases when target in range', () => {
    const graph = BehaviorPresets.chase({ targetId: 'player', detectRange: 200, id: 'c1' });
    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const enemy = makeEntity('enemy', 100, 100);
    const movement = { vx: 0, vy: 0, speed: 100 };
    enemy.components.set('movement', movement as any);
    const player = makeEntity('player', 250, 100); // 150px away, within 200
    const scene = makeScene(enemy, player);

    const status = executor.tick('c1', ctx(enemy, scene));
    expect(status).toBe('running'); // pursuing
    expect(movement.vx).toBeGreaterThan(0);
  });

  it('idles when target out of range', () => {
    const graph = BehaviorPresets.chase({ targetId: 'player', detectRange: 100, id: 'c2' });
    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const enemy = makeEntity('enemy', 0, 0);
    const movement = { vx: 0, vy: 0, speed: 100 };
    enemy.components.set('movement', movement as any);
    const player = makeEntity('player', 500, 0); // 500px away, outside 100
    const scene = makeScene(enemy, player);

    const status = executor.tick('c2', ctx(enemy, scene));
    expect(status).toBe('success'); // idle branch always succeeds
    expect(movement.vx).toBe(0); // no movement
  });
});

// ─── Alert/Chase/Flee ───

describe('BehaviorPresets.alertChaseFlee', () => {
  it('creates a complex graph with 4 branches', () => {
    const graph = BehaviorPresets.alertChaseFlee({ targetId: 'player' });
    expect(graph.nodes.length).toBeGreaterThan(10);
    expect(graph.tags).toContain('alert');
    expect(graph.tags).toContain('flee');
  });

  it('flees when low health and target visible', () => {
    const graph = BehaviorPresets.alertChaseFlee({
      targetId: 'player',
      chaseRange: 150,
      fleeHealthThreshold: 50,
      id: 'acf1',
    });
    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const enemy = makeEntity('enemy', 100, 100);
    const stats = { hp: 20, maxHp: 100, damage: 10 };
    enemy.components.set('stats', stats as any);
    const movement = { vx: 0, vy: 0, speed: 100 };
    enemy.components.set('movement', movement as any);
    const player = makeEntity('player', 150, 100); // 50px away, in range
    const scene = makeScene(enemy, player);

    const status = executor.tick('acf1', ctx(enemy, scene));
    expect(status).toBe('success'); // flee sequence completes
  });

  it('chases when healthy and target close', () => {
    const graph = BehaviorPresets.alertChaseFlee({
      targetId: 'player',
      chaseRange: 150,
      fleeHealthThreshold: 30,
      id: 'acf2',
    });
    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const enemy = makeEntity('enemy', 100, 100);
    const stats = { hp: 100, maxHp: 100, damage: 10 };
    enemy.components.set('stats', stats as any);
    const movement = { vx: 0, vy: 0, speed: 100 };
    enemy.components.set('movement', movement as any);
    const player = makeEntity('player', 200, 100); // 100px, within chaseRange
    const scene = makeScene(enemy, player);

    const status = executor.tick('acf2', ctx(enemy, scene));
    expect(status).toBe('running'); // chasing
    expect(movement.vx).toBeGreaterThan(0);
    // Should have attacked (damage applied to player)
    // Player doesn't have stats component, so attack succeeds but no damage applied
  });

  it('enters alert state when target in alert range but not chase range', () => {
    const graph = BehaviorPresets.alertChaseFlee({
      targetId: 'player',
      alertRange: 300,
      chaseRange: 100,
      fleeHealthThreshold: 30,
      id: 'acf3',
    });
    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const enemy = makeEntity('enemy', 100, 100);
    const stats = { hp: 100, maxHp: 100, damage: 10 };
    enemy.components.set('stats', stats as any);
    const player = makeEntity('player', 350, 100); // 250px, in alert range but not chase
    const scene = makeScene(enemy, player);

    const status = executor.tick('acf3', ctx(enemy, scene));
    expect(status).toBe('success'); // alert sequence completes
    // Should have 'alerted' tag
    const tags = enemy.components.get('tags') as unknown as { list: string[] } | undefined;
    expect(tags?.list).toContain('alerted');
  });

  it('idles when no target in range', () => {
    const graph = BehaviorPresets.alertChaseFlee({
      targetId: 'player',
      alertRange: 100,
      chaseRange: 50,
      id: 'acf4',
    });
    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const enemy = makeEntity('enemy', 0, 0);
    const stats = { hp: 100, maxHp: 100, damage: 10 };
    enemy.components.set('stats', stats as any);
    const player = makeEntity('player', 500, 0); // far away
    const scene = makeScene(enemy, player);

    const status = executor.tick('acf4', ctx(enemy, scene));
    expect(status).toBe('success');
  });
});

// ─── Guard ───

describe('BehaviorPresets.guard', () => {
  it('creates a graph with chase + return + patrol', () => {
    const graph = BehaviorPresets.guard({ x: 300, targetId: 'player' });
    expect(graph.tags).toContain('guard');
    // root, chase-seq (detect, pursue), return-seq (not-at-post, go-home), patrol
    expect(graph.nodes.length).toBe(8);
  });

  it('chases intruder when detected', () => {
    const graph = BehaviorPresets.guard({ x: 300, targetId: 'player', detectRange: 200, id: 'g1' });
    const executor = new BehaviorExecutor();
    // Register the custom 'not-at-post' condition
    executor.registerCondition('not-at-post', (_data, ctx) => {
      const homeX = ctx.variables.homeX ?? 300;
      const dx = Math.abs(ctx.entity.transform.x - homeX);
      return dx > 10;
    });
    executor.registerGraph(graph);

    const enemy = makeEntity('enemy', 300, 0);
    const movement = { vx: 0, vy: 0, speed: 80 };
    enemy.components.set('movement', movement as any);
    const player = makeEntity('player', 200, 0); // 100px from guard, within 200
    const scene = makeScene(enemy, player);

    const status = executor.tick('g1', ctx(enemy, scene, { variables: { homeX: 300 } }));
    expect(status).toBe('running');
    expect(movement.vx).toBeLessThan(0); // moving toward player (left)
  });

  it('patrols when no intruder', () => {
    const graph = BehaviorPresets.guard({ x: 300, targetId: 'player', detectRange: 50, patrolRadius: 50, id: 'g2' });
    const executor = new BehaviorExecutor();
    executor.registerCondition('not-at-post', (_data, ctx) => {
      const homeX = ctx.variables.homeX ?? 300;
      return Math.abs(ctx.entity.transform.x - homeX) > 10;
    });
    executor.registerGraph(graph);

    const enemy = makeEntity('enemy', 300, 0);
    const movement = { vx: 0, vy: 0, speed: 80 };
    enemy.components.set('movement', movement as any);
    const player = makeEntity('player', 500, 0); // far away
    const scene = makeScene(enemy, player);

    // At post (300), so return-seq's "not-at-post" fails. Falls through to patrol.
    const status = executor.tick('g2', ctx(enemy, scene, { variables: { homeX: 300 } }));
    // Patrol is a move-to (350, 0) — running since not there yet
    expect(status).toBe('running');
    expect(movement.vx).toBeGreaterThan(0); // heading to patrol point
  });
});

// ─── Bindings ───

describe('BehaviorPresets bindings', () => {
  it('bindToType creates correct binding', () => {
    const binding = BehaviorPresets.bindToType('enemy', 'patrol-1', { speed: 80 });
    expect(binding.target).toBe('enemy');
    expect(binding.targetType).toBe('type');
    expect(binding.graphId).toBe('patrol-1');
    expect(binding.variables).toEqual({ speed: 80 });
  });

  it('bindToEntity creates correct binding', () => {
    const binding = BehaviorPresets.bindToEntity('enemy-42', 'chase-1');
    expect(binding.target).toBe('enemy-42');
    expect(binding.targetType).toBe('id');
    expect(binding.graphId).toBe('chase-1');
  });
});

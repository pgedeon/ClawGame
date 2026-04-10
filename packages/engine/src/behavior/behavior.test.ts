/**
 * Tests for Behavior Graph types and BehaviorExecutor
 */

import { describe, it, expect } from 'vitest';
import {
  BehaviorGraph,
  BehaviorNode,
} from './types';
import { BehaviorExecutor, BehaviorContext } from './BehaviorExecutor';
import { Entity, Scene } from '../types';
import { EventBus } from '../EventBus';

// ─── Helpers ───

function makeEntity(id: string, overrides?: Partial<Entity>): Entity {
  return {
    id,
    name: id,
    type: 'enemy',
    transform: { x: 100, y: 100 },
    components: new Map(Object.entries(overrides?.components ?? {})),
    ...overrides,
  };
}

function makeScene(entities: Entity[]): Scene {
  const map = new Map<string, Entity>();
  entities.forEach((e) => map.set(e.id, e));
  return { name: 'test', entities: map };
}

function makeContext(entity: Entity, scene: Scene, overrides?: Partial<BehaviorContext>): BehaviorContext {
  return {
    entity,
    scene,
    events: new EventBus(),
    variables: {},
    deltaTime: 1 / 60,
    ...overrides,
  };
}

// ─── Test Graphs ───

function makeAlwaysSucceedGraph(): BehaviorGraph {
  const nodes: BehaviorNode[] = [
    {
      id: 'root',
      type: 'composite',
      label: 'Selector',
      data: { type: 'composite', composite: { kind: 'selector' } },
    },
    {
      id: 'cond1',
      type: 'condition',
      label: 'Always True',
      data: { type: 'condition', condition: { kind: 'always' } },
    },
    {
      id: 'act1',
      type: 'action',
      label: 'Set Velocity',
      data: {
        type: 'action',
        action: { kind: 'set-velocity', vx: 50, vy: 0 },
      },
    },
  ];
  const edges = [
    { id: 'e1', from: 'root', to: 'cond1', priority: 1 },
    { id: 'e2', from: 'root', to: 'act1', priority: 2 },
  ];
  return { id: 'g1', name: 'test-graph', root: 'root', nodes, edges };
}

function makeSequenceWithEventGraph(): BehaviorGraph {
  const nodes: BehaviorNode[] = [
    {
      id: 'root',
      type: 'composite',
      data: { type: 'composite', composite: { kind: 'sequence' } },
    },
    {
      id: 'cond',
      type: 'condition',
      data: { type: 'condition', condition: { kind: 'always' } },
    },
    {
      id: 'action',
      type: 'action',
      data: {
        type: 'action',
        action: { kind: 'fire-event', event: 'test-event', payload: { foo: 'bar' } },
      },
    },
  ];
  const edges = [
    { id: 'e1', from: 'root', to: 'cond' },
    { id: 'e2', from: 'root', to: 'action' },
  ];
  return { id: 'seq1', name: 'sequence-test', root: 'root', nodes, edges };
}

// ─── Tests ───

describe('BehaviorExecutor', () => {
  it('executes a selector with always-true condition → success', () => {
    const executor = new BehaviorExecutor();
    const graph = makeAlwaysSucceedGraph();
    executor.registerGraph(graph);

    const entity = makeEntity('e1');
    const scene = makeScene([entity]);
    const ctx = makeContext(entity, scene);

    const status = executor.tick('g1', ctx);
    expect(status).toBe('success');
  });

  it('executes a sequence: condition passes then action fires event', () => {
    const executor = new BehaviorExecutor();
    const graph = makeSequenceWithEventGraph();
    executor.registerGraph(graph);

    const entity = makeEntity('e1');
    const scene = makeScene([entity]);
    const events = new EventBus();
    const ctx = makeContext(entity, scene, { events });

    let eventFired = false;
    events.on('custom:test-event' as any, () => { eventFired = true; });

    const status = executor.tick('seq1', ctx);
    expect(status).toBe('success');
    expect(eventFired).toBe(true);
  });

  it('sequence fails when condition fails', () => {
    const graph: BehaviorGraph = {
      id: 'fail-seq',
      name: 'fail-seq',
      root: 'root',
      nodes: [
        { id: 'root', type: 'composite', data: { type: 'composite', composite: { kind: 'sequence' } } },
        { id: 'cond', type: 'condition', data: { type: 'condition', condition: { kind: 'never' } } },
        { id: 'act', type: 'action', data: { type: 'action', action: { kind: 'fire-event', event: 'should-not-fire' } } },
      ],
      edges: [
        { id: 'e1', from: 'root', to: 'cond' },
        { id: 'e2', from: 'root', to: 'act' },
      ],
    };

    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const entity = makeEntity('e1');
    const scene = makeScene([entity]);
    const events = new EventBus();
    let fired = false;
    events.on('custom:should-not-fire' as any, () => { fired = true; });

    const ctx = makeContext(entity, scene, { events });
    expect(executor.tick('fail-seq', ctx)).toBe('failure');
    expect(fired).toBe(false);
  });

  it('set-velocity via sequence modifies entity', () => {
    const graph: BehaviorGraph = {
      id: 'vel-seq',
      name: 'velocity-seq',
      root: 'root',
      nodes: [
        { id: 'root', type: 'composite', data: { type: 'composite', composite: { kind: 'sequence' } } },
        { id: 'cond', type: 'condition', data: { type: 'condition', condition: { kind: 'always' } } },
        { id: 'act', type: 'action', data: { type: 'action', action: { kind: 'set-velocity', vx: 42, vy: -7 } } },
      ],
      edges: [
        { id: 'e1', from: 'root', to: 'cond' },
        { id: 'e2', from: 'root', to: 'act' },
      ],
    };

    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const movement = { vx: 0, vy: 0, speed: 100 };
    const entity = makeEntity('e1');
    entity.components.set('movement', movement as any);
    const scene = makeScene([entity]);
    const ctx = makeContext(entity, scene);

    const status = executor.tick('vel-seq', ctx);
    expect(status).toBe('success');
    expect(movement.vx).toBe(42);
    expect(movement.vy).toBe(-7);
  });

  it('applies damage to a target entity', () => {
    const graph: BehaviorGraph = {
      id: 'dmg',
      name: 'damage-test',
      root: 'act',
      nodes: [
        {
          id: 'act',
          type: 'action',
          data: { type: 'action', action: { kind: 'apply-damage', targetId: 'target', amount: 25 } },
        },
      ],
      edges: [],
    };

    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const attacker = makeEntity('e1');
    const target = makeEntity('target');
    const stats = { hp: 100, maxHp: 100, damage: 10 };
    target.components.set('stats', stats as any);
    const scene = makeScene([attacker, target]);
    const ctx = makeContext(attacker, scene);

    executor.tick('dmg', ctx);
    expect(stats.hp).toBe(75);
  });

  it('destroy-self removes entity from scene', () => {
    const graph: BehaviorGraph = {
      id: 'destroy',
      name: 'destroy-test',
      root: 'act',
      nodes: [
        { id: 'act', type: 'action', data: { type: 'action', action: { kind: 'destroy-self' } } },
      ],
      edges: [],
    };

    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const entity = makeEntity('e1');
    const scene = makeScene([entity]);
    const events = new EventBus();
    const ctx = makeContext(entity, scene, { events });

    let destroyed = false;
    events.on('custom:entity:destroyed' as any, () => { destroyed = true; });

    executor.tick('destroy', ctx);
    expect(scene.entities.has('e1')).toBe(false);
    expect(destroyed).toBe(true);
  });

  it('inverter decorator flips child result', () => {
    const graph: BehaviorGraph = {
      id: 'inv',
      name: 'inverter-test',
      root: 'inv-node',
      nodes: [
        { id: 'inv-node', type: 'decorator', data: { type: 'decorator', decorator: { kind: 'inverter' } } },
        { id: 'always', type: 'condition', data: { type: 'condition', condition: { kind: 'always' } } },
      ],
      edges: [{ id: 'e1', from: 'inv-node', to: 'always' }],
    };

    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const entity = makeEntity('e1');
    const scene = makeScene([entity]);
    expect(executor.tick('inv', makeContext(entity, scene))).toBe('failure');
  });

  it('inverter turns failure into success', () => {
    const graph: BehaviorGraph = {
      id: 'inv2',
      name: 'inverter-fail',
      root: 'inv-node',
      nodes: [
        { id: 'inv-node', type: 'decorator', data: { type: 'decorator', decorator: { kind: 'inverter' } } },
        { id: 'never', type: 'condition', data: { type: 'condition', condition: { kind: 'never' } } },
      ],
      edges: [{ id: 'e1', from: 'inv-node', to: 'never' }],
    };

    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const entity = makeEntity('e1');
    const scene = makeScene([entity]);
    expect(executor.tick('inv2', makeContext(entity, scene))).toBe('success');
  });

  it('supports custom condition evaluators', () => {
    const graph: BehaviorGraph = {
      id: 'custom-cond',
      name: 'custom-condition',
      root: 'cond',
      nodes: [
        {
          id: 'cond',
          type: 'condition',
          data: { type: 'condition', condition: { kind: 'custom', evaluator: 'is-blue' } },
        },
      ],
      edges: [],
    };

    const executor = new BehaviorExecutor();
    executor.registerCondition('is-blue', (_data, ctx) => ctx.variables.color === 'blue');
    executor.registerGraph(graph);

    const entity = makeEntity('e1');
    const scene = makeScene([entity]);

    expect(executor.tick('custom-cond', makeContext(entity, scene, { variables: { color: 'red' } }))).toBe('failure');
    expect(executor.tick('custom-cond', makeContext(entity, scene, { variables: { color: 'blue' } }))).toBe('success');
  });

  it('supports custom action executors', () => {
    const graph: BehaviorGraph = {
      id: 'custom-act',
      name: 'custom-action',
      root: 'act',
      nodes: [
        {
          id: 'act',
          type: 'action',
          data: { type: 'action', action: { kind: 'custom', executor: 'log' } },
        },
      ],
      edges: [],
    };

    const executor = new BehaviorExecutor();
    const log: string[] = [];
    executor.registerAction('log', (_data, ctx) => {
      log.push(`entity=${ctx.entity.id}`);
      return 'success';
    });
    executor.registerGraph(graph);

    const entity = makeEntity('e1');
    const scene = makeScene([entity]);
    expect(executor.tick('custom-act', makeContext(entity, scene))).toBe('success');
    expect(log).toEqual(['entity=e1']);
  });

  it('move-toward-entity chases a target', () => {
    const graph: BehaviorGraph = {
      id: 'chase',
      name: 'chase-test',
      root: 'act',
      nodes: [
        {
          id: 'act',
          type: 'action',
          data: { type: 'action', action: { kind: 'move-toward-entity', targetId: 'player' } },
        },
      ],
      edges: [],
    };

    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const enemy = makeEntity('enemy');
    const movement = { vx: 0, vy: 0, speed: 100 };
    enemy.components.set('movement', movement as any);
    const player = makeEntity('player');
    player.transform = { x: 200, y: 100 };
    const scene = makeScene([enemy, player]);
    const ctx = makeContext(enemy, scene);

    const status = executor.tick('chase', ctx);
    expect(status).toBe('running');
    expect(movement.vx).toBeGreaterThan(0);
  });

  it('parallel composite: all must succeed', () => {
    const graph: BehaviorGraph = {
      id: 'par',
      name: 'parallel-test',
      root: 'root',
      nodes: [
        { id: 'root', type: 'composite', data: { type: 'composite', composite: { kind: 'parallel' } } },
        { id: 'c1', type: 'condition', data: { type: 'condition', condition: { kind: 'always' } } },
        { id: 'c2', type: 'condition', data: { type: 'condition', condition: { kind: 'always' } } },
      ],
      edges: [
        { id: 'e1', from: 'root', to: 'c1' },
        { id: 'e2', from: 'root', to: 'c2' },
      ],
    };

    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const entity = makeEntity('e1');
    const scene = makeScene([entity]);
    expect(executor.tick('par', makeContext(entity, scene))).toBe('success');
  });

  it('parallel fails when any child fails', () => {
    const graph: BehaviorGraph = {
      id: 'par-fail',
      name: 'parallel-fail',
      root: 'root',
      nodes: [
        { id: 'root', type: 'composite', data: { type: 'composite', composite: { kind: 'parallel' } } },
        { id: 'c1', type: 'condition', data: { type: 'condition', condition: { kind: 'always' } } },
        { id: 'c2', type: 'condition', data: { type: 'condition', condition: { kind: 'never' } } },
      ],
      edges: [
        { id: 'e1', from: 'root', to: 'c1' },
        { id: 'e2', from: 'root', to: 'c2' },
      ],
    };

    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const entity = makeEntity('e1');
    const scene = makeScene([entity]);
    expect(executor.tick('par-fail', makeContext(entity, scene))).toBe('failure');
  });

  it('entity-in-range condition checks distance', () => {
    const graph: BehaviorGraph = {
      id: 'range',
      name: 'range-test',
      root: 'cond',
      nodes: [
        {
          id: 'cond',
          type: 'condition',
          data: { type: 'condition', condition: { kind: 'entity-in-range', targetId: 'target', range: 50 } },
        },
      ],
      edges: [],
    };

    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const entity = makeEntity('e1');
    entity.transform = { x: 0, y: 0 };
    const target = makeEntity('target');
    target.transform = { x: 30, y: 0 };
    const scene = makeScene([entity, target]);

    expect(executor.tick('range', makeContext(entity, scene))).toBe('success');

    target.transform = { x: 100, y: 0 };
    expect(executor.tick('range', makeContext(entity, scene))).toBe('failure');
  });

  it('random-chance returns both outcomes over many runs', () => {
    const graph: BehaviorGraph = {
      id: 'rand',
      name: 'random-test',
      root: 'cond',
      nodes: [
        {
          id: 'cond',
          type: 'condition',
          data: { type: 'condition', condition: { kind: 'random-chance', chance: 0.5 } },
        },
      ],
      edges: [],
    };

    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const entity = makeEntity('e1');
    const scene = makeScene([entity]);
    const ctx = makeContext(entity, scene);

    let successes = 0;
    for (let i = 0; i < 1000; i++) {
      if (executor.tick('rand', ctx) === 'success') successes++;
    }
    expect(successes).toBeGreaterThan(350);
    expect(successes).toBeLessThan(650);
  });

  it('set-variable modifies context variables', () => {
    const graph: BehaviorGraph = {
      id: 'var',
      name: 'var-test',
      root: 'act',
      nodes: [
        {
          id: 'act',
          type: 'action',
          data: { type: 'action', action: { kind: 'set-variable', variable: 'mood', value: 'angry' } },
        },
      ],
      edges: [],
    };

    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const entity = makeEntity('e1');
    const scene = makeScene([entity]);
    const vars: Record<string, any> = { mood: 'calm' };
    const ctx = makeContext(entity, scene, { variables: vars });

    executor.tick('var', ctx);
    expect(vars.mood).toBe('angry');
  });

  it('resetEntity clears run state', () => {
    const executor = new BehaviorExecutor();
    executor.registerGraph(makeAlwaysSucceedGraph());

    const entity = makeEntity('e1');
    const scene = makeScene([entity]);
    executor.tick('g1', makeContext(entity, scene));

    executor.resetEntity('e1');
    expect(executor.tick('g1', makeContext(entity, scene))).toBe('success');
  });

  it('returns failure for unknown graph', () => {
    const executor = new BehaviorExecutor();
    const entity = makeEntity('e1');
    const scene = makeScene([entity]);
    expect(executor.tick('nonexistent', makeContext(entity, scene))).toBe('failure');
  });

  it('heal action restores hp up to maxHp', () => {
    const graph: BehaviorGraph = {
      id: 'heal',
      name: 'heal-test',
      root: 'act',
      nodes: [
        {
          id: 'act',
          type: 'action',
          data: { type: 'action', action: { kind: 'heal', amount: 50 } },
        },
      ],
      edges: [],
    };

    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const entity = makeEntity('e1');
    const stats = { hp: 30, maxHp: 100, damage: 0 };
    entity.components.set('stats', stats as any);
    const scene = makeScene([entity]);
    const ctx = makeContext(entity, scene);

    executor.tick('heal', ctx);
    expect(stats.hp).toBe(80);

    // Overheal caps at maxHp
    executor.tick('heal', ctx);
    expect(stats.hp).toBe(100);
  });

  it('set-tag and entity-has-tag condition work together', () => {
    const graph: BehaviorGraph = {
      id: 'tags',
      name: 'tag-test',
      root: 'root',
      nodes: [
        { id: 'root', type: 'composite', data: { type: 'composite', composite: { kind: 'sequence' } } },
        { id: 'set', type: 'action', data: { type: 'action', action: { kind: 'set-tag', tag: 'alerted' } } },
        { id: 'check', type: 'condition', data: { type: 'condition', condition: { kind: 'entity-has-tag', tag: 'alerted' } } },
      ],
      edges: [
        { id: 'e1', from: 'root', to: 'set' },
        { id: 'e2', from: 'root', to: 'check' },
      ],
    };

    const executor = new BehaviorExecutor();
    executor.registerGraph(graph);

    const entity = makeEntity('e1');
    const scene = makeScene([entity]);
    const ctx = makeContext(entity, scene);

    expect(executor.tick('tags', ctx)).toBe('success');
  });
});

/**
 * @clawgame/engine - Genre Kits Tests
 *
 * Tests for PlatformerKit, TopDownKit, RPGKit, and TacticsKit.
 * Validates graph structure, connectivity, and configuration propagation.
 */

import { describe, it, expect } from 'vitest';
import {
  PlatformerKit,
  TopDownKit,
  RPGKit,
  TacticsKit,
} from './GenreKits';

// ─── Helpers ───

/** Collect all node IDs reachable from root via edges */
function reachableNodeIds(graph: { root: string; nodes: { id: string }[]; edges: { from: string; to: string }[] }): Set<string> {
  const visited = new Set<string>();
  const queue = [graph.root];
  while (queue.length > 0) {
    const current = queue.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const e of graph.edges) {
      if (e.from === current) queue.push(e.to);
    }
  }
  return visited;
}

/** Verify graph integrity: all nodes reachable, all edge endpoints valid */
function assertValidGraph(graph: any) {
  const nodeIds: Set<string> = new Set(graph.nodes.map((n: any) => n.id));
  // Root exists
  expect(nodeIds.has(graph.root)).toBe(true);
  // All edge endpoints reference valid nodes
  for (const e of graph.edges) {
    expect(nodeIds.has(e.from)).toBe(true);
    expect(nodeIds.has(e.to)).toBe(true);
  }
  // All nodes reachable from root
  const reachable = reachableNodeIds(graph);
  for (const id of nodeIds) {
    expect(reachable.has(id)).toBe(true);
  }
  // Has tags
  expect(graph.tags).toBeDefined();
  expect(graph.tags.length).toBeGreaterThan(0);
}

// ─── PlatformerKit ───

describe('PlatformerKit', () => {
  describe('patrolEnemy', () => {
    it('creates a valid patrol enemy graph', () => {
      const graph = PlatformerKit.patrolEnemy({ fromX: 0, toX: 200 });
      expect(graph.name).toContain('Patrol');
      assertValidGraph(graph);
    });

    it('uses custom speed and damage in variables', () => {
      const graph = PlatformerKit.patrolEnemy({ fromX: 0, toX: 200, speed: 80, damage: 3 });
      expect(graph.variables!.speed).toBe(80);
      expect(graph.variables!.damage).toBe(3);
    });

    it('uses custom id when provided', () => {
      const graph = PlatformerKit.patrolEnemy({ fromX: 0, toX: 100, id: 'my-goomba' });
      expect(graph.id).toBe('my-goomba');
    });

    it('has platformer and enemy tags', () => {
      const graph = PlatformerKit.patrolEnemy({ fromX: 0, toX: 100 });
      expect(graph.tags).toContain('platformer');
      expect(graph.tags).toContain('enemy');
    });
  });

  describe('jumpingEnemy', () => {
    it('creates a valid jumping enemy graph', () => {
      const graph = PlatformerKit.jumpingEnemy({ x: 100 });
      expect(graph.name).toContain('Jump');
      assertValidGraph(graph);
    });

    it('includes wait node with configured interval', () => {
      const graph = PlatformerKit.jumpingEnemy({ x: 100, interval: 3 });
      const waitNode = graph.nodes.find(n => n.label === 'Wait 3s');
      expect(waitNode).toBeDefined();
    });
  });

  describe('collectible', () => {
    it('creates a valid collectible graph', () => {
      const graph = PlatformerKit.collectible({ x: 50, y: 100 });
      assertValidGraph(graph);
      expect(graph.tags).toContain('collectible');
    });

    it('stores points in variables', () => {
      const graph = PlatformerKit.collectible({ x: 50, y: 100, points: 50 });
      expect(graph.variables!.points).toBe(50);
    });

    it('includes destroy-self node', () => {
      const graph = PlatformerKit.collectible({ x: 50, y: 100 });
      const destroy = graph.nodes.find(n => n.data.type === 'action' && n.data.action.kind === 'destroy-self');
      expect(destroy).toBeDefined();
    });
  });

  describe('hazard', () => {
    it('creates a valid hazard graph', () => {
      const graph = PlatformerKit.hazard({ x: 100, y: 0 });
      assertValidGraph(graph);
      expect(graph.tags).toContain('hazard');
    });

    it('has damage and cooldown nodes', () => {
      const graph = PlatformerKit.hazard({ x: 100, y: 0, damagePerTick: 2, interval: 0.3 });
      expect(graph.variables!.damagePerTick).toBe(2);
      expect(graph.variables!.interval).toBe(0.3);
    });
  });
});

// ─── TopDownKit ───

describe('TopDownKit', () => {
  describe('wanderEnemy', () => {
    it('creates a valid wander graph', () => {
      const graph = TopDownKit.wanderEnemy({ centerX: 200, centerY: 200 });
      assertValidGraph(graph);
      expect(graph.tags).toContain('top-down');
    });

    it('stores radius and speed in variables', () => {
      const graph = TopDownKit.wanderEnemy({ centerX: 0, centerY: 0, radius: 150, speed: 70 });
      expect(graph.variables!.radius).toBe(150);
      expect(graph.variables!.speed).toBe(70);
    });
  });

  describe('shooterEnemy', () => {
    it('creates a valid shooter graph', () => {
      const graph = TopDownKit.shooterEnemy({ x: 100, y: 100 });
      assertValidGraph(graph);
      expect(graph.tags).toContain('shooter');
    });

    it('uses selector root for conditional shooting', () => {
      const graph = TopDownKit.shooterEnemy({ x: 100, y: 100 });
      const root = graph.nodes.find(n => n.id === 'root')!;
      expect(root.data.type).toBe('composite');
      if (root.data.type === 'composite') {
        expect(root.data.composite.kind).toBe('selector');
      }
    });

    it('spawns configured projectile type', () => {
      const graph = TopDownKit.shooterEnemy({ x: 100, y: 100, projectileType: 'arrow' });
      expect(graph.variables!.projectileType).toBe('arrow');
    });
  });

  describe('itemDrop', () => {
    it('creates a valid item drop graph', () => {
      const graph = TopDownKit.itemDrop({ x: 50, y: 50, itemType: 'health-potion' });
      assertValidGraph(graph);
      expect(graph.variables!.itemType).toBe('health-potion');
    });
  });
});

// ─── RPGKit ───

describe('RPGKit', () => {
  describe('questNPC', () => {
    it('creates a valid quest NPC graph', () => {
      const graph = RPGKit.questNPC({
        questId: 'q1',
        introDialogue: ['Hello!', 'Please help!'],
        completionDialogue: ['Thank you!'],
      });
      assertValidGraph(graph);
      expect(graph.tags).toContain('rpg');
      expect(graph.tags).toContain('quest');
    });

    it('uses selector root for quest state branching', () => {
      const graph = RPGKit.questNPC({
        questId: 'q1',
        introDialogue: ['Hi'],
        completionDialogue: ['Thanks'],
      });
      const root = graph.nodes.find(n => n.id === 'root')!;
      expect(root.data.type).toBe('composite');
      if (root.data.type === 'composite') {
        expect(root.data.composite.kind).toBe('selector');
      }
    });

    it('stores questId in variables', () => {
      const graph = RPGKit.questNPC({
        questId: 'dragon-slayer',
        introDialogue: [],
        completionDialogue: [],
      });
      expect(graph.variables!.questId).toBe('dragon-slayer');
    });
  });

  describe('turnBasedEnemy', () => {
    it('creates a valid combat AI graph', () => {
      const graph = RPGKit.turnBasedEnemy();
      assertValidGraph(graph);
      expect(graph.tags).toContain('turn-based');
    });

    it('heal threshold is 25% of maxHp', () => {
      const graph = RPGKit.turnBasedEnemy({ maxHp: 100 });
      const lowHp = graph.nodes.find(n => n.label === 'HP < 25');
      expect(lowHp).toBeDefined();
    });

    it('has random chance for special attack', () => {
      const graph = RPGKit.turnBasedEnemy();
      const lucky = graph.nodes.find(n => n.label === '20% Chance');
      expect(lucky).toBeDefined();
    });
  });

  describe('villagerNPC', () => {
    it('creates a valid villager graph', () => {
      const graph = RPGKit.villagerNPC({ dialogues: ['Nice day!', 'Goodbye!'] });
      assertValidGraph(graph);
      expect(graph.tags).toContain('villager');
    });

    it('stores dialogues in variables', () => {
      const lines = ['Line 1', 'Line 2', 'Line 3'];
      const graph = RPGKit.villagerNPC({ dialogues: lines });
      expect(graph.variables!.dialogues).toEqual(lines);
    });
  });
});

// ─── TacticsKit ───

describe('TacticsKit', () => {
  describe('meleeUnit', () => {
    it('creates a valid melee unit graph', () => {
      const graph = TacticsKit.meleeUnit();
      assertValidGraph(graph);
      expect(graph.tags).toContain('tactics');
      expect(graph.tags).toContain('melee');
    });

    it('stores combat stats in variables', () => {
      const graph = TacticsKit.meleeUnit({ moveRange: 4, attackRange: 2, damage: 20, maxHp: 100 });
      expect(graph.variables!.moveRange).toBe(4);
      expect(graph.variables!.attackRange).toBe(2);
      expect(graph.variables!.damage).toBe(20);
      expect(graph.variables!.maxHp).toBe(100);
    });

    it('prioritizes attacking over approaching', () => {
      const graph = TacticsKit.meleeUnit();
      const attackEdge = graph.edges.find(e => e.to === 'attack-seq')!;
      const approachEdge = graph.edges.find(e => e.to === 'approach')!;
      expect(attackEdge.priority!).toBeLessThan(approachEdge.priority!);
    });
  });

  describe('rangedUnit', () => {
    it('creates a valid ranged unit graph', () => {
      const graph = TacticsKit.rangedUnit();
      assertValidGraph(graph);
      expect(graph.tags).toContain('ranged');
    });

    it('prioritizes fleeing over firing', () => {
      const graph = TacticsKit.rangedUnit();
      const fleeEdge = graph.edges.find(e => e.to === 'flee-seq')!;
      const fireEdge = graph.edges.find(e => e.to === 'fire-seq')!;
      expect(fleeEdge.priority!).toBeLessThan(fireEdge.priority!);
    });
  });

  describe('supportUnit', () => {
    it('creates a valid support unit graph', () => {
      const graph = TacticsKit.supportUnit();
      assertValidGraph(graph);
      expect(graph.tags).toContain('support');
    });

    it('stores heal amount in variables', () => {
      const graph = TacticsKit.supportUnit({ healAmount: 30 });
      expect(graph.variables!.healAmount).toBe(30);
    });

    it('prioritizes healing over moving', () => {
      const graph = TacticsKit.supportUnit();
      const healEdge = graph.edges.find(e => e.to === 'heal-seq')!;
      const moveEdge = graph.edges.find(e => e.to === 'move-to-ally')!;
      expect(healEdge.priority!).toBeLessThan(moveEdge.priority!);
    });
  });
});

// ─── Cross-kit validation ───

describe('Genre Kits cross-validation', () => {
  it('all kit graphs have unique names within their kit', () => {
    const kits = [
      [PlatformerKit.patrolEnemy({ fromX: 0, toX: 100 }), PlatformerKit.jumpingEnemy({ x: 50 }), PlatformerKit.collectible({ x: 0, y: 0 }), PlatformerKit.hazard({ x: 0, y: 0 })],
      [TopDownKit.wanderEnemy({ centerX: 0, centerY: 0 }), TopDownKit.shooterEnemy({ x: 0, y: 0 }), TopDownKit.itemDrop({ x: 0, y: 0, itemType: 'test' })],
      [RPGKit.questNPC({ questId: 'q', introDialogue: [], completionDialogue: [] }), RPGKit.turnBasedEnemy(), RPGKit.villagerNPC({ dialogues: [] })],
      [TacticsKit.meleeUnit(), TacticsKit.rangedUnit(), TacticsKit.supportUnit()],
    ];

    for (const graphs of kits) {
      const names = graphs.map(g => g.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('all graphs have genre-kit tag', () => {
    const allGraphs = [
      PlatformerKit.patrolEnemy({ fromX: 0, toX: 100 }),
      TopDownKit.wanderEnemy({ centerX: 0, centerY: 0 }),
      RPGKit.villagerNPC({ dialogues: [] }),
      TacticsKit.meleeUnit(),
    ];
    for (const g of allGraphs) {
      expect(g.tags).toContain('genre-kit');
    }
  });
});

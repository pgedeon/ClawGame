/**
 * @clawgame/engine - Behavior Presets
 *
 * Pre-built behavior graphs for common enemy/NPC patterns.
 * These are factory functions that return BehaviorGraph instances
 * with configurable parameters (patrol points, chase range, etc.).
 *
 * Usage:
 *   const patrol = BehaviorPresets.patrol({ fromX: 100, toX: 400, speed: 60 });
 *   executor.registerGraph(patrol);
 *   executor.tick(patrol.id, ctx);
 */

import {
  BehaviorGraph,
  BehaviorNode,
  BehaviorEdge,
  BehaviorBinding,
} from './types';

// ─── Configuration Types ───

export interface PatrolConfig {
  /** Horizontal patrol range start */
  fromX: number;
  /** Horizontal patrol range end */
  toX: number;
  /** Y position (stays fixed) */
  y?: number;
  /** Movement speed */
  speed?: number;
  /** Unique ID for the graph */
  id?: string;
}

export interface ChaseConfig {
  /** Entity ID to chase */
  targetId: string;
  /** Range at which chase begins */
  detectRange?: number;
  /** Range at which chase stops (lose interest) */
  loseRange?: number;
  /** Speed while chasing */
  speed?: number;
  /** Unique ID for the graph */
  id?: string;
}

export interface AlertChaseConfig {
  /** Entity ID to detect */
  targetId: string;
  /** Range to enter alert state */
  alertRange?: number;
  /** Range to start chasing */
  chaseRange?: number;
  /** Range to lose target */
  loseRange?: number;
  /** Health threshold below which entity flees */
  fleeHealthThreshold?: number;
  /** Chase speed */
  chaseSpeed?: number;
  /** Flee speed */
  fleeSpeed?: number;
  /** Unique ID for the graph */
  id?: string;
}

export interface GuardConfig {
  /** Guard position X */
  x: number;
  /** Guard position Y */
  y?: number;
  /** Patrol radius */
  patrolRadius?: number;
  /** Target entity to detect */
  targetId: string;
  /** Detection range */
  detectRange?: number;
  /** Speed */
  speed?: number;
  /** Unique ID for the graph */
  id?: string;
}

// ─── Helpers ───

let _counter = 0;
function uid(prefix: string): string {
  return `${prefix}-${++_counter}`;
}

function node(
  id: string,
  type: BehaviorNode['type'],
  data: BehaviorNode['data'],
  label?: string,
): BehaviorNode {
  const n: BehaviorNode = { id, type, data };
  if (label) n.label = label;
  return n;
}

function edge(from: string, to: string, priority?: number): BehaviorEdge {
  const e: BehaviorEdge = { id: `e-${uid(from)}`, from, to };
  if (priority !== undefined) e.priority = priority;
  return e;
}

// ─── Preset Graphs ───

export const BehaviorPresets = {
  /**
   * Simple back-and-forth horizontal patrol.
   * Moves from fromX to toX, then reverses.
   */
  patrol(config: PatrolConfig): BehaviorGraph {
    const { fromX, toX, y = 0, speed = 60 } = config;
    const graphId = config.id ?? uid('patrol');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Patrol Loop'),
      // Move to point A
      node('move-a', 'action', {
        type: 'action',
        action: { kind: 'move-to', x: fromX, y },
      }, `Move to (${fromX}, ${y})`),
      // Move to point B
      node('move-b', 'action', {
        type: 'action',
        action: { kind: 'move-to', x: toX, y },
      }, `Move to (${toX}, ${y})`),
    ];

    const edges: BehaviorEdge[] = [
      edge('root', 'move-a', 1),
      edge('root', 'move-b', 2),
    ];

    return {
      id: graphId,
      name: 'Patrol',
      root: 'root',
      nodes,
      edges,
      tags: ['patrol', 'movement', 'preset'],
    };
  },

  /**
   * Chase a target when in range, idle otherwise.
   * Selector: if target in range → chase, else → succeed (idle).
   */
  chase(config: ChaseConfig): BehaviorGraph {
    const {
      targetId,
      detectRange = 200,
      loseRange = 400,
      speed = 100,
    } = config;
    const graphId = config.id ?? uid('chase');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'selector' } }, 'Chase AI'),
      // Branch 1: target in range → chase
      node('chase-seq', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Chase Sequence'),
      node('detect', 'condition', {
        type: 'condition',
        condition: { kind: 'entity-in-range', targetId, range: detectRange },
      }, `Detect (${detectRange}px)`),
      node('pursue', 'action', {
        type: 'action',
        action: { kind: 'move-toward-entity', targetId },
      }, 'Pursue Target'),
      // Branch 2: idle (always succeeds, means "do nothing this tick")
      node('idle', 'condition', {
        type: 'condition',
        condition: { kind: 'always' },
      }, 'Idle'),
    ];

    const edges: BehaviorEdge[] = [
      edge('root', 'chase-seq', 1),
      edge('root', 'idle', 2),
      edge('chase-seq', 'detect', 1),
      edge('chase-seq', 'pursue', 2),
    ];

    return {
      id: graphId,
      name: 'Chase',
      root: 'root',
      nodes,
      edges,
      tags: ['chase', 'combat', 'preset'],
    };
  },

  /**
   * Full alert → chase → flee behavior.
   * - Alert when target enters alert range
   * - Chase when target enters chase range
   * - Flee when health drops below threshold
   * - Return to idle when target out of range
   */
  alertChaseFlee(config: AlertChaseConfig): BehaviorGraph {
    const {
      targetId,
      alertRange = 300,
      chaseRange = 150,
      loseRange = 400,
      fleeHealthThreshold = 30,
      chaseSpeed = 120,
      fleeSpeed = 150,
    } = config;
    const graphId = config.id ?? uid('alert-chase');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'selector' } }, 'Alert/Chase/Flee'),

      // Branch 1: Flee if low health + target visible
      node('flee-seq', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Flee Sequence'),
      node('low-hp', 'condition', {
        type: 'condition',
        condition: { kind: 'health-below', threshold: fleeHealthThreshold },
      }, `Low HP (<${fleeHealthThreshold})`),
      node('target-visible', 'condition', {
        type: 'condition',
        condition: { kind: 'entity-in-range', targetId, range: loseRange },
      }, 'Target Visible'),
      node('flee', 'action', {
        type: 'action',
        action: { kind: 'set-velocity', vx: -chaseSpeed, vy: 0 },
      }, 'Flee!'),

      // Branch 2: Chase if target close
      node('chase-seq', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Chase Sequence'),
      node('target-close', 'condition', {
        type: 'condition',
        condition: { kind: 'entity-in-range', targetId, range: chaseRange },
      }, `Target Close (<${chaseRange}px)`),
      node('set-chase-tag', 'action', {
        type: 'action',
        action: { kind: 'set-tag', tag: 'chasing' },
      }, 'Set Chasing Tag'),
      node('chase', 'action', {
        type: 'action',
        action: { kind: 'move-toward-entity', targetId },
      }, 'Chase Target'),
      node('attack', 'action', {
        type: 'action',
        action: { kind: 'apply-damage', targetId, amount: 10 },
      }, 'Attack'),

      // Branch 3: Alert (target in alert range but not chase range)
      node('alert-seq', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Alert Sequence'),
      node('target-alert', 'condition', {
        type: 'condition',
        condition: { kind: 'entity-in-range', targetId, range: alertRange },
      }, `Alert Range (<${alertRange}px)`),
      node('set-alert-tag', 'action', {
        type: 'action',
        action: { kind: 'set-tag', tag: 'alerted' },
      }, 'Set Alert Tag'),
      node('face-target', 'action', {
        type: 'action',
        action: { kind: 'fire-event', event: 'alert', payload: { targetId } },
      }, 'Face Target'),

      // Branch 4: Idle
      node('clear-tags', 'action', {
        type: 'action',
        action: { kind: 'remove-tag', tag: 'alerted' },
      }, 'Clear Alert Tag'),
      node('idle', 'condition', {
        type: 'condition',
        condition: { kind: 'always' },
      }, 'Idle'),
    ];

    const edges: BehaviorEdge[] = [
      edge('root', 'flee-seq', 1),
      edge('root', 'chase-seq', 2),
      edge('root', 'alert-seq', 3),
      edge('root', 'clear-tags', 4),
      edge('root', 'idle', 5),
      // Flee
      edge('flee-seq', 'low-hp', 1),
      edge('flee-seq', 'target-visible', 2),
      edge('flee-seq', 'flee', 3),
      // Chase
      edge('chase-seq', 'target-close', 1),
      edge('chase-seq', 'set-chase-tag', 2),
      edge('chase-seq', 'chase', 3),
      edge('chase-seq', 'attack', 4),
      // Alert
      edge('alert-seq', 'target-alert', 1),
      edge('alert-seq', 'set-alert-tag', 2),
      edge('alert-seq', 'face-target', 3),
    ];

    return {
      id: graphId,
      name: 'Alert/Chase/Flee',
      root: 'root',
      nodes,
      edges,
      tags: ['alert', 'chase', 'flee', 'combat', 'preset'],
    };
  },

  /**
   * Guard: patrol in a small radius, chase if intruder detected, return to post.
   */
  guard(config: GuardConfig): BehaviorGraph {
    const {
      x,
      y = 0,
      patrolRadius = 50,
      targetId,
      detectRange = 200,
      speed = 80,
    } = config;
    const graphId = config.id ?? uid('guard');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'selector' } }, 'Guard AI'),

      // Chase if intruder near
      node('chase-seq', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Chase Intruder'),
      node('intruder-detected', 'condition', {
        type: 'condition',
        condition: { kind: 'entity-in-range', targetId, range: detectRange },
      }, `Detect Intruder (${detectRange}px)`),
      node('pursue', 'action', {
        type: 'action',
        action: { kind: 'move-toward-entity', targetId },
      }, 'Pursue'),

      // Return to post
      node('return-seq', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Return to Post'),
      node('not-at-post', 'condition', {
        type: 'condition',
        condition: { kind: 'custom', evaluator: 'not-at-post' },
      }, 'Not at Post'),
      node('go-home', 'action', {
        type: 'action',
        action: { kind: 'move-to', x, y },
      }, 'Return to Post'),

      // Patrol
      node('patrol', 'action', {
        type: 'action',
        action: { kind: 'move-to', x: x + patrolRadius, y },
      }, 'Patrol'),
    ];

    const edges: BehaviorEdge[] = [
      edge('root', 'chase-seq', 1),
      edge('root', 'return-seq', 2),
      edge('root', 'patrol', 3),
      edge('chase-seq', 'intruder-detected', 1),
      edge('chase-seq', 'pursue', 2),
      edge('return-seq', 'not-at-post', 1),
      edge('return-seq', 'go-home', 2),
    ];

    return {
      id: graphId,
      name: 'Guard',
      root: 'root',
      nodes,
      edges,
      tags: ['guard', 'patrol', 'combat', 'preset'],
    };
  },

  /**
   * Create a BehaviorBinding for attaching a graph to entity types.
   */
  bindToType(entityType: string, graphId: string, variables?: Record<string, any>): BehaviorBinding {
    return { target: entityType, targetType: 'type', graphId, variables };
  },

  /**
   * Create a BehaviorBinding for attaching a graph to a specific entity.
   */
  bindToEntity(entityId: string, graphId: string, variables?: Record<string, any>): BehaviorBinding {
    return { target: entityId, targetType: 'id', graphId, variables };
  },
};

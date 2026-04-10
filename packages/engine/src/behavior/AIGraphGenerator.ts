/**
 * @clawgame/engine - AI-Assisted Graph Generator
 *
 * Generates behavior graphs from natural language descriptions.
 * Parses intent keywords (patrol, chase, flee, guard, alert, etc.)
 * and assembles BehaviorGraph instances using the preset vocabulary.
 *
 * This is the engine-side pure-logic layer. The web UI can call
 * `generateFromDescription()` to get a graph, then let the user
 * edit it visually in the Behavior Graph Editor.
 *
 * Supported patterns:
 * - "patrol between 100 and 400"
 * - "chase the player when close"
 * - "patrol, then alert and chase when player is near, flee when hurt"
 * - "guard position 200,200 — chase intruders within 150px"
 * - "wander randomly"
 * - "stand still until player enters range, then attack"
 *
 * Architecture: keyword extraction → pattern matching → graph assembly.
 * Designed to be extensible — new patterns register via `registerPattern()`.
 */

import {
  BehaviorGraph,
  BehaviorNode,
  BehaviorEdge,
  BehaviorNodeType,
  ActionKind,
  ConditionKind,
  CompositeKind,
  DecoratorKind,
} from './types';

// ─── Types ───

export interface GraphGenerationResult {
  graph: BehaviorGraph;
  /** Human-readable explanation of what was generated */
  description: string;
  /** Confidence level 0-1 */
  confidence: number;
  /** Warnings about ambiguous input */
  warnings: string[];
}

export interface BehaviorPattern {
  /** Keywords that trigger this pattern */
  keywords: string[];
  /** Priority (higher = checked first) */
  priority: number;
  /** Build the graph for this pattern */
  build: (ctx: ParseContext) => BehaviorGraph | null;
}

export interface ParseContext {
  /** Original input text (lowercased) */
  input: string;
  /** Extracted numeric values */
  numbers: number[];
  /** Extracted named entities (e.g. "player") */
  entities: Map<string, string>;
  /** Whether specific keywords were found */
  has: (keyword: string) => boolean;
  /** Get first number, or default */
  num: (index: number, fallback: number) => number;
  /** Unique ID counter */
  nextId: () => string;
}

// ─── ID Generation ───

let _idCounter = 0;
function resetIdCounter(): void {
  _idCounter = 0;
}

// ─── Helpers ───

function uid(prefix: string): string {
  return `${prefix}-${++_idCounter}`;
}

function makeNode(
  id: string,
  type: BehaviorNodeType,
  data: BehaviorNode['data'],
  label?: string,
): BehaviorNode {
  const n: BehaviorNode = { id, type, data };
  if (label) n.label = label;
  return n;
}

function makeEdge(from: string, to: string, priority?: number): BehaviorEdge {
  const e: BehaviorEdge = { id: uid('e'), from, to };
  if (priority !== undefined) e.priority = priority;
  return e;
}

function compositeNode(id: string, kind: CompositeKind, label: string): BehaviorNode {
  return makeNode(id, 'composite', { type: 'composite', composite: { kind } }, label);
}

function conditionNode(id: string, kind: ConditionKind, label: string, extra?: Record<string, any>): BehaviorNode {
  const condition: any = { kind, ...extra };
  return makeNode(id, 'condition', { type: 'condition', condition }, label);
}

function actionNode(id: string, kind: ActionKind, label: string, extra?: Record<string, any>): BehaviorNode {
  const action: any = { kind, ...extra };
  return makeNode(id, 'action', { type: 'action', action }, label);
}

// ─── Parse Context Builder ───

function buildContext(input: string): ParseContext {
  const lower = input.toLowerCase();
  const numbers = (input.match(/-?\d+(\.\d+)?/g) || []).map(Number);
  const entities = new Map<string, string>();

  // Extract named entities
  const entityPatterns: [RegExp, string][] = [
    [/\bplayer\b/i, 'player'],
    [/\benemy\b/i, 'enemy'],
    [/\bnpc\b/i, 'npc'],
    [/\bhero\b/i, 'hero'],
    [/\bboss\b/i, 'boss'],
    [/\bally\b/i, 'ally'],
    [/\bvillager\b/i, 'villager'],
    [/\bguard\b/i, 'guard'],
    [/\bsoldier\b/i, 'soldier'],
    [/\bmonster\b/i, 'monster'],
  ];
  for (const [re, name] of entityPatterns) {
    if (re.test(input)) {
      entities.set(name, name);
    }
  }

  return {
    input: lower,
    numbers,
    entities,
    has: (keyword: string) => lower.includes(keyword),
    num: (index: number, fallback: number) => numbers[index] ?? fallback,
    nextId: () => uid('n'),
  };
}

// ─── Pattern Builders ───

function buildPatrolGraph(ctx: ParseContext): BehaviorGraph | null {
  if (!ctx.has('patrol') && !ctx.has('walk back') && !ctx.has('back and forth')) return null;

  const fromX = ctx.num(0, 100);
  const toX = ctx.num(1, 400);
  const y = ctx.num(2, 0);
  const speed = ctx.has('slow') ? 40 : ctx.has('fast') ? 120 : 60;

  const nodes: BehaviorNode[] = [
    compositeNode('root', 'sequence', 'Patrol Loop'),
    actionNode('move-a', 'move-to', `Patrol to ${fromX}`, { x: fromX, y }),
    actionNode('move-b', 'move-to', `Patrol to ${toX}`, { x: toX, y }),
  ];
  const edges: BehaviorEdge[] = [
    makeEdge('root', 'move-a', 1),
    makeEdge('root', 'move-b', 2),
  ];

  return {
    id: uid('patrol'),
    name: 'Patrol',
    root: 'root',
    nodes,
    edges,
    tags: ['patrol', 'movement', 'ai-generated'],
  };
}

function buildChaseGraph(ctx: ParseContext): BehaviorGraph | null {
  if (!ctx.has('chase') && !ctx.has('pursue') && !ctx.has('follow')) return null;

  const targetId = ctx.entities.keys().next().value || 'target';
  const detectRange = ctx.num(0, 200);
  const speed = ctx.has('fast') ? 150 : ctx.has('slow') ? 60 : 100;

  const nodes: BehaviorNode[] = [
    compositeNode('root', 'selector', 'Chase AI'),
    compositeNode('chase-seq', 'sequence', 'Chase Sequence'),
    conditionNode('detect', 'entity-in-range', `Detect (${detectRange}px)`, {
      targetId,
      range: detectRange,
    }),
    actionNode('pursue', 'move-toward-entity', 'Pursue Target', { targetId }),
    conditionNode('idle', 'always', 'Idle'),
  ];
  const edges: BehaviorEdge[] = [
    makeEdge('root', 'chase-seq', 1),
    makeEdge('root', 'idle', 2),
    makeEdge('chase-seq', 'detect', 1),
    makeEdge('chase-seq', 'pursue', 2),
  ];

  return {
    id: uid('chase'),
    name: 'Chase',
    root: 'root',
    nodes,
    edges,
    tags: ['chase', 'combat', 'ai-generated'],
  };
}

function buildFleeGraph(ctx: ParseContext): BehaviorGraph | null {
  if (!ctx.has('flee') && !ctx.has('run away') && !ctx.has('retreat') && !ctx.has('escape')) return null;

  const targetId = ctx.entities.keys().next().value || 'threat';
  const fleeSpeed = ctx.num(0, 150);
  const hpThreshold = ctx.num(1, 30);

  const nodes: BehaviorNode[] = [
    compositeNode('root', 'selector', 'Flee AI'),
    compositeNode('flee-seq', 'sequence', 'Flee if Threatened'),
    conditionNode('threatened', 'entity-in-range', 'Threat Nearby', {
      targetId,
      range: 300,
    }),
    actionNode('flee', 'set-velocity', 'Flee!', { vx: -fleeSpeed, vy: 0 }),
    conditionNode('idle', 'always', 'Idle'),
  ];
  const edges: BehaviorEdge[] = [
    makeEdge('root', 'flee-seq', 1),
    makeEdge('root', 'idle', 2),
    makeEdge('flee-seq', 'threatened', 1),
    makeEdge('flee-seq', 'flee', 2),
  ];

  return {
    id: uid('flee'),
    name: 'Flee',
    root: 'root',
    nodes,
    edges,
    tags: ['flee', 'ai-generated'],
  };
}

function buildGuardGraph(ctx: ParseContext): BehaviorGraph | null {
  if (!ctx.has('guard') && !ctx.has('defend') && !ctx.has('protect')) return null;

  const x = ctx.num(0, 200);
  const y = ctx.num(1, 0);
  const detectRange = ctx.num(2, 200);
  const targetId = ctx.entities.keys().next().value || 'intruder';

  const nodes: BehaviorNode[] = [
    compositeNode('root', 'selector', 'Guard AI'),
    compositeNode('chase-seq', 'sequence', 'Chase Intruder'),
    conditionNode('detect', 'entity-in-range', `Detect (${detectRange}px)`, {
      targetId,
      range: detectRange,
    }),
    actionNode('pursue', 'move-toward-entity', 'Pursue', { targetId }),
    actionNode('return', 'move-to', 'Return to Post', { x, y }),
    conditionNode('idle', 'always', 'Idle'),
  ];
  const edges: BehaviorEdge[] = [
    makeEdge('root', 'chase-seq', 1),
    makeEdge('root', 'idle', 2),
    makeEdge('chase-seq', 'detect', 1),
    makeEdge('chase-seq', 'pursue', 2),
    makeEdge('chase-seq', 'return', 3),
  ];

  return {
    id: uid('guard'),
    name: 'Guard',
    root: 'root',
    nodes,
    edges,
    tags: ['guard', 'combat', 'ai-generated'],
  };
}

function buildAlertChaseFleeGraph(ctx: ParseContext): BehaviorGraph | null {
  // Must have at least 2 of: alert, chase, flee
  const hasAlert = ctx.has('alert') || ctx.has('notice') || ctx.has('aware');
  const hasChase = ctx.has('chase') || ctx.has('pursue') || ctx.has('attack');
  const hasFlee = ctx.has('flee') || ctx.has('retreat') || ctx.has('run away');
  const activeCount = [hasAlert, hasChase, hasFlee].filter(Boolean).length;
  if (activeCount < 2) return null;

  const targetId = ctx.entities.keys().next().value || 'target';
  const alertRange = ctx.num(0, 300);
  const chaseRange = ctx.num(1, 150);
  const fleeHp = ctx.num(2, 30);

  const nodes: BehaviorNode[] = [
    compositeNode('root', 'selector', 'Alert/Chase/Flee'),
  ];

  const edges: BehaviorEdge[] = [];
  let branchPriority = 1;

  // Flee branch (highest priority)
  if (hasFlee) {
    nodes.push(
      compositeNode('flee-seq', 'sequence', 'Flee Sequence'),
      conditionNode('low-hp', 'health-below', `Low HP (<${fleeHp})`, { threshold: fleeHp }),
      conditionNode('threat-visible', 'entity-in-range', 'Threat Visible', {
        targetId,
        range: 400,
      }),
      actionNode('flee', 'set-velocity', 'Flee!', { vx: -150, vy: 0 }),
    );
    edges.push(
      makeEdge('root', 'flee-seq', branchPriority++),
      makeEdge('flee-seq', 'low-hp', 1),
      makeEdge('flee-seq', 'threat-visible', 2),
      makeEdge('flee-seq', 'flee', 3),
    );
  }

  // Chase branch
  if (hasChase) {
    nodes.push(
      compositeNode('chase-seq', 'sequence', 'Chase Sequence'),
      conditionNode('target-close', 'entity-in-range', `Target Close (<${chaseRange}px)`, {
        targetId,
        range: chaseRange,
      }),
      actionNode('chase', 'move-toward-entity', 'Chase Target', { targetId }),
      actionNode('attack', 'apply-damage', 'Attack', { targetId, amount: 10 }),
    );
    edges.push(
      makeEdge('root', 'chase-seq', branchPriority++),
      makeEdge('chase-seq', 'target-close', 1),
      makeEdge('chase-seq', 'chase', 2),
      makeEdge('chase-seq', 'attack', 3),
    );
  }

  // Alert branch
  if (hasAlert) {
    nodes.push(
      compositeNode('alert-seq', 'sequence', 'Alert Sequence'),
      conditionNode('target-alert', 'entity-in-range', `Alert Range (<${alertRange}px)`, {
        targetId,
        range: alertRange,
      }),
      actionNode('set-alert', 'set-tag', 'Set Alert', { tag: 'alerted' }),
      actionNode('signal', 'fire-event', 'Alert Signal', { event: 'alert', payload: { targetId } }),
    );
    edges.push(
      makeEdge('root', 'alert-seq', branchPriority++),
      makeEdge('alert-seq', 'target-alert', 1),
      makeEdge('alert-seq', 'set-alert', 2),
      makeEdge('alert-seq', 'signal', 3),
    );
  }

  // Idle fallback
  nodes.push(conditionNode('idle', 'always', 'Idle'));
  edges.push(makeEdge('root', 'idle', branchPriority));

  return {
    id: uid('alert-chase-flee'),
    name: 'Alert/Chase/Flee',
    root: 'root',
    nodes,
    edges,
    tags: ['alert', 'chase', 'flee', 'combat', 'ai-generated'],
  };
}

function buildWanderGraph(ctx: ParseContext): BehaviorGraph | null {
  if (!ctx.has('wander') && !ctx.has('roam') && !ctx.has('random')) return null;

  const speed = ctx.has('slow') ? 30 : ctx.has('fast') ? 80 : 50;

  const nodes: BehaviorNode[] = [
    compositeNode('root', 'sequence', 'Wander'),
    conditionNode('chance', 'random-chance', '60% Move', { chance: 0.6 }),
    actionNode('move', 'set-velocity', 'Random Step', {
      vx: speed * (Math.random() > 0.5 ? 1 : -1),
      vy: speed * (Math.random() > 0.5 ? 1 : -1),
    }),
    actionNode('wait', 'wait', 'Pause', { duration: 0.5 }),
  ];
  const edges: BehaviorEdge[] = [
    makeEdge('root', 'chance', 1),
    makeEdge('root', 'move', 2),
    makeEdge('root', 'wait', 3),
  ];

  return {
    id: uid('wander'),
    name: 'Wander',
    root: 'root',
    nodes,
    edges,
    tags: ['wander', 'movement', 'ai-generated'],
  };
}

function buildIdleGraph(ctx: ParseContext): BehaviorGraph | null {
  if (!ctx.has('idle') && !ctx.has('stand') && !ctx.has('still') && !ctx.has('wait')) return null;
  // Only match if nothing else matched — pure idle
  if (ctx.has('patrol') || ctx.has('chase') || ctx.has('flee') || ctx.has('guard') ||
      ctx.has('alert') || ctx.has('wander') || ctx.has('attack')) return null;

  const nodes: BehaviorNode[] = [
    conditionNode('root', 'always', 'Idle'),
  ];

  return {
    id: uid('idle'),
    name: 'Idle',
    root: 'root',
    nodes,
    edges: [],
    tags: ['idle', 'ai-generated'],
  };
}

function buildAttackGraph(ctx: ParseContext): BehaviorGraph | null {
  if (!ctx.has('attack') && !ctx.has('shoot') && !ctx.has('fight') && !ctx.has('hit')) return null;
  // Don't match if chase/alert/flee already covers attack
  if (ctx.has('alert') || ctx.has('flee') || ctx.has('retreat')) return null;

  const targetId = ctx.entities.keys().next().value || 'target';
  const range = ctx.num(0, 100);
  const damage = ctx.num(1, 10);

  const nodes: BehaviorNode[] = [
    compositeNode('root', 'selector', 'Attack AI'),
    compositeNode('atk-seq', 'sequence', 'Attack Sequence'),
    conditionNode('in-range', 'entity-in-range', `In Range (${range}px)`, {
      targetId,
      range,
    }),
    actionNode('attack', 'apply-damage', `Attack (${damage} dmg)`, {
      targetId,
      amount: damage,
    }),
    actionNode('cooldown', 'wait', 'Cooldown', { duration: 0.5 }),
    conditionNode('idle', 'always', 'Idle'),
  ];
  const edges: BehaviorEdge[] = [
    makeEdge('root', 'atk-seq', 1),
    makeEdge('root', 'idle', 2),
    makeEdge('atk-seq', 'in-range', 1),
    makeEdge('atk-seq', 'attack', 2),
    makeEdge('atk-seq', 'cooldown', 3),
  ];

  return {
    id: uid('attack'),
    name: 'Attack',
    root: 'root',
    nodes,
    edges,
    tags: ['attack', 'combat', 'ai-generated'],
  };
}

// ─── Combinator: Multi-Pattern Graph ───

function buildCompositeGraph(ctx: ParseContext): BehaviorGraph | null {
  // Check for comma-separated patterns like "patrol, alert, chase, retreat"
  // This handles descriptions that combine multiple behaviors
  const parts = ctx.input.split(/[,.]/).map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  // Check if any single pattern already covers everything
  const hasPatrol = ctx.has('patrol') || ctx.has('walk');
  const hasChase = ctx.has('chase') || ctx.has('pursue');
  const hasFlee = ctx.has('flee') || ctx.has('retreat');
  const hasAlert = ctx.has('alert') || ctx.has('notice');
  const hasGuard = ctx.has('guard');
  const hasAttack = ctx.has('attack') || ctx.has('fight');

  // If it looks like alert/chase/flee combo, let that handler take it
  const comboCount = [hasAlert, hasChase, hasFlee].filter(Boolean).length;
  if (comboCount >= 2) return null;

  // Build a selector with multiple branches
  const targetId = ctx.entities.keys().next().value || 'target';
  const branches: { condition: BehaviorNode; action: BehaviorNode }[] = [];

  if (hasChase) {
    const range = ctx.num(0, 150);
    branches.push({
      condition: conditionNode(uid('n'), 'entity-in-range', `Detect (<${range}px)`, {
        targetId, range,
      }),
      action: actionNode(uid('n'), 'move-toward-entity', 'Chase', { targetId }),
    });
  }

  if (hasAttack) {
    const range = ctx.num(hasChase ? 1 : 0, 100);
    branches.push({
      condition: conditionNode(uid('n'), 'entity-in-range', `Attack Range (<${range}px)`, {
        targetId, range,
      }),
      action: actionNode(uid('n'), 'apply-damage', 'Attack', { targetId, amount: 10 }),
    });
  }

  if (hasFlee) {
    branches.push({
      condition: conditionNode(uid('n'), 'health-below', 'Low HP', { threshold: 30 }),
      action: actionNode(uid('n'), 'set-velocity', 'Flee', { vx: -150, vy: 0 }),
    });
  }

  if (hasPatrol) {
    const fromX = ctx.num(0, 100);
    const toX = ctx.num(1, 400);
    branches.push({
      condition: conditionNode(uid('n'), 'always', 'Patrol'),
      action: actionNode(uid('n'), 'move-to', `Patrol ${fromX}-${toX}`, { x: toX, y: 0 }),
    });
  }

  if (hasGuard) {
    const x = ctx.num(0, 200);
    branches.push({
      condition: conditionNode(uid('n'), 'always', 'Guard Post'),
      action: actionNode(uid('n'), 'move-to', 'Return to Post', { x, y: 0 }),
    });
  }

  if (branches.length === 0) return null;

  const root = compositeNode('root', 'selector', 'Composite Behavior');
  const nodes: BehaviorNode[] = [root];
  const edges: BehaviorEdge[] = [];

  branches.forEach((branch, i) => {
    const seqId = uid('seq');
    nodes.push(compositeNode(seqId, 'sequence', `Branch ${i + 1}`));
    nodes.push(branch.condition);
    nodes.push(branch.action);
    edges.push(
      makeEdge('root', seqId, i + 1),
      makeEdge(seqId, branch.condition.id, 1),
      makeEdge(seqId, branch.action.id, 2),
    );
  });

  return {
    id: uid('composite'),
    name: 'Composite Behavior',
    root: 'root',
    nodes,
    edges,
    tags: ['composite', 'ai-generated'],
  };
}

// ─── Pattern Registry ───

const DEFAULT_PATTERNS: BehaviorPattern[] = [
  { keywords: ['alert', 'chase', 'flee'], priority: 100, build: buildAlertChaseFleeGraph },
  { keywords: ["composite", "guard", "defend", "protect"], priority: 90, build: buildCompositeGraph },
  { keywords: ['guard'], priority: 80, build: buildGuardGraph },
  { keywords: ['patrol'], priority: 70, build: buildPatrolGraph },
  { keywords: ['chase'], priority: 60, build: buildChaseGraph },
  { keywords: ['flee', 'retreat'], priority: 55, build: buildFleeGraph },
  { keywords: ['attack'], priority: 50, build: buildAttackGraph },
  { keywords: ['wander'], priority: 40, build: buildWanderGraph },
  { keywords: ['idle'], priority: 10, build: buildIdleGraph },
];

const customPatterns: BehaviorPattern[] = [];

// ─── Public API ───

/**
 * Register a custom pattern for graph generation.
 * Custom patterns take priority over built-in ones.
 */
export function registerPattern(pattern: BehaviorPattern): void {
  customPatterns.push(pattern);
  // Keep sorted by priority descending
  customPatterns.sort((a, b) => b.priority - a.priority);
}

/**
 * Generate a behavior graph from a natural language description.
 *
 * @param description - Natural language behavior description
 * @returns Generation result with graph, description, confidence, and warnings
 *
 * @example
 * const result = generateFromDescription("patrol between 100 and 400, chase player when close, flee when hurt");
 * console.log(result.description); // "Generated Alert/Chase/Flee behavior with 3 branches"
 * console.log(result.confidence);  // 0.9
 * executor.registerGraph(result.graph);
 */
export function generateFromDescription(description: string): GraphGenerationResult {
  resetIdCounter();
  const ctx = buildContext(description);
  const warnings: string[] = [];

  // Try custom patterns first, then defaults
  const allPatterns = [...customPatterns, ...DEFAULT_PATTERNS];

  for (const pattern of allPatterns) {
    const graph = pattern.build(ctx);
    if (graph) {
      const confidence = computeConfidence(ctx, graph);
      const desc = describeGraph(graph);

      // Warn about unhandled keywords
      const unhandled = findUnhandledKeywords(ctx, graph);
      if (unhandled.length > 0) {
        warnings.push(`Input contains "${unhandled.join(', ')}" which may not be fully reflected in the generated graph.`);
      }

      return { graph, description: desc, confidence, warnings };
    }
  }

  // Fallback: generate a simple idle graph with low confidence
  return {
    graph: {
      id: uid('unknown'),
      name: 'Unknown Behavior',
      root: 'root',
      nodes: [conditionNode('root', 'always', 'Idle (unrecognized)')],
      edges: [],
      tags: ['unknown', 'ai-generated'],
    },
    description: 'Could not understand the behavior description. Generated idle fallback.',
    confidence: 0.1,
    warnings: [`No matching pattern found for: "${description}". Try describing behaviors like "patrol", "chase", "flee", "guard", "attack", or "alert".`],
  };
}

/**
 * Get all available pattern descriptions for UI hints.
 */
export function getAvailablePatterns(): { keywords: string[]; description: string }[] {
  return DEFAULT_PATTERNS.map(p => ({
    keywords: p.keywords,
    description: `Triggers on: ${p.keywords.join(', ')}`,
  }));
}

// ─── Internal Helpers ───

function computeConfidence(ctx: ParseContext, graph: BehaviorGraph): number {
  let confidence = 0.5;

  // More nodes = more specific match = higher confidence
  confidence += Math.min(graph.nodes.length * 0.05, 0.3);

  // Matching entity names = higher confidence
  if (ctx.entities.size > 0) {
    confidence += 0.1;
  }

  // Numeric parameters extracted = higher confidence
  if (ctx.numbers.length > 0) {
    confidence += 0.05;
  }

  return Math.min(confidence, 1.0);
}

function describeGraph(graph: BehaviorGraph): string {
  const nodeTypes = new Set(graph.nodes.map(n => n.type));
  const parts: string[] = [];

  if (graph.nodes.length === 1) {
    return `Simple ${graph.name} behavior (1 node)`;
  }

  parts.push(`Generated ${graph.name} behavior`);
  parts.push(`with ${graph.nodes.length} nodes and ${graph.edges.length} connections`);

  const actions = graph.nodes.filter(n => n.type === 'action');
  const conditions = graph.nodes.filter(n => n.type === 'condition');
  if (actions.length > 0) parts.push(`${actions.length} action(s)`);
  if (conditions.length > 0) parts.push(`${conditions.length} condition(s)`);

  return parts.join(' — ');
}

function findUnhandledKeywords(ctx: ParseContext, graph: BehaviorGraph): string[] {
  const behaviorKeywords = [
    'patrol', 'chase', 'flee', 'retreat', 'guard', 'attack', 'shoot',
    'alert', 'wander', 'roam', 'follow', 'protect', 'defend', 'heal',
    'teleport', 'spawn', 'summon', 'dance', 'sing', 'talk', 'dialogue',
  ];

  const graphStr = JSON.stringify(graph).toLowerCase();
  const unhandled: string[] = [];

  for (const kw of behaviorKeywords) {
    if (ctx.has(kw) && !graphStr.includes(kw) && !graphStr.includes('flee') &&
        !(kw === 'retreat' && graphStr.includes('flee')) &&
        !(kw === 'pursue' && graphStr.includes('chase'))) {
      // Check more carefully
      const graphTags = graph.tags || [];
      const tagMatch = graphTags.some(t => t.includes(kw));
      const nodeLabelMatch = graph.nodes.some(n =>
        n.label && n.label.toLowerCase().includes(kw)
      );

      if (!tagMatch && !nodeLabelMatch) {
        unhandled.push(kw);
      }
    }
  }

  return unhandled;
}

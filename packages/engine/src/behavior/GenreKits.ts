/**
 * @clawgame/engine - Genre Kits
 *
 * Reusable behavior graph templates organized by game genre.
 * Each kit provides genre-appropriate behavior graphs that can be
 * customized and composed for specific game needs.
 *
 * Kits build on BehaviorPresets and add genre-specific patterns:
 * - PlatformerKit: platform movement, enemy AI, collectibles, hazards
 * - TopDownKit: 4-directional movement, enemy waves, items
 * - RPGKit: dialogue, quests, turn-based combat, NPCs
 * - TacticsKit: grid movement, unit AI, formation, fog of war
 *
 * Usage:
 *   import { PlatformerKit } from '@clawgame/engine';
 *   const goomba = PlatformerKit.patrolEnemy({ ... });
 */

import {
  BehaviorGraph,
  BehaviorNode,
  BehaviorEdge,
  BehaviorBinding,
} from './types';

// ─── Helpers ───

let _kitCounter = 0;
function uid(prefix: string): string {
  return `${prefix}-${++_kitCounter}`;
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

// ─── Platformer Kit ───

export interface PatrolEnemyConfig {
  /** Horizontal patrol range start */
  fromX: number;
  /** Horizontal patrol range end */
  toX: number;
  /** Y position (ground level) */
  y?: number;
  /** Movement speed */
  speed?: number;
  /** Damage dealt on contact */
  damage?: number;
  /** Graph ID */
  id?: string;
}

export interface JumpingEnemyConfig {
  /** X position */
  x: number;
  /** Y position (ground) */
  y?: number;
  /** Jump height */
  jumpHeight?: number;
  /** Time between jumps */
  interval?: number;
  /** Damage on contact */
  damage?: number;
  /** Graph ID */
  id?: string;
}

export interface CollectibleConfig {
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Points awarded */
  points?: number;
  /** Animation to play on collect */
  collectAnimation?: string;
  /** Graph ID */
  id?: string;
}

export interface HazardConfig {
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Damage per tick */
  damagePerTick?: number;
  /** Damage interval in seconds */
  interval?: number;
  /** Graph ID */
  id?: string;
}

export const PlatformerKit = {
  /**
   * Simple patrol enemy (goomba-style).
   * Walks back and forth, damages player on contact.
   */
  patrolEnemy(config: PatrolEnemyConfig): BehaviorGraph {
    const { fromX, toX, y = 0, speed = 40, damage = 1 } = config;
    const graphId = config.id ?? uid('pf-patrol');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Patrol Enemy'),
      node('move-a', 'action', {
        type: 'action',
        action: { kind: 'move-to', x: fromX, y },
      }, `Walk to ${fromX}`),
      node('move-b', 'action', {
        type: 'action',
        action: { kind: 'move-to', x: toX, y },
      }, `Walk to ${toX}`),
    ];

    const edges: BehaviorEdge[] = [
      edge('root', 'move-a', 1),
      edge('root', 'move-b', 2),
    ];

    return {
      id: graphId,
      name: 'Platformer Patrol Enemy',
      root: 'root',
      nodes,
      edges,
      tags: ['platformer', 'enemy', 'patrol', 'genre-kit'],
      variables: { speed, damage },
    };
  },

  /**
   * Jumping enemy (koopa-style).
   * Stays in place, jumps periodically.
   */
  jumpingEnemy(config: JumpingEnemyConfig): BehaviorGraph {
    const { x, y = 0, interval = 2, damage = 1 } = config;
    const graphId = config.id ?? uid('pf-jump');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Jumping Enemy'),
      node('wait', 'action', {
        type: 'action',
        action: { kind: 'wait', duration: interval },
      }, `Wait ${interval}s`),
      node('jump', 'action', {
        type: 'action',
        action: { kind: 'set-velocity', vy: -300 },
      }, 'Jump'),
      node('land', 'action', {
        type: 'action',
        action: { kind: 'move-to', x, y },
      }, 'Land'),
    ];

    return {
      id: graphId,
      name: 'Platformer Jumping Enemy',
      root: 'root',
      nodes,
      edges: [
        edge('root', 'wait', 1),
        edge('root', 'jump', 2),
        edge('root', 'land', 3),
      ],
      tags: ['platformer', 'enemy', 'jump', 'genre-kit'],
      variables: { damage },
    };
  },

  /**
   * Collectible item (coin/gem).
   * Waits to be collected, awards points, then destroys self.
   */
  collectible(config: CollectibleConfig): BehaviorGraph {
    const { x, y, points = 10, collectAnimation = 'sparkle' } = config;
    const graphId = config.id ?? uid('pf-collect');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Collectible'),
      node('player-near', 'condition', {
        type: 'condition',
        condition: { kind: 'entity-in-range', targetId: 'player', range: 30 },
      }, 'Player Nearby'),
      node('animate', 'action', {
        type: 'action',
        action: { kind: 'play-animation', name: collectAnimation },
      }, 'Collect Animation'),
      node('score', 'action', {
        type: 'action',
        action: { kind: 'fire-event', event: 'collect', payload: { points } },
      }, `Award ${points} pts`),
      node('destroy', 'action', {
        type: 'action',
        action: { kind: 'destroy-self' },
      }, 'Remove'),
    ];

    return {
      id: graphId,
      name: 'Platformer Collectible',
      root: 'root',
      nodes,
      edges: [
        edge('root', 'player-near', 1),
        edge('root', 'animate', 2),
        edge('root', 'score', 3),
        edge('root', 'destroy', 4),
      ],
      tags: ['platformer', 'collectible', 'item', 'genre-kit'],
      variables: { points },
    };
  },

  /**
   * Environmental hazard (spikes, fire, etc).
   * Damages player on contact at regular intervals.
   */
  hazard(config: HazardConfig): BehaviorGraph {
    const { x, y, damagePerTick = 1, interval = 0.5 } = config;
    const graphId = config.id ?? uid('pf-hazard');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Hazard'),
      node('player-touch', 'condition', {
        type: 'condition',
        condition: { kind: 'entity-in-range', targetId: 'player', range: 20 },
      }, 'Player Touching'),
      node('damage', 'action', {
        type: 'action',
        action: { kind: 'apply-damage', targetId: 'player', amount: damagePerTick },
      }, `Deal ${damagePerTick} dmg`),
      node('cooldown', 'action', {
        type: 'action',
        action: { kind: 'wait', duration: interval },
      }, `Cooldown ${interval}s`),
    ];

    return {
      id: graphId,
      name: 'Platformer Hazard',
      root: 'root',
      nodes,
      edges: [
        edge('root', 'player-touch', 1),
        edge('root', 'damage', 2),
        edge('root', 'cooldown', 3),
      ],
      tags: ['platformer', 'hazard', 'environment', 'genre-kit'],
      variables: { damagePerTick, interval },
    };
  },
};

// ─── Top-Down Kit ───

export interface WanderEnemyConfig {
  /** Center X of wander area */
  centerX: number;
  /** Center Y of wander area */
  centerY: number;
  /** Wander radius */
  radius?: number;
  /** Movement speed */
  speed?: number;
  /** Damage on contact */
  damage?: number;
  /** Graph ID */
  id?: string;
}

export interface ShooterEnemyConfig {
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Detection range */
  detectRange?: number;
  /** Fire interval in seconds */
  fireInterval?: number;
  /** Projectile entity type */
  projectileType?: string;
  /** Graph ID */
  id?: string;
}

export interface ItemDropConfig {
  /** X position */
  x: number;
  /** Y position */
  y: number;
  /** Item type to drop */
  itemType: string;
  /** Pickup range */
  pickupRange?: number;
  /** Graph ID */
  id?: string;
}

export const TopDownKit = {
  /**
   * Wandering enemy that moves randomly within a radius.
   * Damages player on contact.
   */
  wanderEnemy(config: WanderEnemyConfig): BehaviorGraph {
    const { centerX, centerY, radius = 100, speed = 50, damage = 1 } = config;
    const graphId = config.id ?? uid('td-wander');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Wander Enemy'),
      node('pick-spot', 'action', {
        type: 'action',
        action: {
          kind: 'custom',
          executor: 'pick-random-point',
          params: { centerX, centerY, radius },
        },
      }, 'Pick Random Spot'),
      node('move-to-spot', 'action', {
        type: 'action',
        action: { kind: 'custom', executor: 'move-to-last-spot' },
      }, 'Move to Spot'),
      node('pause', 'action', {
        type: 'action',
        action: { kind: 'wait', duration: 1 },
      }, 'Pause'),
    ];

    return {
      id: graphId,
      name: 'Top-Down Wander Enemy',
      root: 'root',
      nodes,
      edges: [
        edge('root', 'pick-spot', 1),
        edge('root', 'move-to-spot', 2),
        edge('root', 'pause', 3),
      ],
      tags: ['top-down', 'enemy', 'wander', 'genre-kit'],
      variables: { speed, damage, radius },
    };
  },

  /**
   * Stationary or slow-moving ranged enemy.
   * Detects player, fires projectiles at intervals.
   */
  shooterEnemy(config: ShooterEnemyConfig): BehaviorGraph {
    const {
      x, y,
      detectRange = 250,
      fireInterval = 1.5,
      projectileType = 'bullet',
    } = config;
    const graphId = config.id ?? uid('td-shooter');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'selector' } }, 'Shooter Enemy'),
      // Shoot if player in range
      node('shoot-seq', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Shoot Sequence'),
      node('detect', 'condition', {
        type: 'condition',
        condition: { kind: 'entity-in-range', targetId: 'player', range: detectRange },
      }, `Detect (${detectRange}px)`),
      node('aim', 'action', {
        type: 'action',
        action: { kind: 'custom', executor: 'face-entity', params: { targetId: 'player' } },
      }, 'Aim at Player'),
      node('fire', 'action', {
        type: 'action',
        action: {
          kind: 'spawn-entity',
          spawnConfig: { entityType: projectileType, x, y, tags: ['projectile'] },
        },
      }, 'Fire'),
      node('cooldown', 'action', {
        type: 'action',
        action: { kind: 'wait', duration: fireInterval },
      }, `Cooldown ${fireInterval}s`),
      // Idle
      node('idle', 'condition', {
        type: 'condition',
        condition: { kind: 'always' },
      }, 'Idle'),
    ];

    return {
      id: graphId,
      name: 'Top-Down Shooter Enemy',
      root: 'root',
      nodes,
      edges: [
        edge('root', 'shoot-seq', 1),
        edge('root', 'idle', 2),
        edge('shoot-seq', 'detect', 1),
        edge('shoot-seq', 'aim', 2),
        edge('shoot-seq', 'fire', 3),
        edge('shoot-seq', 'cooldown', 4),
      ],
      tags: ['top-down', 'enemy', 'ranged', 'shooter', 'genre-kit'],
      variables: { fireInterval, projectileType },
    };
  },

  /**
   * Pickup item dropped by enemies or placed in the world.
   * Disappears when player collects it.
   */
  itemDrop(config: ItemDropConfig): BehaviorGraph {
    const { x, y, itemType, pickupRange = 25 } = config;
    const graphId = config.id ?? uid('td-item');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Item Drop'),
      node('player-near', 'condition', {
        type: 'condition',
        condition: { kind: 'entity-in-range', targetId: 'player', range: pickupRange },
      }, 'Player Nearby'),
      node('collect', 'action', {
        type: 'action',
        action: { kind: 'fire-event', event: 'item-collect', payload: { itemType } },
      }, `Collect ${itemType}`),
      node('destroy', 'action', {
        type: 'action',
        action: { kind: 'destroy-self' },
      }, 'Remove'),
    ];

    return {
      id: graphId,
      name: 'Top-Down Item Drop',
      root: 'root',
      nodes,
      edges: [
        edge('root', 'player-near', 1),
        edge('root', 'collect', 2),
        edge('root', 'destroy', 3),
      ],
      tags: ['top-down', 'item', 'pickup', 'genre-kit'],
      variables: { itemType },
    };
  },
};

// ─── RPG Kit ───

export interface QuestNPCConfig {
  /** Quest ID this NPC gives */
  questId: string;
  /** Dialogue lines before quest is accepted */
  introDialogue: string[];
  /** Dialogue after quest completion */
  completionDialogue: string[];
  /** Graph ID */
  id?: string;
}

export interface TurnBasedEnemyConfig {
  /** Enemy display name */
  name?: string;
  /** HP (stored as variable) */
  maxHp?: number;
  /** Actions available */
  actions?: ('attack' | 'defend' | 'special' | 'heal')[];
  /** Graph ID */
  id?: string;
}

export interface VillagerNPCConfig {
  /** Dialogue lines to cycle through */
  dialogues: string[];
  /** Graph ID */
  id?: string;
}

export const RPGKit = {
  /**
   * Quest-giving NPC.
   * Shows intro dialogue → gives quest → shows completion dialogue when done.
   */
  questNPC(config: QuestNPCConfig): BehaviorGraph {
    const { questId, introDialogue, completionDialogue } = config;
    const graphId = config.id ?? uid('rpg-quest');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'selector' } }, 'Quest NPC'),
      // Quest complete path
      node('complete-seq', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Quest Complete'),
      node('quest-done', 'condition', {
        type: 'condition',
        condition: { kind: 'custom', evaluator: 'quest-complete', params: { questId } },
      }, 'Quest Done?'),
      node('reward-dialogue', 'action', {
        type: 'action',
        action: { kind: 'fire-event', event: 'dialogue', payload: { lines: completionDialogue } },
      }, 'Completion Dialogue'),
      // Quest active path
      node('active-seq', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Quest Active'),
      node('quest-active', 'condition', {
        type: 'condition',
        condition: { kind: 'custom', evaluator: 'quest-active', params: { questId } },
      }, 'Quest Active?'),
      node('hint', 'action', {
        type: 'action',
        action: { kind: 'fire-event', event: 'dialogue', payload: { lines: ['Come back when you\'re done!'] } },
      }, 'Quest Hint'),
      // Intro path (quest not started)
      node('intro-seq', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Quest Intro'),
      node('player-near', 'condition', {
        type: 'condition',
        condition: { kind: 'entity-in-range', targetId: 'player', range: 50 },
      }, 'Player Nearby'),
      node('intro-dialogue', 'action', {
        type: 'action',
        action: { kind: 'fire-event', event: 'dialogue', payload: { lines: introDialogue } },
      }, 'Intro Dialogue'),
      node('offer-quest', 'action', {
        type: 'action',
        action: { kind: 'fire-event', event: 'quest-offer', payload: { questId } },
      }, 'Offer Quest'),
    ];

    return {
      id: graphId,
      name: 'RPG Quest NPC',
      root: 'root',
      nodes,
      edges: [
        edge('root', 'complete-seq', 1),
        edge('root', 'active-seq', 2),
        edge('root', 'intro-seq', 3),
        edge('complete-seq', 'quest-done', 1),
        edge('complete-seq', 'reward-dialogue', 2),
        edge('active-seq', 'quest-active', 1),
        edge('active-seq', 'hint', 2),
        edge('intro-seq', 'player-near', 1),
        edge('intro-seq', 'intro-dialogue', 2),
        edge('intro-seq', 'offer-quest', 3),
      ],
      tags: ['rpg', 'npc', 'quest', 'dialogue', 'genre-kit'],
      variables: { questId },
    };
  },

  /**
   * Turn-based combat enemy AI.
   * Selects actions based on HP and state (attack, defend, special, heal).
   */
  turnBasedEnemy(config: TurnBasedEnemyConfig = {}): BehaviorGraph {
    const { maxHp = 50, actions = ['attack', 'defend', 'special'] } = config;
    const graphId = config.id ?? uid('rpg-enemy');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'selector' } }, 'Combat AI'),
      // Heal if low HP
      node('heal-seq', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Emergency Heal'),
      node('low-hp', 'condition', {
        type: 'condition',
        condition: { kind: 'health-below', threshold: maxHp * 0.25 },
      }, `HP < ${maxHp * 0.25}`),
      node('heal', 'action', {
        type: 'action',
        action: { kind: 'heal', amount: maxHp * 0.3 },
      }, 'Heal'),
      // Special attack (random chance)
      node('special-seq', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Special Attack'),
      node('lucky', 'condition', {
        type: 'condition',
        condition: { kind: 'random-chance', chance: 0.2 },
      }, '20% Chance'),
      node('special', 'action', {
        type: 'action',
        action: { kind: 'apply-damage', targetId: 'player', amount: 25 },
      }, 'Special Attack'),
      // Default attack
      node('attack', 'action', {
        type: 'action',
        action: { kind: 'apply-damage', targetId: 'player', amount: 10 },
      }, 'Basic Attack'),
    ];

    return {
      id: graphId,
      name: 'RPG Turn-Based Enemy',
      root: 'root',
      nodes,
      edges: [
        edge('root', 'heal-seq', 1),
        edge('root', 'special-seq', 2),
        edge('root', 'attack', 3),
        edge('heal-seq', 'low-hp', 1),
        edge('heal-seq', 'heal', 2),
        edge('special-seq', 'lucky', 1),
        edge('special-seq', 'special', 2),
      ],
      tags: ['rpg', 'enemy', 'turn-based', 'combat', 'genre-kit'],
      variables: { maxHp, actions },
    };
  },

  /**
   * Simple villager NPC with looping dialogue.
   * Cycles through dialogue lines when player interacts.
   */
  villagerNPC(config: VillagerNPCConfig): BehaviorGraph {
    const { dialogues } = config;
    const graphId = config.id ?? uid('rpg-villager');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Villager'),
      node('player-near', 'condition', {
        type: 'condition',
        condition: { kind: 'entity-in-range', targetId: 'player', range: 50 },
      }, 'Player Nearby'),
      node('input', 'condition', {
        type: 'condition',
        condition: { kind: 'input-pressed', variable: 'interact' },
      }, 'Interact Pressed'),
      node('speak', 'action', {
        type: 'action',
        action: { kind: 'fire-event', event: 'dialogue', payload: { lines: dialogues } },
      }, 'Speak'),
    ];

    return {
      id: graphId,
      name: 'RPG Villager NPC',
      root: 'root',
      nodes,
      edges: [
        edge('root', 'player-near', 1),
        edge('root', 'input', 2),
        edge('root', 'speak', 3),
      ],
      tags: ['rpg', 'npc', 'dialogue', 'villager', 'genre-kit'],
      variables: { dialogueIndex: 0, dialogues },
    };
  },
};

// ─── Tactics Kit ───

export interface MeleeUnitConfig {
  /** Movement range per turn (grid cells) */
  moveRange?: number;
  /** Attack range (grid cells) */
  attackRange?: number;
  /** Damage per attack */
  damage?: number;
  /** HP */
  maxHp?: number;
  /** Graph ID */
  id?: string;
}

export interface RangedUnitConfig {
  /** Movement range per turn */
  moveRange?: number;
  /** Attack range (grid cells) */
  attackRange?: number;
  /** Damage per attack */
  damage?: number;
  /** Max HP */
  maxHp?: number;
  /** Graph ID */
  id?: string;
}

export interface SupportUnitConfig {
  /** Heal amount */
  healAmount?: number;
  /** Heal range (grid cells) */
  healRange?: number;
  /** Movement range per turn */
  moveRange?: number;
  /** Max HP */
  maxHp?: number;
  /** Graph ID */
  id?: string;
}

export const TacticsKit = {
  /**
   * Melee unit AI: close distance, then attack.
   * Prioritizes nearest enemy, moves toward if out of range.
   */
  meleeUnit(config: MeleeUnitConfig = {}): BehaviorGraph {
    const { moveRange = 3, attackRange = 1, damage = 15, maxHp = 80 } = config;
    const graphId = config.id ?? uid('tac-melee');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'selector' } }, 'Melee Unit'),
      // Attack if adjacent
      node('attack-seq', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Attack'),
      node('enemy-adjacent', 'condition', {
        type: 'condition',
        condition: { kind: 'entity-in-range', targetId: 'nearest-enemy', range: attackRange * 32 },
      }, `Enemy in Range (${attackRange})`),
      node('strike', 'action', {
        type: 'action',
        action: { kind: 'apply-damage', targetId: 'nearest-enemy', amount: damage },
      }, `Strike (${damage} dmg)`),
      // Move toward nearest enemy
      node('approach', 'action', {
        type: 'action',
        action: { kind: 'move-toward-entity', targetId: 'nearest-enemy' },
      }, 'Approach Enemy'),
    ];

    return {
      id: graphId,
      name: 'Tactics Melee Unit',
      root: 'root',
      nodes,
      edges: [
        edge('root', 'attack-seq', 1),
        edge('root', 'approach', 2),
        edge('attack-seq', 'enemy-adjacent', 1),
        edge('attack-seq', 'strike', 2),
      ],
      tags: ['tactics', 'unit', 'melee', 'genre-kit'],
      variables: { moveRange, attackRange, damage, maxHp },
    };
  },

  /**
   * Ranged unit AI: stay at distance, fire from afar.
   * Kites away if enemy gets too close.
   */
  rangedUnit(config: RangedUnitConfig = {}): BehaviorGraph {
    const { moveRange = 2, attackRange = 4, damage = 10, maxHp = 50 } = config;
    const graphId = config.id ?? uid('tac-ranged');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'selector' } }, 'Ranged Unit'),
      // Flee if enemy too close
      node('flee-seq', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Flee'),
      node('too-close', 'condition', {
        type: 'condition',
        condition: { kind: 'entity-in-range', targetId: 'nearest-enemy', range: 64 },
      }, 'Enemy Too Close'),
      node('retreat', 'action', {
        type: 'action',
        action: { kind: 'set-velocity', vx: -100, vy: 0 },
      }, 'Retreat'),
      // Fire if in attack range
      node('fire-seq', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Fire'),
      node('in-range', 'condition', {
        type: 'condition',
        condition: { kind: 'entity-in-range', targetId: 'nearest-enemy', range: attackRange * 32 },
      }, `In Range (${attackRange})`),
      node('shoot', 'action', {
        type: 'action',
        action: { kind: 'apply-damage', targetId: 'nearest-enemy', amount: damage },
      }, `Shoot (${damage} dmg)`),
      // Reposition
      node('reposition', 'action', {
        type: 'action',
        action: { kind: 'move-toward-entity', targetId: 'nearest-enemy' },
      }, 'Reposition'),
    ];

    return {
      id: graphId,
      name: 'Tactics Ranged Unit',
      root: 'root',
      nodes,
      edges: [
        edge('root', 'flee-seq', 1),
        edge('root', 'fire-seq', 2),
        edge('root', 'reposition', 3),
        edge('flee-seq', 'too-close', 1),
        edge('flee-seq', 'retreat', 2),
        edge('fire-seq', 'in-range', 1),
        edge('fire-seq', 'shoot', 2),
      ],
      tags: ['tactics', 'unit', 'ranged', 'genre-kit'],
      variables: { moveRange, attackRange, damage, maxHp },
    };
  },

  /**
   * Support unit AI: heals lowest-HP ally, stays behind front line.
   */
  supportUnit(config: SupportUnitConfig = {}): BehaviorGraph {
    const { healAmount = 20, healRange = 3, moveRange = 2, maxHp = 40 } = config;
    const graphId = config.id ?? uid('tac-support');

    const nodes: BehaviorNode[] = [
      node('root', 'composite', { type: 'composite', composite: { kind: 'selector' } }, 'Support Unit'),
      // Heal injured ally
      node('heal-seq', 'composite', { type: 'composite', composite: { kind: 'sequence' } }, 'Heal Ally'),
      node('ally-hurt', 'condition', {
        type: 'condition',
        condition: { kind: 'custom', evaluator: 'ally-below-hp', params: { threshold: 60 } },
      }, 'Ally Hurt?'),
      node('ally-in-range', 'condition', {
        type: 'condition',
        condition: { kind: 'entity-in-range', targetId: 'injured-ally', range: healRange * 32 },
      }, `Ally in Range (${healRange})`),
      node('heal', 'action', {
        type: 'action',
        action: { kind: 'heal', targetId: 'injured-ally', amount: healAmount },
      }, `Heal (+${healAmount} HP)`),
      // Move toward injured ally
      node('move-to-ally', 'action', {
        type: 'action',
        action: { kind: 'move-toward-entity', targetId: 'injured-ally' },
      }, 'Move to Ally'),
    ];

    return {
      id: graphId,
      name: 'Tactics Support Unit',
      root: 'root',
      nodes,
      edges: [
        edge('root', 'heal-seq', 1),
        edge('root', 'move-to-ally', 2),
        edge('heal-seq', 'ally-hurt', 1),
        edge('heal-seq', 'ally-in-range', 2),
        edge('heal-seq', 'heal', 3),
      ],
      tags: ['tactics', 'unit', 'support', 'healer', 'genre-kit'],
      variables: { healAmount, healRange, moveRange, maxHp },
    };
  },
};

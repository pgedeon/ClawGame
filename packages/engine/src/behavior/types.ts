/**
 * @clawgame/engine - Behavior Graph Types
 *
 * Data structures for visual logic and behavior authoring.
 * These types are serializable (JSON-friendly) for storage, AI generation, and editor use.
 *
 * Architecture:
 * - BehaviorGraph: a directed graph of BehaviorNodes connected by edges
 * - BehaviorNode: a single logic step (condition, action, decorator, composite)
 * - BehaviorEdge: a connection between nodes with optional transition condition
 *
 * This is the foundation for:
 * - Visual logic editor (M13)
 * - Behavior graphs for enemies/NPCs
 * - AI-assisted graph generation
 * - Genre kits
 */

// ─── Node Types ───

/** What kind of logic this node performs */
export type BehaviorNodeType =
  | 'composite'    // sequence, selector, parallel
  | 'decorator'    // inverter, repeater, until-fail, timer
  | 'condition'    // check game state
  | 'action';      // do something

/** Composite strategies */
export type CompositeKind = 'sequence' | 'selector' | 'parallel';

/** Decorator kinds */
export type DecoratorKind = 'inverter' | 'repeater' | 'until-fail' | 'timer' | 'cooldown';

/** Built-in condition types */
export type ConditionKind =
  | 'always'
  | 'never'
  | 'entity-in-range'
  | 'entity-has-tag'
  | 'health-below'
  | 'health-above'
  | 'random-chance'
  | 'input-pressed'
  | 'timer-elapsed'
  | 'custom';

/** Built-in action types */
export type ActionKind =
  | 'move-to'
  | 'move-toward-entity'
  | 'set-velocity'
  | 'apply-damage'
  | 'heal'
  | 'destroy-self'
  | 'spawn-entity'
  | 'play-animation'
  | 'play-sound'
  | 'fire-event'
  | 'set-tag'
  | 'remove-tag'
  | 'wait'
  | 'set-variable'
  | 'change-state'
  | 'start-navigation'
  | 'stop-navigation'
  | 'follow-waypoints'
  | 'custom';

// ─── Navigation Types ───

/** A single waypoint in a navigation path */
export interface Waypoint {
  id: string;
  x: number;
  y: number;
  /** Arrival radius — entity is considered "at" waypoint within this distance */
  radius?: number;
  /** Seconds to wait at this waypoint before proceeding */
  waitTime?: number;
  /** Editor label */
  label?: string;
}

/** A named sequence of waypoints forming a navigation path */
export interface NavigationPath {
  id: string;
  name: string;
  waypoints: Waypoint[];
  /** Whether to loop back to the first waypoint after the last */
  loop?: boolean;
  /** Speed multiplier applied while following this path */
  speedMultiplier?: number;
}

/** Per-entity navigation runtime state (stored as entity component) */
export interface NavigationState {
  /** Which path we're following */
  currentPathId: string | null;
  /** Index of the waypoint we're moving toward */
  currentWaypointIndex: number;
  /** Accumulated wait time at current waypoint */
  waitTimeAccumulator: number;
  /** Whether currently in the "waiting" phase at a waypoint */
  isWaiting: boolean;
}

// ─── Node Data ───

export interface CompositeData {
  kind: CompositeKind;
}

export interface DecoratorData {
  kind: DecoratorKind;
  /** For timer/cooldown: duration in seconds */
  duration?: number;
  /** For repeater: max repetitions (0 = infinite) */
  maxRepetitions?: number;
}

export interface ConditionData {
  kind: ConditionKind;
  /** Entity to check against (for range/target conditions) */
  targetId?: string;
  /** Range in pixels */
  range?: number;
  /** Tag string */
  tag?: string;
  /** Health threshold */
  threshold?: number;
  /** Random chance (0-1) */
  chance?: number;
  /** Variable name to check */
  variable?: string;
  /** Expected value for comparison */
  expectedValue?: any;
  /** Custom condition evaluator name */
  evaluator?: string;
  /** Generic parameters */
  params?: Record<string, any>;
}

export interface ActionData {
  kind: ActionKind;
  /** Target entity (defaults to self) */
  targetId?: string;
  /** Movement target coordinates */
  x?: number;
  y?: number;
  /** Velocity values */
  vx?: number;
  vy?: number;
  /** Damage/heal amount */
  amount?: number;
  /** Animation name or sound name */
  name?: string;
  /** Event name to fire */
  event?: string;
  /** Event payload */
  payload?: any;
  /** Wait duration in seconds */
  duration?: number;
  /** Variable name and value */
  variable?: string;
  value?: any;
  /** Tag to set/remove */
  tag?: string;
  /** State to transition to */
  state?: string;
  /** Spawn config */
  spawnConfig?: {
    entityType: string;
    templateId?: string;
    x: number;
    y: number;
    tags?: string[];
  };
  /** Custom action executor name */
  executor?: string;
  /** Generic parameters */
  params?: Record<string, any>;
  /** Navigation-specific parameters */
  navigation?: {
    pathId?: string;
    loop?: boolean;
    speedMultiplier?: number;
  };
}

// ─── Core Types ───

/**
 * BehaviorNode — a single node in a behavior graph.
 * Serializable for JSON storage and AI generation.
 */
export interface BehaviorNode {
  id: string;
  type: BehaviorNodeType;
  /** Human-readable label for the editor */
  label?: string;
  /** Position in the visual editor canvas */
  position?: { x: number; y: number };
  /** Node-type-specific data */
  data:
    | { type: 'composite'; composite: CompositeData }
    | { type: 'decorator'; decorator: DecoratorData }
    | { type: 'condition'; condition: ConditionData }
    | { type: 'action'; action: ActionData };
}

/**
 * BehaviorEdge — a directed connection between two nodes.
 */
export interface BehaviorEdge {
  id: string;
  /** Source node */
  from: string;
  /** Target node */
  to: string;
  /** Optional condition for transition */
  condition?: string;
  /** Priority (lower = evaluated first) */
  priority?: number;
}

/**
 * BehaviorGraph — a complete behavior graph definition.
 * This is the top-level serializable structure.
 */
export interface BehaviorGraph {
  id: string;
  name: string;
  /** Root node ID — entry point of the graph */
  root: string;
  nodes: BehaviorNode[];
  edges: BehaviorEdge[];
  /** Variables scoped to this behavior */
  variables?: Record<string, any>;
  /** Tags for categorization */
  tags?: string[];
}

/**
 * BehaviorBinding — attaches a behavior graph to entity types.
 * Stored in project data, used by the runtime to assign behaviors.
 */
export interface BehaviorBinding {
  /** Entity type or specific entity ID */
  target: string;
  /** Whether target is an entity type ('type') or specific ID ('id') */
  targetType: 'type' | 'id';
  /** Reference to the behavior graph */
  graphId: string;
  /** Override variables for this binding */
  variables?: Record<string, any>;
}

// ─── Runtime Status ───

export type NodeStatus = 'success' | 'failure' | 'running';

/**
 * Runtime state for tracking node execution within a tick.
 * Not serialized — used internally by the executor.
 */
export interface NodeRunState {
  status: NodeStatus;
  /** Current child index for composites */
  childIndex?: number;
  /** Repetition counter for repeaters */
  repetitions?: number;
  /** Timer accumulator */
  elapsed?: number;
  /** Whether this node has been entered this tick */
  entered?: boolean;
}
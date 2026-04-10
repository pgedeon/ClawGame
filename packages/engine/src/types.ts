export interface AnimationState {
  name: string;
  animation: AnimationComponent;
  /** Whether this state can loop indefinitely */
  canLoop: boolean;
  /** Default transition when this state completes */
  defaultTransition?: string;
  /** List of possible transitions to other states */
  transitions: AnimationTransition[];
}

export interface AnimationTransition {
  to: string;
  delay?: number;
  conditions: AnimationCondition[];
}

export interface AnimationCondition {
  type: 'timer' | 'input' | 'health' | 'state' | 'random';
  params?: Record<string, any>;
  /** Comparison operator ('=', '>', '<', '>=', '<=') */
  operator?: string;
  /** Value to compare against */
  value?: any;
}

export interface AnimationStateMachineComponent {
  /** Current active state name */
  currentState: string;
  /** Map of all animation states */
  states: { [stateName: string]: AnimationState };
  /** Track transition timing */
  transitionTimer?: number;
  /** Whether state machine is active */
  active: boolean;
}

export interface AnimationComponent {
  frames: string[];
  frameRate: number;
  loop: boolean;
  currentFrame?: number;
}

// ─── Component Types ───

/** Transform component for entity positioning and scaling */
export interface Transform {
  position: { x: number; y: number };
  rotation?: number;
  scale?: { x: number; y: number };
}

/** Sprite component for visual rendering */
export interface SpriteComponent {
  image?: string;
  width?: number;
  height?: number;
  color?: string;
  flipX?: boolean;
  flipY?: boolean;
  opacity?: number;
}

/** Movement component for entity physics and velocity */
export interface MovementComponent {
  velocity: { x: number; y: number };
  acceleration: { x: number; y: number };
  maxSpeed?: { x: number; y: number };
  friction?: number;
  gravity?: number;
  onGround?: boolean;
}

/** AI component for behavior and decision making */
export interface AIComponent {
  behavior?: string;
  target?: string;
  state?: string;
  range?: number;
  speed?: number;
  health?: number;
  attackPower?: number;
}

/** Collision component for physics and collision detection */
export interface CollisionComponent {
  width: number;
  height: number;
  solid?: boolean;
  trigger?: boolean;
  layers?: string[];
}

/** Stats component for entity attributes and combat */
export interface StatsComponent {
  health: number;
  maxHealth: number;
  attackPower?: number;
  defense?: number;
  speed?: number;
}

/** Player input component for keyboard/gamepad input */
export interface PlayerInputComponent {
  keys: Record<string, boolean>;
  gamepad?: number;
  actions?: Record<string, boolean>;
}

/** Collectible component for items and pickups */
export interface CollectibleComponent {
  type: 'health' | 'coin' | 'powerup' | 'key' | 'weapon';
  value?: number;
  name?: string;
}

/** Physics component for advanced physics simulation */
export interface PhysicsComponent {
  mass?: number;
  restitution?: number;
  friction?: number;
  density?: number;
}

/** Trigger component for event-based interactions */
export interface TriggerComponent {
  onEnter?: string;
  onExit?: string;
  onStay?: string;
  condition?: string;
}

/** Camera component for view and viewport control */
export interface CameraComponent {
  follow?: string;
  bounds?: { width: number; height: number };
  zoom?: number;
  shake?: number;
}

/** Union of all known component types */
export type Component =
  | Transform
  | SpriteComponent
  | MovementComponent
  | AIComponent
  | CollisionComponent
  | StatsComponent
  | PlayerInputComponent
  | CollectibleComponent
  | PhysicsComponent
  | TriggerComponent
  | CameraComponent
  | AnimationComponent
  | AnimationStateMachineComponent;

// ─── Entity Types ───

/** Entity type classification used across editor, preview, and engine */
export type EntityType = 'player' | 'enemy' | 'npc' | 'collectible' | 'obstacle' | 'platform' | 'trigger' | 'camera' | 'custom';

// ─── Serializable (JSON-friendly) types ───

/**
 * SerializableEntity — plain object for JSON storage, API transport, and AI generation.
 * Components are a plain Record (not a Map).
 */
export interface SerializableEntity {
  id: string;
  name?: string;
  type: EntityType;
  transform: Transform;
  components: Record<string, any>;
  /** Parent entity for hierarchy */
  parent?: string;
  children?: string[];
  /** Tags for filtering/searching */
  tags?: string[];
}

/**
 * SerializableScene — plain object representation of a full scene.
 */
export interface SerializableScene {
  name: string;
  entities: SerializableEntity[];
  /** Scene-level metadata */
  bounds?: { width: number; height: number };
  spawnPoint?: { x: number; y: number };
  /** Background color or asset reference */
  background?: string;
}

// ─── Runtime types (engine-internal) ───

/**
 * Entity — runtime game object with Map-based components.
 * Used internally by the engine during gameplay.
 */
export interface Entity {
  id: string;
  name?: string;
  type?: EntityType;
  transform: Transform;
  components: Map<string, Component>;
}

/**
 * Scene — runtime scene with Map-based entity lookup.
 */
export interface Scene {
  name: string;
  entities: Map<string, Entity>;
}

// ─── Conversion Utilities ───

/** Convert a serializable entity to a runtime entity */
export function toRuntimeEntity(se: SerializableEntity): Entity {
  const components = new Map<string, Component>();
  for (const [key, value] of Object.entries(se.components)) {
    if (key !== 'transform') { // transform is top-level
      components.set(key, value as Component);
    }
  }
  return {
    id: se.id,
    name: se.name,
    type: se.type,
    transform: { ...se.transform },
    components,
  };
}

/** Convert a runtime entity to a serializable entity */
export function toSerializableEntity(e: Entity): SerializableEntity {
  const components: Record<string, any> = {};
  e.components.forEach((value, key) => {
    // Strip runtime-only fields (like HTMLImageElement)
    if (key === 'sprite' && value && typeof value === 'object') {
      const { image, ...rest } = value as SpriteComponent;
      components[key] = rest;
    } else {
      components[key] = value;
    }
  });
  return {
    id: e.id,
    name: e.name,
    type: e.type ?? 'custom',
    transform: { ...e.transform },
    components,
  };
}

/** Convert a serializable scene to a runtime scene */
export function toRuntimeScene(ss: SerializableScene): Scene {
  const entities = new Map<string, Entity>();
  for (const entity of ss.entities) {
    entities.set(entity.id, toRuntimeEntity(entity));
  }
  return { name: ss.name, entities };
}

/** Convert a runtime scene to a serializable scene */
export function toSerializableScene(s: Scene, meta?: Partial<SerializableScene>): SerializableScene {
  const entities: SerializableEntity[] = [];
  s.entities.forEach((entity) => {
    entities.push(toSerializableEntity(entity));
  });
  return {
    name: s.name,
    entities,
    ...meta,
  };
}

// ─── Input & Renderer types ───

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface RendererConfig {
  width: number;
  height: number;
  backgroundColor?: string;
  clearCanvas?: boolean;
}
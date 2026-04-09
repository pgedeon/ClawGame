/**
 * @clawgame/engine - Canonical Schema
 *
 * Unified entity/component model shared by:
 * - Engine runtime
 * - Scene editor
 * - Game preview
 * - Export pipeline
 * - AI code generation
 *
 * Two representations:
 * - `SerializableEntity` / `SerializableScene` — plain objects for JSON, API, storage
 * - `Entity` / `Scene` — runtime types with Map-based components for the engine
 *
 * Conversion utilities bridge between them.
 */

// ─── Components (shared between serializable and runtime) ───

export interface Transform {
  x: number;
  y: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface SpriteComponent {
  /** Runtime-only; not serialized. Use assetRef for persistence. */
  image?: HTMLImageElement;
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  color?: string;
  /** Reference to an asset in the project's asset store */
  assetRef?: string;
}

export interface MovementComponent {
  vx: number;
  vy: number;
  speed: number;
}

export interface AIComponent {
  type: 'patrol' | 'chase' | 'idle';
  patrolStart?: { x: number; y: number };
  patrolEnd?: { x: number; y: number };
  patrolSpeed?: number;
  targetEntity?: string;
}

export interface CollisionComponent {
  width: number;
  height: number;
  type?: 'player' | 'enemy' | 'collectible' | 'wall' | 'trigger';
}

export interface StatsComponent {
  hp: number;
  maxHp: number;
  damage: number;
  defense?: number;
  speed?: number;
}

export interface PlayerInputComponent {
  enabled: boolean;
}

export interface CollectibleComponent {
  type: string;
  value: number;
}

export interface PhysicsComponent {
  gravity?: number;
  friction?: number;
  bounce?: number;
  grounded?: boolean;
}

export interface TriggerComponent {
  event: string;
  target?: string;
  once?: boolean;
  radius?: number;
}

export interface CameraComponent {
  follow?: string;
  bounds?: { minX: number; minY: number; maxX: number; maxY: number };
  smoothing?: number;
}

export interface AnimationComponent {
  frames: string[];
  frameRate: number;
  loop: boolean;
  currentFrame?: number;
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
  | AnimationComponent;

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
  showGrid?: boolean;
  showHitboxes?: boolean;
  showFPS?: boolean;
}

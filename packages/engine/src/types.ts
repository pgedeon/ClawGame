export interface AnimationComponent {
  frames: string[];
  frameRate: number;
  loop: boolean;
  currentFrame?: number;
  active?: boolean;
}

// ─── Component Types ───

export interface Transform {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface SpriteComponent {
  image?: HTMLImageElement;
  width?: number;
  height?: number;
  color?: string;
  flipX?: boolean;
  flipY?: boolean;
  opacity?: number;
  offsetX?: number;
  offsetY?: number;
  spriteSheet?: string;
  frameWidth?: number;
  frameHeight?: number;
  assetRef?: string;
}

export interface MovementComponent {
  vx: number;
  vy: number;
  speed?: number;
  acceleration?: number;
  maxSpeed?: number;
  friction?: number;
  gravity?: number;
  onGround?: boolean;
}

export interface AIComponent {
  type?: 'patrol' | 'chase' | 'idle' | 'attack';
  patrolStart?: { x: number; y: number };
  patrolEnd?: { x: number; y: number };
  patrolSpeed?: number;
  targetEntity?: string;
  behavior?: string;
  target?: string;
  state?: string;
  range?: number;
  speed?: number;
  health?: number;
  attackPower?: number;
}

export interface CollisionComponent {
  width: number;
  height: number;
  solid?: boolean;
  trigger?: boolean;
  layers?: string[];
  type?: 'solid' | 'trigger' | 'sensor' | 'player' | 'enemy' | 'collectible' | 'wall' | 'projectile';
}

export interface StatsComponent {
  health: number;
  maxHealth: number;
  attackPower?: number;
  defense?: number;
  speed?: number;
}

export interface PlayerInputComponent {
  keys: Record<string, boolean>;
  gamepad?: number;
  actions?: Record<string, boolean>;
}

export interface CollectibleComponent {
  type: 'health' | 'coin' | 'powerup' | 'key' | 'weapon' | 'item';
  value?: number;
  name?: string;
}

export interface ProjectileComponent {
  vx: number;
  vy: number;
  damage: number;
  targetTypes?: Array<'solid' | 'trigger' | 'sensor' | 'player' | 'enemy' | 'collectible' | 'wall'>;
  lifetime?: number;
  destroyOnHit?: boolean;
}

export interface PhysicsComponent {
  mass?: number;
  restitution?: number;
  friction?: number;
  density?: number;
  gravity?: number;
  vy?: number;
  grounded?: boolean;
  bounce?: number;
}

export interface TriggerComponent {
  onEnter?: string;
  onExit?: string;
  onStay?: string;
  condition?: string;
  event?: string;
  target?: string;
  once?: boolean;
}

export interface CameraComponent {
  follow?: string;
  bounds?: { width: number; height: number };
  zoom?: number;
  shake?: number;
}

export interface RendererConfig {
  width: number;
  height: number;
  backgroundColor?: string;
  clearCanvas?: boolean;
  showGrid?: boolean;
  showHitboxes?: boolean;
  showFPS?: boolean;
}

export type Component =
  | Transform
  | SpriteComponent
  | MovementComponent
  | AIComponent
  | CollisionComponent
  | StatsComponent
  | PlayerInputComponent
  | CollectibleComponent
  | ProjectileComponent
  | PhysicsComponent
  | TriggerComponent
  | CameraComponent
  | AnimationComponent;

export type EntityType =
  | 'player'
  | 'enemy'
  | 'npc'
  | 'projectile'
  | 'collectible'
  | 'item'
  | 'health'
  | 'rune'
  | 'obstacle'
  | 'platform'
  | 'trigger'
  | 'camera'
  | 'custom'
  | 'unknown';

export interface SerializableEntity {
  id: string;
  name?: string;
  type: EntityType;
  transform: Transform;
  components: Record<string, any>;
  parent?: string;
  children?: string[];
  tags?: string[];
}

export interface SerializableScene {
  name: string;
  entities: SerializableEntity[];
  bounds?: { width: number; height: number };
  spawnPoint?: { x: number; y: number };
  background?: string;
}

export interface Entity {
  id: string;
  name?: string;
  type?: EntityType;
  transform: Transform;
  components: Map<string, Component>;
}

export interface Scene {
  name: string;
  entities: Map<string, Entity>;
}

export function toRuntimeEntity(se: SerializableEntity): Entity {
  const components = new Map<string, Component>();

  for (const [key, value] of Object.entries(se.components)) {
    if (key !== 'transform') {
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

export function toSerializableEntity(entity: Entity): SerializableEntity {
  const components: Record<string, any> = {};

  entity.components.forEach((value, key) => {
    if (key === 'sprite' && value && typeof value === 'object') {
      const { image, ...rest } = value as SpriteComponent;
      components[key] = rest;
      return;
    }

    components[key] = value;
  });

  return {
    id: entity.id,
    name: entity.name,
    type: entity.type ?? 'custom',
    transform: { ...entity.transform },
    components,
  };
}

export function toRuntimeScene(scene: SerializableScene): Scene {
  const entities = new Map<string, Entity>();

  for (const entity of scene.entities) {
    entities.set(entity.id, toRuntimeEntity(entity));
  }

  return {
    name: scene.name,
    entities,
  };
}

export function toSerializableScene(scene: Scene, meta?: Partial<SerializableScene>): SerializableScene {
  return {
    name: scene.name,
    entities: Array.from(scene.entities.values()).map((entity) => toSerializableEntity(entity)),
    ...meta,
  };
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

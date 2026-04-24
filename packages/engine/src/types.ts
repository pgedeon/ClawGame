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
  frame?: number;
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
  type?: 'solid' | 'trigger' | 'sensor' | 'player' | 'enemy' | 'collectible' | 'wall' | 'projectile' | 'none';
  shape?: 'rectangle' | 'circle';
  offsetX?: number;
  offsetY?: number;
  immovable?: boolean;
  bounce?: number;
  drag?: number;
  allowGravity?: boolean;
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
  type: 'health' | 'coin' | 'powerup' | 'key' | 'weapon' | 'item' | string;
  value?: number;
  name?: string;
}

export interface TextComponent {
  content: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
}

export interface ParticlesComponent {
  rate?: number;
  lifespan?: number;
  speed?: number;
  color?: string;
}

export interface ContainerComponent {
  children?: string[];
}

export interface TweenComponent {
  duration?: number;
  ease?: string;
  repeat?: number;
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
  | TextComponent
  | ParticlesComponent
  | ContainerComponent
  | TweenComponent
  | ProjectileComponent
  | PhysicsComponent
  | TriggerComponent
  | CameraComponent
  | AnimationComponent;

export const ENTITY_TYPES = [
  'player',
  'enemy',
  'npc',
  'projectile',
  'collectible',
  'item',
  'health',
  'rune',
  'obstacle',
  'platform',
  'trigger',
  'camera',
  'custom',
  'unknown',
] as const;

export type EntityType = typeof ENTITY_TYPES[number];

export interface SerializableEntity {
  id: string;
  name?: string;
  type: EntityType;
  transform: Transform;
  components: Record<string, any>;
  visible?: boolean;
  locked?: boolean;
  phaserKind?: string;
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
  visible?: boolean;
  locked?: boolean;
  phaserKind?: string;
  parent?: string;
  children?: string[];
  tags?: string[];
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
    visible: se.visible,
    locked: se.locked,
    phaserKind: se.phaserKind,
    parent: se.parent,
    children: se.children,
    tags: se.tags,
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
    visible: entity.visible,
    locked: entity.locked,
    phaserKind: entity.phaserKind,
    parent: entity.parent,
    children: entity.children,
    tags: entity.tags,
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

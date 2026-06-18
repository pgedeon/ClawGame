/**
 * @clawgame/shared - Component interfaces and scene types
 * Domain-level component definitions used for serialization and templates.
 *
 * Note: These differ from @clawgame/engine types which are runtime ECS shapes
 * (with HTMLImageElement, Phaser refs, etc.). These are plain data interfaces.
 */

import type { AssetType } from './assets';

export interface Vector2 {
  x: number;
  y: number;
}

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number; // degrees
}

export interface Sprite {
  image: string | null;
  width: number;
  height: number;
  sourceX?: number;
  sourceY?: number;
  assetRef?: string; // Reference to project asset
}

export interface Movement {
  vx: number;
  vy: number;
  speed: number;
  friction: number;
  acceleration: number;
}

export interface Stats {
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  level: number;
  experience: number;
}

export interface Collision {
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  // Physics body properties (used by scene editor PropertyInspector)
  type?: string;
  immovable?: boolean;
  bounce?: number;
  drag?: number;
  allowGravity?: boolean;
  sensor?: boolean;
  velocityX?: number;
  velocityY?: number;
  accelerationX?: number;
  accelerationY?: number;
  maxVelocity?: number;
  mass?: number;
}

export interface Animation {
  currentFrame: number;
  totalFrames: number;
  frameDuration: number;
  isPlaying: boolean;
  loop: boolean;
  lastFrameTime: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  action: boolean;
  cancel: boolean;
}

// Engine event types
export interface EngineEvents {
  'entity:create': { id: string; type: string; data: any };
  'entity:destroy': { id: string };
  'entity:damaged': { id: string; damage: number; source?: string };
  'entity:defeated': { id: string; reason?: string };
  'projectile:hit': { projectileId: string; targetId: string; damage: number };
  'scene:loaded': { sceneId: string; data: any };
  'scene:unloaded': { sceneId: string };
  'asset:loaded': { assetId: string; type: AssetType };
  'asset:failed': { assetId: string; error: string };
}

// Scene management
export interface Scene {
  id: string;
  name: string;
  width: number;
  height: number;
  entities: SceneEntity[];
  background?: string;
  backgroundColor?: string;
  gravity?: { x: number; y: number };
  camera?: {
    x: number;
    y: number;
    zoom: number;
    followEntity?: string;
  };
}

export interface SceneEntity {
  id: string;
  type: string;
  name?: string;
  position: Vector2;
  scale?: Vector2;
  rotation?: number;
  components: Record<string, any>;
  tags?: string[];
}

// Component interfaces for game entities
export interface TransformComponent {
  type: 'transform';
  position: Vector2;
  scale?: Vector2;
  rotation?: number;
}

export interface SpriteComponent {
  type: 'sprite';
  image: string;
  width: number;
  height: number;
  sourceX?: number;
  sourceY?: number;
  sourceWidth?: number;
  sourceHeight?: number;
  flipX?: boolean;
  flipY?: boolean;
  tint?: string;
  animation?: Animation;
}

export interface MovementComponent {
  type: 'movement';
  velocity: Vector2;
  speed: number;
  friction: number;
  acceleration: number;
  maxSpeed?: number;
  canJump?: boolean;
  jumpPower?: number;
  isGrounded?: boolean;
}

export interface StatsComponent {
  type: 'stats';
  health: number;
  maxHealth: number;
  attack: number;
  defense: number;
  speed: number;
  level: number;
  experience: number;
  experienceToNext?: number;
}

export interface CollisionComponent {
  type: 'collision';
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  isTrigger?: boolean;
  layers?: string[];
  // Physics body properties (used by scene editor PropertyInspector)
  immovable?: boolean;
  bounce?: number;
  drag?: number;
  allowGravity?: boolean;
  sensor?: boolean;
  velocityX?: number;
  velocityY?: number;
  accelerationX?: number;
  accelerationY?: number;
  maxVelocity?: number;
  mass?: number;
}

export interface InputComponent {
  type: 'input';
  playerIndex?: number;
  bindings: Record<string, string>;
  state: InputState;
}

export interface AnimationComponent {
  type: 'animation';
  animations: Record<string, Animation>;
  currentAnimation?: string;
  isPlaying: boolean;
  speed?: number;
}

export interface DialogueComponent {
  type: 'dialogue';
  dialogues: string[];
  currentIndex: number;
  isActive: boolean;
  speed: number;
  onComplete?: () => void;
}

export interface TriggerComponent {
  type: 'trigger';
  condition: string;
  action: string;
  isActive: boolean;
  triggered: boolean;
}

export interface AIComponent {
  type: 'ai';
  state: string;
  target?: string;
  patrolPoints?: Vector2[];
  detectionRange?: number;
  attackRange?: number;
  behavior: {
    idle: string;
    patrol: string;
    chase: string;
    attack: string;
    retreat: string;
  };
  lastActionTime: number;
  actionCooldown: number;
}

export interface WeaponComponent {
  type: 'weapon';
  damage: number;
  range: number;
  cooldown: number;
  lastAttackTime: number;
  projectileSpeed?: number;
  projectileType?: string;
}

export interface ProjectileComponent {
  type: 'projectile';
  damage: number;
  speed: number;
  direction: Vector2;
  lifetime: number;
  createdAt: number;
  sourceId: string;
  pierceTargets?: number;
}

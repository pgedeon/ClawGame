/**
 * @clawgame/engine - Component type definitions
 */

/**
 * Transform component - position, rotation, scale
 */
export interface Transform {
  x: number;
  y: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

/**
 * Sprite component - renders an image at the entity's position
 */
export interface Sprite {
  image?: HTMLImageElement;
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
  color?: string;
}

/**
 * Movement component - velocity and speed limits
 */
export interface Movement {
  vx: number;
  vy: number;
  speed: number;
}

/**
 * AI component - behavior for enemy entities
 */
export interface AI {
  type: 'patrol' | 'chase' | 'idle';
  patrolStart?: { x: number; y: number };
  patrolEnd?: { x: number; y: number };
  patrolSpeed?: number;
  targetEntity?: string;
}

/**
 * Collision component - hitbox for collision detection
 */
export interface Collision {
  width: number;
  height: number;
  type?: 'player' | 'enemy' | 'collectible' | 'wall';
}

/**
 * Entity - a game object with components
 */
export interface Entity {
  id: string;
  transform: Transform;
  components: Map<string, Component>;
}

/**
 * Component base type
 */
export type Component = Transform | Sprite | Movement | AI | Collision;

/**
 * Scene - a collection of entities
 */
export interface Scene {
  name: string;
  entities: Map<string, Entity>;
}

/**
 * Input state - keyboard state
 */
export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/**
 * Renderer configuration
 */
export interface RendererConfig {
  width: number;
  height: number;
  backgroundColor?: string;
  showGrid?: boolean;
  showHitboxes?: boolean;
  showFPS?: boolean;
}

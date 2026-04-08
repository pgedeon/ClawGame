/**
 * @clawgame/shared - Shared utilities and types
 */

import { nanoid } from 'nanoid';

// Utility functions
export function generateId(): string {
  return nanoid(10);
}

export function generateProjectId(): string {
  return nanoid(11);
}

export function createId(): string {
  return nanoid(8);
}

// Shared types used across packages
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
}

export interface Movement {
  vx: number;
  vy: number;
  speed: number;
  friction: number;
  acceleration: number;
}

export interface AI {
  type: 'idle' | 'patrol' | 'chase' | 'flee';
  patrolSpeed: number;
  chaseSpeed: number;
  fleeSpeed: number;
  detectionRange: number;
  patrolPoints: Vector2[];
  currentPatrolIndex: number;
}

export interface Collision {
  width: number;
  height: number;
  type: 'wall' | 'platform' | 'collectible' | 'enemy' | 'player';
  solid: boolean;
  sensor: boolean;
}

export interface Animation {
  frames: string[];
  currentFrame: number;
  frameRate: number;
  loop: boolean;
  playing: boolean;
}

export interface Entity {
  id: string;
  transform: Transform;
  components: Map<string, any>;
}

export interface Scene {
  name: string;
  entities: Map<string, Entity>;
}

export interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  entities: Entity[];
}

export interface AssetMetadata {
  id: string;
  projectId: string;
  name: string;
  type: 'sprite' | 'tileset' | 'texture' | 'icon' | 'audio' | 'background';
  prompt?: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  status: 'generated' | 'uploaded' | 'error';
}

// Project types - matching backend structure
export interface ProjectConfig {
  version: string;
  engine: {
    version: string;
    runtimeTarget: string;
    renderBackend: string;
  };
  assets: {
    baseDir: string;
    formats: string[];
  };
  ai: {
    enabled: boolean;
    provider: 'openrouter' | 'openai' | 'anthropic';
    model: string;
  };
  openclaw?: {
    enabled: boolean;
    project: string;
  };
}

export interface ProjectInner {
  id: string;
  name: string;
  displayName?: string;
  genre: string;
  artStyle: string;
  description?: string;
  status: 'draft' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface ClawGameProject {
  version: string;
  project: ProjectInner;
  engine: {
    version: string;
    runtimeTarget: string;
    renderBackend: string;
  };
  assets: ProjectConfig['assets'];
  ai: ProjectConfig['ai'];
  openclaw?: ProjectConfig['openclaw'];
}

export interface CreateProjectRequest {
  name: string;
  genre: string;
  artStyle: string;
  description?: string;
  runtimeTarget?: string;
  renderBackend?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  genre?: string;
  artStyle?: string;
  description?: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  genre: string;
  artStyle: string;
  description?: string;
  status: 'draft' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectListItem {
  version: string;
  engine: {
    version: string;
    runtimeTarget: string;
    renderBackend: string;
  };
  ai?: ProjectConfig['ai'];
  assets?: ProjectConfig['assets'];
  openclaw?: ProjectConfig['openclaw'];
  sceneCount: number;
  entityCount: number;
}

// Game engine configuration
export interface EngineConfig {
  debug: boolean;
  showGrid: boolean;
  showCollision: boolean;
  showFPS: boolean;
  targetFPS: number;
  maxEntities: number;
}

// Component creation helpers
export function createMovement(overrides: Partial<Movement> = {}): Movement {
  return {
    vx: 0,
    vy: 0,
    speed: 100,
    friction: 0.8,
    acceleration: 0.5,
    ...overrides,
  };
}

export function createAI(overrides: Partial<AI> = {}): AI {
  return {
    type: 'idle',
    patrolSpeed: 50,
    chaseSpeed: 100,
    fleeSpeed: 150,
    detectionRange: 100,
    patrolPoints: [],
    currentPatrolIndex: 0,
    ...overrides,
  };
}

export function createCollision(overrides: Partial<Collision> = {}): Collision {
  return {
    width: 32,
    height: 32,
    type: 'wall',
    solid: true,
    sensor: false,
    ...overrides,
  };
}

export function createSprite(overrides: Partial<Sprite> = {}): Sprite {
  return {
    image: null,
    width: 32,
    height: 32,
    ...overrides,
  };
}

export function createTransform(overrides: Partial<Transform> = {}): Transform {
  return {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    ...overrides,
  };
}

// Entity creation helpers
export function createPlayerEntity(transform: Partial<Transform> = {}): Entity {
  return {
    id: `player_${nanoid(6)}`,
    transform: createTransform(transform),
    components: new Map<string, any>([
      ['playerInput', true],
      ['movement', createMovement({ speed: 200 })],
      ['collision', createCollision({ type: 'player', solid: true })],
      ['sprite', createSprite()],
    ]),
  };
}

export function createEnemyEntity(transform: Partial<Transform> = {}): Entity {
  return {
    id: `enemy_${nanoid(6)}`,
    transform: createTransform(transform),
    components: new Map<string, any>([
      ['ai', createAI({ type: 'patrol' })],
      ['movement', createMovement({ speed: 50 })],
      ['collision', createCollision({ type: 'enemy', solid: true })],
      ['sprite', createSprite()],
    ]),
  };
}

export function createCoinEntity(transform: Partial<Transform> = {}): Entity {
  return {
    id: `coin_${nanoid(6)}`,
    transform: createTransform(transform),
    components: new Map<string, any>([
      ['collision', createCollision({ type: 'collectible', solid: false, sensor: true })],
      ['sprite', createSprite()],
    ]),
  };
}

export function createWallEntity(transform: Partial<Transform> = {}): Entity {
  return {
    id: `wall_${nanoid(6)}`,
    transform: createTransform(transform),
    components: new Map<string, any>([
      ['collision', createCollision({ type: 'wall', solid: true })],
    ]),
  };
}

// Project helpers
export function createDefaultProject(input: CreateProjectRequest): ClawGameProject {
  const now = new Date().toISOString();
  return {
    version: '0.1.0',
    project: {
      id: generateProjectId(),
      name: input.name,
      displayName: input.name,
      genre: input.genre,
      artStyle: input.artStyle,
      description: input.description,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    },
    engine: {
      version: '1.0.0',
      runtimeTarget: input.runtimeTarget || 'web',
      renderBackend: input.renderBackend || 'canvas',
    },
    assets: {
      baseDir: './assets',
      formats: ['png', 'jpg', 'svg', 'webp'],
    },
    ai: {
      enabled: true,
      provider: 'openrouter',
      model: 'qwen/qwen3.6-plus:free',
    },
  };
}

// Scene helpers
export function createBasicScene(name: string = 'Main Scene'): Scene {
  return {
    name,
    entities: new Map<string, Entity>(),
  };
}

// Color utilities for asset generation
export const colors = {
  primary: '#8b5cf6',
  secondary: '#22d3ee',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  dark: '#0f172a',
  surface: '#1e293b',
  card: '#334155',
  border: '#475569',
  text: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
};

// Animation constants
export const animations = {
  standardFrameRate: 30,
  smoothFrameRate: 60,
  quickFrameRate: 15,
};
// RPG system types
export * from './rpg/types';

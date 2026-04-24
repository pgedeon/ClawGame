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

// Project types
export interface ClawGameProject {
  version: string;
  project: {
    id: string;
    name: string;
    displayName?: string;
    description?: string;
    genre: string;
    artStyle: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    settings?: Record<string, unknown>;
  };
  engine?: {
    version?: string;
    runtimeTarget?: string;
    renderBackend?: string;
    settings?: {
      width: number;
      height: number;
      backgroundColor: string;
      gravity: { x: number; y: number };
    };
  };
  ai?: {
    enabled: boolean;
    provider?: string;
    model?: string;
    settings?: {
      temperature: number;
      maxTokens: number;
    };
  };
  assets?: {
    enabled?: boolean;
    maxCount?: number;
    autoGenerate?: boolean;
    baseDir?: string;
    formats?: string[];
  };
  openclaw?: {
    version: string;
    features: string[];
    settings: {
      autoSave: boolean;
      autoBackup: boolean;
    };
  };
  settings: {
    width: number;
    height: number;
    backgroundColor: string;
    gravity: { x: number; y: number };
  };
}

export interface LegacyClawGameProject {
  id: string;
  name: string;
  description?: string;
  genre: string;
  artStyle: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  version: string;
  project: {
    engine: {
      version: string;
      settings: {
        width: number;
        height: number;
        backgroundColor: string;
        gravity: { x: number; y: number };
      };
    };
    ai: {
      enabled: boolean;
      model: string;
      settings: {
        temperature: number;
        maxTokens: number;
      };
    };
    assets: {
      enabled: boolean;
      maxCount: number;
      autoGenerate: boolean;
    };
    openclaw: {
      version: string;
      features: string[];
      settings: {
        autoSave: boolean;
        autoBackup: boolean;
      };
    };
  };
  settings: {
    width: number;
    height: number;
    backgroundColor: string;
    gravity: { x: number; y: number };
  };
}

export interface ProjectListItem {
  id: string;
  name: string;
  description?: string;
  genre: string;
  artStyle: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  assetCount: number;
  entityCount: number;
}

export interface ProjectDetail extends ProjectListItem {
  version: string;
  settings: ClawGameProject['settings'];
  scenes?: string[];
  assets: AssetMetadata[] | ClawGameProject['assets'];
  entities?: SceneEntity[];
  engine?: ClawGameProject['engine'];
  ai?: ClawGameProject['ai'];
  openclaw?: ClawGameProject['openclaw'];
  sceneCount: number;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  genre: string;
  artStyle: string;
  settings?: Partial<ClawGameProject['settings']>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  genre?: string;
  artStyle?: string;
  status?: 'draft' | 'active' | 'completed';
  settings?: Partial<ClawGameProject['settings']>;
}

export function createDefaultProject(input: string | CreateProjectRequest): ClawGameProject {
  const request: CreateProjectRequest = typeof input === 'string'
    ? { name: input, description: '', genre: 'action', artStyle: 'pixel' }
    : input;
  const now = new Date().toISOString();
  const settings = {
    width: request.settings?.width ?? 800,
    height: request.settings?.height ?? 600,
    backgroundColor: request.settings?.backgroundColor ?? '#1a1a2e',
    gravity: request.settings?.gravity ?? { x: 0, y: 0.5 },
  };

  return {
    version: '0.1.0',
    project: {
      id: generateProjectId(),
      name: request.name,
      displayName: request.name,
      description: request.description || '',
      genre: request.genre,
      artStyle: request.artStyle,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    },
    engine: {
      version: '1.0.0',
      runtimeTarget: 'web',
      renderBackend: 'canvas',
      settings,
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
    settings,
  };
}

// Asset Types - M11 Generative Media Forge
export enum AssetType {
  // Game characters and entities
  CHARACTER = 'character',
  ENEMY = 'enemy',
  NPC = 'npc',
  
  // Game elements
  SPRITE = 'sprite',
  ICON = 'icon',
  PROP = 'prop',
  CHEST = 'chest',
  TILESET = 'tileset',
  
  // Visual elements
  BACKGROUND = 'background',
  TEXTURE = 'texture',
  EFFECT = 'effect',
  UI = 'ui',
  
  // Media
  AUDIO = 'audio',
  VIDEO = 'video',
  
  // Combined types for convenience
  GAME_ENTITY = 'game-entity', // character | enemy | npc
  VISUAL_ASSET = 'visual-asset', // sprite | icon | prop | chest | background | texture | effect | ui
}

// Asset roles for generation workflow
export enum AssetRole {
  CHARACTER = 'character',
  ENEMY = 'enemy',
  NPC = 'npc',
  PROP = 'prop',
  CHEST = 'chest',
  BACKGROUND = 'background',
  TILESET = 'tileset',
  ICON = 'icon',
  UI_ELEMENT = 'ui-element',
  EFFECT = 'effect',
}

// Quality levels for AI generation
export enum GenerationQuality {
  DRAFT = 'draft',
  STANDARD = 'standard', 
  HIGH = 'high',
  ULTRA = 'ultra',
}

// Output formats for generation
export enum GenerationFormat {
  SVG = 'svg',
  PNG = 'png',
  WEBP = 'webp',
  JPG = 'jpg',
}

// AI models for generation
export enum GenerationModel {
  ZAI = 'zai',
  OPENAI = 'openai',
  LOCAL = 'local',
}

// Aspect ratios for generation
export enum GenerationAspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '2:3',
  LANDSCAPE = '3:2',
  WIDE = '16:9',
  CINEMATIC = '21:9',
}

export function roleToType(role: AssetRole): AssetType {
  switch (role) {
    case AssetRole.CHARACTER: return AssetType.CHARACTER;
    case AssetRole.ENEMY: return AssetType.ENEMY;
    case AssetRole.NPC: return AssetType.NPC;
    case AssetRole.PROP: return AssetType.PROP;
    case AssetRole.CHEST: return AssetType.CHEST;
    case AssetRole.BACKGROUND: return AssetType.BACKGROUND;
    case AssetRole.TILESET: return AssetType.TILESET;
    case AssetRole.ICON: return AssetType.ICON;
    case AssetRole.UI_ELEMENT: return AssetType.UI;
    case AssetRole.EFFECT: return AssetType.EFFECT;
  }
}

// AI generation types
export interface AIImageGenerationRequest {
  projectId?: string;
  type: AssetType;
  prompt: string;
  style?: string;
  width?: number;
  height?: number;
  format?: GenerationFormat;
  backgroundColor?: string;
  model?: GenerationModel;
  quality?: GenerationQuality;
  aspectRatio?: GenerationAspectRatio;
}

export interface GenerationResult {
  content: string;
  metadata: {
    generationId: string;
    type: AssetType;
    prompt: string;
    style: string;
    width: number;
    height: number;
    format: string;
    generationTime: number;
    model: string;
    confidence: number;
    quality?: string;
  };
}

// Generate type mapping for sprite generation
export const SPRITE_TYPES: Record<AssetType, string> = {
  [AssetType.CHARACTER]: 'character sprite',
  [AssetType.ENEMY]: 'enemy sprite', 
  [AssetType.NPC]: 'npc sprite',
  [AssetType.SPRITE]: 'game sprite',
  [AssetType.ICON]: 'icon',
  [AssetType.PROP]: 'prop sprite',
  [AssetType.CHEST]: 'chest sprite',
  [AssetType.TILESET]: 'tileset',
  [AssetType.BACKGROUND]: 'background sprite',
  [AssetType.TEXTURE]: 'texture sprite',
  [AssetType.EFFECT]: 'effect sprite',
  [AssetType.UI]: 'ui sprite',
  [AssetType.AUDIO]: 'audio asset',
  [AssetType.VIDEO]: 'video asset',
  [AssetType.GAME_ENTITY]: 'game entity sprite',
  [AssetType.VISUAL_ASSET]: 'visual asset sprite',
};

// Legacy support - maintaining backward compatibility
type LegacyAssetType = 'sprite' | 'tileset' | 'texture' | 'icon' | 'audio' | 'background';

export interface AssetMetadata {
  id: string;
  projectId: string;
  name: string;
  type: AssetType | LegacyAssetType; // Support both new and legacy types
  prompt?: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  status: 'generated' | 'uploaded' | 'error';
  generationData?: {
    model: string;
    confidence: number;
    parameters?: Record<string, unknown>;
  };
  aiGeneration?: {
    model: string;
    style: string;
    prompt: string;
    duration: number;
    quality?: string;
  };
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
}

export interface Animation {
  currentFrame: number;
  totalFrames: number;
  frameDuration: number; // milliseconds per frame
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

// Utility functions for game development
export function distance(a: Vector2, b: Vector2): number {
  return Math.sqrt(Math.pow(b.x - a.x, 2) + Math.pow(b.y - a.y, 2));
}

export function normalize(vector: Vector2): Vector2 {
  const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: vector.x / length, y: vector.y / length };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

export function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max));
}

export function angleBetween(a: Vector2, b: Vector2): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

export function rotate(vector: Vector2, angle: number): Vector2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  };
}

// Game templates and presets
export const GAME_TEMPLATES = {
  PLATFORMER: {
    name: 'Platformer',
    description: 'Classic side-scrolling platform game',
    entities: [
      { type: 'player', components: ['transform', 'sprite', 'movement', 'collision', 'stats'] },
      { type: 'enemy', components: ['transform', 'sprite', 'movement', 'collision', 'stats', 'ai'] },
      { type: 'platform', components: ['transform', 'collision'] },
    ],
  },
  RPG: {
    name: 'RPG',
    description: 'Role-playing game with turn-based combat',
    entities: [
      { type: 'hero', components: ['transform', 'sprite', 'collision', 'stats', 'input'] },
      { type: 'enemy', components: ['transform', 'sprite', 'collision', 'stats', 'ai'] },
      { type: 'npc', components: ['transform', 'sprite', 'dialogue'] },
    ],
  },
  SHOOTER: {
    name: 'Shooter',
    description: 'Top-down shooter game',
    entities: [
      { type: 'player', components: ['transform', 'sprite', 'movement', 'collision', 'weapon'] },
      { type: 'enemy', components: ['transform', 'sprite', 'movement', 'collision', 'stats', 'ai', 'weapon'] },
      { type: 'projectile', components: ['transform', 'projectile'] },
    ],
  },
};

// Asset management utilities
export const ASSET_UTILS = {
  // Calculate sprite frames from sprite sheet
  calculateFrames: (sheetWidth: number, sheetHeight: number, frameWidth: number, frameHeight: number) => {
    const framesX = Math.floor(sheetWidth / frameWidth);
    const framesY = Math.floor(sheetHeight / frameHeight);
    const totalFrames = framesX * framesY;
    
    return Array.from({ length: totalFrames }, (_, index) => ({
      x: (index % framesX) * frameWidth,
      y: Math.floor(index / framesX) * frameHeight,
      width: frameWidth,
      height: frameHeight,
      index,
    }));
  },

  // Generate collision bounds from sprite dimensions
  generateCollisionBounds: (width: number, height: number, scale = 1) => {
    return {
      width: width * scale,
      height: height * scale,
      offsetX: 0,
      offsetY: 0,
    };
  },

  // Format file size for display
  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Validate asset dimensions
  validateDimensions: (width: number, height: number): { valid: boolean; error?: string } => {
    if (width <= 0 || height <= 0) {
      return { valid: false, error: 'Dimensions must be positive' };
    }
    if (width > 4096 || height > 4096) {
      return { valid: false, error: 'Dimensions cannot exceed 4096 pixels' };
    }
    return { valid: true };
  },

  // Convert between different image formats
  convertFormat: (currentFormat: string, targetFormat: string): string => {
    const formatMap: Record<string, string> = {
      'image/svg+xml': 'svg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/jpeg': 'jpg',
    };
    return formatMap[targetFormat] || targetFormat;
  },
};

// Debug and development utilities (without console references)
export const DEBUG_UTILS = {
  // Log performance metrics (safe for non-DOM environments)
  measurePerformance: (name: string, fn: () => void) => {
    const start = Date.now();
    fn();
    const end = Date.now();
    // Note: In production builds, this should be replaced with proper logging
    // In shared package, we'll just track performance without logging
    return { name, duration: end - start };
  },

  // Deep clone objects
  deepClone: <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  },

  // Generate unique IDs in bulk
  generateBulkIds: (count: number, prefix = ''): string[] => {
    return Array.from({ length: count }, (_, i) => `${prefix}${nanoid(8)}`);
  },

  // Validate game object structure
  validateGameObject: (obj: any, required: string[]): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    for (const field of required) {
      if (!(field in obj)) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    return { valid: errors.length === 0, errors };
  },
};

// Legacy compatibility
export const LEGACY_TYPES = {
  // Map old asset types to new AssetType enum
  ASSET_TYPE_MAP: {
    'character': AssetType.CHARACTER,
    'enemy': AssetType.ENEMY,
    'npc': AssetType.NPC,
    'sprite': AssetType.SPRITE,
    'icon': AssetType.ICON,
    'prop': AssetType.PROP,
    'chest': AssetType.CHEST,
    'tileset': AssetType.TILESET,
    'background': AssetType.BACKGROUND,
    'texture': AssetType.TEXTURE,
    'effect': AssetType.EFFECT,
    'ui': AssetType.UI,
  } as Record<string, AssetType>,

  // Map old generation formats to new GenerationFormat enum
  FORMAT_MAP: {
    'svg': GenerationFormat.SVG,
    'png': GenerationFormat.PNG,
    'webp': GenerationFormat.WEBP,
    'jpg': GenerationFormat.JPG,
  } as Record<string, GenerationFormat>,
};

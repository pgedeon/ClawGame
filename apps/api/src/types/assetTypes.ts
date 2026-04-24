/**
 * Unified Asset Types - M11 Generative Media Forge
 * Consolidated asset type definitions across the codebase
 */

// Asset types for different asset categories
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

// Art styles for generation
export enum ArtStyle {
  PIXEL_ART = 'pixel-art',
  HAND_DRAWN = 'hand-drawn',
  THREE_D_REALISTIC = '3d-realistic',
  CARTOON = 'cartoon',
  FANTASY = 'fantasy',
  SCI_FI = 'sci-fi',
  RETRO = 'retro',
  MODERN = 'modern',
}

// Quality levels for generation
export enum GenerationQuality {
  DRAFT = 'draft',
  STANDARD = 'standard',
  HIGH = 'high',
  ULTRA = 'ultra',
}

// Format options for generation
export enum GenerationFormat {
  SVG = 'svg',
  PNG = 'png',
  JPG = 'jpg',
  WEBP = 'webp',
  GIF = 'gif',
}

// Size options for generation
export enum GenerationSize {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  CUSTOM = 'custom',
}

// Animation types for sprite generation
export enum AnimationType {
  IDLE = 'idle',
  WALK = 'walk',
  RUN = 'run',
  JUMP = 'jump',
  ATTACK = 'attack',
  CAST = 'cast',
  HURT = 'hurt',
  DIE = 'die',
  CUSTOM = 'custom',
}

// Aspect ratios for generation
export enum AspectRatio {
  SQUARE = 'square',
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
  WIDE_LANDSCAPE = 'wide-landscape',
  TALL_PORTRAIT = 'tall-portrait',
  CINEMATIC = 'cinematic',
}

// Generation aspect ratios (different naming convention)
export enum GenerationAspectRatio {
  SQUARE = 'square',
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape',
  WIDE = 'wide',
  CINEMATIC = 'cinematic',
}

// Asset models for generation
export enum GenerationModel {
  ZAI = 'zai',
  OPENAI = 'openai',
  STABILITY = 'stability',
  CLAUDE = 'claude',
  GPT = 'gpt',
  LOCAL = 'local',
  ENHANCED_LOCAL = 'enhanced-local',
}

// Asset generation request
export interface GenerationRequest {
  type: AssetType;
  prompt: string;
  style?: ArtStyle;
  quality: GenerationQuality;
  format: GenerationFormat;
  size: GenerationSize;
  width?: number;
  height?: number;
  aspectRatio?: AspectRatio;
  backgroundColor?: string;
  animationType?: AnimationType;
  frameCount?: number;
  delay?: number;
  loop?: boolean;
  model?: GenerationModel;
  examples?: string[];
}

// Asset generation result
export interface GenerationResult {
  content: string;
  metadata: GenerationMetadata;
}

// Generation metadata
export interface GenerationMetadata {
  generationId: string;
  type: AssetType;
  prompt: string;
  style?: ArtStyle;
  quality: GenerationQuality;
  format: GenerationFormat;
  width: number;
  height: number;
  aspectRatio?: AspectRatio;
  backgroundColor?: string;
  animationType?: AnimationType;
  frameCount?: number;
  delay?: number;
  loop?: boolean;
  model: GenerationModel;
  confidence: number;
  generationTime: number;
  timestamp: string;
}

// Generation job
export interface GenerationJob {
  id: string;
  projectId: string;
  name: string;
  type: 'single' | 'sprite-sheet' | 'asset-pack';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  request: GenerationRequest;
  result?: GenerationResult[];
  progress: number;
  createdAt: string;
  updatedAt: string;
  estimatedTime?: number;
  actualTime?: number;
  errors?: string[];
}

// Asset pack definition
export interface AssetPack {
  id: string;
  projectId: string;
  name: string;
  description: string;
  type: 'game-concept' | 'character-set' | 'enemy-pack' | 'environment' | 'ui-pack';
  assets: AssetDefinition[];
  createdAt: string;
  updatedAt: string;
}

// Asset definition
export interface AssetDefinition {
  id: string;
  name: string;
  type: AssetType;
  prompt: string;
  style: ArtStyle;
  quality: GenerationQuality;
  format: GenerationFormat;
  size: GenerationSize;
  width?: number;
  height?: number;
  animationType?: AnimationType;
  frameCount?: number;
}

// Sprite sheet definition
export interface SpriteSheetDefinition {
  id: string;
  projectId: string;
  name: string;
  type: AssetType;
  style: ArtStyle;
  quality: GenerationQuality;
  animationType: AnimationType;
  frameCount: number;
  frameDelay: number;
  loop: boolean;
  width: number;
  height: number;
  frames: SpriteFrame[];
  createdAt: string;
  updatedAt: string;
}

// Sprite frame
export interface SpriteFrame {
  index: number;
  content: string;
  metadata: GenerationMetadata;
}

// Generation configuration
export interface GenerationConfig {
  model: GenerationModel;
  quality: GenerationQuality;
  format: GenerationFormat;
  maxRetries: number;
  timeout: number;
  batchSize: number;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

// Generation statistics
export interface GenerationStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  processing: number;
  averageTime: number;
  successRate: number;
  byType: Record<AssetType, number>;
  byQuality: Record<GenerationQuality, number>;
  byStyle: Record<ArtStyle, number>;
}

// Role to type mapping
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

// Convert aspect ratio between enums
export function aspectRatioToGeneration(aspectRatio: AspectRatio): GenerationAspectRatio {
  switch (aspectRatio) {
    case AspectRatio.SQUARE: return GenerationAspectRatio.SQUARE;
    case AspectRatio.PORTRAIT: return GenerationAspectRatio.PORTRAIT;
    case AspectRatio.LANDSCAPE: return GenerationAspectRatio.LANDSCAPE;
    case AspectRatio.WIDE_LANDSCAPE: return GenerationAspectRatio.WIDE;
    case AspectRatio.TALL_PORTRAIT: return GenerationAspectRatio.CINEMATIC;
    case AspectRatio.CINEMATIC: return GenerationAspectRatio.CINEMATIC;
    default: return GenerationAspectRatio.SQUARE;
  }
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

// Asset pack templates
export const ASSET_PACK_TEMPLATES: Record<string, AssetDefinition[]> = {
  'warrior-set': [
    {
      id: 'warrior-sprite',
      name: 'Warrior Sprite',
      type: AssetType.CHARACTER,
      prompt: 'warrior character with sword and shield',
      style: ArtStyle.PIXEL_ART,
      quality: GenerationQuality.HIGH,
      format: GenerationFormat.PNG,
      size: GenerationSize.SMALL,
      width: 64,
      height: 64
    },
    {
      id: 'warrior-weapon',
      name: 'Warrior Weapon',
      type: AssetType.PROP,
      prompt: 'sword and shield for warrior',
      style: ArtStyle.PIXEL_ART,
      quality: GenerationQuality.HIGH,
      format: GenerationFormat.PNG,
      size: GenerationSize.SMALL,
      width: 32,
      height: 32
    }
  ],
  'enemy-pack': [
    {
      id: 'goblin-enemy',
      name: 'Goblin Enemy',
      type: AssetType.ENEMY,
      prompt: 'goblin enemy with spear',
      style: ArtStyle.PIXEL_ART,
      quality: GenerationQuality.HIGH,
      format: GenerationFormat.PNG,
      size: GenerationSize.SMALL,
      width: 64,
      height: 64
    },
    {
      id: 'goblin-weapon',
      name: 'Goblin Weapon',
      type: AssetType.PROP,
      prompt: 'spear for goblin',
      style: ArtStyle.PIXEL_ART,
      quality: GenerationQuality.HIGH,
      format: GenerationFormat.PNG,
      size: GenerationSize.SMALL,
      width: 32,
      height: 32
    }
  ]
};

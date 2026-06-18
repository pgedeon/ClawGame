/**
 * @clawgame/shared - Asset types, enums, and utilities
 */

import type { Vector2 } from './components';

// Asset Types - M11 Generative Media Forge
export enum AssetType {
  CHARACTER = 'character',
  ENEMY = 'enemy',
  NPC = 'npc',
  SPRITE = 'sprite',
  ICON = 'icon',
  PROP = 'prop',
  CHEST = 'chest',
  TILESET = 'tileset',
  BACKGROUND = 'background',
  TEXTURE = 'texture',
  EFFECT = 'effect',
  UI = 'ui',
  AUDIO = 'audio',
  VIDEO = 'video',
  GAME_ENTITY = 'game-entity',
  VISUAL_ASSET = 'visual-asset',
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

// Legacy support
type LegacyAssetType = 'sprite' | 'tileset' | 'texture' | 'icon' | 'audio' | 'background';

export interface AssetMetadata {
  id: string;
  projectId: string;
  name: string;
  type: AssetType | LegacyAssetType;
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
    quality?: string;
  };
  aiGeneration?: {
    model: string;
    style: string;
    prompt: string;
    duration: number;
    quality?: string;
  };
}

// Asset management utilities
export const ASSET_UTILS = {
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

  generateCollisionBounds: (width: number, height: number, scale = 1) => {
    return {
      width: width * scale,
      height: height * scale,
      offsetX: 0,
      offsetY: 0,
    };
  },

  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  validateDimensions: (width: number, height: number): { valid: boolean; error?: string } => {
    if (width <= 0 || height <= 0) {
      return { valid: false, error: 'Dimensions must be positive' };
    }
    if (width > 4096 || height > 4096) {
      return { valid: false, error: 'Dimensions cannot exceed 4096 pixels' };
    }
    return { valid: true };
  },

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

// Legacy compatibility maps
export const LEGACY_TYPES = {
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

  FORMAT_MAP: {
    'svg': GenerationFormat.SVG,
    'png': GenerationFormat.PNG,
    'webp': GenerationFormat.WEBP,
    'jpg': GenerationFormat.JPG,
  } as Record<string, GenerationFormat>,
};

/**
 * API-specific type definitions
 */

import type { AssetMetadata } from '@clawgame/shared';
import { AssetType, GenerationQuality, GenerationFormat, GenerationModel, GenerationAspectRatio, AssetRole, AnimationType } from './assetTypes';

// AI generation types
export interface AIImageGenerationRequest {
  projectId?: string; // Added for asset service compatibility
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

export interface GenerationStatus {
  generationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  assetId?: string;
  error?: string;
}

export interface ImageStylePreset {
  id: string;
  name: string;
  description: string;
  style: string;
  examples?: string[];
  role: AssetRole;
}

export interface GenerateFromPresetRequest {
  projectId: string;
  presetId: string;
  description: string;
  artStyle?: 'pixel' | 'vector' | 'hand-drawn' | 'cartoon' | 'realistic';
  width?: number;
  height?: number;
  count?: number;
}

export interface PresetGenerationResult {
  preset: ImageStylePreset;
  assets: Array<{
    id: string;
    content: string;
    format: string;
    width: number;
    height: number;
    generationTime: number;
  }>;
}

// Legacy types for backward compatibility
export interface LegacyGenerationResult {
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
}

export interface LegacyAIImageGenerationService {
  generateAsset(request: AIImageGenerationRequest): Promise<GenerationResult>;
}

// Re-export shared types
export type { AssetMetadata } from '@clawgame/shared';
export { AssetType, GenerationQuality, GenerationFormat, GenerationModel, GenerationAspectRatio, AssetRole, AnimationType } from './assetTypes';

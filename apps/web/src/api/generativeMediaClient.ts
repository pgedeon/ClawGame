/**
 * Real Generative Media API Client
 * M11: AI-powered media generation connecting to the backend API
 */

import type { 
  AssetType, 
  GenerationResult, 
  GenerationQuality,
  GenerationFormat,
  GenerationAspectRatio 
} from './types';

export interface GenerationRequest {
  projectId: string;
  type: AssetType;
  prompt: string;
  style?: string;
  width?: number;
  height?: number;
  format?: GenerationFormat;
  quality?: GenerationQuality;
  aspectRatio?: GenerationAspectRatio;
  backgroundColor?: string;
  count?: number;
}

export interface SpriteSheetRequest {
  projectId: string;
  type: AssetType;
  prompt: string;
  style: string;
  width: number;
  height: number;
  frames: number;
  animationType: 'idle' | 'walk' | 'run' | 'attack' | 'hurt' | 'death';
}

export interface AssetPackRequest {
  projectId: string;
  gameConcept: string;
  genre: string;
  artStyle: string;
  includeCharacters: boolean;
  includeEnemies: boolean;
  includeProps: boolean;
  includeBackgrounds: boolean;
  countPerType: number;
}

export interface GenerationStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  request: GenerationRequest;
  result?: GenerationResult;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaTypeInfo {
  types: Array<{
    value: AssetType;
    label: string;
    description: string;
  }>;
  descriptions: Record<AssetType, string>;
}

export interface StylePreset {
  value: string;
  label: string;
  category: string;
}

export interface AnimationType {
  value: string;
  label: string;
  description: string;
}

class GenerativeMediaAPI {
  private baseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

  // ── Single Asset Generation ──

  async generateAsset(request: GenerationRequest): Promise<{
    success: boolean;
    data?: GenerationResult;
    generationId?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/generative-media/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Generation failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Asset generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Generation failed'
      };
    }
  }

  // ── Sprite Sheet Generation ──

  async generateSpriteSheet(request: SpriteSheetRequest): Promise<{
    success: boolean;
    data?: GenerationResult[];
    frameCount?: number;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/generative-media/sprite-sheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Sprite sheet generation failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Sprite sheet generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sprite sheet generation failed'
      };
    }
  }

  // ── Asset Pack Generation ──

  async generateAssetPack(request: AssetPackRequest): Promise<{
    success: boolean;
    data?: GenerationResult[];
    totalAssets?: number;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/generative-media/asset-pack`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Asset pack generation failed');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Asset pack generation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Asset pack generation failed'
      };
    }
  }

  // ── Job Status Management ──

  async getJobStatus(jobId: string): Promise<{
    success: boolean;
    data?: GenerationStatus;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/generative-media/jobs/${jobId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Job not found');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to get job status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get job status'
      };
    }
  }

  async getProjectJobs(projectId: string, limit = 20): Promise<{
    success: boolean;
    data?: GenerationStatus[];
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/generative-media/projects/${projectId}/jobs?limit=${limit}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get project jobs');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to get project jobs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get project jobs'
      };
    }
  }

  async getGenerationHistory(projectId: string, limit = 20): Promise<{
    success: boolean;
    data?: GenerationResult[];
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/generative-media/projects/${projectId}/history?limit=${limit}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get generation history');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to get generation history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get generation history'
      };
    }
  }

  // ── Media Type Information ──

  async getMediaTypes(): Promise<{
    success: boolean;
    data?: MediaTypeInfo;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/generative-media/types`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get media types');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to get media types:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get media types'
      };
    }
  }

  async getStylePresets(): Promise<{
    success: boolean;
    data?: { presets: StylePreset[] };
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/generative-media/styles`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get style presets');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to get style presets:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get style presets'
      };
    }
  }

  async getAnimationTypes(): Promise<{
    success: boolean;
    data?: { animations: AnimationType[] };
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/generative-media/animations`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get animation types');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to get animation types:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get animation types'
      };
    }
  }
}

// Export singleton instance
export const generativeMediaAPI = new GenerativeMediaAPI();

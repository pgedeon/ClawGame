/**
 * Generative Media Service
 * M11: AI-powered media generation for game assets
 * Connects to Z.ai API for real image, audio, and media generation
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import fetch from 'node-fetch';

import type { GenerationResult } from '../types/index';

// Real types for runtime use
import { 
  AssetType as AssetTypeEnum,
  GenerationQuality as GenerationQualityEnum,
  GenerationFormat as GenerationFormatEnum,
  GenerationAspectRatio as GenerationAspectRatioEnum,
  AssetRole as AssetRoleEnum 
} from '../types/index';

// Environment configuration
const AI_API_URL = process.env.AI_API_URL || 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || 'glm-4.5-flash';

interface GenerationRequest {
  id: string;
  projectId: string;
  type: AssetTypeEnum;
  prompt: string;
  style: string;
  width?: number;
  height?: number;
  format?: GenerationFormatEnum;
  quality?: GenerationQualityEnum;
  aspectRatio?: GenerationAspectRatioEnum;
  count?: number;
  backgroundColor?: string;
  model?: string;
}

interface GenerationJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  request: GenerationRequest;
  result?: GenerationResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

type AnimationTypeValue = 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'cast' | 'hurt' | 'die' | 'death' | 'custom';

// Style presets mapping
const STYLE_PRESETS = {
  'pixel-art': {
    prompt: 'pixel art style, 8-bit retro, game sprite',
    quality: 'high' as const,
  },
  'hand-drawn': {
    prompt: 'hand-drawn sketch style, artistic, illustrated',
    quality: 'standard' as const,
  },
  '3d-realistic': {
    prompt: '3D render, realistic, detailed, volumetric lighting',
    quality: 'ultra' as const,
  },
  'cartoon': {
    prompt: 'cartoon style, animated, colorful, friendly',
    quality: 'high' as const,
  },
  'fantasy': {
    prompt: 'fantasy art, magical, detailed, epic',
    quality: 'high' as const,
  },
  'sci-fi': {
    prompt: 'sci-fi concept art, futuristic, technological, detailed',
    quality: 'high' as const,
  },
  'retro': {
    prompt: 'retro 8-bit pixel art, vintage gaming aesthetic',
    quality: 'standard' as const,
  },
  'modern': {
    prompt: 'modern minimalist design, clean, professional',
    quality: 'standard' as const,
  },
};

// Media type specific prompts
const MEDIA_TYPE_PROMPTS: Record<AssetTypeEnum, string> = {
  [AssetTypeEnum.CHARACTER]: 'game character, sprite sheet, player character, detailed design',
  [AssetTypeEnum.ENEMY]: 'game enemy, villain, monster, boss character, hostile',
  [AssetTypeEnum.NPC]: 'non-player character, friendly, villager, merchant, ally',
  [AssetTypeEnum.SPRITE]: 'game sprite, animated character, game asset',
  [AssetTypeEnum.ICON]: 'icon, button symbol, interface element, small graphic',
  [AssetTypeEnum.PROP]: 'game prop, object, item, interactive element',
  [AssetTypeEnum.CHEST]: 'treasure chest, loot container, wooden chest',
  [AssetTypeEnum.TILESET]: 'tileset, game tiles, modular, grid-based',
  [AssetTypeEnum.BACKGROUND]: 'game background, scene environment, landscape, setting',
  [AssetTypeEnum.TEXTURE]: 'texture pattern, surface material, detailed texture',
  [AssetTypeEnum.EFFECT]: 'game effect, particle, spell, explosion, visual effect',
  [AssetTypeEnum.UI]: 'user interface, menu, HUD, game interface, overlay',
  [AssetTypeEnum.AUDIO]: 'sound effect, audio waveform, music note',
  [AssetTypeEnum.VIDEO]: 'animation frame, sprite sequence, moving image',
  [AssetTypeEnum.GAME_ENTITY]: 'game entity, character, creature, being',
  [AssetTypeEnum.VISUAL_ASSET]: 'visual game asset, graphic element, game art',
};

export class GenerativeMediaService {
  private jobs: Map<string, GenerationJob> = new Map();
  private isProcessing = false;

  /**
   * Generate AI-powered media assets
   */
  async generateMedia(request: GenerationRequest): Promise<GenerationResult> {
    const jobId = randomUUID();
    const job: GenerationJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      request,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.jobs.set(jobId, job);

    try {
      // Update job status
      job.status = 'processing';
      job.progress = 10;
      job.updatedAt = new Date();
      this.jobs.set(jobId, job);

      // Get style preset
      const stylePreset = STYLE_PRESETS[request.style as keyof typeof STYLE_PRESETS] || STYLE_PRESETS['pixel-art'];
      
      // Build the generation prompt
      const mediaPrompt = MEDIA_TYPE_PROMPTS[request.type] || 'game asset';
      const fullPrompt = `${request.prompt}, ${mediaPrompt}, ${stylePreset.prompt}`;
      
      // Format for Z.ai API
      const apiRequest = {
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an expert game asset designer. Generate ${request.type} assets with the specified requirements. Return only the base64 encoded image data without any markdown formatting or additional text.`,
          },
          {
            role: 'user',
            content: `Generate a ${request.type} with the following description: "${fullPrompt}". 
                     Size: ${request.width || 64}x${request.height || 64} pixels
                     Style: ${request.style}
                     Quality: ${request.quality || 'standard'}
                     Format: ${request.format || 'png'}
                     Background: ${request.backgroundColor || 'transparent'}
                     
                     Return only the base64 encoded ${request.format || 'png'} image data, no other text.`,
          },
        ],
        max_tokens: 400,
        temperature: 0.7,
      };

      job.progress = 30;
      job.updatedAt = new Date();
      this.jobs.set(jobId, job);

      // Call Z.ai API
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiRequest),
      });

      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from AI API');
      }

      job.progress = 80;
      job.updatedAt = new Date();
      this.jobs.set(jobId, job);

      // Save the generated asset
      const assetPath = await this.saveGeneratedAsset(
        content,
        request.type,
        request.format || 'png',
        request.projectId
      );

      // Create result
      const result: GenerationResult = {
        content: assetPath,
        metadata: {
          generationId: jobId,
          type: request.type,
          prompt: request.prompt,
          style: request.style,
          width: request.width || 64,
          height: request.height || 64,
          format: request.format || 'png',
          generationTime: Date.now() - job.createdAt.getTime(),
          model: AI_MODEL,
          confidence: 0.9,
          quality: request.quality || 'standard',
        },
      };

      // Complete job
      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.updatedAt = new Date();
      this.jobs.set(jobId, job);

      return result;

    } catch (error) {
      // Mark job as failed
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.updatedAt = new Date();
      this.jobs.set(jobId, job);

      throw error;
    }
  }

  /**
   * Generate sprite sheet with animation frames
   */
  async generateSpriteSheet(request: {
    projectId: string;
    type: AssetTypeEnum;
    prompt: string;
    style?: string;
    width?: number;
    height?: number;
    frames?: number;
    frameCount?: number;
    frameDelay?: number;
    loop?: boolean;
    quality?: GenerationQualityEnum;
    format?: GenerationFormatEnum;
    animationType: AnimationTypeValue;
  }): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];
    const frameTotal = request.frames ?? request.frameCount ?? 4;

    for (let i = 0; i < frameTotal; i++) {
      const framePrompt = `${request.prompt} ${request.animationType} frame ${i + 1}`;
      
      const frameRequest: GenerationRequest = {
        id: randomUUID(),
        projectId: request.projectId,
        type: request.type,
        prompt: framePrompt,
        style: request.style || 'pixel-art',
        width: request.width || 64,
        height: request.height || 64,
        format: GenerationFormatEnum.PNG,
        quality: GenerationQualityEnum.HIGH,
      };

      try {
        const result = await this.generateMedia(frameRequest);
        results.push(result);
      } catch (error) {
        console.error(`Failed to generate frame ${i}:`, error);
        // Continue with other frames even if one fails
      }
    }

    return results;
  }

  /**
   * Generate complete asset pack
   */
  async generateAssetPack(request: {
    projectId: string;
    gameConcept?: string;
    genre?: string;
    artStyle?: string;
    includeCharacters?: boolean;
    includeEnemies?: boolean;
    includeProps?: boolean;
    includeBackgrounds?: boolean;
    countPerType?: number;
  }): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];
    const assetTypes: AssetTypeEnum[] = [];

    if (request.includeCharacters !== false) assetTypes.push(AssetTypeEnum.CHARACTER);
    if (request.includeEnemies !== false) assetTypes.push(AssetTypeEnum.ENEMY);
    if (request.includeProps !== false) assetTypes.push(AssetTypeEnum.PROP);
    if (request.includeBackgrounds !== false) assetTypes.push(AssetTypeEnum.BACKGROUND);

    for (const assetType of assetTypes) {
      for (let i = 0; i < (request.countPerType || 1); i++) {
        const typeSpecificPrompts = this.getTypeSpecificPrompts(assetType, request.genre || 'adventure');
        const prompt = `${request.gameConcept || 'game asset pack'}, ${typeSpecificPrompts[Math.floor(Math.random() * typeSpecificPrompts.length)]}`;

        const generationRequest: GenerationRequest = {
          id: randomUUID(),
          projectId: request.projectId,
          type: assetType,
          prompt,
          style: request.artStyle || 'pixel-art',
          width: 64,
          height: 64,
          format: GenerationFormatEnum.PNG,
          quality: GenerationQualityEnum.STANDARD,
        };

        try {
          const result = await this.generateMedia(generationRequest);
          results.push(result);
        } catch (error) {
          console.error(`Failed to generate ${assetType}:`, error);
          // Continue with other assets even if one fails
        }
      }
    }

    return results;
  }

  /**
   * Get generation job status
   */
  async getJobStatus(jobId: string): Promise<GenerationJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async getJob(jobId: string): Promise<GenerationJob | null> {
    return this.getJobStatus(jobId);
  }

  async generateAsset(request: Omit<GenerationRequest, 'id' | 'style'> & { style?: string }): Promise<GenerationResult> {
    return this.generateMedia({
      ...request,
      id: randomUUID(),
      style: request.style || 'pixel-art',
    });
  }

  /**
   * Get all generation jobs for a project
   */
  async getProjectJobs(projectId: string, status?: string, limit = 50, offset = 0): Promise<GenerationJob[]> {
    return Array.from(this.jobs.values())
      .filter(job => job.request.projectId === projectId)
      .filter(job => !status || job.status === status)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(offset, offset + limit);
  }

  /**
   * Get generation history
   */
  async getGenerationHistory(projectId: string, type?: AssetTypeEnum, limit = 20, offset = 0): Promise<GenerationResult[]> {
    const jobs = await this.getProjectJobs(projectId, undefined, limit, offset);
    return jobs
      .filter(job => job.status === 'completed' && job.result)
      .filter(job => !type || job.request.type === type)
      .slice(0, limit)
      .map(job => job.result!);
  }

  /**
   * Save generated asset to file system
   */
  private async saveGeneratedAsset(
    base64Data: string,
    type: AssetTypeEnum,
    format: string,
    projectId: string
  ): Promise<string> {
    // Create directories if they don't exist
    const projectsDir = join(process.cwd(), 'data', 'projects', projectId);
    const assetsDir = join(projectsDir, 'assets');
    const typeDir = join(assetsDir, type);
    
    await mkdir(typeDir, { recursive: true });

    // Extract base64 data (remove data:image/png;base64, prefix if present)
    const base64Content = base64Data.includes(',') 
      ? base64Data.split(',')[1] 
      : base64Data;

    // Generate filename
    const timestamp = Date.now();
    const filename = `${type}-${timestamp}.${format}`;
    const filePath = join(typeDir, filename);

    // Write file
    await writeFile(filePath, base64Content, 'base64');

    return `/data/projects/${projectId}/assets/${type}/${filename}`;
  }

  /**
   * Get type-specific prompts for asset generation
   */
  private getTypeSpecificPrompts(type: AssetTypeEnum, genre: string): string[] {
    const prompts: Record<AssetTypeEnum, string[]> = {
      [AssetTypeEnum.CHARACTER]: [
        'hero protagonist, main character, player character',
        'supporting character, ally, companion',
        'quest giver, non-player helper',
        'merchant, vendor, shop keeper',
        'village elder, leader, authority figure'
      ],
      [AssetTypeEnum.ENEMY]: [
        'villain antagonist, main boss',
        'minor enemy, grunt soldier',
        'creature monster, beast enemy',
        'robot enemy, mechanical foe',
        'ghost enemy, spirit entity'
      ],
      [AssetTypeEnum.CHEST]: [
        'weapon, sword, axe, bow',
        'armor, helmet, shield, chestplate',
        'potion, health item, magic item',
        'key, quest item, important object',
        'furniture, table, chair, barrel'
      ],
      [AssetTypeEnum.BACKGROUND]: [
        'forest scene, trees, nature',
        'dungeon interior, cave, underground',
        'castle exterior, medieval building',
        'city street, urban environment',
        'desert landscape, sandy environment'
      ],
      [AssetTypeEnum.TILESET]: [
        'ground tiles, floor tiles, platform tiles',
        'wall tiles, barrier tiles',
        'decorative tiles, accent pieces',
        'edge tiles, corner tiles, transition tiles',
        'water tiles, lava tiles, special terrain tiles'
      ],
      [AssetTypeEnum.ICON]: [
        'menu button, interface button',
        'status icon, health bar icon',
        'inventory icon, item icon',
        'skill icon, ability icon',
        'map icon, compass icon'
      ],
      [AssetTypeEnum.PROP]: [
        'chest, treasure box, loot container',
        'door, gate, entrance',
        'switch, button, pressure plate',
        'torch, light source, fire',
        'crystal, gemstone, magical object'
      ],
      [AssetTypeEnum.SPRITE]: [
        'animated character, moving figure',
        'static object, item',
        'effect particle, magic effect',
        'environment detail, background element',
        'ui element, interface component'
      ],
      [AssetTypeEnum.EFFECT]: [
        'explosion effect, burst animation',
        'magic spell, magical effect',
        'particle system, sparkles',
        'transition effect, screen effect',
        'impact effect, collision animation'
      ],
      [AssetTypeEnum.UI]: [
        'health bar, status display',
        'menu panel, interface panel',
        'dialog box, text box',
        'progress bar, loading indicator',
        'score display, game stats'
      ],
      [AssetTypeEnum.NPC]: ['villager, quest giver, friendly character'],
      [AssetTypeEnum.TEXTURE]: ['stone texture', 'wood texture', 'metal texture'],
      [AssetTypeEnum.AUDIO]: ['sound effect', 'ambient loop', 'ui sound'],
      [AssetTypeEnum.VIDEO]: ['short animation', 'looping visual', 'cutscene frame'],
      [AssetTypeEnum.GAME_ENTITY]: ['playable entity', 'interactive character', 'game creature'],
      [AssetTypeEnum.VISUAL_ASSET]: ['visual prop', 'scene detail', 'decorative asset'],
    };

    return prompts[type] || ['game asset'];
  }

  getMediaTypes(): string[] {
    return Object.values(AssetTypeEnum);
  }

  getStylePresets(): Array<{ id: string; prompt: string; quality: string }> {
    return Object.entries(STYLE_PRESETS).map(([id, preset]) => ({ id, ...preset }));
  }

  getAnimationTypes(): AnimationTypeValue[] {
    return ['idle', 'walk', 'run', 'jump', 'attack', 'cast', 'hurt', 'die', 'custom'];
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed') return false;
    job.status = 'failed';
    job.error = 'Cancelled';
    job.updatedAt = new Date();
    this.jobs.set(jobId, job);
    return true;
  }

  async retryJob(jobId: string): Promise<GenerationResult> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error('Job not found');
    return this.generateMedia({ ...job.request, id: randomUUID() });
  }
}

// Export singleton instance
export const generativeMediaService = new GenerativeMediaService();

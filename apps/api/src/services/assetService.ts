/**
 * Asset Service (Enhanced)
 * Full asset management with AI-powered generation.
 */

import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { FastifyLoggerInstance } from 'fastify';
import { AIImageGenerationService, type AIImageGenerationRequest, type GenerationStatus } from './aiImageGenerationService';

const ASSETS_DIR = process.env.ASSETS_DIR || './data/assets';

async function ensureAssetsDir(projectId: string): Promise<string> {
  const projectAssetsDir = join(ASSETS_DIR, projectId);
  if (!existsSync(projectAssetsDir)) {
    await mkdir(projectAssetsDir, { recursive: true });
  }
  return projectAssetsDir;
}

export interface AssetMetadata {
  id: string;
  projectId: string;
  name: string;
  type: AssetType;
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
    generationId: string;
    style: string;
    prompt: string;
    duration: number;
  };
}

export type AssetType = 'sprite' | 'tileset' | 'texture' | 'icon' | 'audio' | 'background';

export class AssetService {
  private cache: Map<string, AssetMetadata> = new Map();
  private logger: FastifyLoggerInstance;
  private aiImageService: AIImageGenerationService;
  private ongoingGenerations: Map<string, GenerationStatus> = new Map();

  constructor(logger: FastifyLoggerInstance) {
    this.logger = logger;
    this.aiImageService = new AIImageGenerationService(logger);
    
    // Start a periodic cleanup of old generations
    setInterval(() => {
      this.aiImageService.cleanupOldGenerations();
    }, 300000); // Every 5 minutes
  }

  async listAssets(projectId: string): Promise<AssetMetadata[]> {
    const projectAssetsDir = join(ASSETS_DIR, projectId);
    
    if (!existsSync(projectAssetsDir)) {
      return [];
    }

    const files = await readdir(projectAssetsDir);
    const assets: AssetMetadata[] = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const assetId = file.replace('.json', '');
      const cached = this.cache.get(assetId);
      
      if (cached && cached.projectId === projectId) {
        assets.push(cached);
      } else {
        try {
          const metadataPath = join(projectAssetsDir, file);
          const content = await readFile(metadataPath, 'utf-8');
          const metadata: AssetMetadata = JSON.parse(content);
          assets.push(metadata);
          this.cache.set(assetId, metadata);
        } catch (err) {
          this.logger.error({ err }, `Failed to load metadata for ${assetId}`);
        }
      }
    }

    assets.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return assets;
  }

  async getAsset(projectId: string, assetId: string): Promise<AssetMetadata | null> {
    const cached = this.cache.get(assetId);
    if (cached && cached.projectId === projectId) {
      return cached;
    }

    const metadataPath = join(ASSETS_DIR, projectId, `${assetId}.json`);
    if (!existsSync(metadataPath)) {
      return null;
    }

    try {
      const content = await readFile(metadataPath, 'utf-8');
      const metadata: AssetMetadata = JSON.parse(content);
      this.cache.set(assetId, metadata);
      return metadata;
    } catch (err) {
      this.logger.error({ err }, `Failed to load asset ${assetId}`);
      return null;
    }
  }

  async getAssetFile(projectId: string, assetId: string): Promise<{ content: Buffer; mimeType: string }> {
    const metadata = await this.getAsset(projectId, assetId);
    if (!metadata) {
      throw new Error('Asset not found');
    }

    const extension = metadata.mimeType.includes('svg') ? 'svg' : 'png';
    const filePath = join(ASSETS_DIR, projectId, `${assetId}.${extension}`);
    
    if (!existsSync(filePath)) {
      throw new Error('Asset file not found');
    }

    const content = await readFile(filePath);
    return {
      content: Buffer.from(content),
      mimeType: metadata.mimeType,
    };
  }

  async deleteAsset(projectId: string, assetId: string): Promise<boolean> {
    const metadata = await this.getAsset(projectId, assetId);
    if (!metadata) {
      return false;
    }

    const projectAssetsDir = join(ASSETS_DIR, projectId);
    
    try {
      const extension = metadata.mimeType.includes('svg') ? 'svg' : 'png';
      await unlink(join(projectAssetsDir, `${assetId}.${extension}`));
      await unlink(join(projectAssetsDir, `${assetId}.json`));
      this.cache.delete(assetId);
      return true;
    } catch (err) {
      this.logger.error({ err }, `Failed to delete asset ${assetId}`);
      return false;
    }
  }

  async uploadAsset(
    projectId: string,
    name: string,
    type: AssetType,
    content: Buffer,
    mimeType: string
  ): Promise<AssetMetadata> {
    const assetId = Math.random().toString(36).substring(2, 11);
    const projectAssetsDir = await ensureAssetsDir(projectId);
    
    const extension = mimeType.includes('svg') ? 'svg' : 
                    mimeType.includes('png') ? 'png' : 
                    mimeType.includes('jpeg') ? 'jpg' : 'png';
    const filename = `${assetId}.${extension}`;
    const filePath = join(projectAssetsDir, filename);
    
    await writeFile(filePath, content);
    
    const metadata: AssetMetadata = {
      id: assetId,
      projectId,
      name,
      type,
      url: `/api/projects/${projectId}/assets/${assetId}`,
      size: content.length,
      mimeType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'uploaded',
    };
    
    const metadataPath = join(projectAssetsDir, `${assetId}.json`);
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    
    this.cache.set(assetId, metadata);
    
    return metadata;
  }

  /**
   * Generate asset using AI image generation service
   */
  async generateAsset(projectId: string, type: AssetType, prompt: string, options?: {
    style?: 'pixel' | 'vector' | 'hand-drawn' | 'cartoon' | 'realistic';
    width?: number;
    height?: number;
    format?: 'svg' | 'png' | 'webp';
    backgroundColor?: string;
  }): Promise<{ generationId: string; metadata: AssetMetadata }> {
    const requestId = options?.style || 'pixel';
    const width = options?.width || 64;
    const height = options?.height || 64;
    const format = options?.format || 'svg';
    const backgroundColor = options?.backgroundColor || '';

    // Create generation request
    const generationRequest: AIImageGenerationRequest = {
      type,
      prompt,
      style: requestId,
      width,
      height,
      format,
      backgroundColor,
    };

    // Start AI generation
    const generationStatus = await this.aiImageService.generateImage(projectId, generationRequest);
    const generationId = generationStatus.id;

    // Store generation reference for tracking
    this.ongoingGenerations.set(generationId, generationStatus);

    // If generation is immediate and successful, create the asset immediately
    if (generationStatus.status === 'completed' && generationStatus.result?.svg) {
      try {
        const metadata = await this.createAssetFromGeneration(projectId, type, prompt, generationStatus);
        return { generationId, metadata };
      } catch (error) {
        this.logger.error({ error, generationId }, 'Failed to create asset from generation');
        throw error;
      }
    }

    // Return generation ID for async tracking
    const metadata = this.createAssetMetadataFromGeneration(projectId, type, prompt, generationStatus);
    return { generationId, metadata };
  }

  /**
   * Get generation status by ID
   */
  async getGenerationStatus(projectId: string, generationId: string): Promise<GenerationStatus | null> {
    return this.aiImageService.getGenerationStatus(projectId, generationId);
  }

  /**
   * List all ongoing generations for a project
   */
  async getGenerations(projectId: string): Promise<GenerationStatus[]> {
    return this.aiImageService.getGenerations(projectId);
  }

  /**
   * Poll for completed generations and create assets
   */
  async pollAndCreateAssets(projectId: string): Promise<{ created: string[], errors: string[] }> {
    const created: string[] = [];
    const errors: string[] = [];

    const generations = await this.aiImageService.getGenerations(projectId);
    
    for (const generation of generations) {
      if (generation.status === 'completed' && generation.result?.svg && !this.ongoingGenerations.get(generation.id)) {
        try {
          const asset = await this.createAssetFromGeneration(projectId, generation.type, generation.prompt, generation);
          created.push(asset.id);
          this.ongoingGenerations.delete(generation.id);
        } catch (error: any) {
          errors.push(generation.id);
          this.logger.error({ error, generationId: generation.id }, 'Failed to create asset from completed generation');
        }
      } else if (generation.status === 'failed') {
        errors.push(generation.id);
      }
    }

    return { created, errors };
  }

  /**
   * Create asset metadata from generation result
   */
  private createAssetMetadataFromGeneration(
    projectId: string, 
    type: AssetType, 
    prompt: string, 
    generation: GenerationStatus
  ): AssetMetadata {
    return {
      id: `ai_${generation.id.substring(4)}`, // Strip 'gen_' prefix
      projectId,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} - ${prompt.substring(0, 20)}`,
      type,
      prompt,
      url: `/api/projects/${projectId}/assets/ai_${generation.id.substring(4)}`,
      size: generation.result?.svg?.length || 0,
      mimeType: 'image/svg+xml',
      createdAt: generation.createdAt,
      updatedAt: generation.updatedAt,
      tags: [type, 'ai-generated'],
      status: generation.result?.success ? 'generated' : 'error',
      generationData: {
        model: 'qwen/qwen3.6-plus:free',
        confidence: 0.85,
        parameters: {
          style: generation.type,
          width: 64,
          height: 64,
          format: 'svg',
        },
      },
      aiGeneration: {
        generationId: generation.id,
        style: generation.type,
        prompt,
        duration: generation.result?.generationTime || 0,
      },
    };
  }

  /**
   * Create actual asset files from generation result
   */
  private async createAssetFromGeneration(
    projectId: string, 
    type: AssetType, 
    prompt: string, 
    generation: GenerationStatus
  ): Promise<AssetMetadata> {
    if (!generation.result?.svg) {
      throw new Error('Generation result does not contain SVG');
    }

    const assetId = `ai_${generation.id.substring(4)}`;
    const projectAssetsDir = await ensureAssetsDir(projectId);
    
    // Save SVG content
    const svgContent = generation.result.svg;
    const svgPath = join(projectAssetsDir, `${assetId}.svg`);
    await writeFile(svgPath, svgContent, 'utf-8');
    
    // Create metadata
    const metadata: AssetMetadata = this.createAssetMetadataFromGeneration(projectId, type, prompt, generation);
    metadata.size = svgContent.length;
    
    const metadataPath = join(projectAssetsDir, `${assetId}.json`);
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    
    this.cache.set(assetId, metadata);
    
    this.logger.info({ 
      projectId, 
      assetId, 
      type, 
      prompt: prompt.substring(0, 50),
      duration: metadata.aiGeneration?.duration 
    }, 'AI-generated asset created');
    
    return metadata;
  }

  async getAssetStats(projectId: string): Promise<{
    total: number;
    byType: Record<AssetType, number>;
    totalSize: number;
    aiGenerated: number;
  }> {
    const assets = await this.listAssets(projectId);
    
    const byType: Record<AssetType, number> = {
      sprite: 0,
      tileset: 0,
      texture: 0,
      icon: 0,
      audio: 0,
      background: 0,
    };
    
    let totalSize = 0;
    let aiGenerated = 0;
    
    for (const asset of assets) {
      byType[asset.type]++;
      totalSize += asset.size;
      if (asset.aiGeneration) {
        aiGenerated++;
      }
    }
    
    return {
      total: assets.length,
      byType,
      totalSize,
      aiGenerated,
    };
  }
}
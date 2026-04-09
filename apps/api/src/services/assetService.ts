/**
 * Asset Service (Enhanced)
 * Full asset management with AI-powered generation.
 */

import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { FastifyLoggerInstance } from 'fastify';
import { AIImageGenerationService, type AIImageGenerationRequest, type GenerationResult } from './aiImageGenerationService';

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
    model: string;
    style: string;
    prompt: string;
    duration: number;
  };
}

export type AssetType = 'sprite' | 'tileset' | 'texture' | 'icon' | 'audio' | 'background';

// Track recently created assets to avoid duplicates in polling
const recentlyCreated = new Set<string>();

export class AssetService {
  private cache: Map<string, AssetMetadata> = new Map();
  private logger: FastifyLoggerInstance;
  private aiImageService: AIImageGenerationService;

  constructor(logger: FastifyLoggerInstance) {
    this.logger = logger;
    this.aiImageService = new AIImageGenerationService(logger);
  }

  async listAssets(projectId: string): Promise<AssetMetadata[]> {
    const projectAssetsDir = join(ASSETS_DIR, projectId);
    if (!existsSync(projectAssetsDir)) return [];

    const files = await readdir(projectAssetsDir);
    const metadataFiles = files.filter(f => f.endsWith('.json'));

    const assets: AssetMetadata[] = [];
    for (const file of metadataFiles) {
      try {
        const content = await readFile(join(projectAssetsDir, file), 'utf-8');
        const metadata = JSON.parse(content) as AssetMetadata;
        this.cache.set(metadata.id, metadata);
        assets.push(metadata);
      } catch {
        // Skip malformed metadata files
      }
    }

    return assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAsset(projectId: string, assetId: string): Promise<AssetMetadata | null> {
    // Check cache first
    if (this.cache.has(assetId)) {
      return this.cache.get(assetId)!;
    }

    const metadataPath = join(ASSETS_DIR, projectId, `${assetId}.json`);
    if (!existsSync(metadataPath)) return null;

    try {
      const content = await readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(content) as AssetMetadata;
      this.cache.set(assetId, metadata);
      return metadata;
    } catch {
      return null;
    }
  }

  async getAssetFile(projectId: string, assetId: string): Promise<{ content: Buffer; mimeType: string }> {
    const metadata = await this.getAsset(projectId, assetId);
    if (!metadata) throw new Error('Asset not found');

    // Try to find the actual file
    const projectAssetsDir = join(ASSETS_DIR, projectId);

    // Try common extensions
    const extensions = ['svg', 'png', 'webp', 'jpg', 'gif'];
    for (const ext of extensions) {
      const filePath = join(projectAssetsDir, `${assetId}.${ext}`);
      if (existsSync(filePath)) {
        const content = await readFile(filePath);
        const mimeTypes: Record<string, string> = {
          svg: 'image/svg+xml',
          png: 'image/png',
          webp: 'image/webp',
          jpg: 'image/jpeg',
          gif: 'image/gif',
        };
        return { content, mimeType: mimeTypes[ext] || 'application/octet-stream' };
      }
    }

    throw new Error('Asset file not found on disk');
  }

  async generateAsset(
    projectId: string,
    type: AssetType,
    prompt: string,
    options?: {
      style?: 'pixel' | 'vector' | 'hand-drawn' | 'cartoon' | 'realistic';
      width?: number;
      height?: number;
      format?: 'svg' | 'png' | 'webp';
      backgroundColor?: string;
    },
  ): Promise<{ generationId: string; metadata: AssetMetadata }> {
    const style = options?.style || 'pixel';
    const width = options?.width || 64;
    const height = options?.height || 64;
    const format = options?.format || 'svg';

    // Call AI image generation (with fallback)
    const result: GenerationResult = await this.aiImageService.generateAsset({
      type,
      prompt,
      style,
      width,
      height,
      format,
      backgroundColor: options?.backgroundColor,
    });

    // Save the generated content
    const projectAssetsDir = await ensureAssetsDir(projectId);
    const extension = 'svg';
    const assetId = result.metadata.id;

    // Save SVG content
    await writeFile(
      join(projectAssetsDir, `${assetId}.${extension}`),
      result.content,
      'utf-8',
    );

    // Create metadata
    const metadata: AssetMetadata = {
      id: assetId,
      projectId,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} - ${prompt.substring(0, 30)}`,
      type,
      prompt,
      url: `/api/projects/${projectId}/assets/${assetId}`,
      size: result.content.length,
      mimeType: 'image/svg+xml',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [type, style, 'ai-generated'],
      status: 'generated',
      generationData: {
        model: result.metadata.aiGeneration.model,
        confidence: 0.85,
        parameters: { style, width, height, format },
      },
      aiGeneration: {
        model: result.metadata.aiGeneration.model,
        style,
        prompt,
        duration: result.metadata.generationTime,
      },
    };

    // Save metadata
    await writeFile(
      join(projectAssetsDir, `${assetId}.json`),
      JSON.stringify(metadata, null, 2),
      'utf-8',
    );

    this.cache.set(assetId, metadata);

    // Mark as recently created for polling
    recentlyCreated.add(assetId);

    this.logger.info({
      projectId,
      assetId,
      type,
      prompt: prompt.substring(0, 50),
      duration: metadata.aiGeneration?.duration,
    }, 'AI-generated asset created');

    return { generationId: assetId, metadata };
  }

  async uploadAsset(
    projectId: string,
    name: string,
    type: AssetType,
    content: Buffer,
    mimeType: string,
  ): Promise<AssetMetadata> {
    const projectAssetsDir = await ensureAssetsDir(projectId);
    const assetId = `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const extension = mimeType.includes('svg') ? 'svg' : mimeType.includes('webp') ? 'webp' : mimeType.includes('png') ? 'png' : 'bin';

    // Save file
    await writeFile(join(projectAssetsDir, `${assetId}.${extension}`), content);

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
      tags: [type, 'uploaded'],
      status: 'uploaded',
    };

    // Save metadata
    await writeFile(
      join(projectAssetsDir, `${assetId}.json`),
      JSON.stringify(metadata, null, 2),
      'utf-8',
    );

    this.cache.set(assetId, metadata);
    return metadata;
  }

  async deleteAsset(projectId: string, assetId: string): Promise<boolean> {
    const metadata = await this.getAsset(projectId, assetId);
    if (!metadata) return false;

    const projectAssetsDir = join(ASSETS_DIR, projectId);

    // Delete files
    const extensions = ['svg', 'png', 'webp', 'jpg', 'gif', 'json', 'bin'];
    for (const ext of extensions) {
      const filePath = join(projectAssetsDir, `${assetId}.${ext}`);
      if (existsSync(filePath)) {
        await unlink(filePath).catch(() => {});
      }
    }

    this.cache.delete(assetId);
    recentlyCreated.delete(assetId);
    return true;
  }

  /**
   * Get generation status — now returns immediately since generation is synchronous
   */
  async getGenerationStatus(projectId: string, generationId: string): Promise<any | null> {
    // Generation is now synchronous, so just check if the asset exists
    const asset = await this.getAsset(projectId, generationId);
    if (!asset) return null;
    return {
      id: generationId,
      projectId,
      status: 'completed',
      progress: 100,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }

  /**
   * List generations — returns all AI-generated assets as completed generations
   */
  async getGenerations(projectId: string): Promise<any[]> {
    const assets = await this.listAssets(projectId);
    return assets
      .filter(a => a.status === 'generated' && a.aiGeneration)
      .map(a => ({
        id: a.id,
        projectId,
        type: a.type,
        prompt: a.prompt || '',
        status: 'completed' as const,
        progress: 100,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }));
  }

  /**
   * Poll and create assets — returns recently created asset IDs
   * Since generation is synchronous, assets are created immediately.
   * This method just reports what was created recently.
   */
  async pollAndCreateAssets(projectId: string): Promise<{ created: string[]; errors: string[] }> {
    const created: string[] = [];
    const errors: string[] = [];

    // Return all recently created assets for this project
    const assets = await this.listAssets(projectId);

    for (const asset of assets) {
      // If this asset was recently created and hasn't been reported yet
      if (recentlyCreated.has(asset.id)) {
        created.push(asset.id);
        recentlyCreated.delete(asset.id); // Mark as reported
      }
    }

    return { created, errors };
  }

  async getAssetStats(projectId: string): Promise<{
    total: number;
    byType: Record<AssetType, number>;
    totalSize: number;
    aiGenerated: number;
  }> {
    const assets = await this.listAssets(projectId);

    const byType: Record<AssetType, number> = {
      sprite: 0, tileset: 0, texture: 0, icon: 0, audio: 0, background: 0,
    };

    let totalSize = 0;
    let aiGenerated = 0;

    for (const asset of assets) {
      byType[asset.type]++;
      totalSize += asset.size;
      if (asset.aiGeneration) aiGenerated++;
    }

    return { total: assets.length, byType, totalSize, aiGenerated };
  }
}

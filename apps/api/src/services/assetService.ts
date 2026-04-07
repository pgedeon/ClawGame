/**
 * Asset Service (Simplified)
 * Basic asset management without AI generation for now.
 */

import { mkdir, readFile, writeFile, readdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { FastifyLoggerInstance } from 'fastify';

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
}

export type AssetType = 'sprite' | 'tileset' | 'texture' | 'icon' | 'audio' | 'background';

export class AssetService {
  private cache: Map<string, AssetMetadata> = new Map();
  private logger: FastifyLoggerInstance;

  constructor(logger: FastifyLoggerInstance) {
    this.logger = logger;
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

  async generateAsset(projectId: string, type: AssetType, prompt: string): Promise<AssetMetadata> {
    // For now, return a placeholder asset
    // Real AI generation to be implemented
    const assetId = Math.random().toString(36).substring(2, 11);
    const projectAssetsDir = await ensureAssetsDir(projectId);
    
    const placeholderSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <rect width="64" height="64" fill="#8b5cf6" opacity="0.2"/>
  <rect x="16" y="16" width="32" height="32" fill="#8b5cf6" opacity="0.5"/>
  <text x="32" y="36" text-anchor="middle" fill="#8b5cf6" font-size="12" font-family="Arial">
    ${type.charAt(0).toUpperCase()}
  </text>
</svg>`;

    const filename = `${assetId}.svg`;
    const filePath = join(projectAssetsDir, filename);
    await writeFile(filePath, placeholderSvg, 'utf-8');
    
    const metadata: AssetMetadata = {
      id: assetId,
      projectId,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} - ${prompt.substring(0, 20)}`,
      type,
      prompt,
      url: `/api/projects/${projectId}/assets/${assetId}`,
      size: placeholderSvg.length,
      mimeType: 'image/svg+xml',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [type],
      status: 'generated',
    };
    
    const metadataPath = join(projectAssetsDir, `${assetId}.json`);
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
    
    this.cache.set(assetId, metadata);
    
    return metadata;
  }

  async getAssetStats(projectId: string): Promise<{
    total: number;
    byType: Record<AssetType, number>;
    totalSize: number;
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
    
    for (const asset of assets) {
      byType[asset.type]++;
      totalSize += asset.size;
    }
    
    return {
      total: assets.length,
      byType,
      totalSize,
    };
  }
}


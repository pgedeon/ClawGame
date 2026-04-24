/**
 * Asset Service (M11 Enhanced)
 * Full asset management with AI-powered multi-model generation.
 */

import { mkdir, readFile, writeFile, readdir, unlink, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { FastifyBaseLogger } from 'fastify';
import { AIImageGenerationService } from './aiImageGenerationService';
import { 
  AIImageGenerationRequest, 
  GenerationResult, 
  AssetType, 
  GenerationQuality 
} from '../types/index';

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
  status: 'generated' | 'uploaded' | 'processed' | 'error';
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

export interface AssetError {
  error?: string;
}

export interface AssetSearchQuery {
  type?: AssetType;
  tags?: string[];
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'name' | 'size';
  sortOrder?: 'asc' | 'desc';
}

export interface AssetSearchResult {
  assets: AssetMetadata[];
  total: number;
  hasMore: boolean;
}

export interface AssetBatchOperation {
  operation: 'upload' | 'delete' | 'process';
  assets: string[];
  parameters?: Record<string, unknown>;
}

export interface AssetOperationResult {
  success: boolean;
  processed: number;
  failed: number;
  errors?: string[];
}

export class AssetService {
  private logger: FastifyBaseLogger;

  constructor(logger: FastifyBaseLogger) {
    this.logger = logger;
  }

  private logError(message: string, error: unknown): void {
    this.logger.error({ err: error }, message);
  }

  private logWarn(message: string, error: unknown): void {
    this.logger.warn({ err: error }, message);
  }

  async getAssets(projectId: string, query: AssetSearchQuery): Promise<AssetSearchResult> {
    try {
      const projectAssetsDir = await ensureAssetsDir(projectId);
      const files = await readdir(projectAssetsDir);
      
      let assets: AssetMetadata[] = [];
      
      for (const file of files) {
        try {
          const filePath = join(projectAssetsDir, file);
          const stats = await stat(filePath);
          
          // Skip directories
          if (stats.isDirectory()) continue;
          
          const metadata: AssetMetadata = {
            id: file.split('.')[0], // Use filename without extension as ID
            projectId,
            name: file,
            type: this.inferType(file),
            url: `/data/assets/${projectId}/${file}`,
            size: stats.size,
            mimeType: this.getMimeType(file),
            createdAt: stats.birthtime.toISOString(),
            updatedAt: stats.mtime.toISOString(),
            status: 'uploaded'
          };
          
          // Apply filters
          if (query.type && metadata.type !== query.type) continue;
          if (query.search && !file.includes(query.search)) continue;
          if (query.createdAfter && new Date(metadata.createdAt) < new Date(query.createdAfter)) continue;
          if (query.createdBefore && new Date(metadata.createdAt) > new Date(query.createdBefore)) continue;
          
          assets.push(metadata);
        } catch (error) {
          this.logWarn(`Failed to process asset file ${file}`, error);
        }
      }
      
      // Apply sorting
      if (query.sortBy) {
        assets.sort((a, b) => {
          let comparison = 0;
          
          switch (query.sortBy) {
            case 'createdAt':
              comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              break;
            case 'name':
              comparison = a.name.localeCompare(b.name);
              break;
            case 'size':
              comparison = a.size - b.size;
              break;
          }
          
          return query.sortOrder === 'desc' ? -comparison : comparison;
        });
      }
      
      // Apply pagination
      const offset = query.offset || 0;
      const limit = Math.min(query.limit || 50, 100); // Max 100 per page
      const paginatedAssets = assets.slice(offset, offset + limit);
      
      return {
        assets: paginatedAssets,
        total: assets.length,
        hasMore: offset + limit < assets.length
      };
    } catch (error) {
      this.logError('Failed to get assets', error);
      throw error;
    }
  }

  async listAssets(projectId: string): Promise<AssetMetadata[]> {
    const result = await this.getAssets(projectId, { limit: 100 });
    return result.assets;
  }

  async getAsset(projectId: string, assetId: string): Promise<AssetMetadata | null> {
    try {
      const projectAssetsDir = await ensureAssetsDir(projectId);
      const files = await readdir(projectAssetsDir);
      
      const assetFile = files.find(file => file.startsWith(assetId));
      if (!assetFile) return null;
      
      const filePath = join(projectAssetsDir, assetFile);
      const stats = await stat(filePath);
      
      return {
        id: assetId,
        projectId,
        name: assetFile,
        type: this.inferType(assetFile),
        url: `/data/assets/${projectId}/${assetFile}`,
        size: stats.size,
        mimeType: this.getMimeType(assetFile),
        createdAt: stats.birthtime.toISOString(),
        updatedAt: stats.mtime.toISOString(),
        status: 'uploaded'
      };
    } catch (error) {
      this.logError('Failed to get asset', error);
      throw error;
    }
  }

  async getAssetFile(projectId: string, assetId: string): Promise<{ content: Buffer; mimeType: string }> {
    const projectAssetsDir = await ensureAssetsDir(projectId);
    const files = await readdir(projectAssetsDir);
    const assetFile = files.find(file => file.startsWith(assetId));
    if (!assetFile) {
      throw new Error('Asset not found');
    }

    const content = await readFile(join(projectAssetsDir, assetFile));
    return { content, mimeType: this.getMimeType(assetFile) };
  }

  async uploadAsset(projectId: string, file: Buffer, filename: string, type?: AssetType): Promise<AssetMetadata> {
    try {
      const projectAssetsDir = await ensureAssetsDir(projectId);
      const filePath = join(projectAssetsDir, filename);
      
      await writeFile(filePath, file);
      const stats = await stat(filePath);
      
      return {
        id: filename.split('.')[0],
        projectId,
        name: filename,
        type: type || this.inferType(filename),
        url: `/data/assets/${projectId}/${filename}`,
        size: stats.size,
        mimeType: this.getMimeType(filename),
        createdAt: stats.birthtime.toISOString(),
        updatedAt: stats.mtime.toISOString(),
        status: 'uploaded'
      };
    } catch (error) {
      this.logError('Failed to upload asset', error);
      throw error;
    }
  }

  async deleteAsset(projectId: string, assetId: string): Promise<boolean> {
    try {
      const projectAssetsDir = await ensureAssetsDir(projectId);
      const files = await readdir(projectAssetsDir);
      
      const assetFile = files.find(file => file.startsWith(assetId));
      if (!assetFile) return false;
      
      const filePath = join(projectAssetsDir, assetFile);
      await unlink(filePath);
      
      return true;
    } catch (error) {
      this.logError('Failed to delete asset', error);
      throw error;
    }
  }

  async processAsset(projectId: string, assetId: string, operation: string, parameters?: Record<string, unknown>): Promise<AssetMetadata> {
    try {
      // This would integrate with the asset processing pipeline
      // For now, just return the asset with updated metadata
      
      const asset = await this.getAsset(projectId, assetId);
      if (!asset) {
        throw new Error('Asset not found');
      }
      
      // Update status based on operation
      asset.status = 'processed';
      asset.updatedAt = new Date().toISOString();
      
      return asset;
    } catch (error) {
      this.logError('Failed to process asset', error);
      throw error;
    }
  }

  async processAssetsInBatch(projectId: string, operations: AssetBatchOperation[]): Promise<AssetOperationResult> {
    try {
      let processed = 0;
      let failed = 0;
      const errors: string[] = [];
      
      for (const op of operations) {
        try {
          for (const assetId of op.assets) {
            try {
              await this.processAsset(projectId, assetId, op.operation, op.parameters);
              processed++;
            } catch (error) {
              failed++;
              errors.push(`Failed to process asset ${assetId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        } catch (error) {
          failed++;
          errors.push(`Failed to process batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      return {
        success: failed === 0,
        processed,
        failed,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      this.logError('Failed to process assets in batch', error);
      throw error;
    }
  }

  async searchAssets(projectId: string, query: string): Promise<AssetSearchResult> {
    try {
      const searchResults = await this.getAssets(projectId, {
        search: query,
        limit: 100
      });
      
      return {
        assets: searchResults.assets,
        total: searchResults.total,
        hasMore: searchResults.hasMore
      };
    } catch (error) {
      this.logError('Failed to search assets', error);
      throw error;
    }
  }

  async exportAssets(projectId: string, format: 'json' | 'csv'): Promise<string> {
    try {
      const searchResult = await this.getAssets(projectId, {});
      
      if (format === 'json') {
        return JSON.stringify(searchResult.assets, null, 2);
      } else {
        // CSV format
        const headers = ['ID', 'Name', 'Type', 'Size', 'Created', 'Status'];
        const rows = searchResult.assets.map(asset => [
          asset.id,
          asset.name,
          asset.type,
          asset.size.toString(),
          asset.createdAt,
          asset.status
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
      }
    } catch (error) {
      this.logError('Failed to export assets', error);
      throw error;
    }
  }

  async getAssetStatistics(projectId: string): Promise<{
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    try {
      const searchResult = await this.getAssets(projectId, {});
      
      const stats = {
        total: searchResult.total,
        byType: {} as Record<string, number>,
        byStatus: {
          generated: 0,
          uploaded: 0,
          processed: 0,
          error: 0
        }
      };
      
      searchResult.assets.forEach(asset => {
        // Count by type
        stats.byType[asset.type] = (stats.byType[asset.type] || 0) + 1;
        
        // Count by status
        stats.byStatus[asset.status] = (stats.byStatus[asset.status] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      this.logError('Failed to get asset statistics', error);
      throw error;
    }
  }

  async getAssetDistribution(projectId: string): Promise<Record<string, { count: number; totalSize: number }>> {
    try {
      const searchResult = await this.getAssets(projectId, {});
      
      const distribution: Record<string, { count: number; totalSize: number }> = {};
      
      searchResult.assets.forEach(asset => {
        if (!distribution[asset.type]) {
          distribution[asset.type] = { count: 0, totalSize: 0 };
        }
        
        distribution[asset.type].count++;
        distribution[asset.type].totalSize += asset.size;
      });
      
      return distribution;
    } catch (error) {
      this.logError('Failed to get asset distribution', error);
      throw error;
    }
  }

  private inferType(filename: string): AssetType {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    if (['mp3', 'wav', 'ogg'].includes(ext)) {
      return AssetType.AUDIO;
    }
    
    if (['mp4', 'avi', 'mov'].includes(ext)) {
      return AssetType.VIDEO;
    }
    
    if (['json', 'xml'].includes(ext)) {
      return AssetType.SPRITE; // Could also be metadata
    }
    
    // Default to visual asset for images
    return AssetType.VISUAL_ASSET;
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'ogg': 'audio/ogg',
      'mp4': 'video/mp4',
      'avi': 'video/x-msvideo',
      'mov': 'video/quicktime',
      'json': 'application/json',
      'xml': 'application/xml'
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

export const assetService = new AssetService({} as FastifyBaseLogger);

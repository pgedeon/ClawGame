/**
 * Asset Routes (M11 Enhanced)
 * Full asset CRUD operations with AI-powered generation.
 */

import { FastifyInstance } from 'fastify';
import { assetService } from '../services/assetService';
import { 
  AssetType, 
  GenerationQuality,
  GenerationFormat,
  GenerationAspectRatio 
} from '../types/index';
import type { AssetBatchOperation } from '../services/assetService';

// ── Asset CRUD Operations ──

export async function assetRoutes(fastify: FastifyInstance) {
  // Get all assets for a project
  fastify.get<{
    Params: { projectId: string };
    Querystring: {
      type?: AssetType;
      limit?: number;
      offset?: number;
      sortBy?: 'createdAt' | 'name' | 'size';
      sortOrder?: 'asc' | 'desc';
    };
    Reply: { success: boolean; data?: any; error?: string };
  }>('/api/projects/:projectId/assets', async (request, reply) => {
    try {
      const { projectId } = request.params;
      const { type, limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = request.query;
      
      const assets = await assetService.getAssets(projectId, { type, limit, offset, sortBy, sortOrder });
      
      return {
        success: true,
        data: assets,
        pagination: {
          total: assets.total,
          limit,
          offset,
          hasMore: assets.hasMore
        }
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to get assets');
      return reply.code(500).send({
        success: false,
        error: 'Failed to retrieve assets'
      });
    }
  });

  // Get a single asset by ID
  fastify.get<{
    Params: { projectId: string; assetId: string };
    Reply: { success: boolean; data?: any; error?: string };
  }>('/api/projects/:projectId/assets/:assetId', async (request, reply) => {
    try {
      const { projectId, assetId } = request.params;
      
      const asset = await assetService.getAsset(projectId, assetId);
      if (!asset) {
        return reply.code(404).send({
          success: false,
          error: 'Asset not found'
        });
      }
      
      return {
        success: true,
        data: asset
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to get asset');
      return reply.code(500).send({
        success: false,
        error: 'Failed to retrieve asset'
      });
    }
  });

  // Upload a new asset
  fastify.post<{
    Params: { projectId: string };
    Body: {
      file: Buffer;
      filename: string;
      type?: AssetType;
    };
    Reply: { success: boolean; data?: any; error?: string };
  }>('/api/projects/:projectId/assets/upload', async (request, reply) => {
    try {
      const { projectId } = request.params;
      const { file, filename, type } = request.body;
      
      if (!file || !filename) {
        return reply.code(400).send({
          success: false,
          error: 'File and filename are required'
        });
      }
      
      const asset = await assetService.uploadAsset(projectId, file, filename, type);
      
      return {
        success: true,
        data: asset
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to upload asset');
      return reply.code(500).send({
        success: false,
        error: 'Failed to upload asset'
      });
    }
  });

  // Delete an asset
  fastify.delete<{
    Params: { projectId: string; assetId: string };
    Reply: { success: boolean; error?: string };
  }>('/api/projects/:projectId/assets/:assetId', async (request, reply) => {
    try {
      const { projectId, assetId } = request.params;
      
      const deleted = await assetService.deleteAsset(projectId, assetId);
      if (!deleted) {
        return reply.code(404).send({
          success: false,
          error: 'Asset not found'
        });
      }
      
      return {
        success: true
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to delete asset');
      return reply.code(500).send({
        success: false,
        error: 'Failed to delete asset'
      });
    }
  });

  // Process an asset
  fastify.patch<{
    Params: { projectId: string; assetId: string };
    Body: {
      operation: string;
      parameters?: Record<string, unknown>;
    };
    Reply: { success: boolean; data?: any; error?: string };
  }>('/api/projects/:projectId/assets/:assetId/process', async (request, reply) => {
    try {
      const { projectId, assetId } = request.params;
      const { operation, parameters } = request.body;
      
      const asset = await assetService.processAsset(projectId, assetId, operation, parameters);
      
      return {
        success: true,
        data: asset
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to process asset');
      return reply.code(500).send({
        success: false,
        error: 'Failed to process asset'
      });
    }
  });

  // Process assets in batch
  fastify.post<{
    Params: { projectId: string };
    Body: {
      operations: Array<{
        operation: AssetBatchOperation['operation'];
        assets: string[];
        parameters?: Record<string, unknown>;
      }>;
    };
    Reply: { success: boolean; data?: any; error?: string };
  }>('/api/projects/:projectId/assets/batch-process', async (request, reply) => {
    try {
      const { projectId } = request.params;
      const { operations } = request.body;
      
      const results = await assetService.processAssetsInBatch(projectId, operations);
      
      return {
        success: true,
        data: results
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to process assets in batch');
      return reply.code(500).send({
        success: false,
        error: 'Failed to process assets in batch'
      });
    }
  });

  // Search assets
  fastify.get<{
    Params: { projectId: string };
    Querystring: { query: string; limit?: number };
    Reply: { success: boolean; data?: any; error?: string };
  }>('/api/projects/:projectId/assets/search', async (request, reply) => {
    try {
      const { projectId } = request.params;
      const { query, limit = 50 } = request.query;
      
      if (!query) {
        return reply.code(400).send({
          success: false,
          error: 'Search query is required'
        });
      }
      
      const results = await assetService.searchAssets(projectId, query);
      
      return {
        success: true,
        data: results
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to search assets');
      return reply.code(500).send({
        success: false,
        error: 'Failed to search assets'
      });
    }
  });

  // Export assets
  fastify.get<{
    Params: { projectId: string };
    Querystring: { format: 'json' | 'csv' };
    Reply: { success: boolean; data?: string; error?: string };
  }>('/api/projects/:projectId/assets/export', async (request, reply) => {
    try {
      const { projectId } = request.params;
      const { format } = request.query;
      
      if (!format || !['json', 'csv'].includes(format)) {
        return reply.code(400).send({
          success: false,
          error: 'Format must be json or csv'
        });
      }
      
      const data = await assetService.exportAssets(projectId, format);
      
      return {
        success: true,
        data
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to export assets');
      return reply.code(500).send({
        success: false,
        error: 'Failed to export assets'
      });
    }
  });

  // Get asset statistics
  fastify.get<{
    Params: { projectId: string };
    Reply: { success: boolean; data?: any; error?: string };
  }>('/api/projects/:projectId/assets/statistics', async (request, reply) => {
    try {
      const { projectId } = request.params;
      
      const stats = await assetService.getAssetStatistics(projectId);
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to get asset statistics');
      return reply.code(500).send({
        success: false,
        error: 'Failed to get asset statistics'
      });
    }
  });

  // Get asset distribution
  fastify.get<{
    Params: { projectId: string };
    Reply: { success: boolean; data?: any; error?: string };
  }>('/api/projects/:projectId/assets/distribution', async (request, reply) => {
    try {
      const { projectId } = request.params;
      
      const distribution = await assetService.getAssetDistribution(projectId);
      
      return {
        success: true,
        data: distribution
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Failed to get asset distribution');
      return reply.code(500).send({
        success: false,
        error: 'Failed to get asset distribution'
      });
    }
  });
}

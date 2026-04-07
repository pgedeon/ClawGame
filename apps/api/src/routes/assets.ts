import { FastifyInstance } from 'fastify';
import { AssetService } from '../services/assetService';
import type { AssetType } from '../services/assetService';
import type { GenerationStatus } from '../services/aiImageGenerationService';

// Global reference to asset service (initialized with logger)
let assetServiceInstance: AssetService | null = null;

export async function assetRoutes(app: FastifyInstance) {
  // Initialize asset service with logger on first use
  if (!assetServiceInstance) {
    assetServiceInstance = new AssetService(app.log);
  }

  // List assets for a project
  app.get<{
    Params: { projectId: string };
    Querystring: { type?: string; tag?: string; search?: string; limit?: string; offset?: string }
  }>(
    '/api/projects/:projectId/assets',
    async (request) => {
      const { projectId } = request.params;
      const assets = await assetServiceInstance!.listAssets(projectId);
      return { assets };
    }
  );

  // Get specific asset metadata
  app.get<{ Params: { projectId: string; assetId: string } }>(
    '/api/projects/:projectId/assets/:assetId',
    async (request, reply) => {
      const { projectId, assetId } = request.params;
      const asset = await assetServiceInstance!.getAsset(projectId, assetId);
      
      if (!asset) {
        reply.code(404);
        return { error: 'Asset not found' };
      }
      
      return asset;
    }
  );

  // Get asset file content
  app.get<{ Params: { projectId: string; assetId: string } }>(
    '/api/projects/:projectId/assets/:assetId/file',
    async (request, reply) => {
      const { projectId, assetId } = request.params;
      
      try {
        const { content, mimeType } = await assetServiceInstance!.getAssetFile(projectId, assetId);
        reply.type(mimeType);
        return content;
      } catch (error: any) {
        reply.code(404);
        return { error: error.message || 'Asset file not found' };
      }
    }
  );

  // Generate new asset using AI
  app.post<{
    Params: { projectId: string };
    Body: { 
      type: AssetType; 
      prompt: string;
      options?: {
        style?: 'pixel' | 'vector' | 'hand-drawn' | 'cartoon' | 'realistic';
        width?: number;
        height?: number;
        format?: 'svg' | 'png' | 'webp';
        backgroundColor?: string;
      }
    }
  }>(
    '/api/projects/:projectId/assets/generate',
    async (request, reply) => {
      const { projectId } = request.params;
      const { type, prompt, options } = request.body;
      
      if (!type || !prompt) {
        reply.code(400);
        return { error: 'type and prompt are required' };
      }
      
      try {
        const { generationId, metadata } = await assetServiceInstance!.generateAsset(
          projectId, 
          type, 
          prompt,
          options
        );
        
        reply.code(201);
        return {
          generationId,
          metadata,
          status: metadata.status === 'generated' ? 'completed' : 'pending'
        };
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to generate asset' };
      }
    }
  );

  // Get generation status
  app.get<{
    Params: { projectId: string; generationId: string }
  }>(
    '/api/projects/:projectId/assets/generations/:generationId',
    async (request, reply) => {
      const { projectId, generationId } = request.params;
      
      try {
        const status = await assetServiceInstance!.getGenerationStatus(projectId, generationId);
        
        if (!status) {
          reply.code(404);
          return { error: 'Generation not found' };
        }
        
        return status;
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to get generation status' };
      }
    }
  );

  // List all generations for a project
  app.get<{
    Params: { projectId: string }
  }>(
    '/api/projects/:projectId/assets/generations',
    async (request, reply) => {
      const { projectId } = request.params;
      
      try {
        const generations = await assetServiceInstance!.getGenerations(projectId);
        return { generations };
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to get generations' };
      }
    }
  );

  // Poll for completed generations and create assets
  app.post<{
    Params: { projectId: string }
  }>(
    '/api/projects/:projectId/assets/generations/poll',
    async (request, reply) => {
      const { projectId } = request.params;
      
      try {
        const result = await assetServiceInstance!.pollAndCreateAssets(projectId);
        reply.code(200);
        return result;
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to poll generations' };
      }
    }
  );

  // Upload asset file
  app.post<{ Params: { projectId: string }; Body: { name: string; type: AssetType; content?: string; mimeType?: string } }>(
    '/api/projects/:projectId/assets/upload',
    async (request, reply) => {
      const { projectId } = request.params;
      const { name, type, content, mimeType } = request.body;
      
      if (!name || !type || !content) {
        reply.code(400);
        return { error: 'name, type, and content are required' };
      }
      
      try {
        const buffer = Buffer.from(content, 'base64');
        const asset = await assetServiceInstance!.uploadAsset(
          projectId,
          name,
          type,
          buffer,
          mimeType || 'image/png'
        );
        
        reply.code(201);
        return asset;
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to upload asset' };
      }
    }
  );

  // Delete asset
  app.delete<{ Params: { projectId: string; assetId: string } }>(
    '/api/projects/:projectId/assets/:assetId',
    async (request, reply) => {
      const { projectId, assetId } = request.params;
      const deleted = await assetServiceInstance!.deleteAsset(projectId, assetId);
      
      if (!deleted) {
        reply.code(404);
        return { error: 'Asset not found' };
      }
      
      return { success: true };
    }
  );

  // Get asset statistics
  app.get<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/assets/stats',
    async (request) => {
      const { projectId } = request.params;
      const stats = await assetServiceInstance!.getAssetStats(projectId);
      return stats;
    }
  );
}
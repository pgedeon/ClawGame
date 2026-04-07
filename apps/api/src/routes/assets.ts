import { FastifyInstance } from 'fastify';
import { AssetService } from '../services/assetService';
import type { AssetType } from '../services/assetService';

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
  app.post<{ Params: { projectId: string }; Body: { type?: AssetType; prompt?: string; name?: string; content?: string; mimeType?: string } }>(
    '/api/projects/:projectId/assets/generate',
    async (request, reply) => {
      const { projectId } = request.params;
      const { type, prompt } = request.body;
      
      if (!type || !prompt) {
        reply.code(400);
        return { error: 'type and prompt are required' };
      }
      
      const asset = await assetServiceInstance!.generateAsset(projectId, type, prompt);
      reply.code(201);
      return asset;
    }
  );

  // Upload asset file
  app.post<{ Params: { projectId: string }; Body: { type?: AssetType; prompt?: string; name?: string; content?: string; mimeType?: string } }>(
    '/api/projects/:projectId/assets/upload',
    async (request, reply) => {
      const { projectId } = request.params;
      const { name, type, content, mimeType } = request.body;
      
      if (!name || !type || !content) {
        reply.code(400);
        return { error: 'name, type, and content are required' };
      }
      
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
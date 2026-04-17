/**
 * @clawgame/api - Hosted Routes
 * API endpoints for hosting exports as real web games
 */

import { FastifyInstance } from 'fastify';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { HostedService, type HostedOptions } from '../services/hostedService';

const HOSTED_DIR = process.env.HOSTED_DIR || './data/hosted';

// Global reference to hosted service (initialized with logger)
let hostedServiceInstance: HostedService | null = null;

export async function hostedRoutes(app: FastifyInstance) {
  // Initialize hosted service with logger on first use
  if (!hostedServiceInstance) {
    hostedServiceInstance = new HostedService(app.log);
  }

  // Host an export for web viewing
  app.post<{
    Params: { projectId: string; filename: string };
    Body: HostedOptions;
  }>(
    '/api/projects/:projectId/exports/:filename/host',
    async (request, reply) => {
      const { projectId, filename } = request.params;
      const options = request.body || {};

      try {
        const hostedExport = await hostedServiceInstance!.hostExport(projectId, filename, options);
        reply.code(201);
        return {
          success: true,
          hosted: hostedExport,
          message: 'Game successfully hosted for web viewing',
        };
      } catch (error: any) {
        reply.code(400);
        return {
          success: false,
          error: error.message || 'Failed to host game',
        };
      }
    }
  );

  // Get hosted export details
  app.get<{ Params: { hostedId: string } }>(
    '/api/hosted/:hostedId',
    async (request, reply) => {
      const { hostedId } = request.params;

      try {
        const hostedExport = await hostedServiceInstance!.getHostedExport(hostedId);
        if (!hostedExport) {
          reply.code(404);
          return { error: 'Hosted game not found' };
        }

        // Check if expired
        if (hostedExport.expiresAt && new Date(hostedExport.expiresAt) < new Date()) {
          reply.code(410);
          return { error: 'Hosted game has expired' };
        }

        return hostedExport;
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to get hosted game' };
      }
    }
  );

  // View hosted game in browser (serve HTML)
  app.get<{ Params: { hostedId: string } }>(
    '/api/hosted/:hostedId/view',
    async (request, reply) => {
      const { hostedId } = request.params;

      try {
        const hostedExport = await hostedServiceInstance!.getHostedExport(hostedId);
        if (!hostedExport) {
          reply.code(404);
          return { error: 'Hosted game not found' };
        }

        // Check if expired
        if (hostedExport.expiresAt && new Date(hostedExport.expiresAt) < new Date()) {
          reply.code(410);
          return {
            error: 'Hosted game has expired',
            expiresAt: hostedExport.expiresAt,
            message: 'This hosted game has expired and is no longer available for viewing.',
          };
        }

        const { content, mimeType } = await hostedServiceInstance!.getHostedFile(hostedId);

        reply
          .header('Content-Type', mimeType)
          .header('Cache-Control', 'public, max-age=3600')
          .header('X-ClawGame-Hosted', 'true')
          .header('X-ClawGame-Project', hostedExport.projectId)
          .header('X-ClawGame-HostedId', hostedExport.id)
          .send(content);
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to serve hosted game' };
      }
    }
  );

  // List hosted exports for a project
  app.get<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/hosted',
    async (request, reply) => {
      const { projectId } = request.params;

      try {
        const hostedExports = await hostedServiceInstance!.listHostedExports(projectId);
        return { hosted: hostedExports };
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to list hosted exports' };
      }
    }
  );

  // Delete hosted export
  app.delete<{ Params: { projectId: string; hostedId: string } }>(
    '/api/projects/:projectId/hosted/:hostedId',
    async (request, reply) => {
      const { projectId, hostedId } = request.params;

      try {
        const deleted = await hostedServiceInstance!.deleteHostedExport(hostedId);
        if (!deleted) {
          reply.code(404);
          return { error: 'Hosted export not found' };
        }

        return { success: true, message: 'Hosted export deleted successfully' };
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to delete hosted export' };
      }
    }
  );

  // Cleanup expired hosted exports (admin endpoint)
  app.post(
    '/api/hosted/cleanup',
    async (request, reply) => {
      try {
        const cleanedCount = await hostedServiceInstance!.cleanupExpired();
        return {
          success: true,
          cleanedCount,
          message: `Cleaned up ${cleanedCount} expired hosted exports`,
        };
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to cleanup expired exports' };
      }
    }
  );

  // Health check for hosted service — auto-creates hosted directory
  app.get(
    '/api/hosted/health',
    async (_request, reply) => {
      try {
        // Auto-create hosted directory if missing
        if (!existsSync(HOSTED_DIR)) {
          await mkdir(HOSTED_DIR, { recursive: true });
        }

        // Derive baseUrl from the running server or env
        const baseUrl = process.env.HOSTED_BASE_URL
          || `http://${_request.hostname || 'localhost:3000'}/api/hosted`;

        return {
          status: 'healthy',
          hostedDir: HOSTED_DIR,
          baseUrl,
        };
      } catch (error: any) {
        reply.code(500);
        return {
          status: 'unhealthy',
          error: error.message || 'Health check failed',
        };
      }
    }
  );
}

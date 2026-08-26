/**
 * @clawgame/api - Hosted Routes
 * API endpoints for hosting exports as real web games
 */

import { FastifyInstance } from 'fastify';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { HostedService, type HostedOptions } from '../services/hostedService';
import { ExportService } from '../services/exportService';

const HOSTED_DIR = process.env.HOSTED_DIR || './data/hosted';

// Global reference to hosted service (initialized with logger)
let hostedServiceInstance: HostedService | null = null;
// Share endpoint needs fresh exports — same proven exportService the
// ExportPage wizard and e2e/export-smoke.spec.ts exercise.
let shareExportServiceInstance: ExportService | null = null;

/**
 * Security headers for serving user-generated game HTML on the API origin
 * (design §7 risk 2 — mandatory in slice 1). CSP sandbox blocks same-origin
 * reads (no cookies exist today; standing rule: none may be added while this
 * origin serves user HTML). Exported games need only scripts + pointer lock.
 * The Remix CTA navigates SAME-TAB (hostedService): a target=_blank popup
 * would inherit this sandbox's flags onto the web origin (opaque origin,
 * every module script CORS-blocked), so popups are neither used nor allowed.
 */
function applyGameHtmlHeaders(reply: { header: (name: string, value: string) => void }) {
  reply.header('Content-Security-Policy', 'sandbox allow-scripts allow-pointer-lock');
  reply.header('X-Content-Type-Options', 'nosniff');
}

export async function hostedRoutes(app: FastifyInstance) {
  // Initialize hosted service with logger on first use
  if (!hostedServiceInstance) {
    hostedServiceInstance = new HostedService(app.log);
  }
  if (!shareExportServiceInstance) {
    shareExportServiceInstance = new ExportService(app.log);
  }

  /**
   * Shared handler for GET /share/:token and GET /api/hosted/:hostedId/view:
   * clean 404/410 pages (never a stack trace), CSP-sandboxed game HTML on hit.
   */
  const serveHostedGame = async (hostedId: string, reply: any) => {
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

      // Play counter (slice 3): every serve of the game counts as a play —
      // both the canonical /share/:token link and the legacy view route come
      // through this shared handler. Awaited (tiny local write) so the
      // landing bar's own stats fetch sees its own view; never throws.
      await hostedServiceInstance!.incrementShareCount(hostedId, 'plays');

      applyGameHtmlHeaders(reply);
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
  };

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

  // One-click share (slice 1 core): always exports FRESH (never re-hosts a
  // stale artifact), then hosts it as a non-expiring capability-token link.
  // stage in error responses lets the client raise distinct toasts for
  // export vs host failure (US-1 AC 5).
  app.post<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/share',
    async (request, reply) => {
      const { projectId } = request.params;

      try {
        const exportResult = await shareExportServiceInstance!.exportToPhaserHTML(projectId, {
          format: 'phaser-html',
        });
        try {
          const hosted = await hostedServiceInstance!.hostExport(projectId, exportResult.filename, {
            expiresInDays: null,
            public: true,
          });
          reply.code(201);
          return { success: true, hosted, url: hosted.hostedUrl };
        } catch (hostError: any) {
          reply.code(500);
          return {
            success: false,
            stage: 'host',
            error: hostError?.message || 'Failed to host shared game',
          };
        }
      } catch (exportError: any) {
        reply.code(400);
        return {
          success: false,
          stage: 'export',
          error: exportError?.message || 'Failed to export game for sharing',
        };
      }
    }
  );

  // Capability-token share link (CEO ruling 3): GET /share/:token serves the
  // standalone phaser-html bundle directly — instant play, no app shell.
  app.get<{ Params: { token: string } }>(
    '/share/:token',
    async (request, reply) => {
      return serveHostedGame(request.params.token, reply);
    }
  );

  // Remix payload endpoint (slice 2): returns the .share.json remix payload so
  // the recipient's client can fork an editable copy via the normal project
  // create path. Token must exist (404), must not be expired (410); legacy
  // shares without a sidecar get a typed 404 so the UI can explain.
  app.get<{ Params: { token: string } }>(
    '/api/share/:token/remix',
    async (request, reply) => {
      const { token } = request.params;
      try {
        const hostedExport = await hostedServiceInstance!.getHostedExport(token);
        if (!hostedExport) {
          reply.code(404);
          return { error: 'Hosted game not found' };
        }
        if (hostedExport.expiresAt && new Date(hostedExport.expiresAt) < new Date()) {
          reply.code(410);
          return { error: 'Hosted game has expired' };
        }
        const payload = await hostedServiceInstance!.getRemixPayload(token);
        if (!payload) {
          reply.code(404);
          return {
            error: 'This share predates remixing and carries no editable source',
            code: 'remix_payload_missing',
          };
        }
        // Remix counter (slice 3): only real payload deliveries count —
        // unknown/expired/legacy-missing fetches are not remixes.
        await hostedServiceInstance!.incrementShareCount(token, 'remixes');
        return payload;
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to load remix payload' };
      }
    }
  );

  // Share stats (slice 3): aggregate integers only (CEO ruling #4 exception
  // to the storage-only funnel — no PII). Consumed by the injected landing
  // bar ("played N times"), which runs inside a CSP-sandboxed page with an
  // opaque origin → its fetch is cross-origin, so ACAO:* is required.
  app.get<{ Params: { token: string } }>(
    '/api/share/:token/stats',
    async (request, reply) => {
      const { token } = request.params;
      try {
        const hostedExport = await hostedServiceInstance!.getHostedExport(token);
        if (!hostedExport) {
          reply.code(404);
          return { error: 'Hosted game not found' };
        }
        if (hostedExport.expiresAt && new Date(hostedExport.expiresAt) < new Date()) {
          reply.code(410);
          return { error: 'Hosted game has expired' };
        }
        const stats = await hostedServiceInstance!.getShareStats(token);
        reply
          .header('Access-Control-Allow-Origin', '*')
          .header('Cache-Control', 'no-store');
        return stats;
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to load share stats' };
      }
    }
  );

  // View hosted game in browser (serve HTML) — legacy route kept working;
  // new shares advertise /share/:token links instead.
  app.get<{ Params: { hostedId: string } }>(
    '/api/hosted/:hostedId/view',
    async (request, reply) => {
      return serveHostedGame(request.params.hostedId, reply);
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

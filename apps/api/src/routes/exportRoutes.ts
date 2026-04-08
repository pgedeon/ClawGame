/**
 * @clawgame/api - Export Routes
 * API endpoints for exporting games to standalone HTML
 */

import { FastifyInstance } from 'fastify';
import { ExportService, type ExportOptions } from '../services/exportService';

// Global reference to export service (initialized with logger)
let exportServiceInstance: ExportService | null = null;

export async function exportRoutes(app: FastifyInstance) {
  // Initialize export service with logger on first use
  if (!exportServiceInstance) {
    exportServiceInstance = new ExportService(app.log);
  }

  // Export game to HTML
  app.post<{
    Params: { projectId: string };
    Body: ExportOptions;
  }>(
    '/api/projects/:projectId/export',
    async (request, reply) => {
      const { projectId } = request.params;
      const options = request.body || {};

      try {
        const result = await exportServiceInstance!.exportToHTML(projectId, options);
        reply.code(201);
        return result;
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to export game' };
      }
    }
  );

  // List exports for a project
  app.get<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/exports',
    async (request, reply) => {
      const { projectId } = request.params;

      try {
        const exports = await exportServiceInstance!.listExports(projectId);
        return { exports };
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to list exports' };
      }
    }
  );

  // Download/export file
  app.get<{
    Params: { projectId: string; filename: string };
  }>(
    '/api/projects/:projectId/exports/:filename',
    async (request, reply) => {
      const { filename } = request.params;

      try {
        const { content, mimeType } = await exportServiceInstance!.getExportFile(filename);

        reply
          .header('Content-Type', mimeType)
          .header('Content-Disposition', `attachment; filename="${filename}"`)
          .send(content);
      } catch (error: any) {
        reply.code(404);
        return { error: error.message || 'Export not found' };
      }
    }
  );

  // Delete export
  app.delete<{
    Params: { projectId: string; filename: string };
  }>(
    '/api/projects/:projectId/exports/:filename',
    async (request, reply) => {
      const { filename } = request.params;

      try {
        const deleted = await exportServiceInstance!.deleteExport(filename);
        if (!deleted) {
          reply.code(404);
          return { error: 'Export not found' };
        }
        return { success: true };
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to delete export' };
      }
    }
  );
}

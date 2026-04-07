import { FastifyInstance } from 'fastify';
import * as fileService from '../services/fileService';

export async function fileRoutes(app: FastifyInstance) {
  // Get file tree for a project
  app.get<{ Params: { projectId: string }; Querystring: { path?: string; depth?: string } }>(
    '/api/projects/:projectId/files/tree',
    async (request) => {
      const { projectId } = request.params;
      const subPath = request.query.path || '';
      const maxDepth = parseInt(request.query.depth || '5', 10);
      const tree = await fileService.getFileTree(projectId, subPath, 0, maxDepth);
      return { tree };
    }
  );

  // Read file content
  app.get<{ Params: { projectId: string; '*' : string } }>(
    '/api/projects/:projectId/files/*',
    async (request, reply) => {
      const { projectId } = request.params;
      const filePath = (request.params as any)['*'];

      if (!filePath) {
        reply.code(400);
        return { error: 'File path is required' };
      }

      try {
        const content = await fileService.readFileContent(projectId, filePath);
        return content;
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          reply.code(404);
          return { error: 'File not found' };
        }
        reply.code(500);
        return { error: err.message };
      }
    }
  );

  // Write/create file
  app.put<{ Params: { projectId: string; '*': string }; Body: { content: string; encoding?: string } }>(
    '/api/projects/:projectId/files/*',
    async (request, reply) => {
      const { projectId } = request.params;
      const filePath = (request.params as any)['*'];
      const { content, encoding } = request.body;

      if (!filePath) {
        reply.code(400);
        return { error: 'File path is required' };
      }
      if (content === undefined) {
        reply.code(400);
        return { error: 'Content is required' };
      }

      try {
        const result = await fileService.writeFileContent(
          projectId,
          filePath,
          content,
          (encoding as 'utf-8' | 'base64') || 'utf-8'
        );
        return result;
      } catch (err: any) {
        reply.code(500);
        return { error: err.message };
      }
    }
  );

  // Delete file
  app.delete<{ Params: { projectId: string; '*': string } }>(
    '/api/projects/:projectId/files/*',
    async (request, reply) => {
      const { projectId } = request.params;
      const filePath = (request.params as any)['*'];

      if (!filePath) {
        reply.code(400);
        return { error: 'File path is required' };
      }

      const deleted = await fileService.deleteFile(projectId, filePath);
      if (!deleted) {
        reply.code(404);
        return { error: 'File not found' };
      }
      return { success: true };
    }
  );

  // Create directory
  app.post<{ Params: { projectId: string }; Body: { path: string } }>(
    '/api/projects/:projectId/files/mkdir',
    async (request, reply) => {
      const { projectId } = request.params;
      const { path: dirPath } = request.body;

      if (!dirPath) {
        reply.code(400);
        return { error: 'Directory path is required' };
      }

      await fileService.createDirectory(projectId, dirPath);
      return { success: true };
    }
  );

  // Search files
  app.get<{ Params: { projectId: string }; Querystring: { q: string } }>(
    '/api/projects/:projectId/files/search',
    async (request) => {
      const { projectId } = request.params;
      const { q } = request.query;

      if (!q) return { results: [] };

      const results = await fileService.searchFiles(projectId, q);
      return { results };
    }
  );
}

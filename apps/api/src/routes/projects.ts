import { FastifyInstance } from 'fastify';
import {
  type CreateProjectRequest,
  type UpdateProjectRequest,
} from '@clawgame/shared';
import * as projectService from '../services/projectService';

export async function projectRoutes(app: FastifyInstance) {
  // List all projects
  app.get('/api/projects', async () => {
    const projects = await projectService.listProjects();
    return { projects };
  });

  // Get a single project
  app.get<{ Params: { projectId: string } }>(
    '/api/projects/:projectId',
    async (request, reply) => {
      const { projectId } = request.params;
      const project = await projectService.getProject(projectId);
      if (!project) {
        reply.code(404);
        return { error: 'Project not found' };
      }
      return project;
    }
  );

  // Create a new project
  app.post<{ Body: CreateProjectRequest }>(
    '/api/projects',
    async (request, reply) => {
      const { name, genre, artStyle, description, runtimeTarget, renderBackend } = request.body;

      if (!name || !genre || !artStyle) {
        reply.code(400);
        return { error: 'name, genre, and artStyle are required' };
      }

      const result = await projectService.createProject({
        name,
        genre,
        artStyle,
        description,
        runtimeTarget,
        renderBackend,
      });

      reply.code(201);
      return {
        id: result.id,
        project: result.project,
      };
    }
  );

  // Update a project
  app.put<{ Params: { projectId: string }; Body: UpdateProjectRequest }>(
    '/api/projects/:projectId',
    async (request, reply) => {
      const { projectId } = request.params;
      const updated = await projectService.updateProject(projectId, request.body);
      if (!updated) {
        reply.code(404);
        return { error: 'Project not found' };
      }
      return updated;
    }
  );

  // Delete a project
  app.delete<{ Params: { projectId: string } }>(
    '/api/projects/:projectId',
    async (request, reply) => {
      const { projectId } = request.params;
      const deleted = await projectService.deleteProject(projectId);
      if (!deleted) {
        reply.code(404);
        return { error: 'Project not found' };
      }
      return { success: true };
    }
  );
}

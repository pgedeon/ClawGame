import { FastifyInstance } from 'fastify';
import { ProjectService, CreateProjectInput, UpdateProjectInput } from '../services/projectService';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const PROJECTS_DIR = process.env.PROJECTS_DIR || './data/projects';

// Global reference to project service (initialized with logger)
let projectServiceInstance: ProjectService | null = null;

export async function projectRoutes(app: FastifyInstance) {
  // Initialize project service with logger on first use
  if (!projectServiceInstance) {
    projectServiceInstance = new ProjectService(app.log);
  }

  // List all projects
  app.get('/api/projects', async (request, reply) => {
    try {
      const projects = await projectServiceInstance!.listProjects();
      return { projects };
    } catch (error: any) {
      reply.code(500);
      return { error: error.message || 'Failed to list projects' };
    }
  });

  // Get project details
  app.get<{ Params: { id: string } }>(
    '/api/projects/:id',
    async (request, reply) => {
      const { id } = request.params;

      try {
        const project = await projectServiceInstance!.getProjectDetail(id);
        if (!project) {
          reply.code(404);
          return { error: 'Project not found' };
        }
        return project;
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to get project' };
      }
    }
  );


  // Create new project
  app.post<{ Body: CreateProjectInput }>(
    '/api/projects',
    async (request, reply) => {
      try {
        const result = await projectServiceInstance!.createProject(request.body);
        reply.code(201);
        return result;
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to create project' };
      }
    }
  );

  // Update project
  app.put<{ Params: { id: string }; Body: UpdateProjectInput }>(
    '/api/projects/:id',
    async (request, reply) => {
      const { id } = request.params;

      try {
        const project = await projectServiceInstance!.updateProject(id, request.body);
        if (!project) {
          reply.code(404);
          return { error: 'Project not found' };
        }
        return project;
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to update project' };
      }
    }
  );

  // Delete project
  app.delete<{ Params: { id: string } }>(
    '/api/projects/:id',
    async (request, reply) => {
      const { id } = request.params;

      try {
        const deleted = await projectServiceInstance!.deleteProject(id);
        if (!deleted) {
          reply.code(404);
          return { error: 'Project not found' };
        }
        return { success: true };
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to delete project' };
      }
    }
  );
}

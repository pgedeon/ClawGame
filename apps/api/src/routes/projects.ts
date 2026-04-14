import { FastifyInstance } from 'fastify';
import { ProjectService, CreateProjectInput, UpdateProjectInput } from '../services/projectService';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';

function getProjectsDir(): string { return process.env.PROJECTS_DIR || './data/projects'; }

// Global reference to project service (initialized with logger)
let projectServiceInstance: ProjectService | null = null;

// Validate project creation input
function validateCreateProjectInput(input: any): { valid: boolean; error?: string } {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const { name, genre, artStyle } = input;

  // Name is required
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return { valid: false, error: 'Project name is required' };
  }

  if (name.trim().length > 100) {
    return { valid: false, error: 'Project name must be 100 characters or less' };
  }

  // Genre is required
  if (!genre || typeof genre !== 'string' || genre.trim().length === 0) {
    return { valid: false, error: 'Genre is required' };
  }

  const validGenres = ['platformer', 'rpg', 'action', 'puzzle', 'adventure', 'simulation', 'strategy', 'other'];
  if (!validGenres.includes(genre.toLowerCase())) {
    return { valid: false, error: `Genre must be one of: ${validGenres.join(', ')}` };
  }

  // Art style is required
  if (!artStyle || typeof artStyle !== 'string' || artStyle.trim().length === 0) {
    return { valid: false, error: 'Art style is required' };
  }

  const validArtStyles = ['pixel', 'vector', '3d', 'mixed', 'other'];
  if (!validArtStyles.includes(artStyle.toLowerCase())) {
    return { valid: false, error: `Art style must be one of: ${validArtStyles.join(', ')}` };
  }

  // Description is optional but must be a string if provided
  if (input.description !== undefined && typeof input.description !== 'string') {
    return { valid: false, error: 'Description must be a string' };
  }

  if (input.description && input.description.length > 500) {
    return { valid: false, error: 'Description must be 500 characters or less' };
  }

  return { valid: true };
}

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
      // Validate input before processing
      const validation = validateCreateProjectInput(request.body);
      if (!validation.valid) {
        reply.code(400);
        return { error: validation.error };
      }

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

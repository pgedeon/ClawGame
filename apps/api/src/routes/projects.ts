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

  // Scene analysis for AI asset suggestions
  app.get<{ Params: { id: string } }>(
    '/api/projects/:id/scene-analysis',
    async (request, reply) => {
      const { id } = request.params;

      try {
        const scenesDir = join(PROJECTS_DIR, id, 'scenes');
        const analysis: {
          entityTypes: string[];
          entityCount: number;
          hasPlayer: boolean;
          hasEnemies: boolean;
          hasPlatforms: boolean;
          hasCollectibles: boolean;
          hasSprites: boolean;
          hasBackground: boolean;
          dominantGenre: string | null;
        } = {
          entityTypes: [],
          entityCount: 0,
          hasPlayer: false,
          hasEnemies: false,
          hasPlatforms: false,
          hasCollectibles: false,
          hasSprites: false,
          hasBackground: false,
          dominantGenre: null,
        };

        if (existsSync(scenesDir)) {
          const sceneFiles = readdirSync(scenesDir).filter(f => f.endsWith('.json'));

          for (const sceneFile of sceneFiles) {
            try {
              const sceneContent = readFileSync(join(scenesDir, sceneFile), 'utf-8');
              const scene = JSON.parse(sceneContent);

              if (scene.entities) {
                const entities = Array.isArray(scene.entities)
                  ? scene.entities
                  : Object.values(scene.entities as Record<string, any>);

                for (const entity of entities) {
                  analysis.entityCount++;
                  const components = entity.components || {};
                  const compKeys = Object.keys(components);

                  // Detect entity type from components
                  if (compKeys.includes('movement') || compKeys.includes('player')) {
                    analysis.hasPlayer = true;
                    if (!analysis.entityTypes.includes('player')) analysis.entityTypes.push('player');
                  }
                  if (compKeys.includes('ai') || compKeys.includes('enemy')) {
                    analysis.hasEnemies = true;
                    if (!analysis.entityTypes.includes('enemy')) analysis.entityTypes.push('enemy');
                  }
                  if (components.collision?.type === 'wall' || components.collision?.type === 'solid') {
                    analysis.hasPlatforms = true;
                    if (!analysis.entityTypes.includes('platform')) analysis.entityTypes.push('platform');
                  }
                  if (components.collision?.type === 'collectible') {
                    analysis.hasCollectibles = true;
                    if (!analysis.entityTypes.includes('collectible')) analysis.entityTypes.push('collectible');
                  }
                  if (compKeys.includes('sprite') || compKeys.includes('renderable')) {
                    analysis.hasSprites = true;
                    if (!analysis.entityTypes.includes('sprite')) analysis.entityTypes.push('sprite');
                  }
                }
              }

              // Check for background in scene metadata
              if (scene.background || scene.settings?.background) {
                analysis.hasBackground = true;
              }
            } catch {
              // Skip unreadable scene files
            }
          }
        }

        // Infer genre from entity composition
        if (analysis.hasPlayer && analysis.hasPlatforms) {
          analysis.dominantGenre = 'platformer';
        } else if (analysis.hasPlayer && analysis.hasEnemies && !analysis.hasPlatforms) {
          analysis.dominantGenre = 'action';
        } else if (analysis.hasCollectibles && !analysis.hasEnemies) {
          analysis.dominantGenre = 'puzzle';
        }

        // Also get genre from project metadata if available
        if (!analysis.dominantGenre) {
          try {
            const project = await projectServiceInstance!.getProjectDetail(id);
            if (project?.genre) {
              analysis.dominantGenre = project.genre;
            }
          } catch {
            // fallback to null
          }
        }

        return analysis;
      } catch (error: any) {
        reply.code(500);
        return { error: error.message || 'Failed to analyze scene' };
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

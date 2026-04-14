import { mkdir, readFile, writeFile, readdir, stat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { FastifyLoggerInstance } from 'fastify';
import { 
  ClawGameProject, 
  ProjectListItem, 
  ProjectDetail,
  CreateProjectRequest,
  UpdateProjectRequest,
  createDefaultProject,
  generateProjectId,
  createId
} from '@clawgame/shared';

function getProjectsDir(): string { return process.env.PROJECTS_DIR || './data/projects'; }

// Export types for routes
export type CreateProjectInput = CreateProjectRequest;
export type UpdateProjectInput = UpdateProjectRequest;

interface ProjectCache {
  projects: Map<string, ClawGameProject>;
  list: ProjectListItem[];
}

/**
 * Project Service
 * Manages game projects with full CRUD operations and caching.
 */
export class ProjectService {
  private logger: FastifyLoggerInstance;
  private cache: ProjectCache = {
    projects: new Map<string, ClawGameProject>(),
    list: [],
  };

  constructor(logger: FastifyLoggerInstance) {
    this.logger = logger;
  }

  /**
   * Initialize project directory structure
   */
  private async ensureProjectsDir(): Promise<void> {
    if (!existsSync(getProjectsDir())) {
      await mkdir(getProjectsDir(), { recursive: true });
    }
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<ProjectListItem[]> {
    await this.ensureProjectsDir();
    
    const entries = await readdir(getProjectsDir(), { withFileTypes: true });
    const projects: ProjectListItem[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      
      try {
        const projectFile = join(getProjectsDir(), entry.name, 'clawgame.project.json');
        if (existsSync(projectFile)) {
          const content = await readFile(projectFile, 'utf-8');
          const project: ClawGameProject = JSON.parse(content);
          
          if (project.project) {
            // Auto-fix missing dates using file mtime as fallback
            if (!project.project.createdAt || !project.project.updatedAt) {
              const fileStat = await stat(projectFile);
              const fallbackDate = fileStat.mtime.toISOString();
              project.project.createdAt = project.project.createdAt || fallbackDate;
              project.project.updatedAt = project.project.updatedAt || fallbackDate;
              // Persist the fix
              await writeFile(projectFile, JSON.stringify(project, null, 2), 'utf-8');
              this.logger.info({ projectId: project.project.id }, 'Auto-fixed missing dates');
            }
            
            projects.push({
              id: project.project.id || entry.name,
              name: project.project.name || project.project.displayName || 'Untitled',
              genre: project.project.genre || 'unset',
              artStyle: project.project.artStyle || 'unset',
              description: project.project.description || '',
              status: project.project.status || 'draft',
              createdAt: project.project.createdAt,
              updatedAt: project.project.updatedAt,
            });
          }
        }
      } catch (err) {
        this.logger.error({ err, project: entry.name }, 'Failed to load project');
      }
    }

    // Sort safely — invalid/missing dates get pushed to the end
    return projects.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  }

  /**
   * Get project by ID
   */
  async getProject(id: string): Promise<ClawGameProject | null> {
    const cached = this.cache.projects.get(id);
    if (cached) {
      return cached;
    }

    const projectDir = join(getProjectsDir(), id);
    const projectFile = join(projectDir, 'clawgame.project.json');
    
    if (!existsSync(projectFile)) {
      return null;
    }

    try {
      const content = await readFile(projectFile, 'utf-8');
      const project: ClawGameProject = JSON.parse(content);
      
      // Count scenes and entities
      const scenesDir = join(projectDir, 'scenes');
      let sceneCount = 0;
      let entityCount = 0;
      
      if (existsSync(scenesDir)) {
        const scenes = await readdir(scenesDir);
        sceneCount = scenes.length;
        
        for (const sceneFile of scenes) {
          const scenePath = join(scenesDir, sceneFile);
          const sceneContent = await readFile(scenePath, 'utf-8');
          const scene = JSON.parse(sceneContent);
          
          if (scene.entities) {
            const entityIds = Array.isArray(scene.entities) 
              ? scene.entities.map((e: any) => e.id)
              : Array.from(Object.keys(scene.entities || {}));
            entityCount += entityIds.length;
          }
        }
      }
      
      this.cache.projects.set(id, project);
      return project;
    } catch (err) {
      this.logger.error({ err, projectId: id }, 'Failed to load project');
      return null;
    }
  }

  /**
   * Get project detail with additional stats
   */
  async getProjectDetail(id: string): Promise<ProjectDetail | null> {
    const project = await this.getProject(id);
    
    if (!project || !project.project) {
      return null;
    }
    
    const scenesDir = join(getProjectsDir(), id, 'scenes');
    let sceneCount = 0;
    let entityCount = 0;
    
    if (existsSync(scenesDir)) {
      const scenes = await readdir(scenesDir);
      sceneCount = scenes.length;
      
      for (const sceneFile of scenes) {
        const scenePath = join(scenesDir, sceneFile);
        const sceneContent = await readFile(scenePath, 'utf-8');
        const scene = JSON.parse(sceneContent);
        
        if (scene.entities) {
          const entityIds = Array.isArray(scene.entities) 
            ? scene.entities.map((e: any) => e.id)
            : Array.from(Object.keys(scene.entities || {}));
          entityCount += entityIds.length;
        }
      }
    }
    
    return {
      id: project.project.id,
      name: project.project.name,
      genre: project.project.genre,
      artStyle: project.project.artStyle,
      description: project.project.description,
      status: project.project.status,
      createdAt: project.project.createdAt,
      updatedAt: project.project.updatedAt,
      version: project.version,
      engine: project.engine,
      ai: project.ai,
      assets: project.assets,
      openclaw: project.openclaw,
      sceneCount,
      entityCount,
    };
  }

  /**
   * Create new project
   */
  async createProject(input: CreateProjectInput): Promise<{ id: string; project: ClawGameProject }> {
    const project = createDefaultProject(input);
    const projectId = project.project.id;
    const projectDir = join(getProjectsDir(), projectId);

    // Create project directory structure
    await mkdir(projectDir, { recursive: true });
    await mkdir(join(projectDir, 'assets'), { recursive: true });
    await mkdir(join(projectDir, 'scenes'), { recursive: true });
    await mkdir(join(projectDir, 'scripts'), { recursive: true });
    await mkdir(join(projectDir, 'docs'), { recursive: true });

    // Create project config file
    const projectFile = join(projectDir, 'clawgame.project.json');
    await writeFile(projectFile, JSON.stringify(project, null, 2), 'utf-8');

    // Create initial scene
    const initialScene = {
      name: 'Main Scene',
      entities: [],
      viewport: {
        x: 0,
        y: 0,
        zoom:1,
      },
    };
    await writeFile(
      join(projectDir, 'scenes', 'main-scene.json'),
      JSON.stringify(initialScene, null, 2),
      'utf-8'
    );

    // Create initial game script
    const gameScript = `// ${input.name} Game Script
// This is the entry point for your game logic

export function update(deltaTime: number) {
  // Game update logic goes here
}

export function render(ctx: CanvasRenderingContext2D) {
  // Game render logic goes here
}
`;
    await writeFile(
      join(projectDir, 'scripts', 'game.ts'),
      gameScript,
      'utf-8'
    );

    this.logger.info({ 
      projectId, 
      name: input.name,
      genre: input.genre 
    }, 'Project created');

    this.cache.projects.set(projectId, project);
    
    return { id: projectId, project };
  }

  /**
   * Update project metadata
   */
  async updateProject(id: string, updates: UpdateProjectInput): Promise<ClawGameProject | null> {
    const project = await this.getProject(id);
    
    if (!project || !project.project) {
      return null;
    }

    const projectDir = join(getProjectsDir(), id);
    const projectFile = join(projectDir, 'clawgame.project.json');
    
    if (updates.name) {
      project.project.name = updates.name;
      project.project.displayName = updates.name;
    }
    if (updates.genre) project.project.genre = updates.genre;
    if (updates.artStyle) project.project.artStyle = updates.artStyle;
    if (updates.description !== undefined) {
      project.project.description = updates.description;
    }
    project.project.updatedAt = new Date().toISOString();

    await writeFile(projectFile, JSON.stringify(project, null, 2), 'utf-8');
    
    this.cache.projects.delete(id);
    
    this.logger.info({ projectId: id, updates }, 'Project updated');
    
    return project;
  }

  /**
   * Delete project
   */
  async deleteProject(id: string): Promise<boolean> {
    const projectDir = join(getProjectsDir(), id);
    
    if (!existsSync(projectDir)) {
      return false;
    }

    try {
      await rm(projectDir, { recursive: true, force: true });
      this.cache.projects.delete(id);
      
      this.logger.info({ projectId: id }, 'Project deleted');
      
      return true;
    } catch (err) {
      this.logger.error({ err, projectId: id }, 'Failed to delete project');
      return false;
    }
  }

  /**
   * Get project directory path
   */
  getProjectDir(projectId: string): string {
    return join(getProjectsDir(), projectId);
  }

  /**
   * Validate project ID exists
   */
  async projectExists(projectId: string): Promise<boolean> {
    const projectDir = join(getProjectsDir(), projectId);
    return existsSync(projectDir);
  }
}

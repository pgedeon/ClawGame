import { FastifyInstance } from 'fastify';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const PROJECTS_DIR = process.env.PROJECTS_DIR || './data/projects';

interface EntityData {
  id: string;
  name?: string;
  components?: Record<string, any>;
}

interface SceneFile {
  name?: string;
  entities?: EntityData[] | Record<string, EntityData>;
  viewport?: { x: number; y: number; zoom: number };
}

interface SceneAnalysisResult {
  entityTypes: string[];
  entityCount: number;
  hasPlayer: boolean;
  hasEnemies: boolean;
  hasPlatforms: boolean;
  hasCollectibles: boolean;
  hasSprites: boolean;
  hasBackground: boolean;
  dominantGenre: string | null;
}

/**
 * Detect entity role from its components
 */
function detectEntityRole(components: Record<string, any>): string[] {
  const roles: string[] = [];
  
  if (!components) return roles;

  // Player detection: has movement component
  if (components.movement || components.playerController) {
    roles.push('player');
  }

  // Enemy detection: has AI component
  if (components.ai || components.enemyAI) {
    roles.push('enemy');
  }

  // Platform detection: has wall/platform collision
  if (components.collision) {
    const col = components.collision;
    if (col.type === 'wall' || col.type === 'platform' || col.behavior === 'wall' || col.behavior === 'platform') {
      roles.push('platform');
    }
    if (col.type === 'collectible' || col.behavior === 'collectible') {
      roles.push('collectible');
    }
  }

  // Sprite detection: has sprite/renderer component
  if (components.sprite || components.renderer || components.visual) {
    roles.push('sprite');
  }

  // Background detection: has background/parallax component
  if (components.background || components.parallax) {
    roles.push('background');
  }

  // If no specific role detected but entity exists, classify as generic
  if (roles.length === 0 && Object.keys(components).length > 0) {
    roles.push('entity');
  }

  return roles;
}

/**
 * Analyze entity composition to infer dominant genre
 */
function inferGenre(
  hasPlayer: boolean,
  hasEnemies: boolean,
  hasPlatforms: boolean,
  hasCollectibles: boolean,
  entityCount: number
): string | null {
  if (entityCount === 0) return null;

  // Platformer: player + platforms
  if (hasPlayer && hasPlatforms) return 'platformer';

  // Action: player + enemies without platforms
  if (hasPlayer && hasEnemies && !hasPlatforms) return 'action';

  // Puzzle: collectibles but no enemies
  if (hasCollectibles && !hasEnemies && !hasPlatforms) return 'puzzle';

  // Adventure: player + collectibles + enemies
  if (hasPlayer && hasCollectibles && hasEnemies) return 'adventure';

  // RPG: player + enemies (no specific platform structure)
  if (hasPlayer && hasEnemies) return 'rpg';

  // Generic
  if (hasPlayer) return 'arcade';

  return null;
}

/**
 * Parse entities from various scene formats
 */
function parseEntities(scene: SceneFile): EntityData[] {
  if (!scene.entities) return [];

  // Array format
  if (Array.isArray(scene.entities)) {
    return scene.entities;
  }

  // Map/object format (serialized Map → { key: EntityData })
  if (typeof scene.entities === 'object') {
    return Object.values(scene.entities);
  }

  return [];
}

/**
 * Analyze all scenes in a project
 */
function analyzeScenes(scenes: SceneFile[], projectGenre?: string): SceneAnalysisResult {
  let hasPlayer = false;
  let hasEnemies = false;
  let hasPlatforms = false;
  let hasCollectibles = false;
  let hasSprites = false;
  let hasBackground = false;
  const entityTypeSet = new Set<string>();
  let totalEntities = 0;

  for (const scene of scenes) {
    const entities = parseEntities(scene);
    totalEntities += entities.length;

    for (const entity of entities) {
      const components = entity.components || {};
      const roles = detectEntityRole(components);

      for (const role of roles) {
        entityTypeSet.add(role);
      }

      if (roles.includes('player')) hasPlayer = true;
      if (roles.includes('enemy')) hasEnemies = true;
      if (roles.includes('platform')) hasPlatforms = true;
      if (roles.includes('collectible')) hasCollectibles = true;
      if (roles.includes('sprite')) hasSprites = true;
      if (roles.includes('background')) hasBackground = true;
    }
  }

  let dominantGenre = inferGenre(hasPlayer, hasEnemies, hasPlatforms, hasCollectibles, totalEntities);

  // Fallback to project genre metadata when scene analysis is insufficient
  if (!dominantGenre && projectGenre && projectGenre !== 'unset') {
    dominantGenre = projectGenre;
  }

  return {
    entityTypes: Array.from(entityTypeSet),
    entityCount: totalEntities,
    hasPlayer,
    hasEnemies,
    hasPlatforms,
    hasCollectibles,
    hasSprites,
    hasBackground,
    dominantGenre,
  };
}

export async function sceneAnalysisRoutes(app: FastifyInstance) {
  // Analyze scene composition for a project
  app.get<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/scene-analysis',
    async (request, reply) => {
      const { projectId } = request.params;
      const projectDir = join(PROJECTS_DIR, projectId);

      if (!existsSync(projectDir)) {
        reply.code(404);
        return { error: 'Project not found' };
      }

      const scenesDir = join(projectDir, 'scenes');
      if (!existsSync(scenesDir)) {
        // Empty project — return zeroed analysis
        return {
          entityTypes: [],
          entityCount: 0,
          hasPlayer: false,
          hasEnemies: false,
          hasPlatforms: false,
          hasCollectibles: false,
          hasSprites: false,
          hasBackground: false,
          dominantGenre: null,
        } satisfies SceneAnalysisResult;
      }

      try {
        const sceneFiles = await readdir(scenesDir);
        const scenes: SceneFile[] = [];
        let projectGenre: string | undefined;

        // Read project metadata for genre fallback
        const projectFile = join(projectDir, 'clawgame.project.json');
        if (existsSync(projectFile)) {
          try {
            const projectContent = await readFile(projectFile, 'utf-8');
            const projectData = JSON.parse(projectContent);
            projectGenre = projectData?.project?.genre;
          } catch {
            // Ignore — genre fallback is optional
          }
        }

        // Read and parse each scene file
        for (const file of sceneFiles) {
          if (!file.endsWith('.json')) continue;
          try {
            const scenePath = join(scenesDir, file);
            const content = await readFile(scenePath, 'utf-8');
            scenes.push(JSON.parse(content));
          } catch {
            // Skip malformed scene files
          }
        }

        const analysis = analyzeScenes(scenes, projectGenre);
        return analysis;
      } catch (error: any) {
        app.log.error({ err: error, projectId }, 'Scene analysis failed');
        reply.code(500);
        return { error: 'Failed to analyze scenes' };
      }
    }
  );
}

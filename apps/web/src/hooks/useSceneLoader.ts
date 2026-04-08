/**
 * @clawgame/web - Scene Loader Hook
 * Loads a project scene from the API, validates entities,
 * and handles both array and legacy object formats.
 */

import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { logger } from '../utils/logger';

export interface SceneEntity {
  id: string;
  type: string;
  transform: { x: number; y: number; scaleX: number; scaleY: number; rotation: number };
  components: Record<string, any>;
}

export interface ProjectScene {
  name: string;
  description?: string;
  entities: SceneEntity[];
  dialogueTrees?: any[];
  quests?: any[];
  metadata?: { features?: string[] };
}

export interface UseSceneLoaderResult {
  loading: boolean;
  error: string | null;
  projectName: string;
  scene: ProjectScene | null;
  reload: () => void;
}

/**
 * Infer entity type from components when explicit type is missing or 'unknown'.
 */
function inferType(type: string | undefined, components: Record<string, any>): string {
  if (type && type !== 'unknown') return type;
  if (components.playerInput || components.movement?.speed >= 150) return 'player';
  if (components.ai) return 'enemy';
  if (components.collision?.type === 'collectible') return 'collectible';
  if (components.collision?.type === 'wall') return 'obstacle';
  if (components.collision?.type === 'player') return 'player';
  if (components.npc) return 'npc';
  return 'unknown';
}

/**
 * Validate and normalize raw entities from scene JSON.
 */
function validateEntities(raw: any[]): SceneEntity[] {
  return raw.map((e: any) => ({
    id: e.id || `e-${Math.random().toString(36).substr(2, 9)}`,
    type: inferType(e.type, e.components || {}),
    transform: e.transform || { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
    components: e.components || {},
  }));
}

/**
 * Parse scene data handling both array and legacy object formats.
 */
function parseSceneData(parsed: any): ProjectScene {
  let rawEntities: any[] = [];

  if (Array.isArray(parsed.entities)) {
    rawEntities = parsed.entities;
  } else if (parsed.entities && typeof parsed.entities === 'object') {
    // Legacy format: Map→{} broken saves stored as keyed objects
    rawEntities = Object.values(parsed.entities);
  }

  return {
    name: parsed.name || 'Main Scene',
    description: parsed.description,
    entities: validateEntities(rawEntities),
    dialogueTrees: parsed.dialogueTrees || [],
    quests: parsed.quests || [],
    metadata: parsed.metadata,
  };
}

export function useSceneLoader(projectId: string | undefined): UseSceneLoaderResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('Game Preview');
  const [scene, setScene] = useState<ProjectScene | null>(null);

  const load = useCallback(() => {
    if (!projectId) return;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const project = await api.getProject(projectId);
        setProjectName(project.name);

        try {
          const sceneData = await api.readFile(projectId, 'scenes/main-scene.json');
          const parsed = JSON.parse(sceneData.content);
          setScene(parseSceneData(parsed));
        } catch {
          // No scene file yet — create empty scene
          setScene({ name: 'Main Scene', entities: [] });
        }
      } catch (err) {
        logger.error('Failed to load project:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  return { loading, error, projectName, scene, reload: load };
}

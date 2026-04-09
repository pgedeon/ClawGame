/**
 * @clawgame/web - Scene Loader Hook
 * Loads a project scene from API, validates entities, and infers types.
 * Returns loading state, scene data, and project metadata (including genre).
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export interface ProjectScene {
  entities: Entity[];
  dialogueTrees?: DialogueTree[];
  platforms?: Platform[];
  collectibles?: CollectibleData[];
  waypoints?: Waypoint[];
  spawnPoint?: SpawnPoint;
  bounds?: Bounds;
}

export interface Entity {
  id: string;
  type: string;
  transform?: Transform;
  components?: Record<string, any>;
  name?: string;
  parent?: string;
  children?: string[];
}

export interface Transform {
  x: number;
  y: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
}

export interface DialogueTree {
  id: string;
  startNode: string;
  nodes: Record<string, DialogueNode>;
}

export interface DialogueNode {
  id: string;
  speaker: string;
  text: string;
  portrait?: string;
  choices?: DialogueChoice[];
  effects?: DialogueEffect[];
}

export interface DialogueChoice {
  text: string;
  nextNode: string;
  condition?: string;
}

export interface DialogueEffect {
  type: 'give-item' | 'start-quest' | 'complete-quest' | 'modify-stats';
  target: string;
  value?: any;
}

export interface Platform {
  id: string;
  transform: Transform;
  width: number;
  height: number;
  properties?: {
    oneWay?: boolean;
    slippery?: boolean;
    bounceFactor?: number;
  };
}

export interface CollectibleData {
  id: string;
  transform: Transform;
  type: 'coin' | 'gem' | 'health' | 'rune';
  value: number;
  respawn?: boolean;
  collectEffects?: {
    healAmount?: number;
    scoreBonus?: number;
  };
}

export interface Waypoint {
  id: string;
  transform: Transform;
  connectedTo: string[];
  type?: 'patrol' | 'path';
}

export interface SpawnPoint {
  id: string;
  transform: Transform;
  spawnEntityId?: string;
}

export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface SceneLoaderReturn {
  loading: boolean;
  error: string | null;
  scene: ProjectScene | null;
  projectName: string;
  projectGenre: string;
}

export function useSceneLoader(projectId: string | undefined): SceneLoaderReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scene, setScene] = useState<ProjectScene | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectGenre, setProjectGenre] = useState('default');

  const loadScene = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load project metadata
      const project = await api.getProject(projectId);
      if (project) {
        setProjectName(project.name);
        setProjectGenre(project.genre || 'default');
      }

      // Load scene from file system
      try {
        const sceneFile = await api.readFile(projectId, 'scenes/main-scene.json');
        const sceneData = JSON.parse(sceneFile.content);

        // Validate and normalize
        const normalizedScene = normalizeScene(sceneData);
        setScene(normalizedScene);
      } catch (err) {
        // No scene file yet — create empty scene
        setScene({ entities: [] });
      }
    } catch (err: any) {
      console.error('Scene load error:', err);
      setError(err.message || 'Failed to load scene');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadScene();
  }, [loadScene]);

  return {
    loading,
    error,
    scene,
    projectName,
    projectGenre,
  };
}

/**
 * Normalize scene data to handle both array and object formats.
 * This resolves Map → {} serialization bug.
 */
function normalizeScene(data: any): ProjectScene {
  // Handle array format (correct)
  if (Array.isArray(data.entities)) {
    return {
      ...data,
      entities: data.entities.map(normalizeEntity),
    };
  }

  // Handle object format (legacy, broken)
  if (typeof data.entities === 'object' && data.entities !== null) {
    return {
      ...data,
      entities: Object.values(data.entities).map(normalizeEntity),
    };
  }

  // Empty scene
  return {
    ...data,
    entities: [],
  };
}

/**
 * Normalize entity data to ensure required fields exist.
 */
function normalizeEntity(entity: any): Entity {
  return {
    id: entity.id || `entity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: entity.type || 'unknown',
    transform: entity.transform || { x: 400, y: 300, scaleX: 1, scaleY: 1, rotation: 0 },
    components: entity.components || {},
    name: entity.name || entity.id,
    parent: entity.parent,
    children: entity.children || [],
  };
}

/**
 * Infer entity type from its components.
 */
export function inferEntityType(components: Record<string, any>): string {
  const compSet = new Set(Object.keys(components));

  // Player detection
  if (compSet.has('playerInput')) return 'player';

  // Enemy detection (has AI but no player input)
  if (compSet.has('ai')) return 'enemy';

  // NPC detection
  if (compSet.has('npc')) return 'npc';

  // Collectible detection
  if (compSet.has('collectible')) {
    const type = components.collectible?.type;
    return type === 'health' ? 'health' : type === 'rune' ? 'rune' : 'collectible';
  }

  // Platform/wall detection (has collision + static)
  if (compSet.has('collision')) {
    const staticBody = components.collision?.type === 'static';
    return staticBody ? 'platform' : 'obstacle';
  }

  // Item detection
  if (compSet.has('itemDrop')) return 'item';

  return 'unknown';
}

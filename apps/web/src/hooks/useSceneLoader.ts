/**
 * @clawgame/web - Scene Loader Hook
 * Loads a project scene from API, validates entities, and infers types.
 * Returns loading state, scene data, and project metadata (including genre).
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { type PreviewSceneData, normalizePreviewScene, inferEntityType } from '../utils/previewScene';

export type ProjectScene = PreviewSceneData;

export interface SceneLoaderReturn {
  loading: boolean;
  error: string | null;
  scene: PreviewSceneData | null;
  projectName: string;
  projectGenre: string;
}

export function useSceneLoader(projectId: string | undefined): SceneLoaderReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scene, setScene] = useState<PreviewSceneData | null>(null);
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
        const normalizedScene = normalizePreviewScene(sceneData);
        setScene(normalizedScene);
      } catch (err) {
        // No scene file yet — create empty scene
        setScene(normalizePreviewScene({ entities: [] }));
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

export { inferEntityType };

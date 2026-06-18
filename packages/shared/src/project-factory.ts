/**
 * @clawgame/shared - Project factory
 */

import type { ClawGameProject, CreateProjectRequest } from './project-types';
import { generateProjectId } from './utils';

export function createDefaultProject(input: string | CreateProjectRequest): ClawGameProject {
  const request: CreateProjectRequest = typeof input === 'string'
    ? { name: input, description: '', genre: 'action', artStyle: 'pixel' }
    : input;
  const now = new Date().toISOString();
  const settings = {
    width: request.settings?.width ?? 800,
    height: request.settings?.height ?? 600,
    backgroundColor: request.settings?.backgroundColor ?? '#1a1a2e',
    gravity: request.settings?.gravity ?? { x: 0, y: 0.5 },
  };

  return {
    version: '0.1.0',
    project: {
      id: generateProjectId(),
      name: request.name,
      displayName: request.name,
      description: request.description || '',
      genre: request.genre,
      artStyle: request.artStyle,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    },
    engine: {
      version: '1.0.0',
      runtimeTarget: 'web',
      renderBackend: 'canvas',
      settings,
    },
    assets: {
      baseDir: './assets',
      formats: ['png', 'jpg', 'svg', 'webp'],
    },
    ai: {
      enabled: true,
      provider: 'openrouter',
      model: 'qwen/qwen3.6-plus:free',
    },
    settings,
  };
}

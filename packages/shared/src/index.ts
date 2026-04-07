/**
 * @clawgame/shared - Shared utilities and types
 */

import { nanoid } from 'nanoid';

// ─── IDs ───
export const createId = () => nanoid(12);

// ─── Project metadata types ───

export interface ClawGameProject {
  name: string;
  version: string;
  engine: EngineConfig;
  project: ProjectMeta;
  ai?: AIConfig;
  assets?: AssetsConfig;
  openclaw?: OpenClawConfig;
}

export interface EngineConfig {
  version: string;
  runtimeTarget: 'browser' | 'desktop' | 'mobile';
  renderBackend: 'canvas' | 'webgl' | 'webgpu';
}

export interface ProjectMeta {
  displayName: string;
  genre: string;
  artStyle: string;
  description?: string;
}

export interface AIConfig {
  providers: string[];
  defaultProvider: string;
  roles: string[];
}

export interface AssetsConfig {
  comfyui?: {
    enabled: boolean;
    url: string;
  };
  formats: string[];
  directories: Record<string, string>;
}

export interface OpenClawConfig {
  integrationLevel: 'native' | 'basic' | 'none';
  memoryPaths: string[];
  agentRoles: string[];
}

// ─── Entity/Component types (for engine) ───

export interface Entity {
  id: string;
  name: string;
  components: Component[];
  transform: Transform;
}

export interface Component {
  type: string;
  data: Record<string, unknown>;
}

export interface Transform {
  x: number;
  y: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

// ─── Scene types ───

export interface Scene {
  id: string;
  name: string;
  entities: Entity[];
  layers: Layer[];
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  entityIds: string[];
}

// ─── API request/response types ───

export interface CreateProjectRequest {
  name: string;
  genre: string;
  artStyle: string;
  description?: string;
  runtimeTarget?: 'browser' | 'desktop' | 'mobile';
  renderBackend?: 'canvas' | 'webgl' | 'webgpu';
}

export interface ProjectListItem {
  id: string;
  name: string;
  genre: string;
  artStyle: string;
  description?: string;
  status: 'draft' | 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends ProjectListItem {
  version: string;
  engine: EngineConfig;
  ai?: AIConfig;
  assets?: AssetsConfig;
  openclaw?: OpenClawConfig;
  sceneCount: number;
  entityCount: number;
}

export interface UpdateProjectRequest {
  name?: string;
  genre?: string;
  artStyle?: string;
  description?: string;
}

// ─── Defaults ───

export const DEFAULT_ENGINE_VERSION = '0.1.0';
export const DEFAULT_RUNTIME_TARGET: EngineConfig['runtimeTarget'] = 'browser';
export const DEFAULT_RENDER_BACKEND: EngineConfig['renderBackend'] = 'canvas';

export function createDefaultProject(input: CreateProjectRequest): ClawGameProject {
  return {
    name: input.name,
    version: '1.0.0',
    engine: {
      version: DEFAULT_ENGINE_VERSION,
      runtimeTarget: input.runtimeTarget ?? DEFAULT_RUNTIME_TARGET,
      renderBackend: input.renderBackend ?? DEFAULT_RENDER_BACKEND,
    },
    project: {
      displayName: input.name,
      genre: input.genre,
      artStyle: input.artStyle,
      description: input.description,
    },
    ai: {
      providers: ['openclaw'],
      defaultProvider: 'openclaw',
      roles: ['builder', 'art', 'director'],
    },
    assets: {
      formats: ['png', 'webp', 'json'],
      directories: {
        sprites: 'assets/sprites',
        tilesets: 'assets/tilesets',
        textures: 'assets/textures',
        icons: 'assets/icons',
        audio: 'assets/audio',
      },
    },
    openclaw: {
      integrationLevel: 'native',
      memoryPaths: ['docs/ai/project_memory.md'],
      agentRoles: ['director-agent', 'gameplay-agent', 'ui-agent', 'tools-agent', 'asset-agent', 'qa-agent'],
    },
  };
}
